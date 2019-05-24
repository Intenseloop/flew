import { AxiosRequestConfig } from 'axios';
import {
  merge,
  isEmpty,
  isArray,
  isBoolean,
  isString,
  startCase,
  omit
} from 'lodash';
import { Observable, Subject } from 'rxjs';
import { Response } from '../interfaces/response';
import { Options, Chain } from '../interfaces/options';
import { ReactiveApi } from '../interfaces/api';
import { ReactiveVerb } from '../interfaces/verb';
import { ReactiveDriverOption, ReactiveDriver } from '../interfaces/driver';
import { StorageAdapter } from '../interfaces/storage';
import { Log } from '../interfaces/log';
import { Logger } from '../utils/logger';
import { Config } from '../symbols/rr';
import { FirestoreDriver } from '../drivers/firestore';
import { FirebaseDriver } from '../drivers/firebase';
import { HttpDriver } from '../drivers/http';
import { RR_VERSION } from '../version';
import { RR_DRIVER } from '../driver';
import { SHA256 } from '../utils/sha';
export class ReactiveRecord implements ReactiveApi {
  protected collection: string;
  protected endpoint: string;
  protected storage: StorageAdapter;

  private httpConfig: AxiosRequestConfig = {};
  private beforeHttp = (config: AxiosRequestConfig) => {};

  private chain: Chain = {};

  private _driver_initialized = {};
  private _driver: ReactiveDriverOption = RR_DRIVER;
  private _drivers: {
    firestore: ReactiveDriver;
    firebase: ReactiveDriver;
    http: ReactiveDriver;
  } = {
    firestore: {} as ReactiveDriver,
    firebase: {} as ReactiveDriver,
    http: {} as ReactiveDriver
  };

  public $log: Subject<Log> = new Subject();
  protected logger: Logger; // instance

  //
  // runtime setup
  private _initial_options: Options = {};
  private _initialized: boolean;

  //
  // verbs
  private verbs = {
    firestore: {
      find: true,
      findOne: true,
      on: true,
      get: 'http.get',
      post: 'http.post',
      update: true,
      patch: 'http.patch',
      delete: 'http.delete',
      set: true
    },
    firebase: {
      find: true,
      findOne: true,
      on: true,
      get: 'http.get',
      post: 'http.post',
      update: 'http.patch',
      patch: 'http.patch',
      delete: 'http.delete',
      set: 'http.post'
    },
    http: {
      find: 'http.get',
      findOne: 'http.get',
      on: false,
      get: true,
      post: true,
      update: 'http.patch',
      patch: true,
      delete: true,
      set: 'http.post'
    }
  };

  constructor(options: Options) {
    this._initial_options = options;
  }

  public init(runtime: Options = {}) {
    //
    // settings that needs runtime evaluation
    const options: Options = { ...this.cloneOptions(), ...runtime };

    if (!this.httpConfig.timeout) this.httpConfig.timeout = 60 * 1000;
    if (!this.httpConfig.baseURL) this.httpConfig.baseURL = options.baseURL;
    if (!this.httpConfig.headers) this.httpConfig.headers = {};

    //
    // configure http client
    this.driverHttpReload(options);

    //
    // set use cache
    if (!options.chain) options.chain = {};
    options.chain.useCache = options.useCache === false ? false : true;

    //
    // settings initialized once
    if (this._initialized) return;

    //
    // configure logger
    if (!isBoolean(options.useLog)) options.useLog = true;
    if (!isBoolean(options.useLogTrace)) options.useLogTrace = false;
    this.logger = new Logger({
      subject: this.$log,
      useLog: options.useLog,
      useLogTrace: options.useLogTrace
    });

    //
    // set default drivers
    this.driverInit(options);

    //
    // apply class options
    delete options.useCache;
    delete options.useLog;
    delete options.useLogTrace;
    delete options.driver;
    merge(this, options);

    //
    // mark as initialized
    this._initialized = true;

    const name = this.collection || this.endpoint;

    this.log().success()(
      `Collection ${startCase(name)} initiated @ RR ${RR_VERSION}`
    );
  }

  public firebase() {
    return this.getConnector('firebase');
  }

  public firestore() {
    return this.getConnector('firestore');
  }

  public cache() {
    return this.storage;
  }

  /**
   * Clear browser cache
   */
  public clearCache(): void {}

