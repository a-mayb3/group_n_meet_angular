import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { timeout } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { EventResultCard } from '../../event-result-card/event-result-card';
import { buildSearchParams } from '../../utils/search-params';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, EventResultCard],
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
    // If resolver provided results, use them first and skip the initial queryParamMap trigger
    let skipFirstQueryParam = false;
    const resolved =
      (this.route.snapshot && (this.route.snapshot.data as any)?.['searchResults']) ?? null;
    if (resolved && Array.isArray(resolved)) {
      this.results = resolved;
      this.loading = false;
      skipFirstQueryParam = true;
    }

    // Also listen to route.data for future resolver-provided results
    this.route.data.subscribe((data) => {
      if (data && data['searchResults']) {
        this.results = data['searchResults'];
        this.loading = false;
      }
    });

    this.route.queryParamMap.subscribe((params) => {
      if (skipFirstQueryParam) {
        skipFirstQueryParam = false;
        return;
      }
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
        this.performSearch(
          buildSearchParams({
            name: this.name,
            organizer_group_name: this.organizer_group_name,
            place: this.place,
            start_time_from: this.start_time_from,
            start_time_to: this.start_time_to,
            end_time_from: this.end_time_from,
            end_time_to: this.end_time_to,
          }),
        );
      } else {
        this.results = [];
      }
    });
  }

  onSubmit(): void {
    const params = buildSearchParams({
      name: this.name,
      organizer_group_name: this.organizer_group_name,
      place: this.place,
      start_time_from: this.start_time_from,
      start_time_to: this.start_time_to,
      end_time_from: this.end_time_from,
      end_time_to: this.end_time_to,
    });
    this.router.navigate(['/search'], { queryParams: params });
  }

  private buildParams(): { [key: string]: string } {
    // keep for compatibility but delegate to shared helper
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
