import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, startWith } from 'rxjs';
import { Session } from '../models/session.model';
@Injectable({
  providedIn: 'root'
})
export class SessionService {
  private emptySession: Session = {
    createdDate: new Date(),
    lastAccessDate: new Date(),
    ongoing: false, // when each player is ready the ongoing flag is set to true
  }
  sessionSubject = new BehaviorSubject<Session>(this.emptySession);

  ngOnInit() {
   
  }

  ngOnDestroy() {
  }


  getCurrentSession() : Observable<Session> {
    return this.sessionSubject.asObservable();
  }
  
  setSession(newSession: Session): void {
    this.sessionSubject.next(newSession);
  }
 

 
}
