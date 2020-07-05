---
id: entry
title: Collection
description: 'Unique api for data access'
hide_title: false
---

Collections on Rebased are meant to access data information whether using http, firebase or parse. The goal is to provide a single and simple api for such operations like getting, saving and updating data.

### Doing a simple http call

```js
import { entry } from '@rebased/core';
// Get a random kitty
entry('kitty', {
  driver: 'http', // use http driver
  silent: false, // show logs
  baseURL: 'https://api.thecatapi.com',
  endpoint: '/v1'
})
  .get('/images/search?size=small&mime_types=gif')
  .subscribe(
    kitty => console.log(kitty),
    err => console.log(err)
  );
```

### The same call but as a promise

```js
import { entry } from '@rebased/core';

// Get a random kitty

entry('kitty', {
  silent: false,
  driver: 'http',
  baseURL: 'https://api.thecatapi.com',
  endpoint: '/v1'
})
  .get('/images/search?size=small&mime_types=gif')
  .toPromise()
  .then(kitty => console.log(kitty))
  .catch(err => console.log(err));
```

### Configuring options only once

```js
import { Rebased, entry } from '@rebased/core';

Rebased.options = {
  silent: true,
  driver: 'http',
  baseURL: 'https://api.thecatapi.com',
  endpoint: '/v1'
};

// Get a random kitty
entry('kitty')
  .get('/images/search?size=small&mime_types=gif')
  .subscribe(
    kitty => console.log(kitty),
    err => console.log(err)
  );
```

### Changing driver in runtime

```js
import { entry, Rebased } from '@rebased/core';

Rebased.options = {
  silent: false,
  baseURL: 'https://api.thecatapi.com',
  endpoint: '/v1'
};

// Get a kitty from http and firestore
// both using the same api
['firestore', 'http'].map(driver =>
  entry('kitty')
    .driver(driver, {
      endpoint: '/v1/images/search?size=small&mime_types=gif' // this is used by http only
    })
    .where('size', '==', 'small') // this is used by firestore only
    .where('mime_types', '==', 'gif') // this is used by firestore only
    .find()
    .subscribe(
      kitty => console.log(kitty),
      err => console.log(err)
    )
);
```

> Rebased API's for `firebase` and `firestore` follows pretty much the same as in the oficial Google's SDK
