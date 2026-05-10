import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventCard } from '../event-card/event-card';

@Component({
  selector: 'app-events-list',
  standalone: true,
  imports: [CommonModule, EventCard],
  templateUrl: './events-list.html',
  styleUrls: ['./events-list.css'],
})
export class EventsList {
  @Input() events: any[] = [];
  @Input() title?: string;
  @Input() emptyMessage: string = 'No events';
}
