import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import Dexie from 'dexie'; // wrapper for IndexedDB
import { Hero } from '../hero';

@Injectable({
  providedIn: 'root'
})
export class IndexDbService {

  private db: any;

  constructor(
  ) {}

  public async getHeroes() {
    console.log('getting Heroes from Index DB');
    return await this.db.hero.toArray();
  }

  public async getHero(id: number) {
    console.log('getting Hero from Index DB');
    return await await this.db.hero
      .where('id')
      .equals(id)
      .first(item => {
        return item;
      });
  }

  public async searchHeroesFromDB(searchTerm: string) {
    console.log('getting Heroes from Index DB');

    if (!searchTerm) {
      return of([]);
    }

    return await this.db.hero.where('name').startsWith(searchTerm).toArray();
  }


  public AddHero(hero: Hero, isOnline: boolean) {
    this.db.hero.orderBy('id').last().then(o => {
      hero.id = o.id + 1;
      if (!isOnline) {
        this.AddHeroTransaction(hero, 'add');
      }
      this.InsertIntoHeroTable(hero);
    });
  }

  public UpdateHero(hero: Hero, isOnline: boolean) {
    if (!isOnline) {
      this.AddHeroTransaction(hero, 'update');
    }
    this.UpdateFromHeroTable(hero);
  }

  public DeleteHero(hero: Hero, isOnline: boolean) {
    if (!isOnline) {
      this.AddHeroTransaction(hero, 'delete');
    }
    this.DeleteFromHeroTable(hero);
  }

  public InitializeIndexDB() {

    console.log('creating Hero DB');
    const dbNname = 'hero_database';
    this.db = new Dexie(dbNname);
    this.CreateTables();

    this.db.open()
      .then(() => {
        console.log('opened database ' + dbNname);
      })
      .catch(err => {
        console.error (err.stack || err);
      });
  }

  private CreateTables() {
    this.db.version(1).stores({
      hero: 'id,name',
      hero_transaction: '++id,hero_id'
    });
  }

  public InitializeHeroTable(heroesObservable: Observable<Hero[]>) {
    heroesObservable.subscribe(heroes => {
      console.log('populate heroes DB');
      this.ClearTables();
      let i: number;
      for (i = 0; i < heroes.length; i++) {
        this.InsertIntoHeroTable(heroes[i]);
      }
    });
  }

  private ClearTables() {
    this.db.hero.clear();
    this.db.hero_transaction.clear();
  }

  public InsertIntoHeroTable(hero: Hero) {
    this.db.hero.add({id: hero.id, name: hero.name})
      .catch(e => {
        console.error('Insert Into Heroes Error: ' + (e.stack || e));
    });
  }

  public UpdateFromHeroTable(hero: Hero) {
    this.db.hero.update(hero.id, {name: hero.name})
    .catch(e => {
      console.error('Update Into Heroes Error: ' + (e.stack || e));
    });
  }

  public DeleteFromHeroTable(hero: Hero) {
    this.db.hero.where('id').equals(hero.id).delete()
      .catch(e => {
        console.error('Delete from Heroes Error: ' + (e.stack || e));
    });
  }

  public AddHeroTransaction(hero: Hero, transactionType: string) {
    this.db.hero_transaction.add({hero_id: hero.id, name: hero.name, type: transactionType})
      .then(() => {
        console.log('Table hero_transaction ' + transactionType + ' ' + hero.name);
      })
      .catch(e => {
        console.error('Insert Into hero_transaction Error:' + (e.stack || e));
    });
  }

  public DeleteFromHeroTransactionTable(id: number): Promise<any> {
    console.log('deleting from hero trans ' + id);
    return this.db.hero_transaction.delete(id);
  }

  public async GetHeroTransctions() {
    return this.db.hero_transaction.toArray();
  }

  public UpdateNewHeroId(oldHeroId: number, newHeroId: number): Promise<any> {
    console.log('Started Sync IDs ' + oldHeroId + ' to ' + newHeroId);
    return this.db.hero_transaction.where('hero_id').equals(oldHeroId).modify({new_hero_id: newHeroId})
      .then(res => console.log('# records synced ' + JSON.stringify(res))
    );
  }

}
