import {
  isArray,
  isEmpty,
  isNil,
  isObject,
  isFunction,
  isString,
  trim,
  omit,
  cloneDeep,
  get
} from 'lodash';

import {
  Reative,
  ReativeDriver,
  ReativeChainPayload,
  ReativeDriverOption,
  ReativeOptions,
  ReativeVerb,
  ReativeChain,
  Response,
  ResponseSource,
  subscribe,
  guid,
  Logger,
  clearNetworkResponse,
  R_IDENTIFIER
} from '@reative/core';

import { Observable, PartialObserver } from 'rxjs';
import { map } from 'rxjs/operators';
import { ReativeParseOptions } from '../interfaces/options';
import { transpileChainQuery } from '../worker/transpile';
import { where } from '../worker/where';
import { order } from '../worker/order';
import { limit } from '../worker/limit';
import { skip } from '../worker/skip';
import { find } from '../worker/find';

declare var window;

export class ParseDriver implements ReativeDriver {
  options: Partial<ReativeParseOptions>;
  instance: any; // parse instance
  driverName: ReativeDriverOption = 'parse';
  driverOptions: ReativeOptions = {};
  connector: any;
  logger: Logger;
  skipOnQuery = ['aggregate'];
  skipOnOperator = ['include', 'exclude'];
  specialOperators = ['or', 'and'];

  //
  // verbs tree
  public verbs: { [key in ReativeVerb]: string | boolean } = {
    find: true,
    findOne: true,
    on: true,
    get: 'parse.find',
    post: 'parse.find',
    update: 'parse.update',
    patch: 'parse.set',
    delete: true, // can use both doc_id or objectId
    set: true,
    count: true,
    run: true
  };

  //
  // chaining tree
  public chaining: { [key in ReativeChain]: string | boolean } = {
    driver: true,
    network: true,
    key: true,
    query: true,
    where: true,
    sort: true,
    size: true,
    at: false,
    after: true,
    ref: false,
    raw: true,
    transform: true,
    diff: true,
    http: false,
    include: true,
    doc: true,
    master: true,
    token: true,
    object: true,
    save: 'browser',
    ttl: 'browser',
    state: 'browser',
    cache: 'browser',
    worker: true
  };

  constructor(options: ReativeParseOptions) {
    this.options = omit(options, ['instance']);
    this.instance = options.instance;
  }

  configure(driverOptions: ReativeOptions) {
    this.driverOptions = driverOptions;
    this.logger = driverOptions.logger;

    try {
      if (
        window &&
        window.Worker &&
        driverOptions.useWorker === true &&
        !Reative.worker.parse
      ) {
        Reative.worker.parse = new Worker('/worker/parse.js');
      }
    } catch (err) {}
    return this.getInstance();
  }

  public getInstance() {
    return this.instance;
  }

  public log() {
    return this.logger;
  }

