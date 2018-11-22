import { Observable } from 'rxjs';
import { RRExtraOptions } from './rr-extra-options';
import { RRResponse } from './rr-response';
import { RRRequest } from './rr-request';
import { RRConnector } from './rr-connector';

export interface RRDriver {
  connector: RRConnector;
  timestamp: boolean;
  find: (
    request: RRRequest,
    extraOptions?: RRExtraOptions
  ) => Observable<RRResponse>;
  findOne: (
    request: RRRequest,
    extraOptions?: RRExtraOptions
  ) => Observable<RRResponse>;
  set: (id: string, data: any) => Observable<RRResponse>;
  update: (id: string, data: any) => Observable<RRResponse>;
  on?: (
    request: RRRequest,
    onSuccess: (response: RRResponse | any) => any,
    onError: (response: any) => any,
    extraOptions?: RRExtraOptions
  ) => any;
}
