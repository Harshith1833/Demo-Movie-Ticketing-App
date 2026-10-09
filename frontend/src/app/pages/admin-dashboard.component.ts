import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="admin-shell">
      <header class="top-nav">
        <img src="/ticketnow-logo.svg" alt="TicketNow logo" class="logo" />
        <div class="brand">
          <h1>TicketNow Admin</h1>
          <p>Organize content in separate modules.</p>
        </div>

        <nav class="nav-group">
          <button class="nav-btn" [class.active]="activeSection === 'movies'" (click)="setSection('movies')">Movies</button>
          <button class="nav-btn" [class.active]="activeSection === 'theaters'" (click)="setSection('theaters')">Theaters</button>
          <button class="nav-btn" [class.active]="activeSection === 'shows'" (click)="setSection('shows')">Shows</button>
          <button class="nav-btn" [class.active]="activeSection === 'users'" (click)="setSection('users')">Users</button>
        </nav>

        <button class="logout" (click)="logout()">Logout</button>
      </header>

      <main class="content-panel">
        <header class="top-header">
          <h2>Dashboard Overview</h2>
          <p>TicketNow control center for movies, theaters, shows, and users.</p>
        </header>

        <div class="summary-cards">
          <article>
            <h4>Movies</h4>
            <strong>{{ movies.length }}</strong>
          </article>
          <article>
            <h4>Theaters</h4>
            <strong>{{ theaters.length }}</strong>
          </article>
          <article>
            <h4>Shows</h4>
            <strong>{{ shows.length }}</strong>
          </article>
          <article>
            <h4>Users</h4>
            <strong>{{ users.length }}</strong>
          </article>
        </div>

        <p class="msg" *ngIf="message">{{ message }}</p>
        <p class="err" *ngIf="error">{{ error }}</p>

        <article class="module" *ngIf="activeSection === 'movies'">
          <h3>Movies</h3>
          <form (ngSubmit)="addMovie()">
            <input [(ngModel)]="movieForm.title" name="mTitle" placeholder="Title" required />
            <input [(ngModel)]="movieForm.language" name="mLang" placeholder="Language" required />
            <input [(ngModel)]="movieForm.genre" name="mGenre" placeholder="Genre" required />
            <input [(ngModel)]="movieForm.duration" name="mDur" placeholder="Duration" required />
            <textarea [(ngModel)]="movieForm.description" name="mDesc" placeholder="Description"></textarea>
            <label class="file-label">Poster Image (optional)
              <input type="file" accept="image/*" (change)="onMoviePosterSelected($event)" />
            </label>
            <button type="submit">Save Movie</button>
          </form>
          <ul>
            <li *ngFor="let movie of movies">
              <div class="row-left">
                <img [src]="imageUrl(movie.posterUrl)" alt="Movie poster" class="thumb" />
                <div>
                  <strong>{{ movie.title }}</strong>
                  <p>{{ movie.language }} | {{ movie.genre }} | {{ movie.duration }}</p>
                </div>
              </div>
              <div class="row-actions">
                <input type="file" accept="image/*" (change)="onPosterFileForMovie(movie.id, $event)" />
                <button (click)="uploadPoster(movie.id)">Upload Image</button>
                <button (click)="editMovie(movie)">Edit</button>
                <button (click)="deleteMovie(movie.id)">Delete</button>
              </div>
            </li>
          </ul>
        </article>

        <article class="module" *ngIf="activeSection === 'theaters'">
          <h3>Theaters</h3>
          <form (ngSubmit)="addTheater()">
            <input [(ngModel)]="theaterForm.name" name="tName" placeholder="Name" required />
            <input [(ngModel)]="theaterForm.city" name="tCity" placeholder="City" required />
            <input [(ngModel)]="theaterForm.address" name="tAddress" placeholder="Address" required />
            <button type="submit">Save Theater</button>
          </form>
          <ul>
            <li *ngFor="let theater of theaters">
              <span>{{ theater.name }} - {{ theater.city }}</span>
              <div class="row-actions">
                <button (click)="editTheater(theater)">Edit</button>
                <button (click)="deleteTheater(theater.id)">Delete</button>
              </div>
            </li>
          </ul>
        </article>

        <article class="module" *ngIf="activeSection === 'shows'">
          <h3>Shows</h3>
          <form (ngSubmit)="addShow()">
            <input [(ngModel)]="showForm.movieId" name="sMovieId" type="number" placeholder="Movie ID" required />
            <input [(ngModel)]="showForm.theaterId" name="sTheaterId" type="number" placeholder="Theater ID" required />
            <input [(ngModel)]="showForm.showTime" name="sTime" placeholder="YYYY-MM-DD HH:MM AM/PM" required />
            <input [(ngModel)]="showForm.price" name="sPrice" type="number" placeholder="Price" required />
            <input [(ngModel)]="showForm.totalSeats" name="sSeats" type="number" placeholder="Total Seats" required />
            <button type="submit">Save Show</button>
          </form>
          <ul>
            <li *ngFor="let show of shows">
              <div class="row-left">
                <img [src]="imageUrl(show.moviePosterUrl)" alt="Movie poster" class="thumb" />
                <div>
                  <strong>#{{ show.id }} {{ show.movieTitle }}</strong>
                  <p>{{ show.theaterName }} | {{ show.showTime }}</p>
                </div>
              </div>
              <div class="row-actions">
                <button (click)="editShow(show)">Edit</button>
                <button (click)="deleteShow(show.id)">Delete</button>
              </div>
            </li>
          </ul>
        </article>

        <article class="module" *ngIf="activeSection === 'users'">
          <h3>Users</h3>
          <ul>
            <li *ngFor="let user of users">
              <span>{{ user.fullName }} - {{ user.email }} ({{ user.role }})</span>
              <div class="row-actions">
                <button (click)="editUser(user)">Edit</button>
                <button (click)="deleteUser(user.id)">Delete</button>
              </div>
            </li>
          </ul>
        </article>
      </main>
    </section>
  `,
  styles: [
    `
      .admin-shell {
        min-height: 100vh;
        background: #ffffff;
      }
      .top-nav {
        background: #d20a2e;
        color: #ffffff;
        padding: 14px 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
      }
      .logo {
        width: 180px;
        max-width: 100%;
        background: #fff;
        border-radius: 10px;
        padding: 4px;
      }
      .brand h1 {
        margin: 0;
      }
      .brand p {
        margin: 2px 0 0;
        opacity: 0.92;
        font-size: 13px;
      }
      .nav-group {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .nav-btn,
      .logout {
        border: 1px solid #ffffff88;
        background: transparent;
        color: #ffffff;
        border-radius: 10px;
        padding: 10px 12px;
        cursor: pointer;
      }
      .nav-btn.active,
      .nav-btn:hover,
      .logout:hover {
        background: #ffffff;
        color: #d20a2e;
      }
      .logout {
        margin-left: auto;
      }
      .content-panel {
        padding: 26px;
        background: linear-gradient(165deg, #ffffff 0%, #fff5f7 100%);
      }
      .top-header h2 {
        margin: 0;
        color: #d20a2e;
      }
      .top-header p {
        margin: 6px 0 14px;
        color: #5a2a35;
      }
      .summary-cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
        margin-bottom: 16px;
      }
      .summary-cards article {
        background: #ffffff;
        border: 1px solid #d20a2e33;
        border-radius: 12px;
        padding: 12px;
      }
      .summary-cards h4 {
        margin: 0;
        color: #762130;
        font-size: 13px;
      }
      .summary-cards strong {
        color: #d20a2e;
        font-size: 30px;
      }
      .module {
        background: #ffffff;
        border: 1px solid #d20a2e33;
        border-radius: 14px;
        padding: 16px;
        box-shadow: 0 10px 28px #d20a2e12;
      }
      .module h3 {
        margin-top: 0;
        color: #d20a2e;
      }
      form {
        display: grid;
        gap: 8px;
        margin-bottom: 10px;
      }
      input,
      textarea {
        border: 1px solid #d20a2e66;
        border-radius: 8px;
        padding: 9px;
      }
      .file-label {
        display: grid;
        gap: 6px;
        color: #7a2d3b;
      }
      button {
        border: 1px solid #d20a2e;
        border-radius: 8px;
        background: #d20a2e;
        color: #ffffff;
        padding: 7px 10px;
        cursor: pointer;
      }
      .msg { color: #0f6a3b; }
      .err { color: #b00020; }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 58vh;
        overflow: auto;
      }
      li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        border-top: 1px solid #d20a2e1f;
        padding: 10px 0;
      }
      .row-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .row-left p {
        margin: 2px 0 0;
        color: #603640;
        font-size: 13px;
      }
      .thumb {
        width: 86px;
        height: 118px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #d20a2e44;
      }
      .row-actions {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .row-actions input[type='file'] {
        width: 190px;
      }
      @media (max-width: 1100px) {
        .top-nav {
          align-items: flex-start;
        }
        .logout {
          margin-left: 0;
        }
        li {
          flex-direction: column;
          align-items: flex-start;
        }
        .row-actions {
          flex-wrap: wrap;
        }
      }
    `
  ]
})
export class AdminDashboardComponent implements OnInit {
  readonly backendBaseUrl = 'http://127.0.0.1:5000';

  movies: any[] = [];
  theaters: any[] = [];
  shows: any[] = [];
  users: any[] = [];

  movieForm: any = { title: '', language: '', genre: '', duration: '', description: '' };
  theaterForm: any = { name: '', city: '', address: '' };
  showForm: any = { movieId: 0, theaterId: 0, showTime: '', price: 0, totalSeats: 0 };

  activeSection: 'movies' | 'theaters' | 'shows' | 'users' = 'movies';
  selectedMoviePoster: File | null = null;
  rowPosterFiles: Record<number, File | null> = {};

  message = '';
  error = '';

  constructor(
    private readonly api: ApiService,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  get token(): string {
    return this.auth.getToken();
  }

  setSection(section: 'movies' | 'theaters' | 'shows' | 'users'): void {
    this.activeSection = section;
  }

  imageUrl(path: string | null | undefined): string {
    return path ? `${this.backendBaseUrl}${path}` : '/poster-placeholder.svg';
  }

  onMoviePosterSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedMoviePoster = input.files?.[0] ?? null;
  }

  onPosterFileForMovie(movieId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.rowPosterFiles[movieId] = input.files?.[0] ?? null;
  }

  uploadPoster(movieId: number): void {
    const file = this.rowPosterFiles[movieId];
    if (!file) {
      this.setError('Please select an image before upload');
      return;
    }

    this.api.adminUploadMoviePoster(this.token, movieId, file).subscribe({
      next: () => {
        this.rowPosterFiles[movieId] = null;
        this.setMessage('Movie image uploaded');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to upload movie image')
    });
  }

  loadAll(): void {
    this.error = '';
    this.api.getMovies().subscribe((res) => (this.movies = res ?? []));
    this.api.getTheaters().subscribe((res) => (this.theaters = res ?? []));
    this.api.getShows().subscribe((res) => (this.shows = res ?? []));
    this.api.adminGetUsers(this.token).subscribe({
      next: (res) => (this.users = res ?? []),
      error: (err) => this.setError(err?.error?.message ?? 'Failed to load users')
    });
  }

  addMovie(): void {
    this.api.adminAddMovie(this.token, this.movieForm).subscribe({
      next: (res) => {
        const movieId = res?.movieId;

        const done = () => {
          this.movieForm = { title: '', language: '', genre: '', duration: '', description: '' };
          this.selectedMoviePoster = null;
          this.setMessage('Movie added');
          this.loadAll();
        };

        if (this.selectedMoviePoster && movieId) {
          this.api.adminUploadMoviePoster(this.token, movieId, this.selectedMoviePoster).subscribe({
            next: () => done(),
            error: (err) => this.setError(err?.error?.message ?? 'Movie saved but poster upload failed')
          });
          return;
        }

        done();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to add movie')
    });
  }

  editMovie(movie: any): void {
    const title = prompt('Movie title', movie.title);
    if (!title) {
      return;
    }
    this.api.adminUpdateMovie(this.token, movie.id, { title }).subscribe({
      next: () => {
        this.setMessage('Movie updated');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to update movie')
    });
  }

  deleteMovie(movieId: number): void {
    this.api.adminDeleteMovie(this.token, movieId).subscribe({
      next: () => {
        this.setMessage('Movie deleted');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to delete movie')
    });
  }

  addTheater(): void {
    this.api.adminAddTheater(this.token, this.theaterForm).subscribe({
      next: () => {
        this.theaterForm = { name: '', city: '', address: '' };
        this.setMessage('Theater added');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to add theater')
    });
  }

  editTheater(theater: any): void {
    const name = prompt('Theater name', theater.name);
    if (!name) {
      return;
    }
    this.api.adminUpdateTheater(this.token, theater.id, { name }).subscribe({
      next: () => {
        this.setMessage('Theater updated');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to update theater')
    });
  }

  deleteTheater(theaterId: number): void {
    this.api.adminDeleteTheater(this.token, theaterId).subscribe({
      next: () => {
        this.setMessage('Theater deleted');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to delete theater')
    });
  }

  addShow(): void {
    this.api.adminAddShow(this.token, this.showForm).subscribe({
      next: () => {
        this.showForm = { movieId: 0, theaterId: 0, showTime: '', price: 0, totalSeats: 0 };
        this.setMessage('Show added');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to add show')
    });
  }

  editShow(show: any): void {
    const showTime = prompt('Show time', show.showTime);
    if (!showTime) {
      return;
    }
    this.api.adminUpdateShow(this.token, show.id, { showTime }).subscribe({
      next: () => {
        this.setMessage('Show updated');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to update show')
    });
  }

  deleteShow(showId: number): void {
    this.api.adminDeleteShow(this.token, showId).subscribe({
      next: () => {
        this.setMessage('Show deleted');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to delete show')
    });
  }

  editUser(user: any): void {
    const role = prompt('Role (USER or ADMIN)', user.role);
    if (!role) {
      return;
    }
    this.api.adminUpdateUser(this.token, user.id, { role }).subscribe({
      next: () => {
        this.setMessage('User updated');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to update user')
    });
  }

  deleteUser(userId: number): void {
    this.api.adminDeleteUser(this.token, userId).subscribe({
      next: () => {
        this.setMessage('User deleted');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Failed to delete user')
    });
  }

  logout(): void {
    this.api.logout(this.token).subscribe({
      next: () => {
        this.auth.clearSession();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.auth.clearSession();
        this.router.navigate(['/login']);
      }
    });
  }

  private setMessage(message: string): void {
    this.message = message;
    this.error = '';
  }

  private setError(error: string): void {
    this.error = error;
    this.message = '';
  }
}
