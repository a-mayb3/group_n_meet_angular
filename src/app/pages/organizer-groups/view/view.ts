import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
export class OrganizerGroupPageComponent implements OnInit, OnDestroy {
  group: any | null = null;
  loading = false;
  error = '';

  events: any[] = [];

  lastAttemptedEndpoint = '';
  lastResponse: any = null;
  lastError: any = null;
  navStateUsed = false;

  // Guards to prevent repeated/recursive loads
  private lastAttemptedGroupId: string | null = null;
  private lastLoadedGroupId: string | null = null;

  private paramSub: Subscription | null = null;

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
      if (gid) {
        this.lastLoadedGroupId = String(gid);
      }
      // Use resolver-provided events (including empty array if no events)
      if (Array.isArray((this.group as any)?.events)) {
        this.events = (this.group as any).events;
      }
      return;
    }

    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.group) ?? null;
    if (resolved) {
      this.group = resolved;
      this.loading = false;
      this.lastResponse = resolved;
      const gid = this.group?.id ?? this.group?.pk ?? this.group?._id ?? null;
      if (gid) {
        this.lastLoadedGroupId = String(gid);
      }
      // Use resolver-provided events (including empty array if no events)
      if (Array.isArray((this.group as any)?.events)) {
        this.events = (this.group as any).events;
      }
      return;
    }

    this.paramSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.error = 'Missing organizer group id';
        return;
      }

      // If group already loaded for this id, skip reload
      if (this.lastLoadedGroupId === id && this.group) {
        return;
      }

      this.loadGroup(id);
    });
  }

  ngOnDestroy(): void {
    if (this.paramSub) {
      this.paramSub.unsubscribe();
      this.paramSub = null;
    }
  }

  private loadGroup(id: string): void {
    // avoid duplicate parallel attempts
    if (this.loading && this.lastAttemptedGroupId === id) {
      return;
    }
    // if already successfully loaded, skip
    if (this.lastLoadedGroupId === id && this.group) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.lastAttemptedEndpoint = `/org/${id}`;
    this.lastAttemptedGroupId = id;

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
            this.lastAttemptedGroupId = null;
            return;
          }
          this.group = Array.isArray(payload) ? payload[0] : payload;
          this.loading = false;
          this.lastLoadedGroupId = id;
          this.lastAttemptedGroupId = null;

          // Use resolver-provided events (including empty array if no events)
          if (Array.isArray((this.group as any)?.events)) {
            this.events = (this.group as any).events;
          }
        },
        error: (err) => {
          this.lastError = err;
          this.error = err?.error?.message || 'Failed to load organizer group';
          this.loading = false;
          this.lastAttemptedGroupId = null;
        },
      });
  }
}
