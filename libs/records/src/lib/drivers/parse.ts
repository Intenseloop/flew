import { isArray, isEmpty, isNil, isObject } from 'lodash';
import { Observable, PartialObserver } from 'rxjs';
import { map } from 'rxjs/operators';
import { isFunction } from 'util';
import { SetOptions } from '../interfaces/api';
import { ChainOptions } from '../interfaces/chain';
import { ConnectorParse } from '../interfaces/connector';
import { ReativeDriver, ReativeDriverOption } from '../interfaces/driver';
import { ReativeOptions } from '../interfaces/options';
import { Response } from '../interfaces/response';
import { Reative } from '../symbols/reative';
import { subscribe } from '../utils/events';
import { guid } from '../utils/guid';
import { Logger } from '../utils/logger';
import { clearNetworkResponse } from '../utils/response';

export class ParseDriver implements ReativeDriver {
  driverName: ReativeDriverOption = 'parse';
  driverOptions: ReativeOptions;
  connector: ConnectorParse;
  logger: Logger;
  skipOnQuery = ['aggregate'];

  constructor(options: ReativeOptions) {
    this.driverOptions = options;
    this.logger = options.logger;
  }

  public log() {
    return this.logger;
  }

  private exceptions() {
    if (!this.driverOptions.collection)
      throw new Error('missing collection name');
  }

  protected where(query: any[] = []) {
    const mapping = {
      id: 'objectId'
    };
    query.map(q => {
      if (isNil(q.value)) throw Error(`value can't be null for parse where`);

      if (mapping[q.field]) q.field = mapping[q.field];

      this.setWhere(q);
      this.log().success()(
        `parse where -> ${q.field} ${q.operator} ${q.value}`
      );
    });
  }

  protected setWhere(q: any) {
    switch (q.operator) {
      case '==':
        this.connector.equalTo(q.field, q.value);
        break;

      case '>=':
        this.connector.greaterThanOrEqualTo(q.field, q.value);
        break;

      case '<=':
        this.connector.lessThanOrEqualTo(q.field, q.value);
        break;

      case '>':
        this.connector.greaterThan(q.field, q.value);
        break;

      case '<':
        this.connector.lessThan(q.field, q.value);
        break;

      case 'array-contains':
        this.connector.containedIn(
          q.field,
          isArray(q.value) ? q.value : [q.value]
        );
        break;

      default:
        break;
    }
  }

  protected order(sort: any) {
    if (isArray(sort)) {
      this.log().success()(`parse sort array -> ${sort}`);
      sort.map(s => {
        if (isEmpty(s)) throw new Error(`sort object in array can't be null`);
        for (const k in s) {
          if (s[k] === 'asc') {
            this.connector.ascending(k);
          }
          if (s[k] === 'desc') {
            this.connector.descending(k);
          }
        }
      });
    } else if (isObject(sort)) {
      this.log().success()(`parse sort object -> ${JSON.stringify(sort)}`);
      if (isEmpty(sort)) throw new Error(`sort object can't be null`);
      for (const k in sort) {
        if (sort[k] === 'asc') {
          this.connector.ascending(k);
        }
        if (sort[k] === 'desc') {
          this.connector.descending(k);
        }
      }
    }
  }

  protected limit(limit: number) {
    this.log().success()(`parse limit -> ${limit}`);
    this.connector.limit(limit);
  }

  public find<T>(chain: ChainOptions, key: string): Observable<T> {
    return new Observable((observer: PartialObserver<T>) => {
      const verb =
        chain.query && chain.query['aggregate'] ? 'aggregate' : 'find';

      //
      // run exceptions
      this.exceptions();

      //
      // define adapter
      this.connector = new Reative.Parse.Query(this.driverOptions.collection);

      //
      // set arbitrary query
      for (const k in chain.query) {
        if (!this.skipOnQuery.includes(k)) {
          const value = chain.query[k];
          if (isFunction(value)) {
            this.connector[k](...value());
          } else {
            this.connector[k](value);
          }
        }
      }

      //
      // set where
      this.where(chain.where);

      //
      // set order
      this.order(chain.sort);

      //
      // set limit
      if (chain.size) this.limit(chain.size);

      //
      // set include (pointers, relation, etc)
      if (chain.fields) {
        this.connector.include(chain.fields);
      }

      //
      // network handle
      const success = async (data: any[]) => {
        const result = [];
        for (const item of data) {
          const entry = isFunction(item.toJSON) ? item.toJSON() : item;
          // const entry =item;
          entry.id = entry.objectId;
          result.push(entry);
        }
        //
        // define standard response
        const response: Response = clearNetworkResponse({
          data: result,
          key: key,
          collection: this.driverOptions.collection,
          driver: this.driverName,
          response: {
            empty: !result.length,
            size: result.length
          }
        });

        //
        // success callback
        observer.next(response as T);
        observer.complete();
      };

      const error = err => {
        try {
          observer.error(err);
          observer.complete();
        } catch (err) {}
      };

      switch (verb) {
        case 'aggregate':
          this.connector
            .aggregate(chain.query['aggregate'])
            .then(success)
            .catch(error);
          break;

        default:
          this.connector
            .find()
            .then(success)
            .catch(error);
          break;
      }
    });
  }

