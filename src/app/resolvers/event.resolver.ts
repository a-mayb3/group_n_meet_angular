import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Observable, from, of } from 'rxjs';
import { concatMap, map, catchError, filter, take, defaultIfEmpty, timeout as rxTimeout } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class EventResolver implements Resolve<any | null> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);

    const endpoints = [`/events/${id}`, `/events/${id}/`, `/event/${id}`, `/event/${id}/`];

    const tryEndpoints$ = from(endpoints).pipe(
      concatMap((ep) =>
        this.api.get<any>(ep).pipe(
          rxTimeout(10000),
          map((resp) => {
            const payload = (resp as any)?.data ?? resp;
            if (!payload) return null;
            if (Array.isArray(payload)) return payload[0] ?? null;
            if (payload && typeof payload === 'object') {
              // If payload looks like an object event
              if (payload.id || payload.name || payload.event_title) return payload;
              const list = payload.results ?? payload.items ?? [];
              if (Array.isArray(list) && list.length) return list[0];
            }
            return null;
          }),
          catchError(() => of(null)),
        ),
      ),
      filter((x) => x != null),
      take(1),
      defaultIfEmpty(null),
    );

    return tryEndpoints$.pipe(
      concatMap((found) => {
        if (found) return of(found);
        // fallback to search endpoint
        return this.api.get<any>('/events/search', { id }).pipe(
          rxTimeout(10000),
          map((resp) => {
            const payload = (resp as any)?.data ?? resp;
            if (!payload) return null;
            if (Array.isArray(payload) && payload.length) return payload[0];
            if (payload && typeof payload === 'object') return payload.results?.[0] ?? payload.items?.[0] ?? payload ?? null;
            return null;
          }),
          catchError(() => of(null)),
        );
      }),
    );
  }
}
