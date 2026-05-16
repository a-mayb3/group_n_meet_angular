import { ChangeDetectorRef, Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, timeout } from 'rxjs/operators';
import { ApiService } from '../services/api.service';

@Component({
  selector: 'app-rsvp-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rsvp-card.html',
  styleUrls: ['./rsvp-card.css'],
})
export class RsvpCardComponent implements OnChanges {
  @Input() rsvp: any | null = null;
  private fetchedEvent: any | null = null;
  private fetchedEventId: string | null = null;

  constructor(
    private router: Router,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnChanges(): void {
    this.ensureEventLoaded();
  }

  get eventId(): string | null {
    return this.rsvp?.event?.id ?? this.rsvp?.event_id ?? null;
  }

  get title(): string {
    return this.fetchedEvent?.name ?? 'Loading event...';
  }

  get reservedAt(): string | null {
    return this.rsvp?.reserved_at ?? null;
  }

  open(): void {
    const id = this.eventId;
    if (!id) return;
    this.router.navigate(['/event', id], {
      state: { event: this.rsvp?.event ?? this.fetchedEvent ?? null },
    });
  }

  activate(event: Event): void {
    event.preventDefault();
    this.open();
  }

  private ensureEventLoaded(): void {
    const id = this.eventId;
    if (!id) return;

    if (this.fetchedEventId === id) return;

    this.fetchedEventId = id;

    this.api
      .get<any>(`/events/${id}/`)
      .pipe(
        timeout(10000),
        map((resp) => {
          const payload = (resp as any)?.data ?? resp;
          if (!payload) return null;
          if (Array.isArray(payload)) return payload[0] ?? null;
          return payload;
        }),
        catchError(() => of(null)),
      )
      .subscribe((eventObj) => {
        if (eventObj?.name) {
          this.fetchedEvent = eventObj;
        }
        this.cdr.detectChanges();
      });
  }
}
