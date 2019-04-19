import { AxiosRequestConfig } from 'axios';
import { merge, isEmpty, cloneDeep, isBoolean, isString } from 'lodash';
import { Observable, Subject } from 'rxjs';
import { ReactiveApi } from '../interfaces/api';
import { ReactiveDriverOption } from '../interfaces/driver';
import { Request } from '../interfaces/request';
import { Options, ExtraOptions } from '../interfaces/options';
import { FirestoreDriver } from '../drivers/firestore';
import { FirebaseDriver } from '../drivers/firebase';
import { Response } from '../interfaces/response';
import { StorageAdapter } from '../interfaces/storage';
import { Log } from '../interfaces/log';
import { Logger } from '../utils/logger';
import { Config } from '../symbols/rr';
import { SHA256 } from '../utils/sha';
import { HttpDriver } from '../drivers/http';
import { ReactiveVerb } from '../interfaces/verb';

export class ReactiveRecord implements ReactiveApi {
  protected collection: string;
  protected storage: StorageAdapter;

  private _driver_initialized = {};
  private _driver: ReactiveDriverOption = 'firestore';
  private _drivers: {
    firestore: any;
    firebase: any;
    http: any;
  } = {
    firestore: {},
    firebase: {},
    http: {}
  };

  private httpConfig: AxiosRequestConfig = {};
  private beforeHttp = (config: AxiosRequestConfig) => {};

  private endpoint: string;
  private request: Request = {};
  private extraOptions: ExtraOptions = {};

  //
  // subject for handling logs
  public $log: Subject<Log> = new Subject();
  protected _logger: Logger; // instance

  //
  // runtime config
  private _initial_options: Options;
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
    // settings initialized once
    if (this._initialized) return;

    //
    // configure logger
    if (!isBoolean(options.useLog)) options.useLog = true;
    if (!isBoolean(options.useLogTrace)) options.useLogTrace = false;
    this._logger = new Logger({
      subject: this.$log,
      useLog: options.useLog,
      useLogTrace: options.useLogTrace
    });

    //
    // set default drivers
    this.driverInit(options);

    //
    // apply class options
    delete options.useLog;
    delete options.useLogTrace;
    delete options.driver;
    merge(this, options);

