import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { SearchResultsComponent } from './pages/search-results/search-results';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AuthGuard } from './guards/auth.guard';
import { EventPageComponent } from './pages/event/event';
import { SearchResolver } from './resolvers/search.resolver';
import { DashboardResolver } from './resolvers/dashboard.resolver';
import { EventResolver } from './resolvers/event.resolver';
import { ProfileResolver } from './resolvers/profile.resolver';
import { RsvpsResolver } from './resolvers/rsvps.resolver';
import { ProfilePageComponent } from './pages/profile/profile';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'search', component: SearchResultsComponent, resolve: { searchResults: SearchResolver } },
  { path: 'event/:id', component: EventPageComponent, resolve: { event: EventResolver } },
  { path: 'profile', component: ProfilePageComponent, resolve: { profile: ProfileResolver } },
  { path: 'profile/:id', component: ProfilePageComponent, resolve: { profile: ProfileResolver } },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    resolve: { dashboardUser: DashboardResolver, rsvps: RsvpsResolver },
  },
  {
    path: '',
    component: DashboardComponent,
    canActivate: [AuthGuard],
    resolve: { dashboardUser: DashboardResolver, rsvps: RsvpsResolver },
  },
];
