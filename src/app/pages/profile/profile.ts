import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout, take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css'],
})
export class ProfilePageComponent implements OnInit {
  profile: any | null = null;
  loading = false;
  error = '';

  isOwnProfile = false;

  lastAttemptedEndpoint = '';
  lastResponse: any = null;
  lastError: any = null;
  navStateUsed = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // If navigation included the profile object in state, use it and avoid refetch
    const navProfile =
      (this.router.getCurrentNavigation && this.router.getCurrentNavigation())?.extras?.state?.[
        'profile'
      ] ?? (window.history.state as any)?.profile;
    if (navProfile) {
      this.profile = navProfile;
      this.loading = false;
      this.navStateUsed = true;
      this.lastResponse = navProfile;
      this.updateIsOwnProfile();
      return;
    }

    // If resolver provided profile data via route.data, use it
    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.profile) ?? null;
    if (resolved) {
      this.profile = resolved;
      this.loading = false;
      this.lastResponse = resolved;
      this.updateIsOwnProfile();
      return;
    }

    // keep ownership state in sync when current user changes
    this.auth.currentUser$.subscribe(() => this.updateIsOwnProfile());

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        // no id -> attempt to load current user
        this.loadProfile('me');
        return;
      }
      this.loadProfile(id);
    });
  }

  private updateIsOwnProfile(): void {
    if (!this.profile) {
      this.isOwnProfile = false;
      this.cdr.detectChanges();
      return;
    }
    this.auth.currentUser$.pipe(take(1)).subscribe((user) => {
      const currentId = user?.id;
      const profileId = this.profile?.id;
      this.isOwnProfile = !!(
        currentId != null &&
        profileId != null &&
        String(currentId) === String(profileId)
      );
      this.cdr.detectChanges();
    });
  }

  onEdit(): void {
    if (!this.profile) return;
    const id = this.profile?.id ?? this.profile?.pk ?? this.profile?._id ?? 'me';
    this.router.navigate(['profile', id, 'edit']);
  }

  private loadProfile(id: string): void {
    this.loading = true;
    this.error = '';
    const attempt = (endpoint: string, onError: () => void) => {
      this.lastAttemptedEndpoint = endpoint;
      // eslint-disable-next-line no-console
      console.log('Requesting profile from', endpoint);
      this.api
        .get<any>(endpoint)
        .pipe(timeout(10000))
        .subscribe({
          next: (resp) => {
            // eslint-disable-next-line no-console
            console.log('Response for', endpoint, resp);
            this.lastResponse = resp;
            const payload = (resp as any)?.data ?? resp;
            if (Array.isArray(payload)) {
              this.profile = payload[0] ?? null;
            } else {
              this.profile = payload ?? null;
            }
            this.loading = false;
            this.updateIsOwnProfile();
          },
          error: (err) => {
            // try fallback if provided
            // eslint-disable-next-line no-console
            console.warn('Request failed for', endpoint, err?.status);
            this.lastError = {
              status: err?.status,
              message: err?.message || err?.error?.message,
              body: err?.error ?? err,
            };
            onError();
          },
        });
    };

    if (id === 'me') {
      attempt('/me/', () => {
        this.error = 'Failed to load profile';
        this.loading = false;
      });
      return;
    }

    // Try several endpoint shapes, then fallback to search
    attempt(`/users/${id}`, () => {
      attempt(`/users/${id}/`, () => {
        attempt(`/user/${id}`, () => {
          attempt(`/user/${id}/`, () => {
            attempt(`/profiles/${id}`, () => {
              attempt(`/profiles/${id}/`, () => {
                this.lastAttemptedEndpoint = `/users/search?id=${id}`;
                this.api
                  .get<any>('/users/search', { id })
                  .pipe(timeout(10000))
                  .subscribe({
                    next: (resp) => {
                      this.lastResponse = resp;
                      const payload = (resp as any)?.data ?? resp;
                      if (Array.isArray(payload) && payload.length) {
                        this.profile = payload[0];
                      } else if (payload && typeof payload === 'object') {
                        const list = payload.results ?? payload.items ?? [];
                        if (Array.isArray(list) && list.length) this.profile = list[0];
                        else this.profile = null;
                      } else {
                        this.profile = null;
                      }
                      this.loading = false;
                      this.updateIsOwnProfile();
                    },
                    error: (err) => {
                      // eslint-disable-next-line no-console
                      console.error('Failed to load profile via search fallback', err);
                      this.lastError = {
                        status: err?.status,
                        message: err?.message || err?.error?.message,
                        body: err?.error ?? err,
                      };
                      this.error = err?.error?.message || 'Failed to load profile';
                      this.loading = false;
                    },
                  });
              });
            });
          });
        });
      });
    });
  }
}
