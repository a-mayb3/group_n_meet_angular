import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { concatMap, map, catchError, filter, take, defaultIfEmpty } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { GroupResolver } from '../../resolvers/group.resolver';

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
    private groupResolver: GroupResolver,
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
    const endpoints = [`/events/${id}`, `/events/${id}/`, `/event/${id}`, `/event/${id}/`];

    const tryEndpoints$ = from(endpoints).pipe(
      concatMap((ep) =>
        this.api.get<any>(ep).pipe(
          timeout(10000),
          map((resp) => (resp as any)?.data ?? resp),
          catchError(() => of(null)),
        ),
      ),
      filter((x) => x != null),
      take(1),
      defaultIfEmpty(null),
    );

    tryEndpoints$.subscribe({
      next: (payload) => {
        if (!payload) {
          this.event = null;
          this.loading = false;
          this.error = `Event ${id} not found`;
          return;
        }

        const payloadObj = Array.isArray(payload) ? (payload[0] ?? null) : (payload ?? null);
        this.event = payloadObj;
        this.loading = false;
        if (this.event) this.resolveOrganizerNameIfNeeded(this.event);
      },
      error: (err) => {
        console.warn('Event lookup failed', err?.status, err);
        this.loading = false;
      },
    });
  }

  private resolveOrganizerNameIfNeeded(eventObj: any): void {
    if (!eventObj) return;
    // If the organizer name is already present, nothing to do
    if (eventObj.organizer_group_name) return;

    // Handle nested group object cases
    const nested = eventObj.organizer_group ?? eventObj.group ?? eventObj.organizer;
    if (nested && typeof nested === 'object') {
      const name =
        nested.name ?? nested.title ?? nested.display_name ?? nested.group_name ?? nested.full_name;
      if (name) {
        eventObj.organizer_group_name = name;
        this.lastResponse = eventObj;
        return;
      }
    }

    const gid =
      eventObj.organizer_group_id ??
      eventObj.organizer_group ??
      eventObj.group_id ??
      eventObj.organizer_id ??
      null;
    if (!gid) return;

    this.groupResolver
      .resolveById(String(gid))
      .pipe(
        timeout(10000),
        catchError(() => of(null)),
      )
      .subscribe({
        next: (gp) => {
          const gObj = Array.isArray(gp) ? gp[0] : gp;
          const name =
            gObj?.name ??
            gObj?.title ??
            gObj?.display_name ??
            gObj?.group_name ??
            gObj?.full_name ??
            null;
          if (name) {
            eventObj.organizer_group_name = name;
            this.lastResponse = eventObj;
          }
        },
        error: () => {},
      });
  }
}
