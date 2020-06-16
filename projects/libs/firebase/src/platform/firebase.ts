import { Rebased } from '../../../core/src';
import { FirebaseConnector, FirestoreConnector } from './connectors';
import { FirebaseDriver } from '../driver/firebase';
import { FirestoreDriver } from '../driver/firestore';

export interface RebasedFirebaseOptions {
  config: any;
  persistence: boolean;
}

export function firebase() {
  return Rebased.driver.firebase.getInstance();
}

export function firestore() {
  return Rebased.driver.firestore.getInstance();
}

export function install(sdk, config, namespace = '', settings = {}) {
  const isDriverAvailable = Rebased.drivers.find(it => it === 'firebase');
  if (!isDriverAvailable) {
    Rebased.drivers = [...Rebased.drivers, 'firebase', 'firestore'];
  }

  Rebased.driver.firebase = new FirebaseDriver({
    instance: new FirebaseConnector(sdk, config)
  });
  Rebased.driver.firestore = new FirestoreDriver({
    instance: new FirestoreConnector(sdk, config, namespace, settings)
  });
}
