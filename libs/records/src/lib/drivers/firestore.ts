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

export class FirestoreDriver implements ReativeDriver {
  _driver: ReativeDriverOption = 'firestore';
  collection: string;
  timestamp = true;
  connector: any;
  logger: Logger;
  chain: Chain;
  persistence: boolean;

  constructor(options: Options) {
    merge(this, options);
    const connector: Connector = Reative.connector || ({} as Connector);
    this.connector = connector.firestore;
    this.chain = this.chain ? this.chain : {};
    //
    // @todo need more tests (capacitor showing warnings)
    if (this.chain.useCache !== false && this.persistence) {
      if (this.log())
        this.log().danger()(
          `[persistence + tabs] using experimental features from firestore`
        );
      try {
        this.connector.enablePersistence({
          experimentalTabSynchronization: true
        });
      } catch (err) {}
    }
  }

  public log() {
    return this.logger;
  }

  private exceptions() {
    if (!this.collection) throw new Error('missing collection');
    if (isEmpty(this.connector)) throw new Error('missing firestore connector');
  }

  protected where(query: any, firestore: any) {
    if (isArray(query)) {
      query.map(q => {
        if (isNil(q.value))
          throw Error(`value can't be null for firestore where`);
        firestore = firestore.where(q.field, q.operator, q.value);
        this.log().success()(
          `firestore where array -> ${q.field} ${q.operator} ${q.value}`
        );
      });
    } else if (
      <any>typeof query === 'object' &&
      query.field &&
      query.operator
    ) {
      this.log().success()(
        `firestore where object -> ${query.field} ${query.operator} ${query.value}`
      );
      if (!query.value)
        throw new Error(`value can't be null for firestore where`);
      firestore = firestore.where(query.field, query.operator, query.value);
    }
    return firestore;
  }

  protected order(sort: any, firestore: any) {
    if (isArray(sort)) {
      this.log().success()(`firestore sort array -> ${sort}`);
      sort.map(s => {
        if (isEmpty(s)) throw new Error(`sort object in array can't be null`);
        for (const k in s) firestore = firestore.orderBy(k, s[k]);
      });
    } else if (isObject(sort)) {
      this.log().success()(`firestore sort object -> ${JSON.stringify(sort)}`);
      if (isEmpty(sort)) throw new Error(`sort object can't be null`);
      for (const k in sort) firestore = firestore.orderBy(k, sort[k]);
    }
    return firestore;
  }

  protected limit(limit: number, firestore: any) {
    this.log().success()(`firestore limit -> ${limit}`);
    return firestore.limit(limit);
  }

  public find<T>(chain: Chain, key: string): Observable<T> {
    return new Observable((observer: PartialObserver<T>) => {
      //
      // run exceptions
      this.exceptions();

      //
      // define adapter
      let firestore: any = this.connector.collection(this.collection);

      //
      // set query
      firestore = this.where(chain.where, firestore);

      //
      // set order
      firestore = this.order(chain.sort, firestore);

      //
      // set limit
      if (chain.size) firestore = this.limit(chain.size, firestore);

      //
      // network handle
      firestore
        .get()
        .then(async (snapshot: any) => {
          //
          // check for offline results
          if (
            snapshot.empty &&
            snapshot.metadata &&
            snapshot.metadata.fromCache
          ) {
            const message = `${key} [find] whoops, looks like you're offline`;
            this.log().danger()(message);
            return observer.complete();
          }

          //
          // format data
          const data: any[] = [];
          snapshot.forEach(doc => data.push(doc.data()));

          //
          // define standard response
          const response: Response = clearNetworkResponse({
            data: data,
            key: key,
            collection: this.collection,
            driver: this._driver,
            response: {
              empty: snapshot.empty,
              size: snapshot.size,
              meta: snapshot.metadata
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
      let firestore: any = this.connector.collection(this.collection);

      //
      // set doc
      if (chain.doc) firestore.doc(chain.doc);

      //
      // set where
      firestore = this.where(chain.where, firestore);

      //
      // set order
      firestore = this.order(chain.sort, firestore);

      //
      // set limit
      if (chain.size) firestore = this.limit(chain.size, firestore);

      //
      // fire in the hole
      const turnOff = firestore.onSnapshot(
        (snapshot: any) => {
          //
          // check for offline results
          if (
            snapshot.empty &&
            snapshot.metadata &&
            snapshot.metadata.fromCache
          ) {
            const message = `${key} [on] whoops, looks like you're offline`;
            this.log().danger()(message);
            observer.complete();
            return turnOff();
          }

          const data: any[] = [];
          snapshot.forEach(doc => data.push(doc.data()));
          const response: Response = clearNetworkResponse({
            data: data,
            key: key,
            collection: this.collection,
            driver: this._driver,
            response: {
              empty: snapshot.empty,
              size: snapshot.size,
              meta: snapshot.metadata
            }
          });
          //
          // callback
          observer.next(response as T);
        },
        err => observer.error(err)
      );
    });
  }

  public set(
    id: string,
    data: any,
    shouldMerge: boolean = true
  ): Observable<any> {
    return new Observable(observer => {
      //
      // run exceptions
      this.exceptions();

      //
      // define connector
      const firestore: any = this.connector.collection(this.collection);
      //
      // define return
      const response = r => {
        observer.next(data);
        observer.complete();
      };
      const error = err => {
        observer.error(err);
        observer.complete();
      };
      //
      // call firestore
      firestore
        .doc(id)
        .set(data, { merge: shouldMerge })
        .then(response)
        .catch(error);
    });
  }

  public update(id: string, data: any): Observable<any> {
    return new Observable(observer => {
      //
      // run exceptions
      this.exceptions();

      //
      // clone state
      const newData = { ...data };

      //
      // define connector
      const firestore: any = this.connector.collection(this.collection);

      //
      // auto update timestamp
      if (this.timestamp) newData.updated_at = new Date().toISOString();

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
      // call firestore
      firestore
        .doc(id)
        .update(newData)
        .then(response)
        .catch(error);
    });
  }
}
