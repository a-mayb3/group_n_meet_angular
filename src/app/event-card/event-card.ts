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

  constructor(private router: Router) {}

  get title(): string {
    return this.event?.title ?? this.event?.name ?? this.event?.event_title ?? 'Untitled Event';
  }

  get description(): string {
    return this.event?.description ?? this.event?.summary ?? '';
  }

  get id(): string | null {
    return this.event?.id ?? this.event?.pk ?? this.event?._id ?? this.event?.slug ?? null;
  }

  open(e: MouseEvent): void {
    e.preventDefault();
    const id = this.id;
    if (!id) return;
    this.router.navigate(['/event', id], { state: { event: this.event } });
  }
}
