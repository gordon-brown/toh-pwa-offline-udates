import { IndexDbService } from './index-db.service';
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, of, from } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { Hero } from './hero';
import { MessageService } from './message.service';
import { OfflineService } from './offline.service';

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
    private messageService: MessageService,
    private IndexDbService: IndexDbService)
    {
      this.registerToEvents(offlineService);
      this.IndexDbService.InitializeIndexDB(this.getHeroes());
    }

  /** GET heroes from the server */
  getHeroes (): Observable<Hero[]> {
    if (!this.offlineService.isOnline)
    {
      return from(this.IndexDbService.getHeroesFromDB());
    }
    else {
      return this.http.get<Hero[]>(this.heroesUrl)
      .pipe(
        tap(_ => this.log('fetched heroes')),
        catchError(this.handleError<Hero[]>('getHeroes', []))
      );
    }
  }

  /** GET hero by id. Will 404 if id not found */
  getHero(id: number): Observable<Hero> {
    if (!this.offlineService.isOnline)
    {
      return from(this.IndexDbService.getHeroFromDB(id));
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
      return from(this.IndexDbService.searchHeroesFromDB(term.trim()));
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

    this.IndexDbService.AddToHeroAddTable(hero, this.offlineService.isOnline);

    if (this.offlineService.isOnline) {
      return this.http.post<Hero>(this.heroesUrl, hero, this.httpOptions).pipe(tap((newHero: Hero) => this.log(`added hero w/ id=${newHero.id}`)), catchError(this.handleError<Hero>('addHero')))
    }
    else {
       return of(hero);
    }
  }


  /** DELETE: delete the hero from the server */
  deleteHero (hero: Hero): Observable<Hero> {

    this.IndexDbService.AddToHeroDeleteTable(hero, this.offlineService.isOnline);

    return this.DeleteHeroFromDB(hero);
  }

  private DeleteHeroFromDB(hero: Hero): Observable<Hero> {
    if (this.offlineService.isOnline) {
      return this.http.delete<Hero>(`${this.heroesUrl}/${hero.id}`, this.httpOptions).pipe(
        tap(_ => this.log(`deleted hero id=${hero.id}`)),
        catchError(this.handleError<Hero>('deleteHero'))
      )
    }
    else {
      return of(hero);
    }
  }

  private UpdateHeroFromDB(hero: Hero): Observable<Hero> {
    if (this.offlineService.isOnline) {
      return this.http.put(this.heroesUrl, hero, this.httpOptions).pipe(
        tap(_ => this.log(`updated hero id=${hero.id}`)),
        catchError(this.handleError<any>('updateHero'))
      )
    }
    else {
      return of(hero);
    }
  }

  /** PUT: update the hero on the server */
  updateHero (hero: Hero): Observable<any> {
    this.IndexDbService.AddToHeroUpdateTable(hero, this.offlineService.isOnline);
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
      if (online) {
        console.log('went online, sending all stored items');
        this.sendItemsFromIndexedDb();
      } else {
        console.log('went offline, storing in indexdb');
      }
    });
  }

  async sendItemsFromIndexedDb() {

    console.log('Sending items from IndexDB');

    await this.IndexDbService.GetHeroesToAdd().then(heroes =>
      {
        heroes.forEach(hero => {
          this.addHero(hero).subscribe(() =>
            console.log('Added ' + JSON.stringify(hero))
          );
        })
      }
     );

    await this.IndexDbService.GetHeroesToUpdate().then(heroes =>
      {
        heroes.forEach(hero => {
          this.updateHero(hero).subscribe(() =>
            console.log('Updated ' + JSON.stringify(hero))
          );
       })
      }
     );

    await this.IndexDbService.GetHeroesToDelete().then(heroes =>
      {
        heroes.forEach(hero => {
          this.deleteHero(hero).subscribe(() =>
            console.log('Deleted ' + JSON.stringify(hero))
          );
        })
      }
     );

    this.IndexDbService.ClearTables();

  }

}
