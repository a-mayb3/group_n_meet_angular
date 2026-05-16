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
      return (
        this.event?.name ?? `Event: ${this.rsvp?.event_id}`
      );
    }

    return this.event?.name;
  }

  get id(): string{
    return (
      this.event?.id
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

  open(): void {
    const id = this.id;
    if (!id) return;
    this.router.navigate(['/event', id], { state: { event: this.event } });
  }

  activate(event: Event): void {
    event.preventDefault();
    this.open();
  }
}
