export class FirebaseConnector {
  constructor(firebase, config) {
    try {
      firebase.initializeApp(config);
    } catch (err) {
      if (!/already exists/.test(err.message))
        console.error('Firebase initialization error', err.stack);
    }
    if (!firebase.apps.length) {
      return firebase.default;
    } else {
      return firebase.apps[0].firebase_;
    }
  }
}

export class FirestoreConnector {
  constructor(firebase, config, namespace = '') {
    let firestore;

    try {
      if (namespace) {
        firebase.initializeApp(config, namespace);
      } else {
        firebase.initializeApp(config);
      }
    } catch (err) {
      if (!/already exists/.test(err.message))
        console.error('Firebase initialization error', err.stack);
    }

    let app;

    if (namespace) {
      app = firebase.app(namespace);
    } else {
      app = firebase.app();
    }

    firestore = app.firestore();
    return firestore;
  }
}
