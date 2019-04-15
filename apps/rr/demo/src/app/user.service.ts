import { Injectable } from '@angular/core';
import { ReactiveRecord, Collection } from '@firetask/reactive-record';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { Response } from '@firetask/reactive-record';
import { AxiosRequestConfig } from 'libs/reactive-record/node_modules/axios';

// import { AxiosRequestConfig } from 'axios';

export interface UserEntry extends Response {
  id: string;
  text: string;
}

@Injectable({
  providedIn: 'root'
})
@Collection({
  name: 'user',
  endpoint: '/v1'
})
export class UserService {
  $collection: ReactiveRecord;

  constructor() {
    this.$collection.feed();
    // this.$collection.http((config: AxiosRequestConfig) => {
    //   config.params = { rr: 123 };
    //   config.headers = { 'x-api-key': `${456}` };
    // });
  }

  find(): Observable<UserEntry> {
    return this.$collection.find();
  }

  findOne(): Observable<UserEntry> {
    return this.$collection.findOne();
  }

  findOneAlternative(): Observable<Response<UserEntry>> {
    return this.$collection.findOne();
  }

  findAll(): Observable<Response<UserEntry[]>> {
    return this.$collection.find();
  }
}
