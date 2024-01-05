import { Injectable } from '@angular/core';
import { Subject, Observable, takeUntil, BehaviorSubject, startWith } from 'rxjs';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Injectable({
  providedIn: 'root'
})
export class ScreenSizeService {
  private destroyed = new Subject<void>();
  private currentScreenSizeSubject = new BehaviorSubject<string>('Unknown');

  // Expose the current screen size as an observable
  currentScreenSize$: Observable<string> = this.currentScreenSizeSubject
    .asObservable()
    .pipe(startWith(this.currentScreenSizeSubject.value)); // emit the current value immediately

  private displayNameMap = new Map([
    [Breakpoints.XSmall, 'XSmall'],
    [Breakpoints.Small, 'Small'],
    [Breakpoints.Medium, 'Medium'],
    [Breakpoints.Large, 'Large'],
    [Breakpoints.XLarge, 'XLarge'],
  ]);

  constructor(private breakpointObserver: BreakpointObserver) {
    this.observeScreenSizeChanges();
  }

  private observeScreenSizeChanges() {
    this.breakpointObserver
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntil(this.destroyed))
      .subscribe(result => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            const screenSize = this.displayNameMap.get(query) ?? 'Unknown';
            this.currentScreenSizeSubject.next(screenSize);
          }
        }
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }
}

