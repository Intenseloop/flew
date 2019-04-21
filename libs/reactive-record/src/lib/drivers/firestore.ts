import { Request } from '../interfaces/request';
import { Observable, PartialObserver } from 'rxjs';
import { merge, isEmpty, isArray, isNil } from 'lodash';
import { Connector } from '../interfaces/connector';
import { Options, Chain } from '../interfaces/options';
import { Response } from '../interfaces/response';
import { map } from 'rxjs/operators';
import { Logger } from '../utils/logger';
import { ReactiveDriverOption, ReactiveDriver } from '../interfaces/driver';
import { clearNetworkResponse } from '../utils/response';

export class FirestoreDriver implements ReactiveDriver {
  _driver: ReactiveDriverOption = 'firestore';
  collection: string;
  timestamp = true;
  connector: Connector = {};
  logger: Logger;

  constructor(options: Options) {
    merge(this, options);
    this.connector = options.connector.firestore;
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
      this.log().success()(
        `firestore where array -> ${query[0].field} ${query[0].operator} ${
          query[0].value
        }`
      );
      query.map(q => {
        if (isNil(q.value))
          throw Error(`value can't be null for firestore where`);
        firestore = firestore.where(q.field, q.operator, q.value);
      });
    } else if (
      <any>typeof query === 'object' &&
      query.field &&
      query.operator
    ) {
      this.log().success()(
        `firestore where object -> ${query.field} ${query.operator} ${
          query.value
        }`
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
    } else if (typeof sort === 'object') {
      this.log().success()(`firestore sort object -> ${JSON.stringify(sort)}`);
      if (isEmpty(sort)) throw new Error(`sort object can't be null`);
      for (const k in sort) firestore = firestore.orderBy(k, sort[k]);
    }
    return firestore;
  }

  protected limit(limit: number, firestore: any) {
    return firestore.limit(limit);
  }

  public find<T extends Response>(
    request: Request,
    key: string,
    chain: Chain = {}
  ): Observable<T> {
    return new Observable((observer: PartialObserver<any>) => {
      //
      // run exceptions
      this.exceptions();

      //
      // define adapter
      let firestore: any = this.connector.collection(this.collection);

      //
      // set query
      firestore = this.where(request.query, firestore);

      //
      // set order
      firestore = this.order(request.sort, firestore);

      //
      // set limit
      if (request.size) firestore = this.limit(request.size, firestore);

      //
      // network handle
      firestore
        .get()
        .then(async (snapshot: any) => {
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
              metadata: { ...snapshot.metadata }
            }
          });

          //
          // success callback
          observer.next(response);
          observer.complete();
        })
        .catch(err => {
          console.log(err);
          observer.error(err);
          observer.complete();
        });
    });
  }

  public findOne(
    request: Request,
    key: string,
    chain: Chain = {}
  ): Observable<Response> {
    return this.find(request, key, chain).pipe(
      map((r: Response) => {
        const response: Response = <Response>{
          data: r.data && r.data.length ? r.data[0] : {},
          key: r.key,
          collection: this.collection,
          driver: this._driver,
          response: r.response
        };

        return response;
      })
    );
  }

  public on(
    request: Request,
    onSuccess: (response: Response) => any = (response: Response) => {},
    onError: (response: any) => any = (response: any) => {},
    chain: Chain = {}
  ): any {
    //
    // run exceptions
    this.exceptions();

    //
    // network handle
    const transformResponse: any =
      chain.transformResponse && typeof chain.transformResponse === 'function'
        ? chain.transformResponse
        : (data: Response) => data;

    //
    // define adapter
    let firestore: any = this.connector.collection(this.collection);

    //
    // set doc
    if (request.id) firestore.doc(request.id);

    //
    // set where
    firestore = this.where(request.query, firestore);

    //
    // set order
    firestore = this.order(request.sort, firestore);

    //
    // set limit
    if (request.size) firestore = this.limit(request.size, firestore);

    //
    // fire in the hole
    return firestore.onSnapshot((snapshot: any) => {
      const data: any[] = [];
      snapshot.forEach(doc => data.push(doc.data()));
      const response: Response = clearNetworkResponse({
        data: data,
        key: false,
        collection: this.collection,
        driver: this._driver,
        response: {
          empty: snapshot.empty,
          size: snapshot.size
        }
      });
      //
      // callback
      onSuccess(transformResponse(response));
    }, onError);
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
        observer.next(r);
        observer.complete();
      };
      //
      // call firestore
      firestore
        .doc(id)
        .set(data, { merge: shouldMerge })
        .then(response)
        .catch(response);
    });
  }

  public update(id: string, data: any): Observable<any> {
    return new Observable(observer => {
      //
      // run exceptions
      this.exceptions();

      //
      // define connector
      const firestore: any = this.connector.collection(this.collection);

      //
      // auto update timestamp
      if (this.timestamp) data.updated_at = new Date().toISOString();

      //
      // define return
      const response = r => {
        observer.next(r);
        observer.complete();
      };
      //
      // call firestore
      firestore
        .doc(id)
        .update(data)
        .then(response)
        .catch(response);
    });
  }
}
