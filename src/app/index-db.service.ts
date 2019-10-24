import { Observable } from 'rxjs';
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

  async getHeroesFromDB(){
    console.log('getting Heroes from Index DB');
    return await this.db.hero.toArray();
  }

  async getHeroFromDB(id: number){
    console.log('getting Hero from Index DB');
    return await await this.db.hero
      .where('id')
      .equals(id)
      .first(function(item) {
        return item;
    })
  }

  async searchHeroesFromDB(searchTerm: string) {
    console.log('getting Heroes from Index DB');
    return await this.db.hero.where("name").startsWith(searchTerm).toArray();;
  }

  InitializeIndexDB (heroes: Observable<Hero[]>) {

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
      hero_add: "id",
      hero_update: "id",
      hero_delete: "id"
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

  ClearTables() {
    this.db.hero.clear();
    this.db.hero_add.clear();
    this.db.hero_update.clear();
    this.db.hero_delete.clear();
  }

  InsertIntoHeroTable(hero: Hero) {
    this.db.table('hero').add({id: hero.id, name: hero.name})
      .catch(e => {
        console.error('Insert Into Heroes Error: ' + (e.stack || e));
    });
  }

  public UpdateFromHeroTable(hero: Hero) {
    this.db.table('hero').update(hero.id, {name: hero.name})
    .catch(e => {
      console.error('Update Into Heroes Error: ' + (e.stack || e));
    });
  }

  public DeleteFromHeroTable(hero: Hero) {
    this.db.table('hero').where('id').equals(hero.id).delete()
      .catch(e => {
        console.error('Delete from Heroes Error: ' + (e.stack || e));
    });
  }

  public InsertIntoHeroTransactionTable(hero: Hero, tableName: string) {
    this.db.table(tableName).add({id: hero.id, name: hero.name})
      .then(() => {
        console.log('Table ' + tableName + ' ' + hero.name);
      })
      .catch(e => {
        console.error('Insert Into ' + tableName + 'Error:' + (e.stack || e));
    });
  }

  AddToHeroAddTable(hero: Hero, isOnline: boolean) {
    this.db.hero.orderBy('id').last().then(o => {
      hero.id = o.id + 1;
      if (!isOnline) {
        this.InsertIntoHeroTransactionTable(hero, 'hero_add');
      }
      this.InsertIntoHeroTable(hero);
    });
  }

  AddToHeroUpdateTable(hero: Hero, isOnline: boolean) {
    if (!isOnline) {
      this.InsertIntoHeroTransactionTable(hero, 'hero_update');
    }
    this.UpdateFromHeroTable(hero);
  }

  AddToHeroDeleteTable(hero: Hero, isOnline: boolean) {
    if (!isOnline) {
      this.InsertIntoHeroTransactionTable(hero, 'hero_delete');
    }
    this.DeleteFromHeroTable(hero);
  }

  async GetHeroesToAdd() {
    return await this.db.hero_add.toArray();
  }

  async GetHeroesToUpdate() {
    return await this.db.hero_update.toArray();
  }

  async GetHeroesToDelete() {
    return await this.db.hero_delete.toArray();
  }

}