import axios, { AxiosResponse } from 'axios';
import { get, omit, cloneDeep } from 'lodash';
import { from, Observable, PartialObserver } from 'rxjs';
import { ConnectorHttp } from '../interfaces/connector';
import { ReativeDriver, ReativeDriverOption } from '../interfaces/driver';
import { ReativeOptions } from '../interfaces/options';
import { Response, ResponseSource } from '../interfaces/response';
import { Reative } from '../symbols/reative';
import { Logger } from '../utils/logger';
import { clearNetworkResponse } from '../utils/response';
import { ReativeChainPayload } from '../interfaces/chain';

declare var window;
export class HttpDriver implements ReativeDriver {
  driverName: ReativeDriverOption = 'http';
  driverOptions: ReativeOptions;
  connector: ConnectorHttp;
  logger: Logger;

  constructor(options: ReativeOptions) {
    this.driverOptions = options;
    try {
      if (
        window &&
        window.Worker &&
        options.useWorker === true &&
        !Reative.worker.http
      ) {
        Reative.worker.http = new Worker('/worker/http.js');
      }
    } catch (err) {}
    // if (typeof Worker !== 'undefined') {
    //   Reative.worker.http = new Worker('../platforms/browser.worker', {
    //     type: 'module'
    //   });
    // }
  }

  public log() {
    return this.logger;
  }

  public executeRequest<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    key: string,
    body: any = {},
    chain: ReativeChainPayload
  ): Observable<T> {
    const options: ReativeOptions = {
      ...Reative.options,
      ...this.driverOptions,
      ...chain
    };

    if (chain.useSessionToken) {
      options.httpConfig.headers[`Authorization`] = `Bearer ${
        chain.useSessionToken
      }`;
    }

    this.connector = Reative.connector.http || axios.create(options.httpConfig);

    const baseURL = options.baseURL || get(options, 'httpConfig.baseURL');
    const endpoint = options.endpoint;
    const collectionName = options.collection;

    //
    // call exceptions
    if (!baseURL) throw new Error(`baseURL needed for [${method}]`);
    if (!endpoint) throw new Error(`endpoint required for [${method}]`);

    //
    // set path to be requestes
    const url = `${baseURL}${endpoint}${path}`;
    return new Observable((observer: PartialObserver<T>) => {
      //
      // error callback
      const error = (err, source: ResponseSource = 'http') => {
        const errData = get(err, 'response.data');
        try {
          observer.error(errData ? errData : err);
          if (source !== 'worker') observer.complete();
        } catch (err) {}
      };

      //
      // success callback
      const success = (r, source: ResponseSource = 'http') => {
        // double check for worker errors
        if (source === 'worker' && r.data.error) {
          return error(r.data.error, source);
        }

        const data = source === 'worker' ? r.data.data : r.data;
        const dataResponse =
          source === 'worker'
            ? omit(cloneDeep(r.data), [`data`])
            : omit(cloneDeep(r), [`data`]);

        // build standard response
        const response: Response = clearNetworkResponse({
          data: data,
          response: dataResponse,
          key: source === 'worker' ? r.data.key : key,
          collection: collectionName || '',
          driver: this.driverName,
          source: source
        });

        //
        // success callback
        if (source === 'worker') {
          Reative.responses[r.data.key].observer.next(response as T);
        } else {
          observer.next(response as T);
          observer.complete();
        }
      };
      //
      // network handle
      if (
        Reative.worker.http &&
        options.useWorker &&
        chain.useWorker !== false
      ) {
        Reative.responses[key] = {
          key: key,
          observer: observer
        };
        Reative.worker.http.postMessage({
          key: key,
          method: method,
          url: url,
          body: body,
          headers: options.httpConfig.headers
        });
        Reative.worker.http.onmessage = r => success(r, 'worker');
        Reative.worker.http.onerror = r => error(r, 'worker');
      } else {
        switch (method) {
          case 'post':
            from(this.connector.post(url, body))
              .toPromise()
              .then((r: AxiosResponse) => success(r))
              .catch(error);
            break;

          case 'patch':
            from(this.connector.patch(url, body))
              .toPromise()
              .then((r: AxiosResponse) => success(r))
              .catch(error);
            break;

          case 'delete':
            from(this.connector.delete(url, body))
              .toPromise()
              .then((r: AxiosResponse) => success(r))
              .catch(error);
            break;

          default:
            from(this.connector.get(url))
              .toPromise()
              .then((r: AxiosResponse) => success(r))
              .catch(error);
        }
      }
    });
  }

  public get<T>(
    path: string = '',
    key: string = '',
    payload: any,
    chain: ReativeChainPayload
  ): Observable<T> {
    return this.executeRequest('get', path, key, payload, chain);
  }

  public post<T>(
    path: string = '',
    key: string = '',
    payload: any = {},
    chain: ReativeChainPayload
  ): Observable<T> {
    return this.executeRequest('post', path, key, payload, chain);
  }

  public patch<T>(
    path: string = '',
    key: string = '',
    payload: any = {},
    chain: ReativeChainPayload
  ): Observable<T> {
    return this.executeRequest('patch', path, key, payload, chain);
  }

  public delete<T>(
    path: string = '',
    key: string = '',
    payload: any = {},
    chain: ReativeChainPayload
  ): Observable<T> {
    return this.executeRequest('delete', path, key, payload, chain);
  }
}
