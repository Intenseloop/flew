import * as Firebase from 'firebase/app';

export interface FirebaseOptions {
  config: any;
  persistence?: boolean;
  loader: any;
}

import {
  NgModule,
  ModuleWithProviders,
  Injectable,
  Inject
} from '@angular/core';

@Injectable()
export class RebasedFirebaseSetup {
  constructor(@Inject('FirebaseOptions') public options) {
    options.loader.install(Firebase, options.config);
  }
}

/**
  Firebase Module 
  @example
  ```js
  import { FirebaseModule } from '@rebased/angular';
  //... 
  FirebaseModule.forRoot({
    config: FIREBASE_CONFIG, // from firebase console
    persistence: true // firestore setting
  })
  //...
  ```
  @export
  @class FirebaseModule
*/
@NgModule()
export class FirebaseModule {
  public static forRoot(
    options: FirebaseOptions = {} as FirebaseOptions
  ): ModuleWithProviders<FirebaseModule> {
    return {
      ngModule: FirebaseModule,
      providers: [
        RebasedFirebaseSetup,
        {
          provide: 'FirebaseOptions',
          useValue: options
        }
      ]
    };
  }
  constructor(private fire: RebasedFirebaseSetup) {}
}
