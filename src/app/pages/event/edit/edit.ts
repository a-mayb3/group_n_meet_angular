import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { timeout } from 'rxjs/operators';

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
  submitted = false;
  error = '';
  success = '';

  event: any | null = null;
  eventId: string | null = null;
  organizerGroups: any[] = [];
  loadingGroups = false;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private router: Router,
    private route: ActivatedRoute,
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

    const resolvedEvent = (this.route.snapshot.data as any)?.event ?? null;
    const navEvent = (window.history.state as any)?.event ?? null;
    this.event = resolvedEvent ?? navEvent ?? null;

    const id =
      this.event?.id ?? this.event?.pk ?? this.event?._id ?? this.route.snapshot.paramMap.get('id');
    this.eventId = id ? String(id) : null;

    if (this.event) {
      this.eventForm.patchValue({
        name: this.event.name ?? '',
        description: this.event.description ?? '',
        start_time: this.toDateTimeLocal(this.event.start_time ?? ''),
        end_time: this.toDateTimeLocal(this.event.end_time ?? ''),
        place: this.event.place ?? '',
        organizer_group_id:
          this.event.organizer_group_id ?? this.event.group_id ?? this.event.organizer?.id ?? '',
      });
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
        },
        error: () => {
          this.loadingGroups = false;
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

  onSubmit(): void {
    this.submitted = true;
    this.error = '';
    this.success = '';
    if (this.eventForm.invalid || !this.eventId) return;

    this.loading = true;
    const body: any = {
      name: this.f['name'].value,
      description: this.f['description'].value || undefined,
      start_time: this.isoFromDateTimeLocal(this.f['start_time'].value) || undefined,
      end_time: this.isoFromDateTimeLocal(this.f['end_time'].value) || undefined,
      place: this.f['place'].value || undefined,
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
          if (id) {
            this.router.navigate(['/event', String(id)]);
          } else {
            this.router.navigateByUrl('/dashboard');
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to update event';
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

  private isoFromDateTimeLocal(value: string | null | undefined): string | null {
    if (!value) return null;
    try {
      // value like 'YYYY-MM-DDTHH:mm' interpreted as local time
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return d.toISOString();
    } catch {
      return null;
    }
  }

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
          this.router.navigate(['/event', String(id)]);
        },
        error: (err) => {
          this.loading = false;
          this.error = err?.error?.message || 'Failed to cancel event';
        },
      });
  }
}
