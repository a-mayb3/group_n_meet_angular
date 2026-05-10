import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RSVPBase } from '../models/rsvp.model';

@Component({
  selector: 'app-rsvp-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './rsvp-card.html',
  styleUrls: ['./rsvp-card.css'],
})
export class RsvpCard {
  @Input() rsvp: RSVPBase | any = null;
}