  /**
   * Feed store with cached responses
   */
  public feed(): void {}

  protected log(): Logger {
    return this.logger;
  }

  protected getDriver(): ReactiveDriverOption {
    return this._driver;
  }

  private getConnector(driver) {
    if (!this._driver_initialized[driver]) {
      const options: Options = this.cloneOptions();
      this.driverInit(options);
      this._driver_initialized[driver] = true;
    }

    return this._drivers[driver].connector;
  }

  private _reset(): void {
    this.driver(RR_DRIVER);
    this.chain = {};
  }

  private cloneOptions() {
    const consumer: Options = this._initial_options;
    const general: Options = Config.options;
    return { ...general, ...consumer };
  }

  private driverInit(options: Options) {
    this._driver = options.driver || RR_DRIVER;
    this._drivers = {
      firestore: new FirestoreDriver({
        ...{ logger: this.logger },
        ...options
      }),
      firebase: new FirebaseDriver({
        ...{ logger: this.logger },
        ...options
      }),
      http: new HttpDriver({
        ...{ logger: this.logger },
        ...options,
        ...{ httpConfig: this.httpConfig }
      })
    };
  }

  private driverHttpReload(options: Options) {
    this.beforeHttp(this.httpConfig);
    this._drivers.http = new HttpDriver({
      ...{ logger: this.logger },
      ...options,
      ...{ httpConfig: this.httpConfig }
    });
  }

  private getVerbOrException(_driver: string, _method: string): ReactiveVerb {
    const msg = `[${_method}] method unavailable for driver [${_driver}]`;
    try {
      const verb = this.verbs[_driver][_method];
      if (verb === false) throw new Error(msg);
      return verb;
    } catch (err) {
      throw new Error(msg);
    }
  }

  public useLog(active: boolean): ReactiveRecord {
    this.logger.enabled(active);
    return this;
  }

  public useLogTrace(active: boolean): ReactiveRecord {
    this.logger.traced(active);
    return this;
  }

  public find<T extends Response>(): Observable<T> {
    return this.call<T>('find');
  }

  public findOne<T extends Response>(): Observable<T> {
    return this.call<T>('findOne');
  }

  public set(
    id: string,
    data: any,
    shouldMerge: boolean = true
  ): Observable<any> {
    return this.call('set', null, {
      id: id,
      data: data,
      shouldMerge: shouldMerge
    });
  }

  public update(id: string, data: any): Observable<any> {
    return this.call('update', null, {
      id: id,
      data: data
    });
  }

  public on<T extends Response>(
    onSuccess: (response: Response) => any,
    onError: (response: any) => any
  ): any {
    return this.call<T>('on', null, {
      onSuccess: onSuccess,
      onError: onError
    });
  }

  protected createKey(path, body): string {
    const chain = this.cloneChain();
    const payload = JSON.stringify({
      ...body,
      ...this.chain,
      ...{ path: path },
      ...{ driver: this._driver },
      ...omit(chain, [
        'ttl',
        'key',
        'transformCache',
        'transformResponse',
        'transformNetwork'
      ])
    });
    const key = `${this.collection || 'rr'}:/${this.endpoint || ''}${path ||
      ''}/${SHA256(payload)}`;
    return chain.key || key.split('///').join('//');
  }

  protected cloneChain(): Chain {
    return { ...this.chain };
  }

  protected call<T extends Response>(
    method: ReactiveVerb,
    path: string = '',
    payload: any = {},
    chain = this.cloneChain(),
    key: string = ''
  ): Observable<T> {
    let _method = method;
    let _driver = this.getDriver();
    let arg1, arg2, arg3;

    //
    // get verb
    let verb = this.getVerbOrException(_driver, _method);

    if (isString(verb)) {
      _driver = verb.split('.')[0] as ReactiveDriverOption;
      _method = verb.split('.')[1] as ReactiveVerb;
    }

    //
    // run exception for new variables
    this.getVerbOrException(_driver, _method);

    //
    // init rr
    this.init({ driver: _driver });

    //
    // define an unique key
    key = key ? key : this.createKey(path, payload);

    //
    // reset the chain
    this._reset();

    //
    // define arguments
    switch (_method) {
      case 'find':
      case 'findOne':
        arg1 = chain;
        arg2 = key;
        break;
      case 'set':
      case 'update':
        arg1 = payload.id;
        arg2 = payload.data;
        arg3 = payload.shouldMerge;
        break;
      case 'on':
        arg1 = chain;
        arg2 = payload.onSuccess;
        arg3 = payload.onError;
        break;
      default:
        arg1 = path;
        arg2 = key;
        arg3 = payload;
    }

    //
    // execute request
    return this._drivers[_driver][_method]<T>(arg1, arg2, arg3);
  }

