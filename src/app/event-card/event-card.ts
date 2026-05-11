import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-event-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './event-card.html',
  styleUrls: ['./event-card.css'],
})
export class EventCard {
  @Input() event: any | null = null;
  @Input() rsvp: any | null = null;

  constructor(private router: Router) {}

  get isRsvpCard(): boolean {
    return !!this.rsvp && !this.event;
  }

  get title(): string {
    if (this.isRsvpCard) {
      return `Event: ${this.rsvp?.event_id ?? 'Unknown event'}`;
    }

    return this.event?.title ?? this.event?.name ?? this.event?.event_title ?? 'Untitled Event';
  }

  get id(): string | null {
    return (
      this.event?.id ??
      this.event?.pk ??
      this.event?._id ??
      this.event?.slug ??
      this.rsvp?.event_id ??
      null
    );
  }

  get description(): string {
    if (this.isRsvpCard) {
      return '';
    }

    return this.event?.description ?? this.event?.summary ?? '';
  }

  get reservedAt(): string | null {
    return this.rsvp?.reserved_at ?? null;
  }

  open(e: MouseEvent): void {
    e.preventDefault();
    const id = this.id;
    if (!id) return;
    this.router.navigate(['/event', id], { state: { event: this.event } });
  }

  activate(event: MouseEvent | KeyboardEvent): void {
    if (event instanceof KeyboardEvent) {
      event.preventDefault();
    }

    this.open(event as MouseEvent);
  }
}