  public find<T>(chain: ReativeChainPayload, key: string): Observable<T> {
    return new Observable((observer: PartialObserver<T>) => {
      const Parse = this.getInstance();
      const options: ReativeOptions = {
        ...Reative.options,
        ...this.driverOptions,
        ...chain
      };

      //
      // network handle
      const error = (r, source: ResponseSource = 'http') => {
        const data = source === 'worker' ? get(r, `data.error`) || r : r;
        try {
          if (source === 'worker') {
            Reative.responses[r.key].observer.error(data);
            Reative.responses[r.key].observer.complete();
          } else {
            observer.error(data);
            observer.complete();
          }
        } catch (err) {}
      };

      const success = (r: any, source: ResponseSource = 'http') => {
        // double check for worker errors
        if (source === 'worker' && r.data.error) {
          return error(r.data, source);
        }

        const data = source === 'worker' ? r.data.data : r.data;
        const dataResponse =
          source === 'worker'
            ? omit(cloneDeep(r.data), [`data`])
            : omit(cloneDeep(r), [`data`]);

        let result = [];

        if (source === 'http') {
          for (const item of data) {
            // tslint:disable-next-line: deprecation
            const entry =
              isFunction(item.toJSON) && !chain.useObject
                ? item.toJSON()
                : item;

            if (!chain.useObject) {
              // @todo add id for nested results
              entry.id = entry.objectId;
            }
            result.push(entry);
          }
        } else {
          result = data;
        }

        //
        // @todo auto populate `id` on included fields - need more work
        // if (chain.fields && chain.fields.length) {
        //   result.map(entry => {
        //     chain.fields.map(field => {
        //       const whatever: any = get(entry, field);
        //       if (isArray(whatever)) {
        //         whatever.map(it => {
        //           it.id = it.objectId;
        //         });
        //       }
        //       if (isObject(whatever)) {
        //         whatever.id = whatever.objectId;
        //       }
        //     });
        //   });
        // }

        //
        // define standard response
        const response: Response = clearNetworkResponse({
          data: result,
          key: source === 'worker' ? r.data.key : key,
          collection: this.getCollectionName(),
          driver: this.driverName,
          response: {
            ...dataResponse,
            empty: !result.length,
            size: result.length
          }
        });

        //
        // success callback
        if (source === 'worker') {
          Reative.responses[r.data.key].observer.next(response as T);
          Reative.responses[r.data.key].observer.complete();
        } else {
          observer.next(response as T);
          observer.complete();
        }
      };

      if (
        Reative.worker.parse &&
        options.useWorker &&
        chain.useWorker !== false
      ) {
        Reative.responses[key] = {
          key: key,
          observer: observer
        };

        Reative.worker.parse.postMessage({
          key: key,
          serverURL: this.options.serverURL,
          appID: this.options.appID,
          chain: chain,
          collection: this.getCollectionName(),
          skipOnOperator: this.skipOnOperator,
          skipOnQuery: this.skipOnQuery,
          specialOperators: this.specialOperators
        });
        Reative.worker.parse.onmessage = r => success(r, 'worker');
        Reative.worker.parse.onerror = r => error(r, 'worker');
      } else {
        find({
          Parse: this.getInstance(),
          chain: chain,
          collection: this.getCollectionName(),
          skipOnQuery: this.skipOnQuery,
          skipOnOperator: this.skipOnOperator,
          specialOperators: this.specialOperators,
          success: r => success(r),
          error: err => error(err)
        });
      }
    });
  }

  public findOne<T>(chain: ReativeChainPayload, key: string): Observable<T> {
    return this.find<T>(chain, key).pipe(
      map((r: Response) => {
        const response: Response = <Response>{
          data: r.data && r.data.length ? r.data[0] : {},
          key: r.key,
          collection: this.getCollectionName(),
          driver: this.driverName,
          response: r.response
        };

        return response as T;
      })
    );
  }

