import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar {
  name = '';
  place = '';

  currentUser$: Observable<any>;

  constructor(
    private router: Router,
    private auth: AuthService,
  ) {
    // initialize here to ensure auth is available
    this.currentUser$ = this.auth.currentUser$;
  }

  onSubmit(): void {
    const params: { [key: string]: string } = {};
    if (this.name) params['name'] = this.name;
    if (this.place) params['place'] = this.place;
    this.router.navigate(['/search'], { queryParams: params });
  }
}
