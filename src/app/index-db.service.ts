import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import Dexie from 'dexie'; // wrapper for IndexedDB
import { Hero } from './hero';

@Injectable({
  providedIn: 'root'
})
export class IndexDbService {

  private db: any;

  constructor(
  ) {}

  public async getHeroes(){
    console.log('getting Heroes from Index DB');
    return await this.db.hero.toArray();
  }

  public async getHero(id: number){
    console.log('getting Hero from Index DB');
    return await await this.db.hero
      .where('id')
      .equals(id)
      .first(function(item) {
        return item;
    })
  }

  public async searchHeroesFromDB(searchTerm: string) {
    console.log('getting Heroes from Index DB');

    if (!searchTerm) {
      return of([]);
    }

    return await this.db.hero.where("name").startsWith(searchTerm).toArray();;
  }


  public AddHero(hero: Hero, isOnline: boolean) {
    this.db.hero.orderBy('id').last().then(o => {
      hero.id = o.id + 1;
      if (!isOnline) {
        this.AddHeroTransaction(hero, 'add');
      }
      this.InsertIntoHeroTable(hero);
    })
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

  public InitializeIndexDB (heroes: Observable<Hero[]>) {

    console.log('creating Hero DB');
    let db_name = "hero_database"
    this.db = new Dexie(db_name);
    this.CreateTables();

    this.db.open()
      .then(() => {
        console.log('opened database ' + db_name)
        this.InitializeHeroTable(heroes);
      })
      .catch(function (err) {
        console.error (err.stack || err);
      });
  }

  private CreateTables() {
    this.db.version(1).stores({
      hero: "id,name",
      hero_transaction: "++id"
    });
  }

  private InitializeHeroTable(heroesObservable: Observable<Hero[]>) {
    heroesObservable.subscribe(heroes => {
      console.log('populate heroes DB');
      this.ClearTables();
      var i: number;
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
        console.error('Insert Into hero_transaction ' + 'Error:' + (e.stack || e));
    });
  }

  public DeleteFromHeroTransactionTable(id: number) {
    this.db.hero_transaction.delete(id)
      .then(() => {
        console.log('Deleted from hero_transaction ' + ' ' + id);
      })
      .catch(e => {
        console.error('Delete from hero_transaction ' + 'Error:' + (e.stack || e));
    });
  }

  public GetHeroTransctions() {
    return this.db.hero_transaction.toArray();
  }

}
