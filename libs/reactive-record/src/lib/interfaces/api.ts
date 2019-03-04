import { RRRequest } from './rr-request';
import { RRExtraOptions } from './rr-extra-options';
import { RRResponse } from './rr-response';
import { Observable } from 'rxjs';

/**
 * Public RR Api
 *
 * @export
 * @interface Api
 */
export interface Api {
  //
  // chaining
  driver(name: string);
  useNetwork(active: boolean);
  saveNetwork(active: boolean);
  transformNetwork(transformFn: (response: RRResponse) => any);
  ttl(value: number);
  useCache(active: boolean);
  transformCache(transformFn: (response: RRResponse) => any);
  key(name: string);
  query(by: { [key: string]: {} } | { [key: string]: {} }[]);
  where(field: string, operator: string, value: string | number | boolean);
  sort(by: { [key: string]: string });
  size(value: number);
  ref(path: string);

  //
  // data
  find(): Observable<RRResponse>;
  findOne(): Observable<RRResponse>;
  set(id: string, data: any, merge?: boolean): Observable<any>;
  update(id: string, data: any): Observable<any>;
  on(
    onSuccess: (response: RRResponse | any) => any,
    onError: (response: any) => any
  ): any;

  //
  // http
  get(path: string): Observable<RRResponse>;
  post(path: string, body: any): Observable<RRResponse>;
  patch(path: string, body: any): Observable<RRResponse>;
  delete(path: string): Observable<RRResponse>;
}
