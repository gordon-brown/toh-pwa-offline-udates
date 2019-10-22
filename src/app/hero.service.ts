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
  private db: any;

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
    if (!this.offlineService.isOnline)
    {
      this.db.table("hero").toArray().then(h =>
      {
        return of(h).pipe(
          tap(_ => console.log('return heroes from IndexDB')),
          catchError(this.handleError<Hero[]>('getHeroes from IndexDB', []))
          );
      })
    }
    else {
      return this.http.get<Hero[]>(this.heroesUrl)
      .pipe(
        tap(_ => this.log('fetched heroes')),
        catchError(this.handleError<Hero[]>('getHeroes', []))
      );
    }
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

    this.AddToOfflineTables(hero);

    return (this.offlineService.isOnline) ?
      this.http.post<Hero>(this.heroesUrl, hero, this.httpOptions).pipe(
        tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)),
        catchError(this.handleError<Hero>('addHero')))
        :
      of(hero)

  }

  private AddToOfflineTables(hero: Hero) {
    this.db.hero.orderBy('id').last().then(o => {
      hero.id = o.id + 1;
      if (!this.offlineService.isOnline) {
        this.InsertIntoHeroAddTable(hero);
      }
      this.InsertIntoHeroTable(hero);
    });
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
        this.sendItemsFromIndexedDb();
      } else {
        console.log('went offline, storing in indexdb');
      }
    });
  }
  sendItemsFromIndexedDb() {
    console.log('Register to Events. Online');
  }

  private listenToEvents(offlineService: OfflineService) {

    offlineService.connectionChanged.subscribe(online => {
      console.log('Listen to events ' + online);
      if (online) {
        console.log('went online');
        console.log('sending all stored item ids');

        //send _ids for bulk delete
        // todo redo this
        this.sendItemsToDelete();

      } else {
        console.log('went offline, storing ids to delete later, in indexdb');
      }
    });
  }
  sendItemsToDelete() {
   console.log('Listen to events. Online');
  }

  // ---------- create the hero database
  private createIndexedDatabase(){

    console.log('creating Hero DB');
    let db_name = "hero_database"
    this.db = new Dexie(db_name);
    this.CreateTables();

    this.db.open()
      .then(() => {
        console.log('opened database ' + db_name)
        this.InitializeHeroTable();
      })
      .catch(function (err) {
        console.error (err.stack || err);
      });

  }

  private CreateTables() {
    this.db.version(1).stores({
      hero: "id,name",
      hero_add: "id",
      hero_update: "id",
      hero_delete: "id"
    });
  }

  private InitializeHeroTable() {
    this.getHeroes().subscribe(h => {
      console.log('populate heroes DB');
      this.heroes = h;
      this.ClearTables();
      var i: number;
      for (i = 0; i < this.heroes.length; i++) {
        this.InsertIntoHeroTable(this.heroes[i]);
      }
    });
  }

  private ClearTables() {
    this.db.hero.clear();
    this.db.hero_add.clear();
    this.db.hero_update.clear();
    this.db.hero_delete.clear();
  }

  private InsertIntoHeroTable(hero: Hero) {
    this.db.hero.add({id: hero.id, name: hero.name})
      .catch(e => {
        console.error('Insert Into Heroes Error: ' + (e.stack || e));
      });
    }

  private InsertIntoHeroAddTable(hero: Hero) {
    this.db.hero_add.add({id: hero.id, name: hero.name})
      .then(() => {
        console.log('Added hero ' + hero.name);
      })
      .catch(e => {
        console.error('Insert Into Heroes Error: ' + (e.stack || e));
      });
    }

}
