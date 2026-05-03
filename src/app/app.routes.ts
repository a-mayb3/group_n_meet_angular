import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { SearchResultsComponent } from './pages/search-results/search-results';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'search', component: SearchResultsComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: '', component: DashboardComponent, canActivate: [AuthGuard] },
];
