import axios, { AxiosRequestConfig, AxiosResponse, AxiosInstance } from 'axios';
import { get, merge, isEmpty, clone, cloneDeep } from 'lodash';
import { Observable, PartialObserver } from 'rxjs';
import { Hooks } from '../hooks/hooks';
import { Api } from '../interfaces/api';
import { Driver } from '../interfaces/driver';
import { Request } from '../interfaces/request';
import { ExtraOptions } from '../interfaces/extra-options';
import { Options } from '../interfaces/options';
import { FirestoreDriver } from '../drivers/firestore';
import { FirebaseDriver } from '../drivers/firebase';
import { Response } from '../interfaces/response';

export class ReactiveRecord extends Hooks implements Api {
  //
  // default params
  private _driver = 'firestore';
  private _drivers: {
    firestore: Driver;
    firebase: Driver | any;
  };

  private http: AxiosInstance;
  public baseURL: string;
  private endpoint: string;

  private request: Request = {};
  private extraOptions: ExtraOptions = {};

  //
  // for unit test
  _observer: PartialObserver<any>;

  /**
   * Creates an instance for RR
   * @param { Options } options
   * @memberof RR
   */
  constructor(options: Options) {
    super(options);

    //
    // set default drivers
    this._drivers = {
      firestore: new FirestoreDriver(options),
      firebase: new FirebaseDriver(options)
    };

    //
    // extend options
    merge(this, options);
    this.baseURL = options.baseURL;

    //
    // configure http client
    this.httpSetup();
  }

  /**
   * Configure http client
   *
   * @public
   * @memberof RR
   */
  public httpSetup() {
    const config: AxiosRequestConfig = {
      timeout: 60 * 1000,
      headers: {},
      baseURL: this.baseURL
    };
    this.runHook('http.pre', config);
    this.http = axios.create(config);
  }

  /**
   * Reset RR chaining
   *
   * @private
   * @memberof ReactiveRecord
   */
  private reset(): void {
    this._driver = 'firestore';
    this.request = {};
    this.extraOptions = {};
  }

  private driverException(_driver: string, _method: string) {
    if (
      !this._drivers[_driver] ||
      typeof this._drivers[_driver].find !== 'function'
    )
      throw new Error(`${_driver} driver unavailable for method [${_method}]`);
  }

  public find<T extends Response>(): Observable<T> {
    const _request = cloneDeep(this.request);
    const _extraOptions = cloneDeep(this.extraOptions);
    const _driver = clone(this._driver);
    this.reset();
    this.driverException(_driver, 'find');
    return this._drivers[_driver].find<T>(_request, _extraOptions);
  }

  public findOne<T extends Response>(): Observable<T> {
    const _request = cloneDeep(this.request);
    const _extraOptions = cloneDeep(this.extraOptions);
    const _driver = clone(this._driver);
    this.reset();

    this.driverException(_driver, 'findOne');

    return this._drivers[_driver].findOne<T>(_request, _extraOptions);
  }

  public set(
    id: string,
    data: any,
    shouldMerge: boolean = true
  ): Observable<any> {
    const _driver = clone(this._driver);
    this.reset();
    this.driverException(_driver, 'set');
    return this._drivers[_driver].set(id, data, shouldMerge);
  }

  public update(id: string, data: any): Observable<any> {
    const _driver = clone(this._driver);
    this.reset();

    this.driverException(_driver, 'update');

    return this._drivers[_driver].update(id, data);
  }

  public on<T>(
    onSuccess: (response: Response) => any = (response: Response) => {},
    onError: (response: any) => any = (response: any) => {}
  ): any {
    const _request = cloneDeep(this.request);
    const _extraOptions = cloneDeep(this.extraOptions);
    const _driver = clone(this._driver);
    this.reset();
    this.driverException(_driver, 'on');
    return this._drivers[_driver].on(
      _request,
      onSuccess,
      onError,
      _extraOptions
    );
  }

