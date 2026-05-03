import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './search-results.html',
  styleUrls: ['./search-results.css'],
})
export class SearchResultsComponent implements OnInit {
  name = '';
  organizer_group_name = '';
  place = '';
  start_time_from = '';
  start_time_to = '';
  end_time_from = '';
  end_time_to = '';

  results: any[] = [];
  loading = false;
  error = '';

  constructor(private api: ApiService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.name = params.get('name') ?? '';
      this.organizer_group_name = params.get('organizer_group_name') ?? '';
      this.place = params.get('place') ?? '';
      this.start_time_from = params.get('start_time_from') ?? '';
      this.start_time_to = params.get('start_time_to') ?? '';
      this.end_time_from = params.get('end_time_from') ?? '';
      this.end_time_to = params.get('end_time_to') ?? '';

      const hasAny = [
        this.name,
        this.organizer_group_name,
        this.place,
        this.start_time_from,
        this.start_time_to,
        this.end_time_from,
        this.end_time_to,
      ].some((v) => !!v);

      if (hasAny) {
        this.performSearch(this.buildParams());
      } else {
        this.results = [];
      }
    });
  }

  onSubmit(): void {
    this.router.navigate(['/search'], { queryParams: this.buildParams() });
  }

  private buildParams(): { [key: string]: string } {
    const params: { [key: string]: string } = {};
    if (this.name) params['name'] = this.name;
    if (this.organizer_group_name) params['organizer_group_name'] = this.organizer_group_name;
    if (this.place) params['place'] = this.place;
    if (this.start_time_from) params['start_time_from'] = this.formatLocalDateTime(this.start_time_from);
    if (this.start_time_to) params['start_time_to'] = this.formatLocalDateTime(this.start_time_to);
    if (this.end_time_from) params['end_time_from'] = this.formatLocalDateTime(this.end_time_from);
    if (this.end_time_to) params['end_time_to'] = this.formatLocalDateTime(this.end_time_to);
    return params;
  }

  private formatLocalDateTime(value: string): string {
    // input[type=datetime-local] yields values like 'YYYY-MM-DDTHH:mm' (no seconds)
    // Backend expects a naive datetime; append seconds if missing.
    if (!value) return value;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
      return `${value}:00`;
    }
    return value;
  }

  private performSearch(params: { [key: string]: string }): void {
    this.loading = true;
    this.error = '';

    this.api
      .get<any>('/events/search', params)
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
          // ApiService returns ApiResponse<T>, but some backends return T directly.
          // eslint-disable-next-line no-console
          console.log('GET /events/search response', resp);
          const payload = (resp as any)?.data ?? resp;
          if (Array.isArray(payload)) {
            this.results = payload;
          } else if (payload && Array.isArray(payload.results)) {
            this.results = payload.results;
          } else if (payload && Array.isArray(payload.items)) {
            this.results = payload.items;
          } else if (payload) {
            this.results = [payload];
          } else {
            this.results = [];
          }
          this.loading = false;
        },
        error: (err) => {
          // eslint-disable-next-line no-console
          console.error('Failed to load /events/search', err);
          this.error = err?.error?.message || 'Failed to load search results';
          this.loading = false;
        },
      });
  }
}
