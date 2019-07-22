---
description: 'Easy as cake, start work with redux today using the state package.'
---

# Getting Started

### Installation

```bash
$ npm install --save @reative/state
```

{% hint style="info" %}
Dependencies
{% endhint %}

```bash
$ npm i -P @ngxs/store && npm i -P lodash
```

#### Load Module

{% code-tabs %}
{% code-tabs-item title="app.module.ts" %}
```typescript
import { NgxsModule } from '@ngxs/store';
import { State, StateModule } from '@reative/state';
import { environment } from '../environments/environment';

@NgModule({
  // ...
  imports: [
    //
    // ngxs
    NgxsModule.forRoot([State], {
      developmentMode: !environment.production
    }),
    //
    // rr state
    StateModule.forRoot()
  ]
})
export class AppModule {}
```
{% endcode-tabs-item %}
{% endcode-tabs %}

#### Freeze Data

This is very powerful on development stage to make sure we're not going to mutate app state.

```bash
$ npm install --save-dev @ngxs/devtools-plugin
```

```typescript
import { NgxsModule } from '@ngxs/store';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { State, StateModule } from '@reative/state';
import { environment } from '../environments/environment';

@NgModule({
  // ...
  imports: [
    //
    // ngxs
    NgxsModule.forRoot([State], {
      developmentMode: !environment.production
    }),
    NgxsReduxDevtoolsPluginModule.forRoot({ disabled: environment.production }),
    //
    // rr state
    StateModule.forRoot()
  ]
})
export class AppModule {}
```

