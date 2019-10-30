import { Injectable } from '@angular/core';
import { concat, Observable, of, from } from 'rxjs';
import { first } from 'rxjs/operators';

import { Hero } from './hero';
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
      this.indexDbService.InitializeIndexDB(this.getHeroes());
    }

  /** get heroes */
  public getHeroes(): Observable<Hero[]> {
    return (this.offlineService.isOnline) ?
      this.databaseService.getHeroes()
    :
      from(this.indexDbService.getHeroes());
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

    console.log('Sending items from IndexDB');

    concat(of(...(await this.indexDbService.GetHeroTransctions())))
      .subscribe(async t => await this.processTransaction(t));
  }

   private async processTransaction(transaction) {
    if (transaction.type === 'add') {
      await Promise.all([
        this.databaseService.addHero({ id: transaction.hero_id, name: transaction.name }).pipe(first()).toPromise(),
        this.indexDbService.DeleteFromHeroTransactionTable(transaction.id) ]
      );
    } else if (transaction.type === 'update') {
      await Promise.all([
        this.databaseService.updateHero({ id: transaction.hero_id, name: transaction.name }).pipe(first()).toPromise(),
        this.indexDbService.DeleteFromHeroTransactionTable(transaction.id) ]
      );
    } else if (transaction.type === 'delete') {
      await Promise.all([
        this.databaseService.updateHero({ id: transaction.hero_id, name: transaction.name }).pipe(first()).toPromise(),
        this.indexDbService.DeleteFromHeroTransactionTable(transaction.id) ]
      );
    }
  }

}
