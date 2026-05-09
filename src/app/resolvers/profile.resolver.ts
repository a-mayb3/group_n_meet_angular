import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Observable, of, from } from 'rxjs';
import {
  concatMap,
  map,
  catchError,
  filter,
  take,
  defaultIfEmpty,
  timeout as rxTimeout,
} from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ProfileResolver implements Resolve<any | null> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any | null> {
    const id = route.paramMap.get('id');
    if (!id) {
      // No id -> try /me
      return this.api.get<any>('/me/').pipe(
        rxTimeout(10000),
        map((resp) => (resp as any)?.data ?? resp),
        catchError(() => of(null)),
      );
    }

    const endpoints = [
      `/users/${id}`,
      `/users/${id}/`,
      `/user/${id}`,
      `/user/${id}/`,
      `/profiles/${id}`,
      `/profiles/${id}/`,
    ];

    const tryEndpoints$ = from(endpoints).pipe(
      concatMap((ep) =>
        this.api.get<any>(ep).pipe(
          rxTimeout(10000),
          map((resp) => {
            const payload = (resp as any)?.data ?? resp;
            if (!payload) return null;
            if (Array.isArray(payload)) return payload[0] ?? null;
            if (payload && typeof payload === 'object') return payload;
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
        return this.api.get<any>('/users/search', { id }).pipe(
          rxTimeout(10000),
          map((resp) => {
            const payload = (resp as any)?.data ?? resp;
            if (!payload) return null;
            if (Array.isArray(payload) && payload.length) return payload[0];
            if (payload && typeof payload === 'object')
              return payload.results?.[0] ?? payload.items?.[0] ?? payload ?? null;
            return null;
          }),
          catchError(() => of(null)),
        );
      }),
    );
  }
}
