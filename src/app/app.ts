import { Component } from '@angular/core';
import { RouterOutlet, Router, Event } from '@angular/router';

import { Footer } from './footer/footer';
import { Navbar } from './navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar, Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {
  constructor(private router: Router) {
    // Log router events to help debug unexpected redirects
    this.router.events.subscribe((e: Event) => {
      // Use console.group to make the logs easier to scan
      // eslint-disable-next-line no-console
      console.log('[ROUTER EVENT]', e);
    });
  }
}
