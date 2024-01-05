import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { PageNotFoundComponent } from './components/page-not-found/page-not-found.component';

export const routes: Routes = [
    
    { path: 'home', component: HomeComponent, title: 'Home', data: { animation: 'HomePage'} },

    { path: '', redirectTo: 'home', pathMatch: 'full' },
    
    { path: '**', component: PageNotFoundComponent, title: '404 - Page Not Found', data: { animation: 'NotFoundPage'}}

];
