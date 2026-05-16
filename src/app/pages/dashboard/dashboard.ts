import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { timeout, take } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { UserBase } from '../../models/user.model';
import { RsvpCardComponent } from '../../rsvp-card/rsvp-card';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RsvpCardComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit {
  user?: UserBase;
  loading = false;
  error = '';
  rsvps: any[] = [];
  rsvpsLoading = false;
  rsvpsError = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.loading = true;

    const routeData = (this.route.snapshot && (this.route.snapshot.data as any)) ?? null;
    const rsvpsResolved = !!(routeData && routeData['rsvps']);
    if (rsvpsResolved) {
      this.rsvps = routeData['rsvps'];
      this.rsvpsLoading = false;
    }

    // If resolver provided dashboard user, use it immediately
    const resolved =
      (this.route.snapshot && (this.route.snapshot.data as any)?.['dashboardUser']) ?? null;
    if (resolved) {
      this.user = resolved;
      this.loading = false;
      if (!rsvpsResolved) this.fetchRsvps();
      return;
    }

    // First check if AuthService already has a user (from APP_INITIALIZER or earlier login)
    this.auth.currentUser$.pipe(take(1)).subscribe((user) => {
      if (user) {
        this.user = user;
        this.loading = false;
        if (!rsvpsResolved) this.fetchRsvps();
      } else {
        // Fallback: try to load user directly
        this.loadUser();
      }
    });

    // Keep UI in sync if current user is set later (e.g., after login)
    this.auth.currentUser$.subscribe((user) => {
      if (user) {
        this.user = user;
        this.loading = false;
        if (!rsvpsResolved) this.fetchRsvps();
      }
    });

    // Also listen for resolver updates (future navigations)
    this.route.data.subscribe((data) => {
      if (data && data['dashboardUser']) {
        this.user = data['dashboardUser'];
        this.loading = false;
      }
      if (data && data['rsvps']) {
        this.rsvps = data['rsvps'];
        this.rsvpsLoading = false;
      }
    });
  }

  private loadUser(): void {
    this.loading = true;
    this.error = '';

    this.api
      .get<UserBase>('/me/')
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          // ApiService returns ApiResponse<T>, but some backends return T directly.
          // Log response for debugging
          // eslint-disable-next-line no-console
          console.log('GET /me/ response', resp);
          const maybeUser = (resp as any)?.data ?? resp;
          if (maybeUser && maybeUser.email_address) {
            this.user = maybeUser as UserBase;
            this.fetchRsvps();
          } else {
            this.error = 'Failed to load user data';
          }
          this.loading = false;
        },
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to load /me/', err);
          this.error = err?.error?.message || 'Failed to load user info';
          this.loading = false;
        },
      });
  }

  private fetchRsvps(): void {
    if (!this.user) return;
    this.rsvpsLoading = true;
    this.rsvpsError = '';

    this.api
      .get<any>('/me/get_rsvps')
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          const payload = (resp as any)?.data ?? resp;
          let list: any[] = [];
          if (Array.isArray(payload)) list = payload;
          else if (payload && typeof payload === 'object')
            list = payload.results ?? payload.items ?? [];
          this.rsvps = list;
          this.rsvpsLoading = false;
        },
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to load /me/get_rsvps', err);
          this.rsvpsError = err?.error?.message || 'Failed to load RSVPs';
          this.rsvpsLoading = false;
        },
      });
  }
}
