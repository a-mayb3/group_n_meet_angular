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
      concatMap((found) => {
        if (!found) {
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
        }

        // If we found a group, try to attach its events via /org/{id}/events/
        const groupObj = Array.isArray(found) ? found[0] : found;
        const gid = groupObj?.id ?? groupObj?.pk ?? groupObj?._id ?? id;
        return this.api.get<any>(`/org/${gid}/events/`).pipe(
          rxTimeout(10000),
          map((eventsResp) => {
            const eventsPayload = (eventsResp as any)?.data ?? eventsResp;
            const events = Array.isArray(eventsPayload)
              ? eventsPayload
              : eventsPayload && typeof eventsPayload === 'object'
              ? eventsPayload.results ?? eventsPayload.items ?? []
              : [];
            try {
              (groupObj as any).events = events;
            } catch {
              // ignore assignment errors
            }
            return groupObj;
          }),
          catchError(() => of(groupObj)),
        );
      }),
      catchError(() => of(null)),
    );
  }
}