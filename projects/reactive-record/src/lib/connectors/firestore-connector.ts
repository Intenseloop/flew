
/**
 * initialize and return the firestore instance
 *
 * @export
 * @class FirestoreConnector
 */
export class FirestoreConnector {
    constructor(firebase, config) {
        const settings = {/* your settings... */ timestampsInSnapshots: true };

        if (!firebase.apps.length) {
            firebase.initializeApp(config);
            const firestore = firebase.default.firestore();
            firestore.settings(settings);
            return firestore;
        } else {
            const firestore = firebase.apps[0].firebase_.firestore();
            firestore.settings(settings);
            return firestore;
        }
    }
}
