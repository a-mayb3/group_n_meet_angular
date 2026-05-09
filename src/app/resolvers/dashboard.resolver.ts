import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { take, catchError, switchMap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class DashboardResolver implements Resolve<any | null> {
  constructor(private auth: AuthService) {}

  resolve(): Observable<any | null> {
    // Try existing currentUser$ first, otherwise attempt to load from backend
    return this.auth.currentUser$.pipe(
      take(1),
      switchMap((user) => {
        if (user) return of(user);
        return this.auth.loadCurrentUser();
      }),
      catchError(() => of(null)),
    );
  }
}
