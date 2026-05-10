import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-menu.html',
  styleUrls: ['./user-menu.css'],
})
export class UserMenu {
  @Input() user: any;
  showMenu = false;

  constructor(
    private auth: AuthService,
    private router: Router,
    private el: ElementRef,
  ) {}

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.showMenu = !this.showMenu;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.showMenu = false;
    }
  }

  navigateToProfile(): void {
    this.showMenu = false;
    this.router.navigate(['/profile']);
  }

  navigateToDashboard(): void {
    this.showMenu = false;
    this.router.navigate(['/dashboard']);
  }

  logout(): void {
    this.auth.logout().subscribe({
      next: () => {
        this.showMenu = false;
        this.router.navigateByUrl('/login');
      },
      error: () => {
        this.showMenu = false;
        this.router.navigateByUrl('/login');
      },
    });
  }
}