  public get<T extends Response>(path: string = ''): Observable<T> {
    return this.call<T>('get', path);
  }

  public post<T extends Response>(
    path: string = '',
    body: any = {}
  ): Observable<T> {
    return this.call<T>('post', path, body);
  }

  public patch<T extends Response>(
    path: string = '',
    body: any = {}
  ): Observable<T> {
    return this.call<T>('patch', path, body);
  }

  public delete<T extends Response>(
    path: string = '',
    body?: any
  ): Observable<T> {
    return this.call<T>('delete', path, body);
  }

  /**
   * Getter / Setter for the current driver
   */
  public driver(name?: ReactiveDriverOption): ReactiveRecord {
    if (name) {
      this._driver = name;
      return this;
    }
    return this.getDriver() as any;
  }

  public http(fn: (config: AxiosRequestConfig) => void): ReactiveRecord {
    this.beforeHttp = fn;
    return this;
  }

  /**
   * Set whether to use network for first requests
   */
  public useNetwork(active: boolean): ReactiveRecord {
    this.chain.useNetwork = active;
    return this;
  }

  /**
   * Set whether to cache network responses
   */
  public saveNetwork(active: boolean): ReactiveRecord {
    this.chain.saveNetwork = active;
    return this;
  }

  /**
   * Set a transform fn for the responses
   */
  public transformResponse<T>(
    transformFn: (response: Response) => any
  ): ReactiveRecord {
    this.chain.transformResponse = transformFn;
    return this;
  }

  //
  // legacy method
  public transformNetwork<T>(
    transformFn: (response: Response) => any
  ): ReactiveRecord {
    this.transformResponse(transformFn);
    return this;
  }

  /**
   * Set cache time to live
   */
  public ttl(value: number): ReactiveRecord {
    this.chain.ttl = value;
    return this;
  }

  /**
   * Set whether to use cache for first requests
   */
  public useCache(active: boolean): ReactiveRecord {
    this.chain.useCache = active;
    return this;
  }

  /**
   * Set transform fn for cache
   */
  public transformCache<T>(
    transformFn: (response: Response) => any
  ): ReactiveRecord {
    this.chain.transformCache = transformFn;
    return this;
  }

  /**
   * Set cache key
   */
  public key(name: string): ReactiveRecord {
    this.chain.key = name;
    return this;
  }

  /**
   * Set request query
   */
  public query(
    by: { [key: string]: {} } | { [key: string]: {} }[]
  ): ReactiveRecord {
    this.chain.query = by;
    return this;
  }

  /**
   * Set request where
   */
  public where(
    field: string,
    operator: string,
    value: string | number | boolean | []
  ): ReactiveRecord {
    if (!isArray(this.chain.query)) {
      this.chain.query = [];
    }
    this.chain.query.push({
      field: field,
      operator: operator,
      value: value
    });
    return this;
  }

  /**
   * Set request sort
   */
  public sort(by: { [key: string]: string }): ReactiveRecord {
    if (isEmpty(this.chain.sort)) {
      this.chain.sort = {};
    }
    for (const k in by) {
      this.chain.sort[k] = by[k];
    }
    return this;
  }

  /**
   * Set request size
   */
  public size(value: number): ReactiveRecord {
    this.chain.size = value;
    return this;
  }

  /**
   * Set reference (for firebase)
   */
  public ref(path: string): ReactiveRecord {
    this.chain.ref = path;
    return this;
  }

  public data(transform: boolean): ReactiveRecord {
    this.chain.transformData = transform;
    return this;
  }

  public doc(value: string | number): ReactiveRecord {
    this.chain.doc = value;
    return this;
  }

  public reset(): ReactiveRecord {
    this._reset();
    return this;
  }

  /**
   * experimental
   */
  public reboot() {
    this._initialized = false;
    this._driver_initialized = {};
    this.reset();
    this.init({ driver: RR_DRIVER });
  }
}

export class PlatformServer extends ReactiveRecord {}
