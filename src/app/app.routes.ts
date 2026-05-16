import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { RegisterComponent } from './pages/register/register';
import { AddOrganizerGroupComponent } from './pages/organizer-groups/add/add';
import { EditOrganizerGroupComponent } from './pages/organizer-groups/edit/edit';
import { CreateEventComponent } from './pages/event/create/create';
import { EditEventComponent } from './pages/event/edit/edit';
import { SearchResultsComponent } from './pages/search-results/search-results';
import { OrganizerGroupPageComponent } from './pages/organizer-groups/view/view';
import { GroupResolver } from './resolvers/group.resolver';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AuthGuard } from './guards/auth.guard';
import { EventPageComponent } from './pages/event/event';
import { SearchResolver } from './resolvers/search.resolver';
import { DashboardResolver } from './resolvers/dashboard.resolver';
import { EventResolver } from './resolvers/event.resolver';
import { ProfileResolver } from './resolvers/profile.resolver';
import { RsvpsResolver } from './resolvers/rsvps.resolver';
import { ProfilePageComponent } from './pages/profile/profile';
import { RsvpsPageComponent } from './pages/rsvps/rsvps';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'organizer-groups/new', component: AddOrganizerGroupComponent, canActivate: [AuthGuard] },
  {
    path: 'organizer-groups/:id/edit',
    component: EditOrganizerGroupComponent,
    canActivate: [AuthGuard],
    resolve: { group: GroupResolver },
  },
  {
    path: 'event/:id/edit',
    component: EditEventComponent,
    canActivate: [AuthGuard],
    resolve: { event: EventResolver },
  },
  { path: 'event/new', component: CreateEventComponent, canActivate: [AuthGuard] },
  {
    path: 'search',
    component: SearchResultsComponent,
  },
  { path: 'org/:id', component: OrganizerGroupPageComponent, resolve: { group: GroupResolver } },
  {
    path: 'event/:id',
    component: EventPageComponent,
    resolve: { event: EventResolver, rsvps: RsvpsResolver },
  },
  { path: 'profile/:id', component: ProfilePageComponent, resolve: { profile: ProfileResolver } },
  {
    path: 'rsvps',
    component: RsvpsPageComponent,
    canActivate: [AuthGuard],
  },
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
