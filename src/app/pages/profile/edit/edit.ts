import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit.html',
  styleUrls: ['./edit.css'],
})
export class EditProfileComponent implements OnInit {
  profileForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';
  success = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      email_address: ['', [Validators.required, Validators.email]],
      display_name: [''],
    });

    this.auth.currentUser$.pipe().subscribe((u) => {
      const user = u as any;
      if (!user) return;
      this.profileForm.patchValue({
        email_address: user.email_address ?? user.email ?? '',
        display_name: user.display_name ?? user.name ?? '',
      });
    });
  }

  get f() {
    return this.profileForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.profileForm.invalid) return;

    this.loading = true;
    const body: any = {
      email_address: this.f['email_address'].value,
      display_name: this.f['display_name'].value || undefined,
    };

    this.api.put<any>('/me/', body).subscribe({
      next: (resp) => {
        this.loading = false;
        this.success = 'Profile updated successfully';
        // refresh current user and navigate to profile
        this.auth
          .loadCurrentUser()
          .pipe()
          .subscribe((user) => {
            const id = (user as any)?.id ?? (user as any)?.pk ?? (user as any)?._id ?? 'me';
            this.router.navigate(['/profile', String(id)]);
          });
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to update profile';
      },
    });
  }

  deleteAccount(): void {
    const confirmed = window.confirm('Delete your account? This action cannot be undone.');
    if (!confirmed) return;
    this.loading = true;
    this.error = '';
    this.api.delete<any>('/me/delete_me').subscribe({
      next: () => {
        this.loading = false;
        // attempt logout/cleanup and navigate home
        this.auth.logout().subscribe(
          () => this.router.navigateByUrl('/'),
          () => this.router.navigateByUrl('/'),
        );
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to delete account';
      },
    });
  }
}