    //
    // mark as initialized
    this._initialized = true;
  }

  public firebase() {
    return this.getDriverInstance('firebase');
  }

  public firestore() {
    return this.getDriverInstance('firestore');
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
    return this._logger;
  }

  protected getDriver(): ReactiveDriverOption {
    return this._driver;
  }

  private getDriverInstance(driver) {
    if (isEmpty(this._driver_initialized[driver])) {
      const options: Options = this.cloneOptions();
      this.driverInit(options);
    } else {
      this._driver_initialized[driver] = true;
    }
    return this._drivers[driver].connector;
  }

  private _reset(): void {
    this.request = {};
    this.extraOptions = {};
  }

  private cloneOptions() {
    const consumer: Options = this._initial_options;
    const general: Options = Config.options;
    return { ...general, ...consumer };
  }

  private driverInit(options: Options) {
    this._driver = options.driver || 'firestore';
    this._drivers = {
      firestore: new FirestoreDriver({
        ...{ _logger: this._logger },
        ...options
      }),
      firebase: new FirebaseDriver({
        ...{ _logger: this._logger },
        ...options
      }),
      http: new HttpDriver({
        ...{ _logger: this._logger },
        ...options,
        ...{ httpConfig: this.httpConfig }
      })
    };
  }

  private driverHttpReload(options: Options) {
    this.beforeHttp(this.httpConfig);
    this._drivers.http = new HttpDriver({
      ...{ _logger: this._logger },
      ...options,
      ...{ httpConfig: this.httpConfig }
    });
  }

  private driverException(_driver: string, _method: string) {
    if (this.verbs[_driver][_method] === false)
      throw new Error(
        `[${_method}] methond unavailable for driver [${_driver}]`
      );
  }

  public useLog(active: boolean): ReactiveRecord {
    this._logger.enabled(active);
    return this;
  }

  public useLogTrace(active: boolean): ReactiveRecord {
    this._logger.traced(active);
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

  public on<T>(
    onSuccess: (response: Response) => any = (response: Response) => {},
    onError: (response: any) => any = (response: any) => {}
  ): any {
    return this.call('on', null, {
      onSuccess: onSuccess,
      onError: onError
    });
  }

  protected createKey(path = '', body = {}): string {
    const extraOptions = this.cloneExtraOptions();
    const requestPath = `${this.collection}:/${this.endpoint || ''}${path ||
      ''}/${SHA256(
      JSON.stringify({
        ...body,
        ...this.request,
        ...{ ref: this.extraOptions.ref || '' },
        ...{ driver: this._driver }
      })
    )}`;
    // requestPath += `/${JSON.stringify(this.request.query)}`;
    return extraOptions.key || requestPath.replace('///', '//');
  }

  protected cloneExtraOptions(): ExtraOptions {
    return cloneDeep(this.extraOptions);
  }

  private call<T extends Response>(
    method: ReactiveVerb,
    path: string = '/',
    payload?: any
  ): Observable<T> {
    let _method = method;
    let _driver = this.getDriver();
    let arg1, arg2, arg3, arg4;

    const handler = this.verbs[_driver][_method];
    if (isString(handler)) {
      _driver = handler.split('.')[0] as ReactiveDriverOption;
      _method = handler.split('.')[1] as ReactiveVerb;
    }

    //
    // run exception
    this.driverException(_driver, _method);

    //
    // init rr
    this.init({ driver: _driver });

    //
    // define an unique key
    const key = this.createKey(path, payload);

    //
    // firebase stuff
    const request = cloneDeep(this.request);
    const extraOptions = cloneDeep(this.extraOptions);

    //
    // reset the chain
    this._reset();

    //
    // define arguments
    switch (_method) {
      case 'find':
      case 'findOne':
        arg1 = request;
        arg2 = key;
        arg3 = extraOptions;
        break;
      case 'set':
      case 'update':
        arg1 = payload.id;
        arg2 = payload.data;
        arg3 = payload.shouldMerge;
        break;
      case 'on':
        arg1 = request;
        arg2 = payload.onSuccess;
        arg3 = payload.onError;
        arg4 = extraOptions;
        break;
      default:
        arg1 = path;
        arg2 = key;
        arg3 = payload;
    }

    //
    // execute request
    return this._drivers[_driver][_method](arg1, arg2, arg3, arg4);
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
   * Set current driver
   */
  public driver(name: ReactiveDriverOption): ReactiveRecord {
    this._driver = name;
    return this;
  }

  /**
   * Set current driver
   */
  public http(fn: (config: AxiosRequestConfig) => void): ReactiveRecord {
    this.beforeHttp = fn;
    return this;
  }

  /**
   * Set whether to use network for first requests
   */
  public useNetwork(active: boolean): ReactiveRecord {
    this.extraOptions.useNetwork = active;
    return this;
  }

  /**
   * Set whether to cache network responses
   */
  public saveNetwork(active: boolean): ReactiveRecord {
    this.extraOptions.saveNetwork = active;
    return this;
  }

  /**
   * Set a transform fn for the responses
   */
  public transformResponse<T>(
    transformFn: (response: Response) => any
  ): ReactiveRecord {
    this.extraOptions.transformResponse = transformFn;
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
    this.extraOptions.ttl = value;
    return this;
  }

  /**
   * Set whether to use cache for first requests
   */
  public useCache(active: boolean): ReactiveRecord {
    this.extraOptions.useCache = active;
    return this;
  }

  /**
   * Set transform fn for cache
   */
  public transformCache<T>(
    transformFn: (response: Response) => any
  ): ReactiveRecord {
    this.extraOptions.transformCache = transformFn;
    return this;
  }

  /**
   * Set cache key
   */
  public key(name: string): ReactiveRecord {
    this.extraOptions.key = name;
    return this;
  }

  /**
   * Set request query
   */
  public query(
    by: { [key: string]: {} } | { [key: string]: {} }[]
  ): ReactiveRecord {
    this.request.query = by;
    return this;
  }

  /**
   * Set request where
   */
  public where(
    field: string,
    operator: string,
    value: string | number | boolean
  ): ReactiveRecord {
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
   */
  public sort(by: { [key: string]: string }): ReactiveRecord {
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
   */
  public size(value: number): ReactiveRecord {
    this.request.size = value;
    return this;
  }

  /**
   * Set reference (for firebase)
   */
  public ref(path: string): ReactiveRecord {
    this.extraOptions.ref = path;
    return this;
  }

  public data(transform: boolean): ReactiveRecord {
    this.extraOptions.transformData = transform;
    return this;
  }

  /**
   * experimental
   */
  public reboot() {
    this._initialized = false;
    const currentDriver = this.getDriver();
    this.init({ driver: currentDriver });
  }

  public reset(): ReactiveRecord {
    this._reset();
    return this;
  }
}

export class PlatformServer extends ReactiveRecord {}
