import { Injectable } from '@angular/core';
import { Session } from '../models/session.model';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  db: IDBDatabase | null = null;
  // database is extremely simple
  private storeName: string = 'sessions';
  private keyPath: string = 'createdDate'

  constructor(private sessionService: SessionService) {}

  openDatabase(databaseName: string, version: number) : Promise<Session[]> {
    return new Promise<Session[]>((resolve, reject) => {
      const request = indexedDB.open(databaseName, version);
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if(!db.objectStoreNames.contains(this.storeName)) {
          const objectStore = db.createObjectStore(this.storeName, { keyPath: this.keyPath});
          objectStore.createIndex('lastAccessDate', 'lastAccessDate', { unique: false });
        }
      }

      request.onsuccess = (event: any) => {
        this.db = event.target.result;
        // Get the SESSIONS store
        const transaction = this.db!.transaction(this.storeName, 'readonly');
        const store = transaction.objectStore(this.storeName);
        const sessions: Session[] = [];

        const cursorRequest = store.openCursor();
        cursorRequest.onsuccess = (cursorEvent: any) => {
          const cursor = cursorEvent.target.result;
          if (cursor) {
            sessions.push(cursor.value);
            cursor.continue();
          } else {
            if(sessions.length > 0) {
              console.log(`Got all sessions: ${sessions}`);
              console.log('Setting the last session in the array in the Session Service');
              this.sessionService.setSession(sessions[sessions.length - 1]);
            } else {
              console.log('No saved sessions yet!')
            }
          }
        };

        transaction.oncomplete = () => { resolve(sessions); }

        transaction.onerror = (error) => { 
          console.error('Error opening database:', error);
          reject(error);
        }
      }
    })
  }

  
  getSession(keyPathValue: string): Promise<Session | null> {
    return new Promise<Session | null>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database has not been opened yet!'));
        return;
      }
  
      const transaction = this.db.transaction(this.storeName, 'readonly');
      const store = transaction.objectStore(this.storeName);
  
      const getRequest = store.get(keyPathValue);
  
      getRequest.onsuccess = (event: any) => {
        const user = event.target.result;
        resolve(user);
      };
  
      getRequest.onerror = (error) => {
        console.error(`Error getting player with keyPath ${keyPathValue}:`, error);
        reject(error);
      };
  
      transaction.onerror = (error) => {
        console.error('Error opening transaction:', error);
        reject(error);
      };
    });
  }

  addNewSession(session: Session): Promise<void> {
   
    return this.addSession(session);
  }

  private addSession(session: Session): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database has not been opened yet!'));
        return;
      }
  
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
  
      const addRequest = store.add(session);
  
      addRequest.onsuccess = () => {
        console.log('Success in adding session!')

        resolve();
      };
  
      addRequest.onerror = (error) => {
        console.error('Error adding session:', error);
        reject(error);
      };
  
      transaction.onerror = (error) => {
        console.error('Error opening transaction:', error);
        reject(error);
      };
    });
  }

  removeSession(keyPathValue: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database has not been opened yet!'));
        return;
      }
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);
  
      const deleteRequest = store.delete(keyPathValue);
  
      deleteRequest.onsuccess = () => {
        resolve();
      };
  
      deleteRequest.onerror = (error) => {
        console.error(`Error removing user with keyPath ${keyPathValue}:`, error);
        reject(error);
      };
  
      transaction.onerror = (error) => {
        console.error('Error opening transaction:', error);
        reject(error);
      };
    });
  }

  clearDatabase(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!this.db) {
        // Handle the case where the database is not open yet.
        reject(new Error('Database is not open.'));
        return;
      }
  
      const transaction = this.db.transaction(this.storeName, 'readwrite');
      const store = transaction.objectStore(this.storeName);

      // Clear all data in the 'tracks' object store.
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        console.log('Database cleared.');
      };

      transaction.oncomplete = () => {
        resolve();
      };
  
      transaction.onerror = (event: any) => {
        console.error('Error clearing database:', event.target.error);
        reject(event.target.error);
      };
  
    });
  }

}
