import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { GroupResolver } from '../../../resolvers/group.resolver';
import { ApiService } from '../../../services/api.service';
import { EventResultCard } from '../../../event-result-card/event-result-card';

@Component({
  selector: 'app-organizer-group-page',
  standalone: true,
  imports: [CommonModule, RouterModule, EventResultCard],
  templateUrl: './view.html',
  styleUrls: ['./view.css'],
})
export class OrganizerGroupPageComponent implements OnInit {
  group: any | null = null;
  loading = false;
  error = '';

  events: any[] = [];
  eventsLoading = false;
  eventsError = '';

  lastAttemptedEndpoint = '';
  lastResponse: any = null;
  lastError: any = null;
  navStateUsed = false;

  constructor(
    private route: ActivatedRoute,
    private groupResolver: GroupResolver,
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const navGroup =
      (this.router.getCurrentNavigation && this.router.getCurrentNavigation())?.extras?.state?.[
        'group'
      ] ?? (window.history.state as any)?.group;

    if (navGroup) {
      this.group = navGroup;
      this.loading = false;
      this.navStateUsed = true;
      this.lastResponse = navGroup;
      const gid = this.group?.id ?? this.group?.pk ?? this.group?._id ?? null;
      if (Array.isArray((this.group as any)?.events) && (this.group as any).events.length) {
        this.events = (this.group as any).events;
      } else if (gid) {
        this.loadEvents(String(gid));
      }
      return;
    }

    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.group) ?? null;
    if (resolved) {
      this.group = resolved;
      this.loading = false;
      this.lastResponse = resolved;
      const gid = this.group?.id ?? this.group?.pk ?? this.group?._id ?? null;
      if (Array.isArray((this.group as any)?.events) && (this.group as any).events.length) {
        this.events = (this.group as any).events;
      } else if (gid) {
        this.loadEvents(String(gid));
      }
      return;
    }

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error = 'Missing organizer group id';
        return;
      }
      this.loadGroup(id);
    });
  }

  private loadGroup(id: string): void {
    this.loading = true;
    this.error = '';
    this.lastAttemptedEndpoint = `/org/${id}`;

    this.groupResolver
      .resolveById(id)
      .pipe(timeout(10000))
      .subscribe({
        next: (payload) => {
          this.lastResponse = payload;
          if (!payload) {
            this.group = null;
            this.error = `Organizer group ${id} not found`;
            this.loading = false;
            return;
          }
          this.group = Array.isArray(payload) ? payload[0] : payload;
          this.loading = false;
          // prefer resolver-provided events; otherwise fetch events for this org
          if (Array.isArray((this.group as any)?.events) && (this.group as any).events.length) {
            this.events = (this.group as any).events;
          } else {
            this.loadEvents(id);
          }
        },
        error: (err) => {
          this.lastError = err;
          this.error = err?.error?.message || 'Failed to load organizer group';
          this.loading = false;
        },
      });
  }

  private loadEvents(id: string): void {
    this.eventsLoading = true;
    this.eventsError = '';
    this.lastAttemptedEndpoint = `/org/${id}/events/`;

    this.api
      .get<any>(`/org/${id}/events/`)
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          this.lastResponse = resp;
          const payload = (resp as any)?.data ?? resp;
          if (Array.isArray(payload)) {
            this.events = payload;
          } else if (payload && typeof payload === 'object') {
            this.events = payload.results ?? payload.items ?? [];
          } else {
            this.events = [];
          }
          this.eventsLoading = false;
        },
        error: (err) => {
          this.eventsError = err?.error?.message || 'Failed to load events for organizer group';
          this.eventsLoading = false;
        },
      });
  }
}
