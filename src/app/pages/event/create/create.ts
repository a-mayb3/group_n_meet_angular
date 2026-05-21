import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { generateDescriptionSuggestion } from '../../../utils/description';
import { isoFromDateTimeLocal } from '../../../utils/search-params';

@Component({
  selector: 'app-create-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './create.html',
  styleUrls: ['./create.css'],
})
export class CreateEventComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  generatingDescription = false;
  submitted = false;
  error = '';
  descriptionError = '';
  organizerGroups: any[] = [];
  loadingGroups = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadOrganizerGroups();
    this.eventForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      start_time: [''],
      end_time: [''],
      place: [''],
      organizer_group_id: ['', [Validators.required]],
    });
  }

  get f() {
    return this.eventForm.controls;
  }

  private loadOrganizerGroups(): void {
    this.loadingGroups = true;
    this.api.get<any>('/me/get_orgs').subscribe({
      next: (resp) => {
        this.loadingGroups = false;
        const payload = (resp as any)?.data ?? resp;
        if (Array.isArray(payload)) {
          this.organizerGroups = payload;
        } else if (Array.isArray(payload?.results)) {
          this.organizerGroups = payload.results;
        } else if (Array.isArray(payload?.items)) {
          this.organizerGroups = payload.items;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingGroups = false;
        // Silently fail - user can still manually enter group ID if needed
        this.cdr.detectChanges();
      },
    });
  }

  onOrganizerGroupChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'create-new') {
      // Reset the select and navigate to organizer group creation
      this.eventForm.get('organizer_group_id')?.setValue('');
      this.router.navigate(['/organizer-groups', 'new']);
    }
  }

  generateDescription(): void {
    if (this.generatingDescription || this.loading) return;

    this.descriptionError = '';
    this.generatingDescription = true;
    generateDescriptionSuggestion(this.api, this.eventForm)
      .pipe()
      .subscribe({
        next: (suggested) => {
          this.generatingDescription = false;
          this.eventForm.get('description')?.setValue(suggested);
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.generatingDescription = false;
          this.descriptionError = err?.error?.message || 'Failed to generate description';
          this.cdr.detectChanges();
        },
      });
  }

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    if (this.eventForm.invalid) return;

    this.loading = true;
    const body: any = {
      name: this.f['name'].value,
      description: this.f['description'].value || undefined,
      start_time: isoFromDateTimeLocal(this.f['start_time'].value) || undefined,
      end_time: isoFromDateTimeLocal(this.f['end_time'].value) || undefined,
      place: this.f['place'].value?.trim() || undefined,
      organizer_group_id: this.f['organizer_group_id'].value,
    };

    this.api.post<any>('/events/', body).subscribe({
      next: (resp) => {
        this.loading = false;
        const payload = (resp as any)?.data ?? resp;
        const id = payload?.id ?? payload?.pk ?? payload?._id ?? null;
        if (id) {
          // Navigate to event view page
          this.router.navigate(['/event', String(id)]);
        } else {
          this.router.navigateByUrl('/dashboard');
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Failed to create event';
        this.cdr.detectChanges();
      },
    });
  }

  // Use shared helper from utils/search-params if needed for other conversions
}
