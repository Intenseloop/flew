// import { Subject } from 'rxjs';
// import { RebasedChainPayload } from '../interfaces/chain';
// import { Records } from '../platforms/server';
// import { Rebased } from '../symbols/rebased';
// import { Logger } from '../utils/logger';
// import { FirestoreDriver } from './firestore';
// class FirestoreDriverMock extends FirestoreDriver {
//   logger = new Logger({
//     subject: new Subject(),
//     silent: false
//   });

//   constructor(options) {
//     super(options);
//   }

//   public where(query, firestore) {
//     return super.where(query, firestore);
//   }

//   public order(sort, firestore) {
//     return super.order(sort, firestore);
//   }

//   public limit(
//     limit,
//     firestore = {
//       limit: () => {
//         get: () => Promise.resolve();
//       }
//     }
//   ) {
//     return super.limit(limit, firestore);
//   }

//   public on(chain: RebasedChainPayload = {}, key: string = ''): any {
//     return super.on(chain, key);
//   }
// }

// class FirestoreFailMock extends FirestoreDriver {
//   logger = new Logger({
//     subject: new Subject(),
//     silent: false
//   });

//   constructor(options) {
//     super(options);
//   }

//   public where(query, firestore) {
//     return super.where(query, firestore);
//   }

//   public limit(limit, firestore) {
//     return super.limit(limit, firestore);
//   }

//   //
//   // fail
//   public order(sort, firestore) {
//     return super.order(sort, firestore);
//   }
// }
// const get = Promise.resolve([
//   {
//     data: () => {
//       return { foo: 'data' };
//     }
//   }
// ]);
// const set = Promise.resolve(true);
// const update = Promise.resolve(true);
// const onSnapshot = (successFn, errorFn) => {};

// const firestoreCollectionDocGetStub: any = jasmine
//   .createSpy('get')
//   .and.returnValue(get);

// const firestoreCollectionDocSetStub: any = jasmine
//   .createSpy('set')
//   .and.returnValue(set);

// const firestoreCollectionDocUpdateStub: any = jasmine
//   .createSpy('update')
//   .and.returnValue(update);

// const firestoreCollectionDocOnStub: any = jasmine
//   .createSpy('onSnapshot')
//   .and.returnValue(onSnapshot);

// const firestoreCollectionDocStub: any = jasmine
//   .createSpy('doc')
//   .and.returnValue({
//     get: firestoreCollectionDocGetStub,
//     set: firestoreCollectionDocSetStub,
//     update: firestoreCollectionDocUpdateStub,
//     onSnapshot: firestoreCollectionDocOnStub
//   });

// const firestoreCollectionStub: any = jasmine
//   .createSpy('collection')
//   .and.returnValue({
//     doc: firestoreCollectionDocStub,
//     get: firestoreCollectionDocGetStub,
//     onSnapshot: firestoreCollectionDocOnStub
//   });

// export const firestoreStub: any = {
//   collection: firestoreCollectionStub
// };

// describe('FirestoreDriver', () => {
//   let driver: FirestoreDriverMock, lib: Records;
//   const collection = 'foo-collection';

//   beforeEach(() => {
//     Rebased.connector = {
//       firestore: firestoreStub
//     };
//     driver = new FirestoreDriverMock({
//       collection: collection
//     });
//   });

//   it('should be created using minimal setup', () => {
//     expect(driver).toBeTruthy();
//     driver = new FirestoreDriverMock({
//       chain: {
//         useCache: false
//       }
//     });
//     expect(driver).toBeTruthy();
//   });

//   it('should implement `find` method', () => {
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'find');
//     driver.find({}, 'my-key').toPromise();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should implement `findOne` method', () => {
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'findOne');
//     driver.findOne({}, 'my-key').toPromise();
//     expect(spy).toHaveBeenCalledTimes(1);
//   });

