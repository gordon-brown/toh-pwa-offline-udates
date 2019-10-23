import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, of, from } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import Dexie from 'dexie'; // wrapper for IndexedDB
import { Hero } from './hero';
import { MessageService } from './message.service';
import { OfflineService } from './offline.service';

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
    }

  /** GET heroes from the server */
  getHeroes (): Observable<Hero[]> {
    if (!this.offlineService.isOnline)
    {
      return from(this.getHeroesFromDB());
    }
    else {
      return this.http.get<Hero[]>(this.heroesUrl)
      .pipe(
        tap(_ => this.log('fetched heroes')),
        catchError(this.handleError<Hero[]>('getHeroes', []))
      );
    }
  }

  private async getHeroesFromDB(){
    console.log('getting Heroes from Index DB');
    return await this.db.hero.toArray();
  }

  private async getHeroFromDB(id: number){
    console.log('getting Hero from Index DB');
    return await await this.db.hero
      .where('id')
      .equals(id)
      .first(function(item) {
        return item;
    })
  }

  private async searchHeroesFromDB(searchTerm: string) {
    console.log('getting Heroes from Index DB');
    return await this.db.hero.where("name").startsWith(searchTerm).toArray();;
  }

  /** GET hero by id. Will 404 if id not found */
  getHero(id: number): Observable<Hero> {
    if (!this.offlineService.isOnline)
    {
      return from(this.getHeroFromDB(id));
    }
    else
    {
      const url = `${this.heroesUrl}/${id}`;
      return this.http.get<Hero>(url).pipe(
        tap(_ => this.log(`fetched hero id=${id}`)),
        catchError(this.handleError<Hero>(`getHero id=${id}`))
      );
    }
  }

  /* GET heroes whose name contains search term */
  searchHeroes(term: string): Observable<Hero[]> {
    if (!term.trim()) {
      // if not search term, return empty hero array.
      return of([]);
    }
    if (!this.offlineService.isOnline)
    {
      return from(this.searchHeroesFromDB(term.trim()));
    }
    else {
      return this.http.get<Hero[]>(`${this.heroesUrl}/?name=${term}`).pipe(
        tap(_ => this.log(`found heroes matching "${term}"`)),
        catchError(this.handleError<Hero[]>('searchHeroes', []))
      );
    }
  }

  //////// Save methods //////////
/** POST: add a new hero to the server */
  addHero (hero: Hero): Observable<Hero> {

    this.AddToHeroAddTable(hero);

    return this.AddHeroToDB(hero)

  }

  private AddHeroToDB(hero: Hero): Observable<Hero> {
    return (this.offlineService.isOnline) ?
      this.http.post<Hero>(this.heroesUrl, hero, this.httpOptions).pipe(tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)), catchError(this.handleError<Hero>('addHero')))
      :
      of(hero);
  }

  private AddToHeroAddTable(hero: Hero) {
    this.db.hero.orderBy('id').last().then(o => {
      hero.id = o.id + 1;
      if (!this.offlineService.isOnline) {
        this.InsertIntoHeroTransactionTable(hero, 'hero_add');
      }
      this.InsertIntoHeroTable(hero);
    });
  }

  private AddToHeroUpdateTable(hero: Hero) {
    if (!this.offlineService.isOnline) {
      this.InsertIntoHeroTransactionTable(hero, 'hero_update');
    }
    this.UpdateFromHeroTable(hero);
  }

  private AddToHeroDeleteTable(hero: Hero) {
    if (!this.offlineService.isOnline) {
      this.InsertIntoHeroTransactionTable(hero, 'hero_delete');
    }
    this.DeleteFromHeroTable(hero);
  }

  /** DELETE: delete the hero from the server */
  deleteHero (hero: Hero): Observable<Hero> {

    this.AddToHeroDeleteTable(hero);

    return this.DeleteHeroFromDB(hero);
  }

  private DeleteHeroFromDB(hero: Hero): Observable<Hero> {

    return (this.offlineService.isOnline) ?

    this.http.delete<Hero>(`${this.heroesUrl}/${hero.id}`, this.httpOptions).pipe(
        tap(_ => this.log(`deleted hero id=${hero.id}`)),
        catchError(this.handleError<Hero>('deleteHero'))
      )
    :
      of(hero);
  }

  private UpdateHeroFromDB(hero: Hero): Observable<Hero> {
    return (this.offlineService.isOnline) ?
        this.http.put(this.heroesUrl, hero, this.httpOptions).pipe(
          tap(_ => this.log(`updated hero id=${hero.id}`)),
          catchError(this.handleError<any>('updateHero'))
        )
      :
        of(hero);
  }


  /** PUT: update the hero on the server */
  updateHero (hero: Hero): Observable<any> {
    this.AddToHeroUpdateTable(hero);

    return this.UpdateHeroFromDB(hero);
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

  async sendItemsFromIndexedDb() {
    console.log('Inserting into db from hero_add');

    var items = await this.db.hero_add.toArray();
    items.forEach(h => {
      this.AddHeroToDB(h);
    })

    this.db.hero_add.clear();

    console.log('update from hero_update');

    items = await this.db.hero_update.toArray();
    items.forEach(h => {
      this.UpdateHeroFromDB(h);
    })

    this.db.hero_update.clear();

    console.log('deleting from hero_delete');

    items = await this.db.hero_delete.toArray();
    items.forEach(h => {
      this.DeleteHeroFromDB(h);
    })

    this.db.hero_delete.clear();

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
    this.db.table('hero').add({id: hero.id, name: hero.name})
      .catch(e => {
        console.error('Insert Into Heroes Error: ' + (e.stack || e));
    });
  }

  private UpdateFromHeroTable(hero: Hero) {
    this.db.table('hero').update(hero.id, {name: hero.name})
    .catch(e => {
      console.error('Update Into Heroes Error: ' + (e.stack || e));
    });
  }

  private DeleteFromHeroTable(hero: Hero) {
    this.db.table('hero').where('id').equals(hero.id).delete()
      .catch(e => {
        console.error('Delete from Heroes Error: ' + (e.stack || e));
    });
  }

  private InsertIntoHeroTransactionTable(hero: Hero, tableName: string) {
    this.db.table(tableName).add({id: hero.id, name: hero.name})
      .then(() => {
        console.log('Table ' + tableName + ' ' + hero.name);
      })
      .catch(e => {
        console.error('Insert Into ' + tableName + 'Error:' + (e.stack || e));
    });
  }

}
