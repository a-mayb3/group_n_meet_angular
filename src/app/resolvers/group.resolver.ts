import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Observable, from, of } from 'rxjs';
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
export class GroupResolver implements Resolve<any | null> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);
    return this.resolveById(id);
  }

  resolveById(id: string): Observable<any | null> {
    const endpoints = [`/org/${id}`, `/org/${id}/`];

    return from(endpoints).pipe(
      concatMap((ep) =>
        this.api.get<any>(ep).pipe(
          rxTimeout(10000),
          map((resp) => (resp as any)?.data ?? resp),
          catchError(() => of(null)),
        ),
      ),
      filter((x) => x != null),
      take(1),
      defaultIfEmpty(null),
      map((groupPayload) => {
        if (!groupPayload) return null;
        return Array.isArray(groupPayload) ? groupPayload[0] : groupPayload;
      }),
      catchError(() => of(null)),
    );
  }
}
