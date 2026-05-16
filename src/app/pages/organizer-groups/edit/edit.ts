import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { OrganizerGroupBase } from '../../../models/organizer-group.model';

@Component({
  selector: 'app-edit-organizer-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit.html',
  styleUrls: ['./edit.css'],
})
export class EditOrganizerGroupComponent implements OnInit {
  groupForm!: FormGroup;
  loading = false;
  deleting = false;
  submitted = false;
  error = '';
  success = '';

  group: OrganizerGroupBase | null = null;
  private groupId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.groupForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
    });

    const resolvedGroup = (this.route.snapshot.data as any)?.group ?? null;
    const navGroup = (window.history.state as any)?.group ?? null;
    this.group = resolvedGroup ?? navGroup ?? null;

    const id = this.group?.id ?? this.route.snapshot.paramMap.get('id');
    this.groupId = id ? String(id) : null;

    if (this.group) {
      this.groupForm.patchValue({
        name: this.group.name,
        description: this.group.description ?? '',
      });
    }
  }

  get f() {
    return this.groupForm.controls;
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.groupForm.invalid || !this.groupId) return;

    this.loading = true;
    const body: any = {
      name: this.f['name'].value,
      description: this.f['description'].value || undefined,
    };

    this.api.put<any>(`/org/${this.groupId}`, body).subscribe({
      next: (resp) => {
        this.loading = false;
        const payload = (resp as any)?.data ?? resp;
        const id = payload?.id ?? payload?.pk ?? payload?._id ?? this.groupId;
        this.success = 'Organizer group updated successfully';
        if (id) {
          this.router.navigate(['/org', String(id)]);
        } else {
          this.router.navigateByUrl('/dashboard');
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to update organizer group';
      },
    });
  }

  deleteGroup(): void {
    this.error = '';
    this.success = '';

    if (!this.groupId || this.deleting) return;

    const confirmed = window.confirm('Delete this organizer group? This action cannot be undone.');
    if (!confirmed) return;

    this.deleting = true;
    this.api.delete<any>(`/org/${this.groupId}/`).subscribe({
      next: () => {
        this.deleting = false;
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        this.deleting = false;
        if (err?.status === 400) {
          this.error =
            err?.error?.message ||
            err?.error?.detail ||
            'This group cannot be deleted until only one user remains.';
          return;
        }

        this.error = err?.error?.message || 'Failed to delete organizer group';
      },
    });
  }
}
