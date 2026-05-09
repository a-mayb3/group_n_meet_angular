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
export class SearchResolver implements Resolve<any[] | null> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any[] | null> {
    const qp = route.queryParamMap;
    const params: { [k: string]: string } = {};
    qp.keys.forEach((k) => {
      const v = qp.get(k);
      if (v) params[k] = v;
    });

    const hasAny = Object.keys(params).length > 0 && Object.values(params).some((v) => !!v);
    if (!hasAny) return of(null);

    return this.api.get<any>('/events/search', params).pipe(
      rxTimeout(15000),
      map((resp) => {
        const payload = (resp as any)?.data ?? resp;
        if (!payload) return null;
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.results)) return payload.results;
        if (payload && Array.isArray(payload.items)) return payload.items;
        // If single object returned, wrap it
        return [payload];
      }),
      catchError(() => of(null)),
    );
  }
}