//   it('should implement `on` method', () => {
//     const onSnapshot = fn => {
//       const snapshot = {
//         forEach: fn => {
//           return fn({
//             data: () => {
//               return { data: { a: 1, b: 2, c: 3 } };
//             }
//           });
//         }
//       };
//       fn(snapshot);
//     };
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             doc: () => {},
//             onSnapshot: onSnapshot,
//             where: () => {},
//             order: () => {
//               return {
//                 onSnapshot: onSnapshot
//               };
//             },
//             limit: () => {
//               return {
//                 onSnapshot: onSnapshot
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     const driver_ = new FirestoreDriverMock({
//       logger: new Logger({
//         subject: new Subject(),
//         silent: false
//       }),
//       collection: 'users'
//     } as any);
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'on');
//     driver_.on({});
//     driver_.on({
//       transformResponse: r => r.data
//     });
//     driver_.on({ doc: 'asdf', size: 54 });

//     expect(spy).toHaveBeenCalledTimes(3);
//   });

//   it('should fail for `on` method', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             doc: () => {},
//             onSnapshot: onSnapshotFail,
//             where: () => {},
//             order: () => {
//               return {
//                 onSnapshot: onSnapshotFail
//               };
//             },
//             limit: () => {
//               return {
//                 onSnapshot: onSnapshotFail
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     const onSnapshotFail = (fn1, fn2) => {
//       return fn2('on failed');
//     };
//     const driver_ = new FirestoreDriver({
//       collection: 'users'
//     });

//     driver_.on({}, '');
//   });

//   it('should fail on missing `collection` for [find] method', async () => {
//     let thrownError;
//     Rebased.connector = {
//       firestore: firestoreStub
//     };
//     driver = new FirestoreDriverMock({
//       driver: 'firestore'
//     });
//     try {
//       await driver.find({}, 'my-key').toPromise();
//     } catch (err) {
//       thrownError = err;
//     }
//     return expect(thrownError).toEqual(new Error('missing collection'));
//   });

//   it('should fail on missing `connector` for [find] method', async () => {
//     let thrownError;

//     Rebased.connector = {
//       firestore: {}
//     };

//     driver = new FirestoreDriverMock({
//       collection: 'users'
//     });

//     try {
//       await driver.find({}, 'my-key').toPromise();
//     } catch (err) {
//       thrownError = err;
//     }

//     return expect(thrownError).toEqual(
//       new Error(`missing firestore connector`)
//     );
//   });

//   it('should apply `where` using array', () => {
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'where');
//     driver.where([{ field: 'uid', operator: '==', value: 'a1b2c3' }], {
//       where: () => {}
//     });
//     expect(spy).toHaveBeenCalled();
//     expect(() => {
//       driver.where([{ field: 'uid', operator: '==', value: null }], {
//         where: () => {}
//       });
//     }).toThrowError(`value can't be null for firestore where`);
//   });

//   it('should apply `where` using object', () => {
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'where');
//     driver.where([{ field: 'uid', operator: '==', value: 'a1b2c3' }], {
//       where: () => {}
//     });
//     expect(spy).toHaveBeenCalled();
//     expect(() => {
//       driver.where([{ field: 'uid', operator: '==', value: null }], {
//         where: () => {}
//       });
//     }).toThrowError(`value can't be null for firestore where`);
//   });

//   it('should apply `order` using array', () => {
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'order');
//     driver.order([{ updated_at: 'desc' }], { orderBy: () => {} });
//     expect(spy).toHaveBeenCalled();
//     expect(() => {
//       driver.order([{}], {
//         orderBy: () => {
//           return { orderBy: () => {} };
//         }
//       });
//     }).toThrowError(`sort object in array can't be null`);
//   });

//   it('should apply `order` using object', () => {
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'order');
//     driver.order(
//       { updated_at: 'desc', created_at: 'asc' },
//       {
//         orderBy: () => {
//           return { orderBy: () => {} };
//         }
//       }
//     );
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should apply `limit`', () => {
//     Rebased.connector = {
//       firestore: firestoreStub
//     };
//     driver = new FirestoreDriverMock({
//       driver: 'firestore',
//       collection: collection
//     });
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'limit');
//     driver.limit(54, {
//       limit: () => {}
//     });
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should apply the limit on `find` method', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             where: () => {},
//             limit: () => {
//               return {
//                 get: () =>
//                   Promise.resolve({
//                     forEach: () => {}
//                   })
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     driver = new FirestoreDriverMock({
//       driver: 'firestore',
//       collection: collection
//     });
//     const spy = jest.spyOn(FirestoreDriverMock.prototype, 'limit');
//     driver.find({ size: 999 }, 'my-key').toPromise();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should fail on `sort`', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {}
//       }
//     };
//     driver = new FirestoreFailMock({
//       driver: 'firestore',
//       collection: collection,

//       chain: { a: 123 }
//     });

//     expect(() => {
//       driver.order({}, { orderBy: () => {} });
//     }).toThrowError(`sort object can't be null`);
//   });

//   it('should fail on `find`', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             where: () => {},
//             order: () => {},
//             limit: () => {
//               return {
//                 get: () => Promise.reject('find failed')
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     driver = new FirestoreDriverMock({
//       collection: collection
//     });
//     driver
//       .find({ size: 54 }, 'my-key')
//       .toPromise()
//       .catch(err => expect(err).toBe('find failed'));
//   });

//   it('should `set`', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             doc: () => {
//               return {
//                 set: () => {
//                   return Promise.resolve();
//                 }
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     const spy = jest.spyOn(FirestoreDriver.prototype, 'set');
//     const driver_ = new FirestoreDriver({
//       collection: collection
//     });
//     driver_.set({ doc: 'a1b2c3' }, { lol: 123 }).toPromise();
//     expect(spy).toHaveBeenCalled();
//   });

//   it('should fail on `set`', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             doc: () => {
//               return {
//                 set: () => {
//                   return Promise.reject('set failed');
//                 }
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     const driver_ = new FirestoreDriver({
//       collection: collection
//     });
//     driver_
//       .set({ doc: 'a1b2c3' }, { lol: 123 })
//       .toPromise()
//       .catch(err => {
//         expect(err).toBe(`set failed`);
//       });
//   });

//   it('should NOT apply `timestamp`', () => {
//     Rebased.connector = {
//       firestore: {
//         collection: () => {
//           return {
//             doc: () => {
//               return {
//                 update: () => Promise.resolve()
//               };
//             }
//           };
//         },
//         limit: () => false
//       }
//     };
//     const driver_ = new FirestoreDriver({
//       timestamp: false,
//       collection: collection
//     });
//     driver_
//       .update({ doc: 'a1b2c3' }, {})
//       .toPromise()
//       .then(r => expect(r).toEqual({}));
//   });
// });
