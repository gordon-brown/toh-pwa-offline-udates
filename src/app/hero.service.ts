import { Injectable } from '@angular/core';
import { Observable, of, from } from 'rxjs';

import { Hero } from './hero';
import { DataService } from './data.service';
import { IndexDbService } from './index-db.service';
import { OfflineService } from './offline.service';

@Injectable({ providedIn: 'root' })
export class HeroService {

  constructor(
    private readonly offlineService: OfflineService,
    private IndexDbService: IndexDbService,
    private DatabaseService : DataService)
    {
      this.registerToEvents(offlineService);
      this.IndexDbService.InitializeIndexDB(this.getHeroes());
    }

  /** get heroes */
  public getHeroes (): Observable<Hero[]> {
    return (this.offlineService.isOnline) ?
      this.DatabaseService.getHeroes()
    :
      from(this.IndexDbService.getHeroes())
  }

  /** get hero by id */
  public getHero(id: number): Observable<Hero> {
    return (this.offlineService.isOnline) ?
      this.DatabaseService.getHero(id)
    :
      from(this.IndexDbService.getHero(id))
  }

  /* get heroes whose name contains search term */
  public searchHeroes(term: string): Observable<Hero[]> {
    return (this.offlineService.isOnline) ?
      this.DatabaseService.searchHeroes(term)
    :
      from(this.IndexDbService.searchHeroesFromDB(term.trim()));
  }

  //////// Save methods //////////
  /** add a new hero */
  public addHero (hero: Hero): Observable<Hero> {

    this.IndexDbService.AddHero(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.DatabaseService.addHero(hero)
    :
      of(hero);
  }

  /** update the hero */
  public updateHero (hero: Hero): Observable<any> {

    this.IndexDbService.UpdateHero(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.DatabaseService.updateHero(hero)
    :
      of(hero)
  }

  /** delete the hero */
  public deleteHero (hero: Hero): Observable<Hero> {

    this.IndexDbService.DeleteHero(hero, this.offlineService.isOnline);

    return (this.offlineService.isOnline) ?
      this.DatabaseService.deleteHero(hero)
    :
      of(hero);
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

  private async sendItemsFromIndexedDb() {

    console.log('Sending items from IndexDB');

    await this.IndexDbService.GetHeroTransctions('hero_add').then(heroes =>
      {
        heroes.forEach(hero => {
          this.DatabaseService.addHero(hero).subscribe(() => {
            console.log('Added ' + JSON.stringify(hero));
            this.IndexDbService.DeleteFromHeroTransactionTable(hero, 'hero_add');
          });
        })
      }
    )

    await this.IndexDbService.GetHeroTransctions('hero_update').then(heroes =>
      {
        heroes.forEach(hero => {
          this.DatabaseService.updateHero(hero).subscribe(() => {
            console.log('Updated ' + JSON.stringify(hero));
            this.IndexDbService.DeleteFromHeroTransactionTable(hero, 'hero_update');
          });
       })
      }
     );

    await this.IndexDbService.GetHeroTransctions('hero_delete').then(heroes =>
      {
        heroes.forEach(hero => {
          this.DatabaseService.deleteHero(hero).subscribe(() => {
            console.log('Deleted ' + JSON.stringify(hero));
            this.IndexDbService.DeleteFromHeroTransactionTable(hero, 'hero_delete');
          });
        })
      }
     );

  }

}
