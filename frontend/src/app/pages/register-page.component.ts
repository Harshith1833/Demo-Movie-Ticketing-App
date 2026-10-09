import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="shell">
      <div class="card">
        <img src="/ticketnow-logo.svg" alt="TicketNow logo" class="logo" />
        <h1>Create Account</h1>
        <p>Book your movie tickets in minutes.</p>

        <form (ngSubmit)="register()">
          <label>Full Name</label>
          <input [(ngModel)]="fullName" name="fullName" required />

          <label>Email</label>
          <input [(ngModel)]="email" name="email" type="email" required />

          <label>Password</label>
          <input [(ngModel)]="password" name="password" type="password" required />

          <button type="submit" [disabled]="loading">{{ loading ? 'Creating...' : 'Register' }}</button>
        </form>

        <p class="err" *ngIf="error">{{ error }}</p>
        <p class="ok" *ngIf="message">{{ message }}</p>

        <a routerLink="/login">Back to login</a>
      </div>
    </section>
  `,
  styles: [
    `
      .shell {
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: linear-gradient(145deg, #f6f1e8, #ddeaf7);
        padding: 24px;
      }
      .card {
        width: min(420px, 100%);
        background: #ffffffee;
        border: 1px solid #d20a2e55;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 14px 30px #d20a2e1f;
      }
      .logo {
        width: 220px;
        max-width: 100%;
        display: block;
        margin: 0 auto 12px;
      }
      h1 { margin: 0; color: #d20a2e; text-align: center; }
      p { text-align: center; }
      form { display: grid; gap: 8px; }
      input {
        border: 1px solid #d20a2e66;
        border-radius: 10px;
        padding: 10px;
      }
      button {
        margin-top: 8px;
        border: 1px solid #d20a2e;
        border-radius: 10px;
        padding: 11px;
        cursor: pointer;
        background: #d20a2e;
        color: #ffffff;
      }
      .err { color: #a11; }
      .ok { color: #14673a; }
      a { color: #d20a2e; }
    `
  ]
})
export class RegisterPageComponent {
  fullName = '';
  email = '';
  password = '';
  error = '';
  message = '';
  loading = false;

  constructor(private readonly api: ApiService, private readonly router: Router) {}

  register(): void {
    this.error = '';
    this.message = '';
    this.loading = true;

    this.api.register({ fullName: this.fullName, email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        this.message = res?.message ?? 'Registered successfully';
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message ?? 'Registration failed';
      }
    });
  }
}
