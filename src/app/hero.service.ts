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

  heroes: Hero[];

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private readonly offlineService: OfflineService,
    private http: HttpClient,
    private messageService: MessageService)
    {
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

  // ---------- create the hero database
  private createIndexedDatabase(){

    console.log('createing Hero DB');
    let db_name = "heroes_database"
    this.db = new Dexie(db_name);
    this.db.version(1).stores({
      heroes: "id,name",
      heroes_add: "++id",
      heroes_update: "id",
      heroes_delete: "id"
    });

    this.db.open()
      .then(() => {
        console.log('opened database ' + db_name)
        this.InitializeTable();
      })
      .catch(function (err) {
        console.error (err.stack || err);
      });

   }


  private InitializeTable() {
    this.getHeroes().subscribe(h => {
      console.log('populate heroes DB');
      this.heroes = h;
      this.ClearTables();
      var i: number;
      for (i = 0; i < this.heroes.length; i++) {
        this.InsertIntoHeroesTable(this.heroes[i]);
      }
    });
  }

  private ClearTables() {
    this.db.heroes.clear();
    this.db.heroes_add.clear();
    this.db.heroes_update.clear();
    this.db.heroes_delete.clear();
  }

  // ---------- add hero to the indexedDB on offline mode
  private InsertIntoHeroesTable(hero: Hero) {
    this.db.heroes.add({name: hero.name})
      .catch(e => {
        console.error('Error: ' + (e.stack || e));
      });
    }

}
