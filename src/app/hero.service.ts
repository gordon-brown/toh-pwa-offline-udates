import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';

import { Hero } from './hero';
import { DatabaseService } from './database.service';
import { IndexDbService } from './index-db.service';
import { OfflineService } from './offline.service';

@Injectable({ providedIn: 'root' })
export class HeroService {

  constructor(
    private readonly offlineService: OfflineService,
    private IndexDbService: IndexDbService,
    private DatabaseService : DatabaseService)
    {
      this.registerToEvents(offlineService);
      this.IndexDbService.InitializeIndexDB(this.getHeroes());
    }

  /** GET heroes */
  getHeroes (): Observable<Hero[]> {
    return (this.offlineService.isOnline) ?
      this.DatabaseService.getHeroes()
    :
      from(this.IndexDbService.getHeroesFromDB())
  }

  /** GET hero by id */
  getHero(id: number): Observable<Hero> {
    return (this.offlineService.isOnline) ?
      this.DatabaseService.getHero(id)
    :
      from(this.IndexDbService.getHeroFromDB(id))
  }

  /* GET heroes whose name contains search term */
  searchHeroes(term: string): Observable<Hero[]> {
    return (this.offlineService.isOnline) ?
      this.DatabaseService.searchHeroes(term)
    :
      from(this.IndexDbService.searchHeroesFromDB(term.trim()));
  }

  //////// Save methods //////////
  /** POST: add a new hero */
  addHero (hero: Hero): Observable<Hero> {

    this.IndexDbService.AddToHeroAddTable(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.DatabaseService.addHero(hero)
    :
      of(hero);
  }

  /** DELETE: delete the hero */
  deleteHero (hero: Hero): Observable<Hero> {

    this.IndexDbService.AddToHeroDeleteTable(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.DatabaseService.deleteHero(hero)
    :
      of(hero);
  }

  /** PUT: update the hero */
  updateHero (hero: Hero): Observable<any> {

    this.IndexDbService.AddToHeroUpdateTable(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.DatabaseService.updateHero(hero)
    :
      of(hero)
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
