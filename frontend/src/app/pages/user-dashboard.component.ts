import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="user-shell">
      <header class="top-nav">
        <img src="/ticketnow-logo.svg" alt="TicketNow logo" class="logo" />
        <div class="brand">
          <h1>TicketNow User</h1>
          <p>Explore shows, bookings, and slips.</p>
        </div>

        <nav class="nav-group">
          <button class="nav-btn" [class.active]="activeSection === 'shows'" (click)="setSection('shows')">Available Shows</button>
          <button class="nav-btn" [class.active]="activeSection === 'bookings'" (click)="setSection('bookings')">My Bookings</button>
          <button class="nav-btn" [class.active]="activeSection === 'slips'" (click)="setSection('slips')">Payment Slips</button>
        </nav>

        <button class="logout" (click)="logout()">Logout</button>
      </header>

      <main class="content-panel">
        <header class="top-header">
          <h2>Dashboard Overview</h2>
          <p>All your TicketNow actions and details at the top.</p>
        </header>

        <div class="summary-cards">
          <article>
            <h4>Shows</h4>
            <strong>{{ shows.length }}</strong>
          </article>
          <article>
            <h4>Bookings</h4>
            <strong>{{ bookings.length }}</strong>
          </article>
          <article>
            <h4>Payment Slips</h4>
            <strong>{{ slips.length }}</strong>
          </article>
        </div>

        <p class="msg" *ngIf="message">{{ message }}</p>
        <p class="err" *ngIf="error">{{ error }}</p>

        <article class="module shows-module" *ngIf="activeSection === 'shows'">
          <h3>Available Shows</h3>
          <ul>
            <li *ngFor="let show of shows">
              <div class="row-left">
                <img [src]="imageUrl(show.moviePosterUrl)" alt="Movie poster" class="thumb" />
                <div>
                  <strong>{{ show.movieTitle }}</strong>
                  <p>{{ show.theaterName }} | {{ show.showTime }}</p>
                  <p>Price: {{ show.price }} | Seats: {{ show.totalSeats }}</p>
                </div>
              </div>
              <div class="book">
                <input type="number" [(ngModel)]="seatSelection[show.id]" [name]="'seat' + show.id" min="1" placeholder="Seats" />
                <button (click)="book(show.id)">Book</button>
              </div>
            </li>
          </ul>
        </article>

        <article class="module" *ngIf="activeSection === 'bookings'">
          <h3>My Bookings</h3>
          <ul>
            <li *ngFor="let booking of bookings">
              <div class="row-left">
                <img [src]="imageUrl(booking.moviePosterUrl)" alt="Movie poster" class="thumb" />
                <div>
                  <strong>{{ booking.movieTitle }}</strong>
                  <p>{{ booking.theaterName }} | {{ booking.showTime }}</p>
                  <p>Seats: {{ booking.seats }} | Amount: {{ booking.totalAmount }}</p>
                </div>
              </div>
              <button (click)="cancel(booking.id)">Cancel</button>
            </li>
          </ul>
        </article>

        <article class="module" *ngIf="activeSection === 'slips'">
          <h3>My Payment Slips</h3>
          <ul>
            <li *ngFor="let slip of slips">
              <div class="row-left">
                <img [src]="imageUrl(slip.moviePosterUrl)" alt="Movie poster" class="thumb" />
                <div>
                  <strong>{{ slip.slipNumber }}</strong>
                  <p>{{ slip.movieTitle }} | {{ slip.showTime }}</p>
                  <p>Seats: {{ slip.seats }} | Amount: {{ slip.amount }} | {{ slip.paymentStatus }}</p>
                  <p>Paid at: {{ slip.paidAt }}</p>
                </div>
              </div>
            </li>
          </ul>
        </article>
      </main>
    </section>
  `,
  styles: [
    `
      .user-shell {
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
      .shows-module {
        padding: 22px;
      }
      .module h3 {
        margin-top: 0;
        color: #d20a2e;
      }
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 62vh;
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
      .shows-module li {
        padding: 14px 0;
      }
      .row-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .row-left p {
        margin: 2px 0 0;
        color: #603640;
        font-size: 14px;
      }
      .thumb {
        width: 86px;
        height: 118px;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #d20a2e44;
      }
      .shows-module .thumb {
        width: 104px;
        height: 144px;
      }
      .book {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }
      input {
        border: 1px solid #d20a2e66;
        border-radius: 8px;
        padding: 8px;
        width: 90px;
      }
      button {
        border: 1px solid #d20a2e;
        border-radius: 8px;
        background: #d20a2e;
        color: #ffffff;
        padding: 8px 10px;
        cursor: pointer;
      }
      .msg { color: #0f6a3b; }
      .err { color: #b00020; }
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
      }
    `
  ]
})
export class UserDashboardComponent implements OnInit {
  readonly backendBaseUrl = 'http://127.0.0.1:5000';

  shows: any[] = [];
  bookings: any[] = [];
  slips: any[] = [];
  seatSelection: Record<number, number> = {};
  activeSection: 'shows' | 'bookings' | 'slips' = 'shows';

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

  setSection(section: 'shows' | 'bookings' | 'slips'): void {
    this.activeSection = section;
  }

  imageUrl(path: string | null | undefined): string {
    return path ? `${this.backendBaseUrl}${path}` : '/poster-placeholder.svg';
  }

  loadAll(): void {
    this.api.getShows().subscribe((res) => (this.shows = res ?? []));
    this.api.myBookings(this.token).subscribe({
      next: (res) => (this.bookings = res ?? []),
      error: (err) => this.setError(err?.error?.message ?? 'Failed to load bookings')
    });
    this.api.myPaymentSlips(this.token).subscribe({
      next: (res) => (this.slips = res ?? []),
      error: (err) => this.setError(err?.error?.message ?? 'Failed to load payment slips')
    });
  }

  book(showId: number): void {
    const seats = Number(this.seatSelection[showId] ?? 1);
    this.api.bookTicket(this.token, { showId, seats }).subscribe({
      next: (res) => {
        this.setMessage(`${res?.message ?? 'Ticket booked'} | Slip: ${res?.paymentSlip?.slipNumber ?? 'N/A'}`);
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Booking failed')
    });
  }

  cancel(bookingId: number): void {
    this.api.cancelBooking(this.token, bookingId).subscribe({
      next: (res) => {
        this.setMessage(res?.message ?? 'Booking cancelled');
        this.loadAll();
      },
      error: (err) => this.setError(err?.error?.message ?? 'Cancel failed')
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
