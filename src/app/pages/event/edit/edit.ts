import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { generateDescriptionSuggestion } from '../../../utils/description';
import { isoFromDateTimeLocal } from '../../../utils/search-params';
import { timeout } from 'rxjs/operators';
import { from, of } from 'rxjs';
import {
  concatMap,
  map,
  catchError,
  filter,
  take,
  defaultIfEmpty,
  timeout as rxTimeout,
} from 'rxjs/operators';

@Component({
  selector: 'app-edit-event',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './edit.html',
  styleUrls: ['./edit.css'],
})
export class EditEventComponent implements OnInit {
  eventForm!: FormGroup;
  loading = false;
  generatingDescription = false;
  submitted = false;
  error = '';
  success = '';
  descriptionError = '';

  event: any | null = null;
  eventId: string | null = null;
  organizerGroups: any[] = [];
  loadingGroups = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
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

    const id =
      (this.route.snapshot.data as any)?.event?.id ??
      (this.route.snapshot.data as any)?.event?.pk ??
      (this.route.snapshot.data as any)?.event?._id ??
      (window.history.state as any)?.event?.id ??
      (window.history.state as any)?.event?.pk ??
      (window.history.state as any)?.event?._id ??
      this.route.snapshot.paramMap.get('id');
    this.eventId = id ? String(id) : null;

    if (this.eventId) {
      this.loadEvent(this.eventId);
    }
  }

  get f() {
    return this.eventForm.controls;
  }

  private loadOrganizerGroups(): void {
    this.loadingGroups = true;
    this.api
      .get<any>('/me/get_orgs')
      .pipe(timeout(10000))
      .subscribe({
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
          this.cdr.detectChanges();
        },
      });
  }

  private loadEvent(id: string): void {
    this.loading = true;
    this.error = '';

    const endpoints = [`/events/${id}`, `/events/${id}/`, `/event/${id}`, `/event/${id}/`];

    from(endpoints)
      .pipe(
        concatMap((endpoint) =>
          this.api.get<any>(endpoint).pipe(
            rxTimeout(10000),
            map((resp) => (resp as any)?.data ?? resp),
            catchError(() => of(null)),
          ),
        ),
        filter((payload) => payload != null),
        take(1),
        defaultIfEmpty(null),
      )
      .subscribe({
        next: (payload) => {
          if (!payload) {
            this.loading = false;
            this.error = `Event ${id} not found`;
            this.cdr.detectChanges();
            return;
          }

          const eventObj = Array.isArray(payload) ? (payload[0] ?? null) : (payload ?? null);
          this.event = eventObj;
          this.eventForm.patchValue({
            name: this.event?.name ?? '',
            description: this.event?.description ?? '',
            start_time: this.toDateTimeLocal(this.event?.start_time ?? ''),
            end_time: this.toDateTimeLocal(this.event?.end_time ?? ''),
            place: this.event?.place ?? '',
            organizer_group_id:
              this.event?.organizer_group_id ??
              this.event?.group_id ??
              this.event?.organizer?.id ??
              '',
          });
          // Ensure template updates reflect patched form values (start/end inputs)
          this.cdr.detectChanges();
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.loading = false;
          this.error = `Event ${id} not found`;
          this.cdr.detectChanges();
        },
      });
  }

  onOrganizerGroupChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'create-new') {
      this.eventForm.get('organizer_group_id')?.setValue('');
      this.router.navigate(['/organizer-groups', 'new']);
    }
  }

  generateDescription(): void {
    if (this.generatingDescription || this.loading) return;

    this.descriptionError = '';
    this.generatingDescription = true;

    generateDescriptionSuggestion(this.api, this.eventForm)
      .pipe(timeout(10000))
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
    this.success = '';
    if (this.eventForm.invalid || !this.eventId) return;

    this.loading = true;
    const body: any = {
      name: this.f['name'].value,
      description: this.f['description'].value || undefined,
      start_time: isoFromDateTimeLocal(this.f['start_time'].value) || undefined,
      end_time: isoFromDateTimeLocal(this.f['end_time'].value) || undefined,
      place: this.f['place'].value?.trim() || undefined,
      organizer_group_id: this.f['organizer_group_id'].value,
    };

    this.api
      .put<any>(`/events/${this.eventId}`, body)
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          this.loading = false;
          const payload = (resp as any)?.data ?? resp;
          const id = payload?.id ?? payload?.pk ?? payload?._id ?? this.eventId;
          this.success = 'Event updated successfully';
          this.cdr.detectChanges();
          if (id) {
            this.router.navigate(['/event', String(id)]);
          } else {
            this.router.navigateByUrl('/dashboard');
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to update event';
          this.cdr.detectChanges();
        },
      });
  }

  private toDateTimeLocal(value: string | null | undefined): string {
    if (!value) return '';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return '';
      // Convert to local YYYY-MM-DDTHH:mm
      const tzOffset = d.getTimezoneOffset();
      const local = new Date(d.getTime() - tzOffset * 60000);
      return local.toISOString().slice(0, 16);
    } catch {
      return '';
    }
  }
  // ISO conversion uses shared helper from utils/search-params

  cancelEvent(): void {
    if (!this.eventId) return;
    if (!confirm('Are you sure you want to cancel this event? This action may be irreversible.'))
      return;

    this.loading = true;
    this.error = '';

    this.api
      .delete<any>(`/events/${this.eventId}/cancel`)
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          this.loading = false;
          // After cancel, navigate back to event page or dashboard
          const payload = (resp as any)?.data ?? resp;
          const id = payload?.id ?? payload?.pk ?? payload?._id ?? this.eventId;
          this.cdr.detectChanges();
          this.router.navigate(['/event', String(id)]);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to cancel event';
          this.cdr.detectChanges();
        },
      });
  }
}
