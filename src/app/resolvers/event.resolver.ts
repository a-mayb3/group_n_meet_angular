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
import { GroupResolver } from './group.resolver';

@Injectable({ providedIn: 'root' })
export class EventResolver implements Resolve<any | null> {
  constructor(
    private api: ApiService,
    private groupResolver: GroupResolver,
  ) {}

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
        if (!found) {
          // no fallback to search - resolve as null when not found
          return of(null);
        }

        // If we found an event, try to resolve organizer group name if only an id is present
        const gid =
          (found as any).organizer_group_id ??
          (found as any).organizer_group ??
          (found as any).group_id ??
          (found as any).organizer_id ??
          null;
        if (!gid || (found as any).organizer_group_name) return of(found);

        return this.groupResolver.resolveById(String(gid)).pipe(
          map((gp) => {
            const groupObj = Array.isArray(gp) ? gp[0] : gp;
            const name =
              groupObj?.name ??
              groupObj?.title ??
              groupObj?.display_name ??
              groupObj?.group_name ??
              groupObj?.full_name ??
              null;
            if (name) (found as any).organizer_group_name = name;
            return found;
          }),
          catchError(() => of(found)),
        );
      }),
    );
  }
}
