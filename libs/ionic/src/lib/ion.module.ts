import { RouteReuseStrategy } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { storageConfig } from '@firetask/core';
import { Config } from '@firetask/reactive-record';

import { Ui } from './ui.service';

import {
  NgModule,
  ModuleWithProviders,
  Injectable,
  Inject
} from '@angular/core';

import { Storage } from '@ionic/storage';

export interface ReactiveIonicOptions {
  dbName: string;
  dbStore: string;
}

@Injectable()
export class ReactiveIonic {
  constructor(@Inject('Options') public options) {
    Config.options = {
      ...Config.options,
      ...options,
      ...{
        storage: new Storage(storageConfig(options.dbName, options.dbStore))
      }
    };
  }
}

@NgModule({
  declarations: [],
  imports: [IonicModule.forRoot()],
  exports: [IonicModule]
})
export class ReactiveIonicModule {
  public static forRoot(
    options: ReactiveIonicOptions = {} as ReactiveIonicOptions
  ): ModuleWithProviders {
    return {
      ngModule: ReactiveIonicModule,
      providers: [
        Ui,
        ReactiveIonic,
        {
          provide: 'Options',
          useValue: options
        },
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
      ]
    };
  }
  constructor(private ionic: ReactiveIonic) {}
}
