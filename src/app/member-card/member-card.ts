import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-member-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './member-card.html',
  styleUrls: ['./member-card.css'],
})
export class MemberCardComponent {
  @Input() member: any | null = null;

  constructor(private router: Router) {}

  get id(): string | null {
    if (!this.member) return null;
    return (
      this.member.id ??
      this.member.pk ??
      this.member._id ??
      this.member.user_id ??
      this.member.profile_id ??
      null
    );
  }

  get name(): string {
    return this.member?.display_name ?? this.member?.name ?? this.member?.email_address ?? 'Member';
  }

  get email(): string | null {
    return this.member?.email_address ?? null;
  }

  openProfile(): void {
    const id = this.id;
    if (!id) return;
    this.router.navigate(['/profile', id]);
  }

  activate(event: Event): void {
    event.preventDefault();
    this.openProfile();
  }
}
