import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import { Observable, BehaviorSubject, of, from } from 'rxjs';
import { map, catchError, switchMap, filter, take, defaultIfEmpty } from 'rxjs/operators';
import { UserBase } from '../models/user.model';
import { OrganizerGroupBase } from '../models/organizer-group.model';
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
              this.loadCurrentUser().subscribe(
                () => {
                  observer.next(body);
                  observer.complete();
                },
                (err) => {
                  observer.next(body);
                  observer.complete();
                },
              );
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
    return this.http.get<any>(`${environment.apiUrl}/me/`, { withCredentials: true }).pipe(
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
   * Check whether the current logged-in user owns the given event through org groups.
   */
  ownsEventThroughOrgGroups(
    event: any,
    currentUser: any = this.currentUserSubject.getValue(),
  ): boolean {
    const eventGroupIds = this.extractEventGroupIds(event);
    // eslint-disable-next-line no-console
    console.log('[AUTH] Event group IDs extracted:', eventGroupIds);
    if (!eventGroupIds.length) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] No event group IDs found, returning false');
      return false;
    }

    const userGroupIds = this.extractUserGroupIds(currentUser);
    // eslint-disable-next-line no-console
    console.log('[AUTH] User group IDs extracted:', userGroupIds);
    if (!userGroupIds.length) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] No user group IDs found, returning false');
      return false;
    }

    const result = eventGroupIds.some((groupId) => userGroupIds.includes(String(groupId)));
    // eslint-disable-next-line no-console
    console.log('[AUTH] Comparing:', { eventGroupIds, userGroupIds, result });
    return result;
  }

  /**
   * Check if user owns event by checking org group membership
   * Returns Observable<boolean> that fetches org group data if needed
   */
  ownsEventThroughOrgGroupsAsync(
    event: any,
    currentUser: any = this.currentUserSubject.getValue(),
  ): Observable<boolean> {
    if (!event || !currentUser) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] Missing event or currentUser');
      return of(false);
    }

    const eventGroupIds = this.extractEventGroupIds(event);
    // eslint-disable-next-line no-console
    console.log('[AUTH] Event group IDs extracted:', eventGroupIds);
    if (!eventGroupIds.length) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] No event group IDs found in event');
      return of(false);
    }

    // Check each event group to see if current user is a member
    return from(eventGroupIds).pipe(
      switchMap((groupId) => this.isCurrentUserMemberOfOrgGroup(groupId, currentUser)),
      filter((isMember) => isMember === true),
      take(1),
      map(() => true),
      defaultIfEmpty(false),
    );
  }

  /**
   * Check whether the current user is a member of a specific org group.
   */
  isCurrentUserMemberOfOrgGroup(
    group: OrganizerGroupBase | string | number | null | undefined,
    currentUser: any = this.currentUserSubject.getValue(),
  ): Observable<boolean> {
    if (!group || !currentUser) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] Missing group or currentUser');
      return of(false);
    }

    const groupId = this.extractEntityId(group);
    if (!groupId) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] Missing group id');
      return of(false);
    }

    const currentUserId = this.extractEntityId(currentUser);
    if (!currentUserId) {
      // eslint-disable-next-line no-console
      console.log('[AUTH] Missing current user id');
      return of(false);
    }

    // eslint-disable-next-line no-console
    console.log('[AUTH] Checking membership in org group:', groupId);
    return this.http
      .get<any>(`${environment.apiUrl}/org/${groupId}`, {
        withCredentials: true,
      })
      .pipe(
        map((resp) => (resp as any)?.data ?? resp),
        map((payload) => (Array.isArray(payload) ? (payload[0] ?? null) : (payload ?? null))),
        map((groupObj) => {
          // eslint-disable-next-line no-console
          console.log('[AUTH] Fetched org group:', groupObj);
          const memberIds = this.extractOrgGroupMemberIds(groupObj);
          // eslint-disable-next-line no-console
          console.log('[AUTH] Org group member IDs:', memberIds);

          const isMember = memberIds.includes(String(currentUserId));
          // eslint-disable-next-line no-console
          console.log('[AUTH] Is current user a member?', isMember);
          return isMember;
        }),
        catchError((err) => {
          // eslint-disable-next-line no-console
          console.warn('[AUTH] Failed to fetch org group:', err);
          return of(false);
        }),
      );
  }

  private extractEventGroupIds(event: any): string[] {
    const ids = new Set<string>();
    const candidates = [
      event?.organizer_group_id,
      event?.group_id,
      event?.organizer_id,
      event?.organizer_group,
      event?.group,
      event?.organizer,
    ];

    // eslint-disable-next-line no-console
    console.log('[AUTH] extractEventGroupIds - checking event:', {
      organizer_group_id: event?.organizer_group_id,
      group_id: event?.group_id,
      organizer_id: event?.organizer_id,
      organizer_group: event?.organizer_group,
      group: event?.group,
      organizer: event?.organizer,
    });

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          const id = this.extractEntityId(item);
          if (id) ids.add(String(id));
        }
        continue;
      }

      if (candidate && typeof candidate === 'object') {
        const id = this.extractEntityId(candidate);
        if (id) ids.add(String(id));
        continue;
      }

      if (candidate != null && candidate !== '') {
        ids.add(String(candidate));
      }
    }

    // eslint-disable-next-line no-console
    console.log('[AUTH] extractEventGroupIds - result:', Array.from(ids));
    return Array.from(ids);
  }

  private extractUserGroupIds(user: any): string[] {
    const ids = new Set<string>();
    const candidates = [
      user?.organizer_groups,
      user?.org_groups,
      user?.groups,
      user?.group_ids,
      user?.organizer_group_ids,
      user?.member_groups,
      user?.owned_groups,
    ];

    // eslint-disable-next-line no-console
    console.log('[AUTH] extractUserGroupIds - checking user:', {
      organizer_groups: user?.organizer_groups,
      org_groups: user?.org_groups,
      groups: user?.groups,
      group_ids: user?.group_ids,
      organizer_group_ids: user?.organizer_group_ids,
      member_groups: user?.member_groups,
      owned_groups: user?.owned_groups,
    });

    const addCandidate = (candidate: any): void => {
      if (Array.isArray(candidate)) {
        candidate.forEach((item) => addCandidate(item));
        return;
      }

      if (candidate && typeof candidate === 'object') {
        const id = this.extractEntityId(candidate);
        if (id) ids.add(String(id));
        return;
      }

      if (candidate != null && candidate !== '') {
        ids.add(String(candidate));
      }
    };

    candidates.forEach((candidate) => addCandidate(candidate));
    // eslint-disable-next-line no-console
    console.log('[AUTH] extractUserGroupIds - result:', Array.from(ids));
    return Array.from(ids);
  }

  private extractOrgGroupMemberIds(group: any): string[] {
    const ids = new Set<string>();
    const candidates = [
      group?.members,
      group?.group_members,
      group?.member_ids,
      group?.users,
      group?.user_ids,
      group?.organizer_group_members,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        for (const item of candidate) {
          const id = this.extractEntityId(item);
          if (id) ids.add(String(id));
        }
        continue;
      }

      if (candidate && typeof candidate === 'object') {
        const id = this.extractEntityId(candidate);
        if (id) ids.add(String(id));
        continue;
      }

      if (candidate != null && candidate !== '') {
        ids.add(String(candidate));
      }
    }

    return Array.from(ids);
  }

  private extractEntityId(entity: any): string | null {
    if (entity == null) return null;
    if (typeof entity === 'string' || typeof entity === 'number') {
      return String(entity);
    }
    return (
      entity?.id ??
      entity?.pk ??
      entity?._id ??
      entity?.group_id ??
      entity?.user_id ??
      entity?.profile_id ??
      null
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
