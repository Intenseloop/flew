import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { dispatch, connect, getState } from '@flew/state';
import { fetch } from '@flew/network';
import { delayedIncrement } from './actions/delayedIncrement';
import { delayedDecrement } from './actions/delayedDecrement';
import { increment } from './actions/increment';
import { decrement } from './actions/decrement';

@Component({
  selector: 'flew-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  display$ = connect<number>('counter');
  displayDetailed$ = connect<number>('counter', { context: true });

  displayFirestoreRealtime = 0;

  constructor(private detector: ChangeDetectorRef) {
    console.log('initial state', getState());
  }

  ngOnInit() {
    this.realtimeFirestoreCounter();
    // fetch('counter')
    //   .from('firestore')
    //   .where('lol', '==', 'do not exists')
    //   .findOne()
    //   .subscribe(it => {
    //     console.log('non existent result');
    //   });
    // fetch('counter')
    //   // .from('firestore')
    //   // .where('lol', '==', 'do not exists')
    //   .findOne()
    //   .subscribe(it => {
    //     console.log(it, 'existent result');
    //   });
  }

  increment() {
    dispatch(increment(1));

    // fetch()
    //   .from('http')
    //   .cache(false)
    //   .state(false)
    //   .get(`https://api.thecatapi.com/v1/images/search`)
    //   .toPromise()
    //   .then((result: any) => {
    //     console.log(result);
    //   });

    // fetch('Entry')
    //   .from('parse')
    //   .set({
    //     a: 123
    //   })
    //   .toPromise()
    //   .then((result: any) => {
    //     console.log(result);
    //   });
  }

  decrement() {
    dispatch(decrement(1));
    // fetch('Entry')
    //   .from('parse')
    //   .doc('oaJ9tKmWCg')
    //   .delete()
    //   .toPromise()
    //   .then((result: any) => {
    //     console.log(result);
    //   });
  }

  incrementAsync(seconds) {
    dispatch(delayedIncrement(seconds));
  }

  decrementAsync(seconds) {
    dispatch(delayedDecrement(seconds));
  }

  incrementFromFirestore() {
    fetch('counter')
      .from('firestore')
      .doc('some-id')
      .set({ total: this.displayFirestoreRealtime + 1 })
      .toPromise();
  }

  decrementFromFirestore() {
    fetch('counter')
      .from('firestore')
      .doc('some-id')
      .set({ total: this.displayFirestoreRealtime - 1 })
      .toPromise();
  }

  realtimeFirestoreCounter() {
    fetch('counter')
      .from('firestore')
      // .state(false)
      // .cache(false)
      .on()
      .subscribe(numbers => {
        console.log('realtime counter from firestore', numbers[0]?.total);
        this.displayFirestoreRealtime = numbers[0]?.total;
        this.detector.detectChanges();
      });
  }
}
