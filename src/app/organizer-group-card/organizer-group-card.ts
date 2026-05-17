import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-organizer-group-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './organizer-group-card.html',
  styleUrls: ['./organizer-group-card.css'],
})
export class OrganizerGroupCardComponent {
  @Input() group: any | null = null;

  constructor(private router: Router) {}

  get id(): string | null {
    return this.group?.id ?? this.group?.pk ?? this.group?._id ?? null;
  }

  get title(): string {
    return this.group?.display_name ?? this.group?.name ?? 'Organizer Group';
  }

  get description(): string {
    return this.group?.description ?? '';
  }

  get eventsCount(): number | null {
    const ev = this.group?.events ?? null;
    if (Array.isArray(ev)) return ev.length;
    return null;
  }

  get membersCount(): number | null {
    if (Array.isArray(this.group?.members)) return this.group.members.length;
    return null;
  }

  open(): void {
    const id = this.id;
    if (!id) return;
    this.router.navigate(['/org', id], { state: { group: this.group } });
  }

  activate(event: Event): void {
    event.preventDefault();
    this.open();
  }
}
