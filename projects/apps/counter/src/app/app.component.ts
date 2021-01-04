import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { dispatch, connect, getState } from '@rebased/state';
import { fetch } from '@rebased/core';
import { delayedIncrement } from './actions/delayedIncrement';
import { delayedDecrement } from './actions/delayedDecrement';
import { increment } from './actions/increment';
import { decrement } from './actions/decrement';

@Component({
  selector: 'rebased-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  display$ = connect<number>('counter');
  displayDetailed$ = connect<number>('counter', { context: true });

  displayFirestoreRealtime = 0;

  constructor(private detector: ChangeDetectorRef) {
    console.log('initial state', getState());
  }

  ngOnInit() {
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

    fetch('counter')
      .from('firestore')
      .where('lol', '==', 'do not exists')
      .findOne()
      .subscribe(it => {
        console.log('non existent result');
      });
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
  }

  decrement() {
    dispatch(decrement(1));
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
}
