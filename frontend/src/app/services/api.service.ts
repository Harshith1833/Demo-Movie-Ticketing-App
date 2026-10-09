import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = 'http://127.0.0.1:5001/api';

  constructor(private readonly http: HttpClient) {}

  register(payload: { fullName: string; email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/register`, payload);
  }

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/login`, payload);
  }

  logout(token: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/auth/logout`, {}, { headers: this.authHeaders(token) });
  }

  getMovies(): Observable<any> {
    return this.http.get(`${this.baseUrl}/movies`);
  }

  getTheaters(): Observable<any> {
    return this.http.get(`${this.baseUrl}/theaters`);
  }

  getShows(): Observable<any> {
    return this.http.get(`${this.baseUrl}/shows`);
  }

  adminGetUsers(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/users`, { headers: this.authHeaders(token) });
  }

  adminAddMovie(token: string, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/movies`, payload, { headers: this.authHeaders(token) });
  }

  adminUpdateMovie(token: string, movieId: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/movies/${movieId}`, payload, { headers: this.authHeaders(token) });
  }

  adminDeleteMovie(token: string, movieId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/movies/${movieId}`, { headers: this.authHeaders(token) });
  }

  adminUploadMoviePoster(token: string, movieId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('poster', file);
    return this.http.post(`${this.baseUrl}/admin/movies/${movieId}/poster`, formData, {
      headers: this.authHeaders(token)
    });
  }

  adminAddTheater(token: string, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/theaters`, payload, { headers: this.authHeaders(token) });
  }

  adminUpdateTheater(token: string, theaterId: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/theaters/${theaterId}`, payload, { headers: this.authHeaders(token) });
  }

  adminDeleteTheater(token: string, theaterId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/theaters/${theaterId}`, { headers: this.authHeaders(token) });
  }

  adminAddShow(token: string, payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/shows`, payload, { headers: this.authHeaders(token) });
  }

  adminUpdateShow(token: string, showId: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/shows/${showId}`, payload, { headers: this.authHeaders(token) });
  }

  adminDeleteShow(token: string, showId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/shows/${showId}`, { headers: this.authHeaders(token) });
  }

  adminUpdateUser(token: string, userId: number, payload: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/admin/users/${userId}`, payload, { headers: this.authHeaders(token) });
  }

  adminDeleteUser(token: string, userId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/admin/users/${userId}`, { headers: this.authHeaders(token) });
  }

  bookTicket(token: string, payload: { showId: number; seats: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/bookings`, payload, { headers: this.authHeaders(token) });
  }

  myBookings(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/my-bookings`, { headers: this.authHeaders(token) });
  }

  myPaymentSlips(token: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/my-payment-slips`, { headers: this.authHeaders(token) });
  }

  cancelBooking(token: string, bookingId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/bookings/${bookingId}`, { headers: this.authHeaders(token) });
  }

  private authHeaders(token: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
