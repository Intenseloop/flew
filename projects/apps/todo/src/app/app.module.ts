import 'firebase/firestore';
import 'firebase/database';
import 'firebase/auth';

import * as reducers from './reducers';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import {
  StateModule,
  CacheModule,
  FirebaseModule,
  RebasedModule,
  ParseModule
} from '@rebased/angular';
import { environment } from '../environments/environment';
import { FIREBASE_CONFIG } from './configs/firebase';
import { AppComponent } from './app.component';
import { RoutesModule } from './routes.module';
import { stateLoader } from '@rebased/state';
import { firebaseLoader } from '@rebased/firebase';
import { cacheLoader } from '@rebased/cache';
import { parseLoader } from '@rebased/parse';
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    RoutesModule,
    RebasedModule.forRoot({
      silent: environment.production,
      baseURL: 'https://api.thecatapi.com',
      endpoint: '/v1'
    }),
    StateModule.forRoot({
      // enable devtools when production is false
      // https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd
      production: environment.production,
      // devtools option. see more at
      // https://github.com/zalmoxisus/redux-devtools-extension/blob/master/docs/API/Arguments.md
      trace: true,
      // define an initial state
      state: {},
      // pass in the app reducers
      reducers: reducers,
      loader: stateLoader
    }),
    FirebaseModule.forRoot({
      config: FIREBASE_CONFIG,
      persistence: false,
      loader: firebaseLoader
    }),
    CacheModule.forRoot({
      dbName: environment.dbName,
      dbStore: environment.dbStore,
      loader: cacheLoader
    }),
    ParseModule.forRoot({
      serverURL: environment.parse.serverURL,
      appID: environment.parse.appID,
      loader: parseLoader
    })
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
