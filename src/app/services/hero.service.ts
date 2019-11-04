import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';
import { tap } from 'rxjs/operators';

import { Hero } from '../hero';
import { DataService } from './data.service';
import { IndexDbService } from './index-db.service';
import { OfflineService } from './offline.service';

@Injectable({ providedIn: 'root' })
export class HeroService {

  constructor(
    private readonly offlineService: OfflineService,
    private indexDbService: IndexDbService,
    private databaseService: DataService) {
    this.registerToEvents(offlineService);
    this.indexDbService.InitializeIndexDB();
  }

  /** get heroes */
  public getHeroes(): Observable<Hero[]> {
    if (this.offlineService.isOnline) {
      this.indexDbService.InitializeHeroTable(this.databaseService.getHeroes());
    }
    return from(this.indexDbService.getHeroes());
  }

  /** get hero by id */
  public getHero(id: number): Observable<Hero> {
    return (this.offlineService.isOnline) ?
      this.databaseService.getHero(id)
      :
      from(this.indexDbService.getHero(id));
  }

  /* get heroes whose name contains search term */
  public searchHeroes(term: string): Observable<Hero[]> {
    return (this.offlineService.isOnline) ?
      this.databaseService.searchHeroes(term)
      :
      from(this.indexDbService.searchHeroesFromDB(term.trim()));
  }

  //////// Save methods //////////
  /** add a new hero */
  public addHero(hero: Hero): Observable<Hero> {

    this.indexDbService.AddHero(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.databaseService.addHero(hero)
        .pipe(
          tap((newHero: Hero) => { this.indexDbService.UpdateNewHeroId(hero.id, newHero.id); }))
      :
        of(hero);
  }

  /** update the hero */
  public updateHero(hero: Hero): Observable<any> {

    this.indexDbService.UpdateHero(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.databaseService.updateHero(hero)
      :
      of(hero);
  }

  /** delete the hero */
  public deleteHero(hero: Hero): Observable<Hero> {

    this.indexDbService.DeleteHero(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.databaseService.deleteHero(hero)
      :
      of(hero);
  }

  private registerToEvents(offlineService: OfflineService) {
    offlineService.connectionChanged.subscribe(online => {
      if (online) {
        console.log('went online, sending all stored items');
        this.sendItemsFromIndexedDb();
      } else {
        console.log('went offline, storing in IndexDB');
      }
    });
  }

  private async sendItemsFromIndexedDb() {

    try {
      console.log('Sending items from IndexDB');

      const newHeroIds = {};
      for (const transaction of await this.indexDbService.GetHeroTransctions()) {
        if (transaction.type === 'add') {
          const hero = await this.databaseService.addHero({ id: null, name: transaction.name }).toPromise();
          newHeroIds[transaction.hero_id] = hero.id;
        } else if (transaction.type === 'update') {
          await this.databaseService.updateHero({ id: getHeroID(newHeroIds, transaction.hero_id), name: transaction.name }).toPromise();
        } else if (transaction.type === 'delete') {
          await this.databaseService.deleteHero({ id: getHeroID(newHeroIds, transaction.hero_id), name: transaction.name }).toPromise();
        }
        await this.indexDbService.DeleteFromHeroTransactionTable(transaction.id);
      }
    } catch (error) {
      console.error('SendItemsFromIndexDb Error: ' + (error.stack || error));
    }

    function getHeroID(newIds: {}, oldHeroId: number) {
      return newIds[oldHeroId] || oldHeroId;
    }

  }

}
