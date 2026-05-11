import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { EventCard } from '../../event-card/event-card';

@Component({
  selector: 'app-rsvps-page',
  standalone: true,
  imports: [CommonModule, EventCard],
  templateUrl: './rsvps.html',
  styleUrls: ['./rsvps.css'],
})
export class RsvpsPageComponent implements OnInit {
  rsvps: any[] = [];
  loading = false;
  error = '';

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadRsvps();
  }

  get filteredRsvps(): any[] {
    return this.rsvps.filter((rsvp) => !rsvp.is_cancelled);
  }

  private loadRsvps(): void {
    this.loading = true;
    this.error = '';

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
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err?.error?.message || 'Failed to load RSVPs';
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
  }
}