  public findOne<T>(chain: ChainOptions, key: string): Observable<T> {
    return this.find<T>(chain, key).pipe(
      map((r: Response) => {
        const response: Response = <Response>{
          data: r.data && r.data.length ? r.data[0] : {},
          key: r.key,
          collection: this.driverOptions.collection,
          driver: this.driverName,
          response: r.response
        };

        return response as T;
      })
    );
  }

  public on<T>(chain: ChainOptions, key: string): Observable<T> {
    return new Observable(observer => {
      //
      // run exceptions
      this.exceptions();

      //
      // define adapter
      this.connector = new Reative.Parse.Query(this.driverOptions.collection);

      //
      // set arbitrary query
      for (const k in chain.query) {
        const value = chain.query[k];
        if (isFunction(value)) {
          this.connector[k](...value());
        } else {
          this.connector[k](value);
        }
      }

      //
      // set where
      this.where(chain.where);

      //
      // set order
      this.order(chain.sort);

      //
      // set limit
      if (chain.size) this.limit(chain.size);

      //
      // fire in the hole
      const getData = async (result?) => {
        if (isEmpty(result)) {
          result = [];
          const entries: any[] = await this.connector.find();
          for (const item of entries) {
            const entry = isFunction(item.toJSON) ? item.toJSON() : item;
            entry.id = entry.objectId;
            result.push(entry);
          }
        } else {
          result = [result];
        }
        //
        // define standard response
        return clearNetworkResponse({
          data: result,
          key: key,
          collection: this.driverOptions.collection,
          driver: this.driverName,
          response: {
            empty: !result.length,
            size: result.length
          }
        } as Response);
      };

      // for test
      // observer.next({
      //   data: [{ a: 1 }],
      //   key: key,
      //   collection: this.collection,
      //   driver: this.driverName,
      //   response: {}
      // } as any);

      // observer.next({
      //   data: [{ a: 2 }],
      //   key: key,
      //   collection: this.collection,
      //   driver: this.driverName,
      //   response: {}
      // } as any);

      this.connector.subscribe().then(async handler => {
        observer.next((await getData()) as T);
        handler.on('create', async object => {
          // console.log(`create`, object);
          // observer.next((await getData(object.toJSON())) as T);
          observer.next((await getData()) as T);
        });

        handler.on('update', async object => {
          // console.log(`update`, object);
          // observer.next((await getData(object.toJSON())) as T);
          observer.next((await getData()) as T);
        });

        handler.on('delete', async object => {
          // console.log(`delete`, object);
          // observer.next((await getData(object.toJSON())) as T);
          observer.next((await getData()) as T);
        });

        handler.on('close', () => {
          console.log('close');
          observer.complete();
        });

        subscribe(`unsubscribe-${key}`, () => {
          handler.unsubscribe();
        });
      });
    });
  }

  public set(
    chain: ChainOptions,
    data: any,
    options?: SetOptions
  ): Observable<any> {
    return new Observable(observer => {
      const id = chain.doc;
      const newData = { ...data };

      if (id) newData[Reative.options.identifier] = id;
      else newData[Reative.options.identifier] = guid(3);

      //
      // auto update timestamp
      if (this.driverOptions.timestamp)
        newData[this.driverOptions.timestampCreated] = new Date().toISOString();

      //
      // run exceptions
      this.exceptions();

      //
      // define connector
      const model = new Reative.Parse.Object(this.driverOptions.collection);

      //
      // define return
      const response = r => {
        observer.next(r);
        observer.complete();
      };

      const error = err => {
        observer.error(err);
        observer.complete();
      };

      //
      //
      model
        .save(newData)
        .then(response)
        .catch(error);
    });
  }

  public update(chain: ChainOptions, data: any): Observable<any> {
    return new Observable(observer => {
      //
      // run exceptions
      this.exceptions();

      //
      // clone state
      const newData = { ...data };

      //
      // auto update timestamp
      if (this.driverOptions.timestamp)
        newData[this.driverOptions.timestampUpdated] = new Date().toISOString();

      //
      // define return
      const response = r => {
        observer.next(newData);
        observer.complete();
      };
      const error = err => {
        observer.error(err);
        observer.complete();
      };

      //
      // persist on cloud
      var id1 = new Reative.Parse.Query(this.driverOptions.collection);
      id1.equalTo('objectId', chain.doc);

      var id2 = new Reative.Parse.Query(this.driverOptions.collection);
      id2.equalTo('doc_id', chain.doc);

      Reative.Parse.Query.or(id1, id2)
        .find()
        .then((r: any[] = []) => {
          if (r.length) {
            for (let k in data) {
              r[0].set(k, data[k]);
            }
            r[0]
              .save()
              .then(response)
              .catch(error);
          }
        });
    });
  }
}
