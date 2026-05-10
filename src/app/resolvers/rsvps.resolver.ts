import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ApiService } from '../services/api.service';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout as rxTimeout } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class RsvpsResolver implements Resolve<any[] | null> {
  constructor(private api: ApiService) {}

  resolve(): Observable<any[] | null> {
    return this.api.get<any>('/me/get_rsvps').pipe(
      rxTimeout(10000),
      map((resp) => {
        const payload = (resp as any)?.data ?? resp;
        if (!payload) return null;
        if (Array.isArray(payload)) return payload;
        if (payload && typeof payload === 'object') return payload.results ?? payload.items ?? [];
        return null;
      }),
      catchError(() => of(null)),
    );
  }
}
