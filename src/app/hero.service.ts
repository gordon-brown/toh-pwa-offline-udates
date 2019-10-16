import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import Dexie from 'dexie'; // wrapper for IndexedDB
import { Hero } from './hero';
import { MessageService } from './message.service';
import { OfflineService } from './../../offline.service';


@Injectable({ providedIn: 'root' })
export class HeroService {

  private heroesUrl = 'api/heroes';  // URL to web api

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    // private readonly OfflineService,
    private readonly offlineService: OfflineService,
    private http: HttpClient,
    private messageService: MessageService) {
      // todo fill this out
      this.createIndexedDatabase();
      this.registerToEvents(offlineService);
      this.listenToEvents(offlineService);
    }

  /** GET heroes from the server */
  getHeroes (): Observable<Hero[]> {
    return this.http.get<Hero[]>(this.heroesUrl)
      .pipe(
        tap(_ => this.log('fetched heroes')),
        catchError(this.handleError<Hero[]>('getHeroes', []))
      );
  }

  /** GET hero by id. Return `undefined` when id not found */
  getHeroNo404<Data>(id: number): Observable<Hero> {
    const url = `${this.heroesUrl}/?id=${id}`;
    return this.http.get<Hero[]>(url)
      .pipe(
        map(heroes => heroes[0]), // returns a {0|1} element array
        tap(h => {
          const outcome = h ? `fetched` : `did not find`;
          this.log(`${outcome} hero id=${id}`);
        }),
        catchError(this.handleError<Hero>(`getHero id=${id}`))
      );
  }

  /** GET hero by id. Will 404 if id not found */
  getHero(id: number): Observable<Hero> {
    const url = `${this.heroesUrl}/${id}`;
    return this.http.get<Hero>(url).pipe(
      tap(_ => this.log(`fetched hero id=${id}`)),
      catchError(this.handleError<Hero>(`getHero id=${id}`))
    );
  }

  /* GET heroes whose name contains search term */
  searchHeroes(term: string): Observable<Hero[]> {
    if (!term.trim()) {
      // if not search term, return empty hero array.
      return of([]);
    }
    return this.http.get<Hero[]>(`${this.heroesUrl}/?name=${term}`).pipe(
      tap(_ => this.log(`found heroes matching "${term}"`)),
      catchError(this.handleError<Hero[]>('searchHeroes', []))
    );
  }

  //////// Save methods //////////

  /** POST: add a new hero to the server */
  addHero (hero: Hero): Observable<Hero> {
    console.log('addHero ' + this.offlineService.isOnline)
    if (!this.offlineService.isOnline) {
      console.log('adding hero to index db');
      debugger;
      console.log(hero.name);
      hero.id = 1;
      this.addToIndexedDb(hero);
    }
    return this.http.post<Hero>(this.heroesUrl, hero, this.httpOptions).pipe(
      tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)),
      catchError(this.handleError<Hero>('addHero'))
    );
  }

  /** DELETE: delete the hero from the server */
  deleteHero (hero: Hero | number): Observable<Hero> {
    const id = typeof hero === 'number' ? hero : hero.id;
    const url = `${this.heroesUrl}/${id}`;

    return this.http.delete<Hero>(url, this.httpOptions).pipe(
      tap(_ => this.log(`deleted hero id=${id}`)),
      catchError(this.handleError<Hero>('deleteHero'))
    );
  }

  /** PUT: update the hero on the server */
  updateHero (hero: Hero): Observable<any> {
    return this.http.put(this.heroesUrl, hero, this.httpOptions).pipe(
      tap(_ => this.log(`updated hero id=${hero.id}`)),
      catchError(this.handleError<any>('updateHero'))
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T> (operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {

      // TODO: send the error to remote logging infrastructure
      console.error(error); // log to console instead

      // TODO: better job of transforming error for user consumption
      this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  /** Log a HeroService message with the MessageService */
  private log(message: string) {
    this.messageService.add(`HeroService: ${message}`);
  }

  private registerToEvents(offlineService: OfflineService) {

    offlineService.connectionChanged.subscribe(online => {

      console.log(online);
      if (online) {
        console.log('went online');
        console.log('sending all stored items');

        //pass the items to the backend if the connetion is enabled
        // todo redo this
        // this.sendItemsFromIndexedDb();
      } else {
        console.log('went offline, storing in indexdb');
      }
    });

  }

  private listenToEvents(offlineService: OfflineService) {

    offlineService.connectionChanged.subscribe(online => {

      console.log('Listen to events ' + online);
      if (online) {
        console.log('went online');
        console.log('sending all stored item ids');

        //send _ids for bulk delete
        // todo redo this
        // this.sendItemsToDelete();

      } else {
        console.log('went offline, storing ids to delete later, in indexdb');
      }
    });
  }

  private db: any;

  // ---------- create the indexedDB
  private createIndexedDatabase(){

    // Delete Old Existing DB
    let db_name = "heroes_database"
    //if (Dexie.exists(db_name))
    //  Dexie.delete(db_name)

    console.log('createing Hero Database');
    this.db = new Dexie(db_name);
    this.db.version(1).stores({
      heroes: "++id,name"
    });
    this.db.open()
      .then(() => console.log('opened hero database'))
      .catch(function (err) {
        console.error (err.stack || err);
      });
  }

  // ---------- add hero to the indexedDB on offline mode
  private async addToIndexedDb(hero: Hero) {

    console.log('addToIndexedDb');

    this.db.heroes.add({name: hero.name})
      .then(async () => {
        const allItems: any[] = await this.db["heroes"].toArray();
        console.log('saved in DB, DB is now', allItems);
      })
      .catch(e => {
        alert('Error: ' + (e.stack || e));
      });

    }

}
