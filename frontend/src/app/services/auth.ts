import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class Auth {
  private tokenKey = 'taskmanager-token';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return sessionStorage.getItem(this.tokenKey);
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string; expiresAt: string }>(
      'http://localhost:5218/api/auth/login', { username, password }
    ).pipe(tap(response => sessionStorage.setItem(this.tokenKey, response.token)));
  }

  logout(): void {
    sessionStorage.removeItem(this.tokenKey);
  }
}
