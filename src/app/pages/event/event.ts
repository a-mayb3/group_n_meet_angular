import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-event-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event.html',
  styleUrls: ['./event.css'],
})
export class EventPageComponent implements OnInit {
  event: any | null = null;
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
    // If navigation included the event object in state, use it and avoid refetch
    const navEvent =
      (this.router.getCurrentNavigation && this.router.getCurrentNavigation())?.extras?.state?.[
        'event'
      ] ?? (window.history.state as any)?.event;
    if (navEvent) {
      this.event = navEvent;
      this.loading = false;
      this.navStateUsed = true;
      this.lastResponse = navEvent;
      return;
    }

    // If resolver provided event data via route.data, use it
    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.event) ?? null;
    if (resolved) {
      this.event = resolved;
      this.loading = false;
      this.lastResponse = resolved;
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error = 'Missing event id';
        return;
      }
      this.loadEvent(id);
    });
  }

  private loadEvent(id: string): void {
    this.loading = true;
    this.error = '';
    const attempt = (endpoint: string, onError: () => void) => {
      this.lastAttemptedEndpoint = endpoint;
      // eslint-disable-next-line no-console
      console.log('Requesting event from', endpoint);
      this.api
        .get<any>(endpoint)
        .pipe(timeout(10000))
        .subscribe({
          next: (resp) => {
            // eslint-disable-next-line no-console
            console.log('Response for', endpoint, resp);
            this.lastResponse = resp;
            this.lastError = null;
            const payload = (resp as any)?.data ?? resp;
            if (Array.isArray(payload)) {
              this.event = payload[0] ?? null;
            } else {
              this.event = payload ?? null;
            }
            this.loading = false;
          },
          error: (err) => {
            // try fallback if provided
            // eslint-disable-next-line no-console
            console.warn('Request failed for', endpoint, err?.status, err);
            this.lastError = {
              status: err?.status,
              message: err?.message || err?.error?.message,
              body: err?.error ?? err,
            };
            onError();
          },
        });
    };

    // Try several possible endpoint shapes, then fall back to search
    attempt(`/events/${id}`, () => {
      attempt(`/events/${id}/`, () => {
        attempt(`/event/${id}`, () => {
          attempt(`/event/${id}/`, () => {
            // as a last-ditch attempt, try searching by id via search endpoint
            this.lastAttemptedEndpoint = `/events/search?id=${id}`;
            this.api
              .get<any>('/events/search', { id })
              .pipe(timeout(10000))
              .subscribe({
                next: (resp) => {
                  this.lastResponse = resp;
                  const payload = (resp as any)?.data ?? resp;
                  if (Array.isArray(payload) && payload.length) {
                    // find exact match by id or pk or _id or slug
                    const found = (payload as any[]).find((e) =>
                      [e.id, e.pk, e._id, e.slug]?.some((x: any) => String(x) === String(id)),
                    );
                    this.event = found ?? payload[0];
                  } else if (payload && typeof payload === 'object') {
                    // payload might be an object with results/items
                    const list = payload.results ?? payload.items ?? [];
                    if (Array.isArray(list) && list.length) {
                      const found = list.find((e: any) =>
                        [e.id, e.pk, e._id, e.slug]?.some((x: any) => String(x) === String(id)),
                      );
                      this.event = found ?? list[0];
                    } else {
                      this.event = null;
                    }
                  } else {
                    this.event = null;
                  }
                  this.loading = false;
                },
                error: (err) => {
                  // eslint-disable-next-line no-console
                  console.error('Failed to load event via search fallback', err);
                  this.lastError = {
                    status: err?.status,
                    message: err?.message || err?.error?.message,
                    body: err?.error ?? err,
                  };
                  this.error = err?.error?.message || 'Failed to load event';
                  this.loading = false;
                },
              });
          });
        });
      });
    });
  }
}
