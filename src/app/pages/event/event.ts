import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { concatMap, map, catchError, filter, take, defaultIfEmpty } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { GroupResolver } from '../../resolvers/group.resolver';
import { AuthService } from '../../services/auth.service';

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
  rsvps: any[] = [];
  rsvpsLoading = false;
  rsvpsError = '';
  reservationLoading = false;
  currentUserOwnsEvent = false;

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private router: Router,
    private groupResolver: GroupResolver,
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    // Set up current user subscription FIRST so it's always active
    this.auth.currentUser$.subscribe((user) => {
      // eslint-disable-next-line no-console
      console.log('[EVENT] Current user updated:', user);
      this.updateCurrentUserOwnership();
      this.cdr.detectChanges();
    });

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
      this.applyResolvedRsvps((this.route.snapshot.data as any)?.['rsvps']);
      this.updateCurrentUserOwnership();
      this.cdr.detectChanges();
      return;
    }

    // If resolver provided event data via route.data, use it
    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.event) ?? null;
    if (resolved) {
      this.event = resolved;
      this.loading = false;
      this.lastResponse = resolved;
      this.applyResolvedRsvps((this.route.snapshot.data as any)?.['rsvps']);
      this.updateCurrentUserOwnership();
      this.cdr.detectChanges();
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

    this.route.data.subscribe((data) => {
      this.applyResolvedRsvps(data?.['rsvps']);
    });
  }

  private applyResolvedRsvps(resolved: any[] | null | undefined): void {
    if (Array.isArray(resolved)) {
      this.rsvps = resolved;
      this.rsvpsLoading = false;
      this.rsvpsError = '';
      this.cdr.detectChanges();
      return;
    }
    this.rsvps = [];
    this.rsvpsLoading = false;
    this.cdr.detectChanges();
  }

  private loadEvent(id: string): void {
    this.loading = true;
    this.error = '';
    const endpoints = [`/events/${id}`, `/events/${id}/`];

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
          this.cdr.detectChanges();
          return;
        }

        const payloadObj = Array.isArray(payload) ? (payload[0] ?? null) : (payload ?? null);
        this.event = payloadObj;
        this.loading = false;
        // eslint-disable-next-line no-console
        console.log('[EVENT] Loaded event:', this.event);
        this.updateCurrentUserOwnership();
        this.cdr.detectChanges();
        if (this.event) this.resolveOrganizerNameIfNeeded(this.event);
      },
      error: (err) => {
        // eslint-disable-next-line no-console
        console.warn('Event lookup failed', err?.status, err);
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get currentEventId(): string | null {
    return this.event?.id ?? this.event?.pk ?? this.event?._id ?? this.event?.slug ?? null;
  }

  get activeReservation(): any | null {
    const eventId = this.currentEventId;
    if (!eventId) return null;

    return (
      this.rsvps.find(
        (rsvp) => String(rsvp?.event_id) === String(eventId) && !rsvp?.is_cancelled,
      ) ?? null
    );
  }

  get reservationButtonLabel(): string {
    if (this.rsvpsLoading) return 'Checking reservation…';
    return this.activeReservation ? 'Cancel reservation' : 'Reserve spot';
  }

  toggleReservation(): void {
    const eventId = this.currentEventId;
    if (!eventId || this.reservationLoading || this.rsvpsLoading) return;

    const removeEndpoint = `/events/${eventId}/remove_me`;
    const addEndpoint = `/events/${eventId}/add_me`;

    this.reservationLoading = true;
    this.rsvpsError = '';

    const request$ = this.activeReservation
      ? this.api.delete<any>(removeEndpoint)
      : this.api.post<any>(addEndpoint, {});

    request$.pipe(timeout(10000)).subscribe({
      next: () => {
        this.reservationLoading = false;
        this.refreshRsvps();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.rsvpsError = err?.error?.message || 'Failed to update reservation';
        this.reservationLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  private refreshRsvps(): void {
    this.rsvpsLoading = true;
    this.rsvpsError = '';

    this.api
      .get<any>('/me/get_rsvps')
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          const payload = (resp as any)?.data ?? resp;
          if (Array.isArray(payload)) {
            this.rsvps = payload;
          } else if (payload && typeof payload === 'object') {
            this.rsvps = payload.results ?? payload.items ?? [];
          } else {
            this.rsvps = [];
          }
          this.rsvpsLoading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.rsvpsError = err?.error?.message || 'Failed to load RSVPs';
          this.rsvpsLoading = false;
          this.cdr.detectChanges();
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

    // Extract group ID from various possible fields
    const gid =
      eventObj.organizer_group_id ??
      (typeof eventObj.organizer_group === 'object'
        ? (eventObj.organizer_group?.id ??
          eventObj.organizer_group?.pk ??
          eventObj.organizer_group?._id)
        : null) ??
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
            this.event = { ...eventObj };
            this.lastResponse = eventObj;
          }
        },
        error: () => {},
      });
  }

  navigateToOrganizerGroup(): void {
    if (!this.event) return;
    const gid =
      this.event.organizer_group_id ??
      this.event.organizer_group?.id ??
      this.event.organizer_group?.pk ??
      this.event.organizer_group?._id ??
      this.event.group_id ??
      this.event.organizer_id ??
      null;
    if (gid) {
      this.router.navigate(['/org', String(gid)]);
    }
  }

  navigateToEditEvent(): void {
    if (!this.event) return;
    const id = this.currentEventId;
    if (!id) return;
    this.router.navigate(['/event', String(id), 'edit'], {
      state: { event: this.event, mode: 'edit' },
    });
  }

  private updateCurrentUserOwnership(): void {
    if (!this.event) {
      // eslint-disable-next-line no-console
      console.log('[EVENT] No event set yet, skipping ownership check');
      return;
    }

    const currentUser = (this.auth as any).currentUserSubject?.getValue?.() ?? null;
    if (!currentUser) {
      // eslint-disable-next-line no-console
      console.log('[EVENT] No current user set yet, skipping ownership check');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('[EVENT] Checking ownership (async):', {
      event: this.event,
      currentUser: currentUser,
    });

    // Use async ownership check that fetches org group data
    this.auth.ownsEventThroughOrgGroupsAsync(this.event, currentUser).subscribe({
      next: (owns) => {
        // eslint-disable-next-line no-console
        console.log('[EVENT] Async ownership result:', owns);
        this.currentUserOwnsEvent = owns;
        this.cdr.detectChanges();
      },
      error: (err) => {
        // eslint-disable-next-line no-console
        console.error('[EVENT] Ownership check failed:', err);
        this.currentUserOwnsEvent = false;
        this.cdr.detectChanges();
      },
    });
  }
}
