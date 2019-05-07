import { PlatformBrowser } from './browser';
import { StorageAdapter } from '../interfaces/storage';
import { Config } from '../symbols/rr';
import { Subject, PartialObserver } from 'rxjs';
import { Logger } from '../utils/logger';
import { Chain } from '../interfaces/options';

class PlatformBrowserMock extends PlatformBrowser {
  constructor(options) {
    super(options);
  }

  public ttl$(evaluation, observer, chain, key) {
    return super.ttl$(evaluation, observer, chain, key);
  }

  public shouldCallNetwork(chain: Chain = {}, key: string) {
    return super.shouldCallNetwork(chain, key);
  }

  public shouldReturnCache(
    chain: Chain,
    key: string,
    observer: PartialObserver<any>
  ) {
    return super.shouldReturnCache(chain, key, observer);
  }
}

describe('Browser Platform', () => {
  let lib: PlatformBrowser;
  const baseURL = 'http://firetask.dev';
  const collection = 'foo-collection';

  beforeEach(() => {
    lib = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      collection: collection,
      connector: {
        // firebase: {}
      },
      storage: { clear: () => {} } as StorageAdapter
    });
  });

  it('should be created using minimal setup', () => {
    const lib_ = new PlatformBrowser({});
    expect(lib_).toBeTruthy();
  });

  it('should fail if `useCache` true and no storage instance is available', () => {
    expect(() => {
      lib = new PlatformBrowser({
        useLog: false,
        baseURL: baseURL,
        collection: collection,
        connector: {
          // firebase: {}
        },
        chain: {
          useCache: true
        }
      });
    }).toThrowError('missing storage instance');
  });

  it('should implement `clearCache`', () => {
    const spy = jest.spyOn(PlatformBrowser.prototype, 'clearCache');
    lib.clearCache();
    expect(spy).toHaveBeenCalled();
  });

  it('should NOT `feed` responses from cache into rr store', () => {
    Config.options.storage = null;

    const lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      collection: collection
    });

    const spy = jest.spyOn(Config.store.dispatch, 'next');

    lib_.feed();

    expect(spy).not.toBeCalled();
  });

  it('should `feed` responses from cache into rr store', () => {
    Config.options.storage = {
      forEach: (cb: any) => {
        const result = [
          { data: { a: 1 }, collection: collection, key: 'a1' },
          { data: { b: 2 }, collection: collection, key: 'b2' },
          { data: { c: 3 }, collection: 'foo', key: 'c3' }
        ];
        result.forEach((item, index) => {
          cb(item, item.key, index);
        });
      }
    } as StorageAdapter;

    const spy = jest.spyOn(Config.store.dispatch, 'next');

    lib.feed();

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({
      collection: 'foo-collection',
      data: { a: 1 },
      key: 'a1'
    });
    expect(spy).toHaveBeenCalledWith({
      collection: 'foo-collection',
      data: { b: 2 },
      key: 'b2'
    });
    expect(spy).not.toHaveBeenCalledWith({
      collection: 'foo',
      data: { c: 3 },
      key: 'c3'
    });
  });

  it('should implement [get] verb', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: { get: () => Promise.resolve([1, 2, 3]) }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });
    const spy = jest.spyOn(PlatformBrowser.prototype, 'get');
    lib_
      .get()
      .toPromise()
      .then(r =>
        expect(r).toEqual({
          collection: 'foo-collection',
          data: [1, 2, 3],
          driver: 'http',
          key:
            'foo-collection://ea8b4f22422ed792a368b06eac1d76b7e9f0aa4e748f9c3b2c22272b08fe5a97',
          response: [1, 2, 3]
        })
      );
    lib_.get('').toPromise();
    expect(spy).toBeCalledTimes(2);
  });

  it('should implement [post] verb', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: { post: () => Promise.resolve([1, 2, 3]) }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });
    const spy = jest.spyOn(PlatformBrowser.prototype, 'post');
    lib_
      .post()
      .toPromise()
      .then(r =>
        expect(r).toEqual({
          collection: 'foo-collection',
          data: [1, 2, 3],
          driver: 'http',
          key:
            'foo-collection://ea8b4f22422ed792a368b06eac1d76b7e9f0aa4e748f9c3b2c22272b08fe5a97',
          response: [1, 2, 3]
        })
      );
    lib_.post('', { a: 1, b: 2, c: 3 }).toPromise();
    expect(spy).toBeCalledTimes(2);
  });

  it('should implement [patch] verb', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: { patch: () => Promise.resolve([1, 2, 3]) }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });
    const spy = jest.spyOn(PlatformBrowser.prototype, 'patch');
    lib_
      .patch()
      .toPromise()
      .then(r =>
        expect(r).toEqual({
          collection: 'foo-collection',
          data: [1, 2, 3],
          driver: 'http',
          key:
            'foo-collection://ea8b4f22422ed792a368b06eac1d76b7e9f0aa4e748f9c3b2c22272b08fe5a97',
          response: [1, 2, 3]
        })
      );
    lib_.patch('', { a: 1, b: 2, c: 3 }).toPromise();
    expect(spy).toBeCalledTimes(2);
  });

  it('should implement [find] verb', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        firestore: {
          where: () => {},
          collection: () => {
            return {
              get: () =>
                Promise.resolve([
                  {
                    data: () => {
                      return { a: 1, b: 2, c: 3 };
                    }
                  }
                ]),
              where: () => {
                return {
                  where: () => {
                    return {
                      get: () =>
                        Promise.resolve([
                          {
                            data: () => {
                              return { a: 1, b: 2, c: 3 };
                            }
                          }
                        ])
                    };
                  }
                };
              }
            };
          }
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });
    const spy = jest.spyOn(PlatformBrowser.prototype, 'find');
    lib_
      .find()
      .toPromise()
      .then(r =>
        expect(r).toEqual({
          collection: 'foo-collection',
          data: [{ a: 1, b: 2, c: 3 }],
          driver: 'firestore',
          key:
            'foo-collection://ea8b4f22422ed792a368b06eac1d76b7e9f0aa4e748f9c3b2c22272b08fe5a97',
          response: { empty: undefined, metadata: {}, size: undefined }
        })
      );
    lib_.find().toPromise();
    expect(spy).toBeCalledTimes(2);
  });

  it('should implement [findOne] verb', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        firestore: {
          where: () => {},
          collection: () => {
            return {
              get: () =>
                Promise.resolve([
                  {
                    data: () => {
                      return { a: 1, b: 2, c: 3 };
                    }
                  }
                ]),
              where: () => {
                return {
                  where: () => {
                    return {
                      get: () =>
                        Promise.resolve([
                          {
                            data: () => {
                              return { a: 1, b: 2, c: 3 };
                            }
                          }
                        ])
                    };
                  }
                };
              }
            };
          }
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });
    const spy = jest.spyOn(PlatformBrowser.prototype, 'findOne');
    lib_
      .findOne()
      .toPromise()
      .then(r =>
        expect(r).toEqual({
          collection: 'foo-collection',
          data: { a: 1, b: 2, c: 3 },
          driver: 'firestore',
          key:
            'foo-collection://ea8b4f22422ed792a368b06eac1d76b7e9f0aa4e748f9c3b2c22272b08fe5a97',
          response: { empty: undefined, metadata: {}, size: undefined }
        })
      );
    lib_.findOne().toPromise();
    expect(spy).toBeCalledTimes(2);
  });

  it('should transform response', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        firestore: {
          where: () => {},
          collection: () => {
            return {
              get: () =>
                Promise.resolve([
                  {
                    data: () => {
                      return { a: 1, b: 2, c: 3 };
                    }
                  }
                ]),
              where: () => {
                return {
                  where: () => {
                    return {
                      get: () =>
                        Promise.resolve([
                          {
                            data: () => {
                              return { a: 1, b: 2, c: 3 };
                            }
                          }
                        ])
                    };
                  }
                };
              }
            };
          }
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });

    lib_
      .transformResponse(r => r.data)
      .findOne()
      .toPromise()
      .then(r => expect(r).toEqual({ a: 1, b: 2, c: 3 }));
  });

  it('should transform data', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        firestore: {
          where: () => {},
          collection: () => {
            return {
              get: () =>
                Promise.resolve([
                  {
                    data: () => {
                      return { a: 1, b: 2, c: 3 };
                    }
                  }
                ]),
              where: () => {
                return {
                  where: () => {
                    return {
                      get: () =>
                        Promise.resolve([
                          {
                            data: () => {
                              return { a: 1, b: 2, c: 3 };
                            }
                          }
                        ])
                    };
                  }
                };
              }
            };
          }
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });

    lib_
      .data(true)
      .findOne()
      .toPromise()
      .then(r => expect(r).toEqual({ a: 1, b: 2, c: 3 }));
  });

  it('should transform data from elasticsearch', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: {
          post: () =>
            Promise.resolve({
              data: {
                hits: {
                  hits: [
                    {
                      _source: { a: 1, b: 2, c: 3 }
                    },
                    {
                      _source: { a: 4, b: 5, c: 6 }
                    },
                    {
                      _source: { a: 7, b: 8, c: 9 }
                    }
                  ]
                }
              }
            })
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });

    lib_
      .data(true)
      .post()
      .toPromise()
      .then(r =>
        expect(r).toEqual([
          { a: 1, b: 2, c: 3 },
          { a: 4, b: 5, c: 6 },
          { a: 7, b: 8, c: 9 }
        ])
      );
  });

  it('should fail on network request', () => {
    let lib_ = new PlatformBrowser({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: {
          post: () =>
            Promise.reject({
              message: 'network error'
            })
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });

    lib_
      .data(true)
      .post()
      .toPromise()
      .catch(err => expect(err).toEqual({ message: 'network error' }));
  });

  it('should return response from cache when using ttl', () => {
    let lib_ = new PlatformBrowserMock({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: {
          post: () =>
            Promise.reject({
              message: 'network error'
            })
        }
      },
      storage: {
        get: () => Promise.resolve({}),
        set: () => Promise.resolve({})
      } as any
    });

    lib_.init({
      logger: new Logger({
        subject: new Subject(),
        useLog: false,
        useLogTrace: false
      })
    } as any);

    const observer = { next: () => {}, complete: () => {} };
    const spyNext = jest.spyOn(observer, 'next');
    const spyComplete = jest.spyOn(observer, 'complete');

    lib_
      .ttl$(
        {
          now: false,
          cache: { collection: 'foo-collection', data: { a: 1 }, key: 'a1' }
        },
        observer,
        {},
        'the-key'
      )
      .toPromise();
    expect(spyNext).toBeCalledWith({
      collection: 'foo-collection',
      data: { a: 1 },
      key: 'a1'
    });
    expect(spyComplete).toBeCalled();
  });

  it('should NOT call network and return from cache', () => {
    let lib_ = new PlatformBrowserMock({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: {
          post: () =>
            Promise.reject({
              message: 'network error'
            })
        }
      },
      storage: {
        get: () =>
          Promise.resolve({
            collection: 'foo-collection',
            data: { a: 1 },
            key: 'a1',
            ttl: 155726892352525
          }),
        set: () => Promise.resolve({})
      } as any
    });

    lib_
      .shouldCallNetwork(
        {
          useNetwork: false
        },
        'a1'
      )
      .then(r =>
        expect(r).toEqual({
          cache: {
            collection: 'foo-collection',
            data: { a: 1 },
            key: 'a1',
            ttl: 155726892352525
          },
          now: false
        })
      );
  });

  it('should call network', () => {
    let lib_ = new PlatformBrowserMock({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {
        http: {
          post: () =>
            Promise.reject({
              message: 'network error'
            })
        }
      },
      storage: {
        get: () => Promise.resolve(),
        set: () => Promise.resolve({})
      } as any
    });

    lib_
      .shouldCallNetwork(
        {
          useCache: false
        },
        'the-key'
      )
      .then(r => expect(r).toEqual({ now: true }));

    lib_
      .shouldCallNetwork(
        {
          useNetwork: false
        },
        'the-key'
      )
      .then(r => expect(r).toEqual({ now: true }));
  });

  it('should NOT return cache', () => {
    let lib_ = new PlatformBrowserMock({
        useLog: false,
        baseURL: baseURL,
        endpoint: '/',
        collection: collection,
        connector: {},
        storage: {
          get: () => Promise.resolve({}),
          set: () => Promise.resolve({})
        } as any
      }),
      observer,
      spy;

    lib_.init({
      logger: new Logger({
        subject: new Subject(),
        useLog: false,
        useLogTrace: false
      })
    } as any);

    observer = { next: () => {}, complete: () => {} };
    spy = jest.spyOn(observer, 'next');

    lib_
      .shouldReturnCache(
        {
          useCache: false
        },
        'the-key',
        observer
      )
      .then(_ => {
        expect(spy).not.toBeCalled();
      });

    lib_
      .shouldReturnCache(
        {
          useCache: true
        },
        'the-key',
        observer
      )
      .then(_ => {
        expect(spy).not.toBeCalled();
      });

    lib_
      .shouldReturnCache(
        {
          useCache: true
        },
        'the-key',
        observer
      )
      .then(_ => {
        expect(spy).not.toBeCalled();
      });

    lib_
      .shouldReturnCache(
        {
          useCache: true,
          transformResponse: r => r.data
        },
        'the-key',
        observer
      )
      .then(_ => {
        expect(spy).not.toBeCalled();
      });
  });

  it('should return cache', () => {
    let lib_ = new PlatformBrowserMock({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {},
      storage: {
        get: () =>
          Promise.resolve({
            collection: 'foo-collection',
            data: { a: 1 },
            key: 'a1',
            ttl: 155726892352525
          }),
        set: () => Promise.resolve({})
      } as any
    });

    lib_.init({
      logger: new Logger({
        subject: new Subject(),
        useLog: false,
        useLogTrace: false
      })
    } as any);

    const observer = {
      next: () => {},
      complete: () => {}
    };

    const spyNext = jest.spyOn(observer, 'next');

    lib_
      .shouldReturnCache(
        {
          useCache: true
        },
        'a1',
        observer
      )
      .then(r => {
        expect(spyNext).toBeCalledWith({
          collection: 'foo-collection',
          data: { a: 1 },
          key: 'a1',
          ttl: 155726892352525
        });
      });

    lib_ = new PlatformBrowserMock({
      useLog: false,
      baseURL: baseURL,
      endpoint: '/',
      collection: collection,
      connector: {},
      storage: {
        get: () =>
          Promise.resolve([
            {
              collection: 'foo-collection',
              data: { a: 1 },
              key: 'a1',
              ttl: 155726892352525
            }
          ]),
        set: () => Promise.resolve({})
      } as any
    });

    lib_.init({
      logger: new Logger({
        subject: new Subject(),
        useLog: false,
        useLogTrace: false
      })
    } as any);

    const observer2 = {
      next: () => {},
      complete: () => {}
    };

    const spyNext2 = jest.spyOn(observer2, 'next');

    lib_
      .shouldReturnCache(
        {
          useCache: true
        },
        'a1',
        observer2
      )
      .then(r => {
        expect(spyNext2).toBeCalledWith([
          {
            collection: 'foo-collection',
            data: { a: 1 },
            key: 'a1',
            ttl: 155726892352525
          }
        ]);
      });
  });
});
