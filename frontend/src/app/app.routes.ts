import { Routes } from '@angular/router';
import { LoginPageComponent } from './pages/login-page.component';
import { RegisterPageComponent } from './pages/register-page.component';
import { AdminDashboardComponent } from './pages/admin-dashboard.component';
import { UserDashboardComponent } from './pages/user-dashboard.component';
import { adminGuard, authGuard } from './guards/auth.guard';

export const routes: Routes = [
	{ path: '', pathMatch: 'full', redirectTo: 'login' },
	{ path: 'login', component: LoginPageComponent },
	{ path: 'register', component: RegisterPageComponent },
	{ path: 'admin', component: AdminDashboardComponent, canActivate: [authGuard, adminGuard] },
	{ path: 'dashboard', component: UserDashboardComponent, canActivate: [authGuard] },
	{ path: '**', redirectTo: 'login' }
];
