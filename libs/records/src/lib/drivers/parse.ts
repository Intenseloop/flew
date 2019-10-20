import { Observable, PartialObserver } from 'rxjs';
import { merge, isEmpty, isArray, isObject, isNil, get } from 'lodash';
import { Connector } from '../interfaces/connector';
import { Options } from '../interfaces/options';
import { Response } from '../interfaces/response';
import { map } from 'rxjs/operators';
import { Logger } from '../utils/logger';
import { ReativeDriverOption, ReativeDriver } from '../interfaces/driver';
import { clearNetworkResponse } from '../utils/response';
import { Chain } from '../interfaces/chain';
import { Reative } from '../symbols/reative';
import { subscribe } from '../utils/events';

export class ParseDriver implements ReativeDriver {
  _driver: ReativeDriverOption = 'parse';
  collection: string;
  timestamp = true;
  connector: any;
  logger: Logger;
  chain: Chain;
  // persistence: boolean;

  constructor(options: Options) {
    merge(this, options);

    this.chain = this.chain ? this.chain : {};
  }

  public log() {
    return this.logger;
  }

  private exceptions() {
    if (!this.collection) throw new Error('missing collection name');
  }

  protected where(query: any) {
    if (isArray(query)) {
      query.map(q => {
        if (isNil(q.value)) throw Error(`value can't be null for parse where`);
        this.setWhere(q);
        this.log().success()(
          `parse where array -> ${q.field} ${q.operator} ${q.value}`
        );
      });
    } else if (
      <any>typeof query === 'object' &&
      query.field &&
      query.operator
    ) {
      if (isNil(query.value))
        throw new Error(`value can't be null for parse where`);
      this.setWhere(query);
      this.log().success()(
        `parse where object -> ${query.field} ${query.operator} ${query.value}`
      );
    }
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

  public find<T>(chain: Chain, key: string): Observable<T> {
    return new Observable((observer: PartialObserver<T>) => {
      //
      // run exceptions
      this.exceptions();

      //
      // define adapter
      this.connector = Reative.parse.query(this.collection);

      //
      // set query
      this.where(chain.query);

      //
      // set order
      this.order(chain.sort);

      //
      // set limit
      if (chain.size) this.limit(chain.size);

      //
      // network handle
      this.connector
        .find()
        .then(async (data: any[]) => {
          const result = [];
          for (const item of data) {
            result.push(item.toJSON());
          }
          //
          // define standard response
          const response: Response = clearNetworkResponse({
            data: result,
            key: key,
            collection: this.collection,
            driver: this._driver,
            response: {
              empty: !result.length,
              size: result.length
            }
          });

          //
          // success callback
          observer.next(response as T);
          observer.complete();
        })
        .catch(err => {
          try {
            observer.error(err);
            observer.complete();
          } catch (err) {}
        });
    });
  }

  public findOne<T>(chain: Chain, key: string): Observable<T> {
    return this.find<T>(chain, key).pipe(
      map((r: Response) => {
        const response: Response = <Response>{
          data: r.data && r.data.length ? r.data[0] : {},
          key: r.key,
          collection: this.collection,
          driver: this._driver,
          response: r.response
        };

        return response as T;
      })
    );
  }

  public on<T>(chain: Chain, key: string): Observable<T> {
    return new Observable(observer => {
      //
      // run exceptions
      this.exceptions();

      //
      // define adapter
      this.connector = Reative.parse.query(this.collection);

      //
      // set query
      this.where(chain.query);

      //
      // set order
      this.order(chain.sort);

      //
      // set limit
      if (chain.size) this.limit(chain.size);

      //
      // fire in the hole
      const getData = async () => {
        const entries: any[] = await this.connector.find();

        const result = [];
        for (const item of entries) {
          result.push(item.toJSON());
        }
        //
        // define standard response
        return clearNetworkResponse({
          data: result,
          key: key,
          collection: this.collection,
          driver: this._driver,
          response: {
            empty: !result.length,
            size: result.length
          }
        } as Response);
      };

      this.connector.subscribe().then(async handler => {
        observer.next(await getData());

        handler.on('create', async object => {
          // console.log(`create`, object);
          observer.next(await getData());
        });

        handler.on('update', async object => {
          console.log(`update`, object);
          observer.next(await getData());
        });

        handler.on('delete', async object => {
          // console.log(`delete`, object);
          observer.next(await getData());
        });

        handler.on('close', () => {
          observer.complete();
        });

        subscribe(`unsubscribe-${key}`, () => {
          handler.unsubscribe();
        });
      });
    });
  }

  // public set(
  //   id: string,
  //   data: any,
  //   shouldMerge: boolean = true
  // ): Observable<any> {
  //   return new Observable(observer => {
  //     //
  //     // run exceptions
  //     this.exceptions();

  //     //
  //     // define connector
  //     const firestore: any = this.connector.collection(this.collection);
  //     //
  //     // define return
  //     const response = r => {
  //       observer.next(data);
  //       observer.complete();
  //     };
  //     const error = err => {
  //       observer.error(err);
  //       observer.complete();
  //     };
  //     //
  //     // call firestore
  //     firestore
  //       .doc(id)
  //       .set(data, { merge: shouldMerge })
  //       .then(response)
  //       .catch(error);
  //   });
  // }

  // public update(id: string, data: any): Observable<any> {
  //   return new Observable(observer => {
  //     //
  //     // run exceptions
  //     this.exceptions();

  //     //
  //     // clone state
  //     const newData = { ...data };

  //     //
  //     // define connector
  //     const firestore: any = this.connector.collection(this.collection);

  //     //
  //     // auto update timestamp
  //     if (this.timestamp) newData.updated_at = new Date().toISOString();

  //     //
  //     // define return
  //     const response = r => {
  //       observer.next(newData);
  //       observer.complete();
  //     };
  //     const error = err => {
  //       observer.error(err);
  //       observer.complete();
  //     };
  //     //
  //     // call firestore
  //     firestore
  //       .doc(id)
  //       .update(newData)
  //       .then(response)
  //       .catch(error);
  //   });
  // }
}
