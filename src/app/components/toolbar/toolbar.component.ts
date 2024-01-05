import { Component, EventEmitter, Output, OnDestroy, Input } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ScreenSizeService } from '../../services/screen-size.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule, RouterModule,
    MatIconModule, MatButtonModule,
  ],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.css']
})
export class ToolbarComponent implements OnDestroy {
  toolbarLongSentence = "Seven seas ~ Confidence - Skybox!"
  toolbarShortSentence = "Seven seas: skybox!"

  currentScreenSize: string = '';
  private destroyed = new Subject<void>();

  @Input() isSessionOn: boolean = false;

  @Output() drawerToggle: EventEmitter<boolean> = new EventEmitter<boolean>();

  constructor(
    private screenSizeService: ScreenSizeService) {
    this.screenSizeService.currentScreenSize$
      .pipe(takeUntil(this.destroyed))
      .subscribe(size => {
        this.currentScreenSize = size;
        // Do any additional logic based on the screen size change
        // console.log(this.currentScreenSize);
      });
  }

  ngOnDestroy() {
    this.destroyed.next();
    this.destroyed.complete();
  }

  onDrawerToggleClick() {
    // Emit an event to notify the parent component to toggle the drawer
    this.drawerToggle.emit(true);
  }

}
