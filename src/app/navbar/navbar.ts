import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { buildSearchParams } from '../utils/search-params';
import { UserMenu } from '../user-menu/user-menu';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, UserMenu],
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
    const params = buildSearchParams({ name: this.name, place: this.place });
    this.router.navigate(['/search'], { queryParams: params });
  }

  // User menu behavior moved to `app-user-menu` component.
}
