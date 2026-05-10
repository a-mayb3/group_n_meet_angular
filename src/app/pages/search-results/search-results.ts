import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { EventsList } from '../../events-list/events-list';
import { buildSearchParams, formatLocalDateTime } from '../../utils/search-params';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, EventsList],
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

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const initialParams = this.route.snapshot.queryParamMap;
    this.applyQueryParams(initialParams);

    if (this.hasSearchTerms(initialParams)) {
      this.performSearch(this.buildQueryParams());
    }

    this.route.queryParamMap.subscribe((params: ParamMap) => {
      this.applyQueryParams(params);
      if (this.hasSearchTerms(params)) {
        this.performSearch(this.buildQueryParams());
      } else {
        this.results = [];
        this.loading = false;
        this.error = '';
      }
    });
  }

  onSubmit(): void {
    this.loading = true;
    this.error = '';
    this.router.navigate(['/search'], { queryParams: this.buildQueryParams() });
  }

  private applyQueryParams(params: ParamMap): void {
    this.name = params.get('name') ?? '';
    this.organizer_group_name = params.get('organizer_group_name') ?? '';
    this.place = params.get('place') ?? '';
    this.start_time_from = formatLocalDateTime(params.get('start_time_from') ?? '') ?? '';
    this.start_time_to = formatLocalDateTime(params.get('start_time_to') ?? '') ?? '';
    this.end_time_from = formatLocalDateTime(params.get('end_time_from') ?? '') ?? '';
    this.end_time_to = formatLocalDateTime(params.get('end_time_to') ?? '') ?? '';
  }

  private hasSearchTerms(params: ParamMap): boolean {
    return [
      params.get('name'),
      params.get('organizer_group_name'),
      params.get('place'),
      params.get('start_time_from'),
      params.get('start_time_to'),
      params.get('end_time_from'),
      params.get('end_time_to'),
    ].some((value) => !!value);
  }

  private buildQueryParams(): { [key: string]: string } {
    return buildSearchParams({
      name: this.name,
      organizer_group_name: this.organizer_group_name,
      place: this.place,
      start_time_from: this.start_time_from,
      start_time_to: this.start_time_to,
      end_time_from: this.end_time_from,
      end_time_to: this.end_time_to,
    });
  }

  private performSearch(params: { [key: string]: string }): void {
    this.loading = true;
    this.error = '';

    this.api
      .get<any>('/events/search', params)
      .pipe(timeout(10000))
      .subscribe({
        next: (resp) => {
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
          this.error = err?.error?.message || 'Failed to load search results';
          this.loading = false;
        },
      });
  }
}
