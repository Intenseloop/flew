---
id: set-memo
title: Set Memo
description: 'Great resources to get started learning and using Rebased with Redux State'
hide_title: false
---

Arbitrary and quicker way to persist some data into state.

:::caution
Use this api with caution, the most scalable way to modify a pieca of global state is using reducers.
:::

## Disable cache

By default Rebased detects if you're using cache and will also **save** data into storage.

```ts
import { setMemo } from '@rebased/state';

setMemo('numbers', [1, 2, 3], { save: false }); // skip cache
```

## Play around

Quick way to show up data from global state using angular

```ts
import { connect, setMemo } from '@rebased/state';

@Component({
  selector: 'app-todo-container',
  templateUrl: './todo-container.component.html',
  styleUrls: ['./todo-container.component.scss']
})
export class TodoContainerComponent implements OnInit {
  numbers$ = connect<number[]>('numbers', { memo: true });

  constructor() {}

  ngOnInit() {
    setMemo('numbers', [1, 2, 3]);
  }
}
```

```html
<ul>
  <li *ngFor="let num of (numbers$|async)">{{number}}</li>
</ul>
```
