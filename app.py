import os
from sqlalchemy import inspect

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
import jwt
import datetime

app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"])

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "movie-ticket-secret-key-change-this-in-production"
)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///movie_booking.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["UPLOAD_FOLDER"] = os.path.join(app.root_path, "static", "uploads")
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)

db = SQLAlchemy(app)


# =========================
# DATABASE MODELS
# =========================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(250), nullable=False)
    role = db.Column(db.String(20), default="USER")


class Movie(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    language = db.Column(db.String(50), nullable=False)
    genre = db.Column(db.String(50), nullable=False)
    duration = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, nullable=True)
    poster_url = db.Column(db.String(255), nullable=True)


class Theater(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    city = db.Column(db.String(80), nullable=False)
    address = db.Column(db.String(250), nullable=False)


class Show(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    movie_id = db.Column(db.Integer, db.ForeignKey("movie.id"), nullable=False)
    theater_id = db.Column(db.Integer, db.ForeignKey("theater.id"), nullable=False)
    show_time = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Float, nullable=False)
    total_seats = db.Column(db.Integer, nullable=False)

    movie = db.relationship("Movie", backref="shows")
    theater = db.relationship("Theater", backref="shows")


class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    show_id = db.Column(db.Integer, db.ForeignKey("show.id"), nullable=False)
    seats = db.Column(db.Integer, nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    booking_date = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    user = db.relationship("User", backref="bookings")
    show = db.relationship("Show", backref="bookings")


class PaymentSlip(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    booking_id = db.Column(db.Integer, db.ForeignKey("booking.id"), nullable=False, unique=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    slip_number = db.Column(db.String(40), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_status = db.Column(db.String(20), default="PAID")
    paid_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    booking = db.relationship("Booking", backref="payment_slip")
    user = db.relationship("User", backref="payment_slips")


# =========================
# HELPER FUNCTIONS
# =========================

def create_token(user):
    payload = {
        "user_id": user.id,
        "email": user.email,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=5)
    }
    return jwt.encode(payload, app.config["SECRET_KEY"], algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            # Validate JWT and resolve the signed-in user from token payload.
            data = jwt.decode(token, app.config["SECRET_KEY"], algorithms=["HS256"])
            current_user = User.query.get(data["user_id"])

            if not current_user:
                return jsonify({"message": "User not found"}), 401

        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token expired"}), 401
        except Exception:
            return jsonify({"message": "Invalid token"}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user.role != "ADMIN":
            return jsonify({"message": "Admin access required"}), 403

        return f(current_user, *args, **kwargs)

    return decorated


def get_json_data():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def missing_fields(data, required_fields):
    return [field for field in required_fields if data.get(field) in (None, "")]


def allowed_image_file(filename):
    if not filename or "." not in filename:
        return False
    extension = filename.rsplit(".", 1)[1].lower()
    return extension in {"png", "jpg", "jpeg", "webp", "gif"}


def ensure_schema_updates():
    # Lightweight migration for existing SQLite DBs without Alembic.
    movie_columns = [column["name"] for column in inspect(db.engine).get_columns("movie")]
    if "poster_url" not in movie_columns:
        with db.engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE movie ADD COLUMN poster_url VARCHAR(255)")


# =========================
# BASIC ROUTE
# =========================

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "TicketNow API", "status": "ok"})


# =========================
# AUTH ROUTES
# =========================

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = get_json_data()

    full_name = data.get("fullName")
    email = data.get("email")
    password = data.get("password")

    if not full_name or not email or not password:
        return jsonify({"message": "Full name, email and password are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email already registered"}), 409

    hashed_password = generate_password_hash(password)

    user = User(
        full_name=full_name,
        email=email,
        password=hashed_password,
        role="USER"
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User registered successfully"}), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = get_json_data()

    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = create_token(user)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "fullName": user.full_name,
            "email": user.email,
            "role": user.role
        }
    })


@app.route("/api/auth/logout", methods=["POST"])
@token_required
def logout(current_user):
    # JWT is stateless. Client logout is handled by deleting token on frontend.
    return jsonify({"message": "Logout successful"})


# =========================
# PUBLIC ROUTES
# =========================

@app.route("/api/movies", methods=["GET"])
def get_movies():
    movies = Movie.query.all()

    return jsonify([
        {
            "id": movie.id,
            "title": movie.title,
            "language": movie.language,
            "genre": movie.genre,
            "duration": movie.duration,
            "description": movie.description,
            "posterUrl": movie.poster_url
        }
        for movie in movies
    ])


@app.route("/api/theaters", methods=["GET"])
def get_theaters():
    theaters = Theater.query.all()

    return jsonify([
        {
            "id": theater.id,
            "name": theater.name,
            "city": theater.city,
            "address": theater.address
        }
        for theater in theaters
    ])


@app.route("/api/shows", methods=["GET"])
def get_shows():
    shows = Show.query.all()

    return jsonify([
        {
            "id": show.id,
            "movieId": show.movie.id,
            "movieTitle": show.movie.title,
            "theaterId": show.theater.id,
            "theaterName": show.theater.name,
            "city": show.theater.city,
            "showTime": show.show_time,
            "price": show.price,
            "totalSeats": show.total_seats,
            "moviePosterUrl": show.movie.poster_url
        }
        for show in shows
    ])


# =========================
# ADMIN - MOVIE CRUD
# =========================

@app.route("/api/admin/movies", methods=["POST"])
@token_required
@admin_required
def add_movie(current_user):
    data = get_json_data()
    missing = missing_fields(data, ["title", "language", "genre", "duration"])
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    movie = Movie(
        title=data.get("title"),
        language=data.get("language"),
        genre=data.get("genre"),
        duration=data.get("duration"),
        description=data.get("description")
    )

    db.session.add(movie)
    db.session.commit()

    return jsonify({"message": "Movie added successfully", "movieId": movie.id}), 201


@app.route("/api/admin/movies/<int:movie_id>/poster", methods=["POST"])
@token_required
@admin_required
def upload_movie_poster(current_user, movie_id):
    movie = Movie.query.get_or_404(movie_id)

    image = request.files.get("image")
    if not image or not image.filename:
        return jsonify({"message": "Image file is required"}), 400

    if not allowed_image_file(image.filename):
        return jsonify({"message": "Allowed image types: png, jpg, jpeg, webp, gif"}), 400

    file_name = secure_filename(image.filename)
    extension = file_name.rsplit(".", 1)[1].lower()
    unique_name = f"movie_{movie.id}_{int(datetime.datetime.utcnow().timestamp())}.{extension}"
    save_path = os.path.join(app.config["UPLOAD_FOLDER"], unique_name)
    image.save(save_path)

    # Keep only the latest poster for each movie to avoid orphaned files.
    if movie.poster_url:
        old_name = os.path.basename(movie.poster_url)
        old_path = os.path.join(app.config["UPLOAD_FOLDER"], old_name)
        if os.path.exists(old_path):
            os.remove(old_path)

    movie.poster_url = f"/static/uploads/{unique_name}"
    db.session.commit()

    return jsonify({"message": "Movie poster uploaded", "posterUrl": movie.poster_url})


@app.route("/api/admin/movies/<int:movie_id>", methods=["PUT"])
@token_required
@admin_required
def update_movie(current_user, movie_id):
    movie = Movie.query.get_or_404(movie_id)
    data = get_json_data()

    if not data:
        return jsonify({"message": "No fields provided for update"}), 400

    movie.title = data.get("title", movie.title)
    movie.language = data.get("language", movie.language)
    movie.genre = data.get("genre", movie.genre)
    movie.duration = data.get("duration", movie.duration)
    movie.description = data.get("description", movie.description)

    db.session.commit()

    return jsonify({"message": "Movie updated successfully"})


@app.route("/api/admin/movies/<int:movie_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_movie(current_user, movie_id):
    movie = Movie.query.get_or_404(movie_id)

    db.session.delete(movie)
    db.session.commit()

    return jsonify({"message": "Movie deleted successfully"})


# =========================
# ADMIN - THEATER CRUD
# =========================

@app.route("/api/admin/theaters", methods=["POST"])
@token_required
@admin_required
def add_theater(current_user):
    data = get_json_data()
    missing = missing_fields(data, ["name", "city", "address"])
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    theater = Theater(
        name=data.get("name"),
        city=data.get("city"),
        address=data.get("address")
    )

    db.session.add(theater)
    db.session.commit()

    return jsonify({"message": "Theater added successfully"}), 201


@app.route("/api/admin/theaters/<int:theater_id>", methods=["PUT"])
@token_required
@admin_required
def update_theater(current_user, theater_id):
    theater = Theater.query.get_or_404(theater_id)
    data = get_json_data()

    if not data:
        return jsonify({"message": "No fields provided for update"}), 400

    theater.name = data.get("name", theater.name)
    theater.city = data.get("city", theater.city)
    theater.address = data.get("address", theater.address)

    db.session.commit()

    return jsonify({"message": "Theater updated successfully"})


@app.route("/api/admin/theaters/<int:theater_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_theater(current_user, theater_id):
    theater = Theater.query.get_or_404(theater_id)

    db.session.delete(theater)
    db.session.commit()

    return jsonify({"message": "Theater deleted successfully"})


# =========================
# ADMIN - SHOW CRUD
# =========================

@app.route("/api/admin/shows", methods=["POST"])
@token_required
@admin_required
def add_show(current_user):
    data = get_json_data()
    missing = missing_fields(data, ["movieId", "theaterId", "showTime", "price", "totalSeats"])
    if missing:
        return jsonify({"message": f"Missing required fields: {', '.join(missing)}"}), 400

    try:
        movie_id = int(data.get("movieId"))
        theater_id = int(data.get("theaterId"))
        price = float(data.get("price"))
        total_seats = int(data.get("totalSeats"))
    except (TypeError, ValueError):
        return jsonify({"message": "movieId, theaterId, price and totalSeats must be valid numbers"}), 400

    if price <= 0 or total_seats <= 0:
        return jsonify({"message": "price and totalSeats must be greater than zero"}), 400

    if not Movie.query.get(movie_id):
        return jsonify({"message": "Movie not found"}), 404

    if not Theater.query.get(theater_id):
        return jsonify({"message": "Theater not found"}), 404

    show = Show(
        movie_id=movie_id,
        theater_id=theater_id,
        show_time=data.get("showTime"),
        price=price,
        total_seats=total_seats
    )

    db.session.add(show)
    db.session.commit()

    return jsonify({"message": "Show added successfully"}), 201


@app.route("/api/admin/shows/<int:show_id>", methods=["PUT"])
@token_required
@admin_required
def update_show(current_user, show_id):
    show = Show.query.get_or_404(show_id)
    data = get_json_data()

    if not data:
        return jsonify({"message": "No fields provided for update"}), 400

    if "movieId" in data:
        try:
            new_movie_id = int(data.get("movieId"))
        except (TypeError, ValueError):
            return jsonify({"message": "movieId must be a valid integer"}), 400
        if not Movie.query.get(new_movie_id):
            return jsonify({"message": "Movie not found"}), 404
        show.movie_id = new_movie_id

    if "theaterId" in data:
        try:
            new_theater_id = int(data.get("theaterId"))
        except (TypeError, ValueError):
            return jsonify({"message": "theaterId must be a valid integer"}), 400
        if not Theater.query.get(new_theater_id):
            return jsonify({"message": "Theater not found"}), 404
        show.theater_id = new_theater_id

    if "price" in data:
        try:
            new_price = float(data.get("price"))
        except (TypeError, ValueError):
            return jsonify({"message": "price must be a valid number"}), 400
        if new_price <= 0:
            return jsonify({"message": "price must be greater than zero"}), 400
        show.price = new_price

    if "totalSeats" in data:
        try:
            new_total_seats = int(data.get("totalSeats"))
        except (TypeError, ValueError):
            return jsonify({"message": "totalSeats must be a valid integer"}), 400
        if new_total_seats <= 0:
            return jsonify({"message": "totalSeats must be greater than zero"}), 400
        show.total_seats = new_total_seats

    if "showTime" in data and data.get("showTime"):
        show.show_time = data.get("showTime")

    db.session.commit()

    return jsonify({"message": "Show updated successfully"})


@app.route("/api/admin/shows/<int:show_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_show(current_user, show_id):
    show = Show.query.get_or_404(show_id)

    db.session.delete(show)
    db.session.commit()

    return jsonify({"message": "Show deleted successfully"})


# =========================
# ADMIN - USER MANAGEMENT
# =========================

@app.route("/api/admin/users", methods=["GET"])
@token_required
@admin_required
def get_users(current_user):
    users = User.query.all()

    return jsonify([
        {
            "id": user.id,
            "fullName": user.full_name,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ])


@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
@token_required
@admin_required
def update_user(current_user, user_id):
    user = User.query.get_or_404(user_id)
    data = get_json_data()

    if not data:
        return jsonify({"message": "No fields provided for update"}), 400

    new_email = data.get("email")
    if new_email and new_email != user.email:
        email_owner = User.query.filter_by(email=new_email).first()
        if email_owner and email_owner.id != user.id:
            return jsonify({"message": "Email already registered"}), 409

    user.full_name = data.get("fullName", user.full_name)
    user.email = data.get("email", user.email)
    user.role = data.get("role", user.role)

    db.session.commit()

    return jsonify({"message": "User updated successfully"})


@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@token_required
@admin_required
def delete_user(current_user, user_id):
    user = User.query.get_or_404(user_id)

    if user.role == "ADMIN":
        return jsonify({"message": "Admin user cannot be deleted"}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({"message": "User deleted successfully"})


# =========================
# USER - BOOKING
# =========================

@app.route("/api/bookings", methods=["POST"])
@token_required
def book_ticket(current_user):
    data = get_json_data()

    show_id = data.get("showId")
    seats_raw = data.get("seats")

    if show_id is None or seats_raw is None:
        return jsonify({"message": "showId and seats are required"}), 400

    try:
        seats = int(seats_raw)
    except (TypeError, ValueError):
        return jsonify({"message": "Seats must be a valid integer"}), 400

    show = Show.query.get_or_404(show_id)

    booked_seats = db.session.query(db.func.sum(Booking.seats)).filter_by(show_id=show_id).scalar()
    booked_seats = booked_seats if booked_seats else 0

    # Seat availability is derived from aggregate bookings, not a mutable counter.
    available_seats = show.total_seats - booked_seats

    if seats <= 0:
        return jsonify({"message": "Seats must be greater than zero"}), 400

    if seats > available_seats:
        return jsonify({"message": "Not enough seats available"}), 400

    total_amount = seats * show.price

    booking = Booking(
        user_id=current_user.id,
        show_id=show_id,
        seats=seats,
        total_amount=total_amount
    )

    db.session.add(booking)
    # Flush to get booking.id before creating a linked payment slip in the same transaction.
    db.session.flush()

    slip_number = f"SLIP-{booking.id}-{int(datetime.datetime.utcnow().timestamp())}"
    slip = PaymentSlip(
        booking_id=booking.id,
        user_id=current_user.id,
        slip_number=slip_number,
        amount=total_amount,
        payment_status="PAID"
    )

    db.session.add(slip)
    db.session.commit()

    return jsonify({
        "message": "Ticket booked successfully",
        "bookingId": booking.id,
        "paymentSlip": {
            "slipNumber": slip.slip_number,
            "amount": slip.amount,
            "status": slip.payment_status,
            "paidAt": slip.paid_at.strftime("%Y-%m-%d %H:%M")
        }
    }), 201


@app.route("/api/my-bookings", methods=["GET"])
@token_required
def my_bookings(current_user):
    bookings = Booking.query.filter_by(user_id=current_user.id).all()

    return jsonify([
        {
            "id": booking.id,
            "movieTitle": booking.show.movie.title,
            "theaterName": booking.show.theater.name,
            "city": booking.show.theater.city,
            "showTime": booking.show.show_time,
            "seats": booking.seats,
            "totalAmount": booking.total_amount,
            "bookingDate": booking.booking_date.strftime("%Y-%m-%d %H:%M"),
            "moviePosterUrl": booking.show.movie.poster_url
        }
        for booking in bookings
    ])


@app.route("/api/my-payment-slips", methods=["GET"])
@token_required
def my_payment_slips(current_user):
    slips = PaymentSlip.query.filter_by(user_id=current_user.id).order_by(PaymentSlip.paid_at.desc()).all()

    return jsonify([
        {
            "id": slip.id,
            "slipNumber": slip.slip_number,
            "bookingId": slip.booking_id,
            "amount": slip.amount,
            "paymentStatus": slip.payment_status,
            "paidAt": slip.paid_at.strftime("%Y-%m-%d %H:%M"),
            "movieTitle": slip.booking.show.movie.title,
            "theaterName": slip.booking.show.theater.name,
            "showTime": slip.booking.show.show_time,
            "seats": slip.booking.seats,
            "moviePosterUrl": slip.booking.show.movie.poster_url
        }
        for slip in slips
    ])


@app.route("/api/bookings/<int:booking_id>", methods=["DELETE"])
@token_required
def cancel_booking(current_user, booking_id):
    booking = Booking.query.get_or_404(booking_id)

    if booking.user_id != current_user.id and current_user.role != "ADMIN":
        return jsonify({"message": "You cannot cancel this booking"}), 403

    # Delete linked payment slip first to preserve referential integrity.
    slip = PaymentSlip.query.filter_by(booking_id=booking.id).first()
    if slip:
        db.session.delete(slip)

    db.session.delete(booking)
    db.session.commit()

    return jsonify({"message": "Booking cancelled successfully"})


# =========================
# DATABASE SEED
# =========================

def seed_data():
    admin = User.query.filter_by(email="admin@movie.com").first()

    if not admin:
        admin_user = User(
            full_name="Admin User",
            email="admin@movie.com",
            password=generate_password_hash("admin123"),
            role="ADMIN"
        )

        db.session.add(admin_user)
        db.session.commit()

    if Movie.query.count() == 0:
        movie1 = Movie(
            title="Vikram",
            language="Tamil",
            genre="Action",
            duration="2h 54m",
            description="Action thriller movie"
        )

        movie2 = Movie(
            title="RRR",
            language="Telugu",
            genre="Action Drama",
            duration="3h 2m",
            description="Historical action drama"
        )

        db.session.add_all([movie1, movie2])
        db.session.commit()

    if Theater.query.count() == 0:
        theater1 = Theater(
            name="PVR Cinemas",
            city="Chennai",
            address="Phoenix Marketcity, Velachery"
        )

        theater2 = Theater(
            name="INOX",
            city="Chennai",
            address="Marina Mall"
        )

        db.session.add_all([theater1, theater2])
        db.session.commit()

    if Show.query.count() == 0:
        show1 = Show(
            movie_id=1,
            theater_id=1,
            show_time="2026-07-01 06:30 PM",
            price=180,
            total_seats=100
        )

        show2 = Show(
            movie_id=2,
            theater_id=2,
            show_time="2026-07-01 09:30 PM",
            price=220,
            total_seats=120
        )

        db.session.add_all([show1, show2])
        db.session.commit()


with app.app_context():
    db.create_all()
    # Apply minimal schema changes before seed data for existing databases.
    ensure_schema_updates()
    seed_data()


if __name__ == "__main__":
    app.run(debug=True)