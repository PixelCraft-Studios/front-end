import { ApplicationConfig, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy, provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Title } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';


@Injectable({providedIn: 'root'})
export class TemplatePageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }
  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title !== undefined) {
      this.title.setTitle(`Loose Cannon | ${title}`);
    }
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes), 
    provideAnimations(),
    {provide: TitleStrategy, useClass: TemplatePageTitleStrategy},
    provideHttpClient(),
  ]
};


