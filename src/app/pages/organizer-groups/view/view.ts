import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { GroupResolver } from '../../../resolvers/group.resolver';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { EventsList } from '../../../events-list/events-list';
import { MemberCardComponent } from '../../../member-card/member-card';

@Component({
  selector: 'app-organizer-group-page',
  standalone: true,
  imports: [CommonModule, RouterModule, EventsList, MemberCardComponent],
  templateUrl: './view.html',
  styleUrls: ['./view.css'],
})
export class OrganizerGroupPageComponent implements OnInit {
  group: any | null = null;
  loading = false;
  leaving = false;
  error = '';
  currentUserIsGroupMember = false;

  events: any[] = [];

  get groupMembers(): any[] {
    if (!this.group) return [];
    return this.normalizeMembers(this.group.members);
  }

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
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.auth.currentUser$.subscribe(() => {
      this.refreshCurrentUserMembership();
    });

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
      this.refreshCurrentUserMembership();
    } else {
      this.error = 'Failed to load organizer group';
      this.currentUserIsGroupMember = false;
    }
  }

  private refreshCurrentUserMembership(): void {
    if (!this.group) {
      this.currentUserIsGroupMember = false;
      return;
    }

    this.auth.isCurrentUserMemberOfOrgGroup(this.group).subscribe({
      next: (isMember) => {
        this.currentUserIsGroupMember = isMember;
        this.cdr.detectChanges();
      },
      error: () => {
        this.currentUserIsGroupMember = false;
        this.cdr.detectChanges();
      },
    });
  }

  private normalizeMembers(members: unknown): any[] {
    if (Array.isArray(members)) {
      return members;
    }

    if (typeof members === 'string' && members.trim()) {
      try {
        const parsed = JSON.parse(members);
        return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
      } catch {
        return [];
      }
    }

    if (members && typeof members === 'object') {
      const maybeObject = members as any;
      if (Array.isArray(maybeObject.results)) return maybeObject.results;
      if (Array.isArray(maybeObject.items)) return maybeObject.items;
      return [maybeObject];
    }

    return [];
  }

  navigateToEditGroup(): void {
    if (!this.group) return;

    this.router.navigate(
      ['/organizer-groups', String(this.group.id ?? this.group.pk ?? this.group._id), 'edit'],
      {
        state: {
          group: this.group,
          mode: 'edit',
        },
      },
    );
  }

  leaveGroup(): void {
    if (!this.group || this.leaving) return;

    const groupId = String(this.group.id ?? this.group.pk ?? this.group._id ?? '');
    if (!groupId) return;

    const confirmed = window.confirm('Leave this organizer group?');
    if (!confirmed) return;

    this.leaving = true;
    this.error = '';

    this.api.delete<any>(`/org/${groupId}/leave`).subscribe({
      next: () => {
        this.leaving = false;
        this.currentUserIsGroupMember = false;
        this.cdr.detectChanges();
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.leaving = false;
        this.cdr.detectChanges();
        const message =
          err?.status === 400
            ? err?.error?.message ||
              err?.error?.detail ||
              'You cannot leave this group while more than one user remains. Delete the group instead.'
            : err?.error?.message || 'Failed to leave organizer group';

        window.alert(message);
      },
    });
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
