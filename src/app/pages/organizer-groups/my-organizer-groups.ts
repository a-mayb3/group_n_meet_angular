import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { OrganizerGroupCardComponent } from '../../organizer-group-card/organizer-group-card';

@Component({
  selector: 'app-my-organizer-groups',
  standalone: true,
  imports: [CommonModule, OrganizerGroupCardComponent],
  templateUrl: './my-organizer-groups.html',
  styleUrls: ['./my-organizer-groups.css'],
})
export class MyOrganizerGroupsComponent implements OnInit {
  orgs: any[] = [];
  loading = false;
  error = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOrgs();
  }

  get hasOrgs(): boolean {
    return this.orgs && this.orgs.length > 0;
  }

  private loadOrgs(): void {
    this.loading = true;
    this.error = '';

    this.api
      .get<any>('/me/get_orgs')
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          const payload = (resp as any)?.data ?? resp;
          if (Array.isArray(payload)) {
            this.orgs = payload;
          } else if (payload && typeof payload === 'object') {
            this.orgs = payload.results ?? payload.items ?? [];
          } else {
            this.orgs = [];
          }
          this.loading = false;
          try {
            this.cdr.detectChanges();
          } catch {}
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load organizer groups';
          this.loading = false;
          try {
            this.cdr.detectChanges();
          } catch {}
        },
      });
  }
}
