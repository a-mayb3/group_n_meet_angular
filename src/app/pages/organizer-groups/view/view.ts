import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { GroupResolver } from '../../../resolvers/group.resolver';
import { ApiService } from '../../../services/api.service';
import { EventsList } from '../../../events-list/events-list';

@Component({
  selector: 'app-organizer-group-page',
  standalone: true,
  imports: [CommonModule, RouterModule, EventsList],
  templateUrl: './view.html',
  styleUrls: ['./view.css'],
})
export class OrganizerGroupPageComponent implements OnInit {
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

    // Always trust the resolver for data loading
    const resolved = (this.route.snapshot && (this.route.snapshot.data as any)?.group) ?? null;
    this.group = resolved;
    this.loading = false;

    if (resolved) {
      this.lastResponse = resolved;
      const gid = this.group?.id ?? this.group?.pk ?? this.group?._id ?? null;
      if (gid) {
        this.lastLoadedGroupId = String(gid);
      }
      // Use resolver-provided events (including empty array if no events)
      if (Array.isArray((this.group as any)?.events)) {
        this.events = (this.group as any).events;
      }
    } else {
      this.error = 'Failed to load organizer group';
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