  public on<T>(chain: ReativeChainPayload, key: string): Observable<T> {
    return new Observable(observer => {
      const Parse = this.getInstance();

      this.connector = new Parse.Query(this.getCollectionName());

      //
      // Transpile chain query
      const specialQueries: any = transpileChainQuery(chain.query, {
        Parse: this.connector,
        chain: chain,
        collection: this.getCollectionName(),
        skipOnQuery: this.skipOnQuery,
        skipOnOperator: this.skipOnOperator,
        specialOperators: this.specialOperators
      });

      //
      // Join query with connector
      if (!isEmpty(specialQueries) && this.isSpecialQuery(chain)) {
        this.connector = Parse.Query.and(...specialQueries);
      } else {
        for (const q in chain.query) {
          if (isFunction(chain.query[q])) {
            this.connector[q](...chain.query[q]());
          } else {
            this.connector[q](...chain.query[q]);
          }
        }
      }

      //
      // set where
      where(chain.where, this.connector);

      //
      // set order
      order(chain.sort, this.connector);

      //
      // set limit
      if (chain.size) limit(chain.size, this.connector);

      //
      // set include (pointers, relation, etc)
      if (chain.fields) {
        this.connector.include(chain.fields);
      }

      if (chain.query && chain.query.include) {
        this.connector.include(chain.query.include);
      }

      //
      // set skip
      if (chain.after) skip(chain.after, this.connector);

      //
      // fire in the hole
      const getData = async (result?) => {
        if (isEmpty(result)) {
          result = [];
          const entries: any[] = await this.connector.find();
          for (const item of entries) {
            // tslint:disable-next-line: deprecation
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
          collection: this.getCollectionName(),
          driver: this.driverName,
          response: {
            empty: !result.length,
            size: result.length
          }
        } as Response);
      };

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
    chain: ReativeChainPayload,
    data: any,
    options = { all: false }
  ): Observable<any> {
    return new Observable(observer => {
      const Parse = this.getInstance();

      const response = r => {
        observer.next(r);
        observer.complete();
      };

      const error = err => {
        observer.error(err);
        observer.complete();
      };

      if (!options.all) {
        const connector = new Parse.Object(this.getCollectionName());
        const id = chain.doc;
        const newData = { ...data };

        if (id) {
          newData[this.driverOptions.identifier] = id;
        } else {
          if (!data[this.driverOptions.identifier])
            newData[this.driverOptions.identifier] = guid(3);
        }

        //
        // auto update timestamp
        if (this.driverOptions.timestamp) {
          if (!data[this.driverOptions.timestampCreated]) {
            newData[
              this.driverOptions.timestampCreated
            ] = new Date().toISOString();
          }
          if (!data[this.driverOptions.timestampUpdated]) {
            newData[
              this.driverOptions.timestampUpdated
            ] = new Date().toISOString();
          }
        }

        connector
          .save(newData, {
            useMasterKey: chain.useMasterKey,
            sessionToken: chain.useSessionToken
          })
          .then(response)
          .catch(error);
      } else {
        const connector = Parse.Object;
        connector
          .saveAll(data, {
            useMasterKey: chain.useMasterKey,
            sessionToken: chain.useSessionToken
          })
          .then(response)
          .catch(error);
      }
    });
  }

  public run(name: string, payload: any, key: string): Observable<any> {
    return new Observable(observer => {
      const Parse = this.getInstance();
      //
      // define connector
      const cloud = Parse.Cloud;

      //
      // define return
      const response = r => {
        const result: Response = clearNetworkResponse({
          data: r,
          key: key,
          collection: this.getCollectionName(),
          driver: this.driverName,
          response: {
            empty: isEmpty(r)
          }
        });
        observer.next(result);
        observer.complete();
      };

      const error = err => {
        observer.error(err);
        observer.complete();
      };

      cloud
        .run(name, payload)
        .then(response)
        .catch(error);
    });
  }

  public update(chain: ReativeChainPayload, data: any): Observable<any> {
    return new Observable(observer => {
      const Parse = this.getInstance();

      //
      // clone state
      const newData = { ...data };

      //
      // auto update timestamp
      if (this.driverOptions.timestamp) {
        if (!data[this.driverOptions.timestampUpdated]) {
          newData[
            this.driverOptions.timestampUpdated
          ] = new Date().toISOString();
        }
      }

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
      const id1 = new Parse.Query(this.getCollectionName());
      id1.equalTo('objectId', chain.doc);

      const id2 = new Parse.Query(this.getCollectionName());
      id2.equalTo(this.driverOptions.identifier, chain.doc);

      Parse.Query.or(id1, id2)
        .find()
        .then((r: any[] = []) => {
          if (r.length) {
            for (const k in data) {
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

  public count<T>(chain: ReativeChainPayload, key: string): Observable<T> {
    return new Observable((observer: PartialObserver<T>) => {
      const Parse = this.getInstance();

      //
      // define adapter
      this.connector = new Parse.Query(this.getCollectionName());

      //
      // Transpile chain query
      const query: any = transpileChainQuery(chain.query, {
        Parse: this.connector,
        chain: chain,
        collection: this.getCollectionName(),
        skipOnQuery: this.skipOnQuery,
        skipOnOperator: this.skipOnOperator,
        specialOperators: this.specialOperators
      });

      //
      // Join query with connector
      if (!isEmpty(query)) this.connector = Parse.Query.and(...query);

      //
      // set where
      where(chain.where, this.connector);

      //
      // set skip
      if (chain.after) skip(chain.after, this.connector);

      //
      // network handle
      const success = async (data: any[]) => {
        //
        // define standard response
        const response: Response = clearNetworkResponse({
          data: data,
          key: key,
          collection: this.getCollectionName(),
          driver: this.driverName,
          response: {}
        });

        //
        // success callback
        observer.next(response as T);
        observer.complete();
      };

      const error = err => {
        // this breaks offline requests
        // try {
        //   observer.error(err);
        //   observer.complete();
        // } catch (err) {}
      };

      this.connector
        .count({
          useMasterKey: chain.useMasterKey,
          sessionToken: chain.useSessionToken
        })
        .then(success)
        .catch(error);
    });
  }

  public delete<T>(
    path: string,
    key: string,
    payload: any,
    chain: ReativeChainPayload
  ): Observable<T> {
    return new Observable((observer: PartialObserver<T>) => {
      const Parse = this.getInstance();

      //
      // define adapter
      this.connector = new Parse.Query(this.getCollectionName());

      //
      // add or condition when doc is set
      if (chain.doc) {
        let orQueryExtended = {
          or: [
            {
              equalTo: () => [
                this.driverOptions.identifier || R_IDENTIFIER,
                trim(chain.doc)
              ]
            },
            {
              equalTo: () => ['objectId', trim(chain.doc)]
            }
          ]
        };
        if (chain.query && chain.query.or) {
          orQueryExtended = {
            or: [...chain.query.or, ...orQueryExtended.or]
          };
        }
        chain.query = {
          ...chain.query,
          ...orQueryExtended
        };
      }

      //
      // Transpile chain query
      const query: any = transpileChainQuery(chain.query, {
        Parse: this.connector,
        chain: chain,
        collection: this.getCollectionName(),
        skipOnQuery: this.skipOnQuery,
        skipOnOperator: this.skipOnOperator,
        specialOperators: this.specialOperators
      });

      //
      // Join query with connector
      if (!isEmpty(query)) this.connector = Parse.Query.and(...query);

      //
      // set where
      where(chain.where, this.connector);

      //
      // set skip
      if (chain.after) skip(chain.after, this.connector);

      //
      // network handle
      const success = async (data: any[]) => {
        const list = await Parse.Object.destroyAll(data).catch(error => {
          // An error occurred while deleting one or more of the objects.
          // If this is an aggregate error, then we can inspect each error
          // object individually to determine the reason why a particular
          // object was not deleted.
          if (error.code === Parse.Error.AGGREGATE_ERROR) {
            for (let i = 0; i < error.errors.length; i++) {
              console.log(
                "Couldn't delete " +
                  error.errors[i].object.id +
                  'due to ' +
                  error.errors[i].message
              );
            }
          } else {
            console.log('Delete aborted because of ' + error.message);
          }
        });

        //
        // define standard response
        const response: Response = {
          data: list,
          key: key,
          collection: this.getCollectionName(),
          driver: this.driverName,
          response: {}
        };

        //
        // success callback
        observer.next(response as T);
        observer.complete();
      };

      const error = err => {
        // this breaks offline requests
        // try {
        //   observer.error(err);
        //   observer.complete();
        // } catch (err) {}
      };

      this.connector
        .find({
          useMasterKey: chain.useMasterKey,
          sessionToken: chain.useSessionToken
        })
        .then(success)
        .catch(error);
    });
  }

  getCollectionName() {
    const mapping = {
      User: '_User',
      Role: '_Role',
      Session: '_Session'
    };
    const name = this.driverOptions.collection;
    return mapping[name] ? mapping[name] : name;
  }

  isSpecialQuery(chain: ReativeChainPayload): boolean {
    const query = { ...chain.query };
    let isSpecial = false;
    for (const item in query) {
      if (this.specialOperators.includes(item)) {
        isSpecial = true;
      }
    }
    return isSpecial;
  }
}