  public get<T extends Response>(path: string): Observable<T> {
    const _extraOptions = cloneDeep(this.extraOptions);
    this.reset();
    return new Observable((observer: PartialObserver<T>) => {
      //
      // call exceptions
      if (!this.baseURL) throw new Error('baseURL needed for [get]');
      if (!this.endpoint) throw new Error('endpoint required for [get]');

      //
      // re-apply http stuff
      this.httpSetup();

      //
      // set path to be requestes
      const requestPath = `${this.endpoint}${path}`;

      //
      // define an unique key
      const key = _extraOptions.key || requestPath;

      //
      // for unit test
      this._observer = observer;

      //
      // network handle
      const network = () => {
        this.http
          .get(requestPath)
          .then(async (r: AxiosResponse) => {
            //
            // build standard response
            const response: Response = {
              data: r.data,
              response: r,
              key: key
            };

            //
            // check availability
            if (this.hasHook('http.get.after')) {
              //
              // run client hook
              this.hasHook('http.get.after')(
                key,
                response,
                observer,
                _extraOptions
              );
            } else {
              //
              // success callback
              observer.next(response as T);
              observer.complete();
            }
          })
          .catch(err => {
            const errData = get(err, 'response.data');
            //
            // error callback
            observer.error(errData ? errData : err);
            observer.complete();
          });
      };
      //
      // get before hook
      const hookFn = this.hasHook('http.get.before');
      //
      // check availability
      if (!_extraOptions.useNetwork && hookFn) {
        //
        // run client hook
        hookFn(key, observer, _extraOptions).then(canRequest => {
          //
          // http.get.before should return a boolean
          if (canRequest) network();
        });
      } else {
        //
        // otherwise
        network();
      }
    });
  }

  public post<T extends Response>(
    path: string,
    body: any = {}
  ): Observable<T> {
    const _extraOptions = cloneDeep(this.extraOptions);
    this.reset();

    return new Observable((observer: PartialObserver<T>) => {
      //
      // call exceptions
      if (!this.baseURL) throw new Error('baseURL needed for [post]');
      if (!this.endpoint) throw new Error('endpoint required for [post]');

      //
      // re-apply http stuff
      this.httpSetup();

      //
      // set path to be requestes
      const requestPath: string = `${this.endpoint}${path}`;

      //
      // define an unique key
      const key = _extraOptions.key || requestPath + `/${JSON.stringify(body)}`;

      //
      // for unit test
      this._observer = observer;

      //
      // network handle
      const network = () => {
        this.http
          .post(requestPath, body)
          .then(async (r: AxiosResponse) => {
            //
            // build standard response
            const response: Response = {
              data: r.data,
              response: r,
              key: key
            };

            //
            // check availability
            if (this.hasHook('http.get.after')) {
              //
              // run client hook
              this.hasHook('http.get.after')(
                key,
                response,
                observer,
                _extraOptions
              );
            } else {
              console.log('NO HOOK');
              //
              // success callback
              observer.next(response as T);
              observer.complete();
            }
          })
          .catch(err => {
            const errData = get(err, 'response.data');
            //
            // error callback
            observer.error(errData ? errData : err);
            observer.complete();
          });
      };
      //
      // get before hook
      const hookFn = this.hasHook('http.post.before');
      //
      // check availability
      if (!_extraOptions.useNetwork && hookFn) {
        //
        // run client hook
        hookFn(key, observer, _extraOptions).then(canRequest => {
          //
          // http.get.before should return a boolean
          if (canRequest) network();
        });
      } else {
        //
        // otherwise
        network();
      }
    });
  }

  public patch<T extends Response>(
    path: string,
    body: any = {}
  ): Observable<T> {
    const _extraOptions = cloneDeep(this.extraOptions);
    this.reset();

    return new Observable((observer: PartialObserver<T>) => {
      //
      // call exceptions
      if (!this.baseURL) throw new Error('baseURL needed for [patch]');
      if (!this.endpoint) throw new Error('endpoint required for [patch]');

      //
      // re-apply http stuff
      this.httpSetup();

      //
      // set path to be requestes
      const requestPath: string = `${this.endpoint}${path}`;

      //
      // define an unique key
      const key = _extraOptions.key || requestPath + `/${JSON.stringify(body)}`;

      //
      // for unit test
      this._observer = observer;

      //
      // network handle
      const network = () => {
        this.http
          .patch(requestPath, body)
          .then(async (r: AxiosResponse) => {
            //
            // build standard response
            const response: Response = {
              data: r.data,
              response: r,
              key: key
            };
            //
            // check availability
            if (this.hasHook('http.get.after')) {
              //
              // run client hook
              this.hasHook('http.get.after')(
                key,
                response,
                observer,
                _extraOptions
              );
            } else {
              //
              // success callback
              observer.next(response as T);
              observer.complete();
            }
          })
          .catch(err => {
            const errData = get(err, 'response.data');
            //
            // error callback
            observer.error(errData ? errData : err);
            observer.complete();
          });
      };
      //
      // get before hook
      const hookFn = this.hasHook('http.patch.before');
      //
      // check availability
      if (!_extraOptions.useNetwork && hookFn) {
        //
        // run client hook
        hookFn(key, observer, _extraOptions).then(canRequest => {
          //
          // http.get.before should return a boolean
          if (canRequest) network();
        });
      } else {
        //
        // otherwise
        network();
      }
    });
  }

