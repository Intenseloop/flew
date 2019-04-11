import * as Firebase from 'firebase/app';
import 'firebase/firestore';
import {
  FirebaseConnector,
  FirestoreConnector,
  Version
} from '@firetask/reactive-record';

import { Storage } from '@ionic/storage';
import { storageConfig } from '@firetask/ionic'; // @todo export from reactive-record lib
import { Config } from '@firetask/reactive-record';

// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

const appVersion: number | string = '0001'; // MAJOR.MINOR.PATCH

const firebaseConfig = {
  apiKey: 'AIzaSyDd0NPKiqB06EkCxRRai6rHphUVgkU38jA',
  authDomain: 'reactive-record-demo.firebaseapp.com',
  databaseURL: 'https://reactive-record-demo.firebaseio.com',
  projectId: 'reactive-record-demo',
  storageBucket: 'reactive-record-demo.appspot.com',
  messagingSenderId: '244444899524'
};

Config.options = {
  baseURL: 'https://api.thecatapi.com',
  endpoint: '',
  connector: {
    firebase: new FirebaseConnector(Firebase, firebaseConfig),
    firestore: new FirestoreConnector(Firebase, firebaseConfig)
  },

  // extra options
  version: Version.get(appVersion),
  storage: new Storage(storageConfig())
};

export const environment = {
  production: false
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/dist/zone-error';  // Included with Angular CLI.
