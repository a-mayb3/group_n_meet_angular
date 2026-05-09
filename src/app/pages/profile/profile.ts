import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

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

  lastAttemptedEndpoint = '';
  lastResponse: any = null;
  lastError: any = null;
  navStateUsed = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
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
      return;
    }

    // If resolver provided profile data via route.data, use it
    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.profile) ?? null;
    if (resolved) {
      this.profile = resolved;
      this.loading = false;
      this.lastResponse = resolved;
      return;
    }

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
