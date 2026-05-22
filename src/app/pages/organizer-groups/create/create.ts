import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';

@Component({
  selector: 'app-create-organizer-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create.html',
  styleUrls: ['./create.css'],
})
export class CreateOrganizerGroupComponent implements OnInit {
  groupForm!: FormGroup;
  loading = false;
  submitted = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
    });
  }

  get f() {
    return this.groupForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    if (this.groupForm.invalid) return;

    this.loading = true;
    const body: any = {
      name: this.f['name'].value,
      description: this.f['description'].value || undefined,
    };

    this.api.post<any>('/org/', body).subscribe({
      next: (resp: any) => {
        this.loading = false;
        const payload = (resp as any)?.data ?? resp;
        const id = payload?.id ?? payload?.pk ?? payload?._id ?? null;
        if (id) {
          // attempt to navigate to org view endpoint if available
          this.router.navigate(['/org', String(id)]);
        } else {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to create organizer group';
      },
    });
  }
}
