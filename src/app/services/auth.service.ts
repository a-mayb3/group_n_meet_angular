import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { UserBase } from '../models/user.model';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email_address: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  user: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private isAuthenticatedSubject!: BehaviorSubject<boolean>;
  private currentUserSubject!: BehaviorSubject<UserBase | null>;

  currentUser$!: Observable<UserBase | null>;

  isAuthenticated$!: Observable<boolean>;

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
  ) {
    // Initialize subject after injected services are available
    this.isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
    this.isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
    this.currentUserSubject = new BehaviorSubject<UserBase | null>(null);
    this.currentUser$ = this.currentUserSubject.asObservable();
    this.checkTokenValidity();
  }

  /**
   * Login user with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return new Observable((observer) => {
      this.http
        .post<LoginResponse>(`${environment.apiUrl}/auth/login`, credentials, {
          observe: 'response' as const,
          withCredentials: true,
        })
        .subscribe({
          next: (resp) => {
            const body = resp.body as LoginResponse | null;
            // If server returns tokens in body, store them; otherwise server likely set httpOnly cookie
            if (body && body.access_token) {
              this.setTokens(body.access_token, body.refresh_token);
            }
            // Consider 2xx responses as successful authentication
            if (resp.status >= 200 && resp.status < 300) {
              this.isAuthenticatedSubject.next(true);
              // try to populate current user after successful login
              this.loadCurrentUser().subscribe();
            }
            observer.next(body as any);
            observer.complete();
          },
          error: (error) => observer.error(error),
        });
    });
  }

  /**
   * Register new user
   */
  register(data: any): Observable<LoginResponse> {
    return new Observable((observer) => {
      this.http
        .post<LoginResponse>(`${environment.apiUrl}/auth/register`, data, {
          observe: 'response' as const,
          withCredentials: true,
        })
        .subscribe({
          next: (resp) => {
            const body = resp.body as LoginResponse | null;
            if (body && body.access_token) {
              this.setTokens(body.access_token, body.refresh_token);
            }
            if (resp.status >= 200 && resp.status < 300) {
              this.isAuthenticatedSubject.next(true);
            }
            observer.next(body as any);
            observer.complete();
          },
          error: (error) => observer.error(error),
        });
    });
  }

  /**
   * Logout user and clear tokens
   */
  logout(): Observable<any> {
    return new Observable((observer) => {
      this.http
        .post(
          `${environment.apiUrl}/auth/logout`,
          {},
          { observe: 'response' as const, withCredentials: true },
        )
        .subscribe({
          next: (resp) => {
            this.clearTokens();
            this.isAuthenticatedSubject.next(false);
            observer.next(resp.body);
            observer.complete();
          },
          error: (error) => {
            this.clearTokens();
            this.isAuthenticatedSubject.next(false);
            observer.error(error);
          },
        });
    });
  }

  /**
   * Refresh access token using refresh token
   */
  refreshToken(): Observable<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    return new Observable((observer) => {
      this.http
        .post<LoginResponse>(
          `${environment.apiUrl}/auth/refresh`,
          { refresh_token: refreshToken },
          { observe: 'response' as const, withCredentials: true },
        )
        .subscribe({
          next: (resp) => {
            const body = resp.body as LoginResponse | null;
            if (body && body.access_token) {
              this.setTokens(body.access_token, body.refresh_token);
              // refresh succeeded, repopulate current user if available
              this.loadCurrentUser().subscribe(() => {
                observer.next(body);
                observer.complete();
              }, (err) => {
                observer.next(body);
                observer.complete();
              });
            } else {
              // No tokens returned -> treat as failure
              this.clearTokens();
              this.isAuthenticatedSubject.next(false);
              observer.error(new Error('No token in refresh response'));
            }
          },
          error: (error) => {
            this.clearTokens();
            this.isAuthenticatedSubject.next(false);
            observer.error(error);
          },
        });
    });
  }

  /**
   * Load the current user from the backend `/me/` endpoint and update `currentUserSubject`.
   * Returns an observable resolving to the user object or null on failure.
   */
  loadCurrentUser(): Observable<UserBase | null> {
    return this.http
      .get<any>(`${environment.apiUrl}/me/`, { withCredentials: true })
      .pipe(
        map((body) => {
          const user = (body && (body.data ?? body.user)) ?? body;
          if (user && user.email_address) {
            this.currentUserSubject.next(user as UserBase);
            return user as UserBase;
          }
          this.currentUserSubject.next(null);
          return null;
        }),
        catchError(() => {
          this.currentUserSubject.next(null);
          return of(null);
        }),
      );
  }

  /**
   * Store tokens in cookies
   */
  private setTokens(accessToken: string, refreshToken?: string): void {
    this.cookieService.set(this.TOKEN_KEY, accessToken, {
      secure: environment.production,
      sameSite: 'Strict',
      path: '/',
    });

    if (refreshToken) {
      this.cookieService.set(this.REFRESH_TOKEN_KEY, refreshToken, {
        secure: environment.production,
        sameSite: 'Strict',
        path: '/',
      });
    }
  }

  /**
   * Get access token from cookies
   */
  getToken(): string {
    return this.cookieService.get(this.TOKEN_KEY);
  }

  /**
   * Get refresh token from cookies
   */
  getRefreshToken(): string {
    return this.cookieService.get(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Check if user has valid token
   */
  hasToken(): boolean {
    return this.cookieService.check(this.TOKEN_KEY);
  }

  /**
   * Clear all authentication tokens
   */
  private clearTokens(): void {
    this.cookieService.delete(this.TOKEN_KEY, '/');
    this.cookieService.delete(this.REFRESH_TOKEN_KEY, '/');
  }

  /**
   * Check if token is still valid (basic check)
   */
  private checkTokenValidity(): void {
    const token = this.getToken();
    if (token && this.isTokenExpired(token)) {
      this.clearTokens();
      this.isAuthenticatedSubject.next(false);
    }
  }

  /**
   * Check if JWT token is expired
   */
  private isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);
      const currentTime = Math.floor(Date.now() / 1000);
      return decoded.exp < currentTime;
    } catch {
      return true;
    }
  }

  /**
   * Decode JWT token payload (basic decoding without verification)
   */
  private decodeToken(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token');
    }

    const decoded = JSON.parse(atob(parts[1]));
    return decoded;
  }

  /**
   * Get current authentication status
   */
  isAuthenticated(): boolean {
    // Prefer in-memory state (set on successful login) so guards work immediately.
    try {
      if (this.isAuthenticatedSubject) {
        return this.isAuthenticatedSubject.getValue();
      }
    } catch {
      // ignore and fall back
    }

    // Fallback to cookie presence (works when tokens are readable)
    return this.hasToken();
  }

  /**
   * Perform a session check against the backend. Use this on app startup
   * to determine whether an httpOnly cookie session already exists.
   * Resolves to `true` when a valid session is present.
   */
  checkSession(): Observable<boolean> {
    return this.http
      .get<any>(`${environment.apiUrl}/me/`, {
        observe: 'response' as const,
        withCredentials: true,
      })
      .pipe(
        map((resp) => {
          const body = resp.body as any | null;
          if (resp.status >= 200 && resp.status < 300) {
            if (body && body.access_token) {
              this.setTokens(body.access_token, body.refresh_token);
            }
            // populate current user if returned
            const user = (body && (body.data ?? body.user)) ?? body;
            if (user && user.email_address) {
              this.currentUserSubject.next(user as UserBase);
            }
            this.isAuthenticatedSubject.next(true);
            return true;
          }
          this.clearTokens();
          this.isAuthenticatedSubject.next(false);
          return false;
        }),
        catchError(() => {
          this.clearTokens();
          this.isAuthenticatedSubject.next(false);
          return of(false);
        }),
      );
  }
}