  public delete<T extends Response>(path: string): Observable<T> {
    const _extraOptions = cloneDeep(this.extraOptions);
    this.reset();
    return new Observable((observer: PartialObserver<T>) => {
      //
      // call exceptions
      if (!this.baseURL) throw new Error('baseURL needed for [delete]');
      if (!this.endpoint) throw new Error('endpoint required for [delete]');

      //
      // re-apply http stuff
      this.httpSetup();

      //
      // set path to be requestes
      const requestPath: string = `${this.endpoint}${path}`;

      //
      // for unit test
      this._observer = observer;

      //
      // network handle
      const network = () => {
        this.http
          .delete(requestPath)
          .then(async (r: AxiosResponse) => {
            //
            // build standard response
            const response: Response = {
              data: r.data,
              response: r
            };

            //
            // success callback
            observer.next(response as T);
            observer.complete();
          })
          .catch(err => {
            const errData = get(err, 'response.data');
            //
            // error callback
            observer.error(errData ? errData : err);
            observer.complete();
          });
      };

      //
      // otherwise
      network();
    });
  }

  /**
   * Set current driver
   *
   * @param {string} name
   * @returns
   * @memberof ReactiveRecord
   */
  public driver(name: string) {
    this._driver = name;
    return this;
  }

  /**
   * Set whether to use network for first requests
   *
   * @param {boolean} active
   * @returns
   * @memberof ReactiveRecord
   */
  public useNetwork(active: boolean) {
    this.extraOptions.useNetwork = active;
    return this;
  }

  /**
   * Set whether to cache network responses
   *
   * @param {boolean} active
   * @returns
   * @memberof ReactiveRecord
   */
  public saveNetwork(active: boolean) {
    this.extraOptions.saveNetwork = active;
    return this;
  }

  /**
   * Set transform fn for network responses
   *
   * @param {(response: Response) => any} transformFn
   * @returns
   * @memberof ReactiveRecord
   */
  public transformNetwork<T>(transformFn: (response: Response) => any) {
    this.extraOptions.transformNetwork = transformFn;
    return this;
  }

  /**
   * Set cache time to live
   *
   * @param {number} value
   * @returns
   * @memberof ReactiveRecord
   */
  public ttl(value: number) {
    this.extraOptions.ttl = value;
    return this;
  }

  /**
   * Set whether to use cache for first requests
   *
   * @param {boolean} active
   * @returns
   * @memberof ReactiveRecord
   */
  public useCache(active: boolean) {
    this.extraOptions.useCache = active;
    return this;
  }

  /**
   * Set transform fn for cache
   *
   * @param {(response: Response) => any} transformFn
   * @returns
   * @memberof ReactiveRecord
   */
  public transformCache<T>(transformFn: (response: Response) => any) {
    this.extraOptions.transformCache = transformFn;
    return this;
  }

  /**
   * Set cache key
   *
   * @param {string} name
   * @returns
   * @memberof ReactiveRecord
   */
  public key(name: string) {
    this.extraOptions.key = name;
    return this;
  }

  /**
   * Set request query
   *
   * @param {({ [key: string]: {} } | { [key: string]: {} }[])} by
   * @returns
   * @memberof ReactiveRecord
   */
  public query(by: { [key: string]: {} } | { [key: string]: {} }[]) {
    this.request.query = by;
    return this;
  }

  /**
   * Set request where
   *
   * @param {string} field
   * @param {string} operator
   * @param {(string | number | boolean)} value
   * @returns
   * @memberof ReactiveRecord
   */
  public where(
    field: string,
    operator: string,
    value: string | number | boolean
  ) {
    if (isEmpty(this.request.query)) {
      this.request.query = [];
    }
    this.request.query.push({
      field: field,
      operator: operator,
      value: value
    });
    return this;
  }

  /**
   * Set request sort
   *
   * @param {{ [key: string]: string }} by
   * @returns
   * @memberof ReactiveRecord
   */
  public sort(by: { [key: string]: string }) {
    if (isEmpty(this.request.sort)) {
      this.request.sort = {};
    }
    for (const k in by) {
      this.request.sort[k] = by[k];
    }
    return this;
  }

  /**
   * Set request size
   *
   * @param {number} value
   * @returns
   * @memberof ReactiveRecord
   */
  public size(value: number) {
    this.request.size = value;
    return this;
  }

  /**
   * Set reference
   *
   * @param {string} path
   * @returns
   * @memberof ReactiveRecord
   */
  public ref(path: string) {
    this.extraOptions.ref = path;
    return this;
  }
}

export class PlatformServer extends ReactiveRecord {}
