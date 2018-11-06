import { merge, omit, isEmpty, isEqual } from 'lodash';
import { AxiosRequestConfig } from 'axios';
import { PartialObserver } from 'rxjs';

import { FirebaseConnector } from "../connectors/firebase";
import { FirestoreConnector } from "../connectors/firestore";

import { RROptions } from '../interfaces/rr-options';
import { RRResponse } from '../interfaces/rr-response';
import { RRExtraOptions } from '../interfaces/rr-extra-options';
import { RRClientOptions } from '../interfaces/rr-client-options';


/**
 * @export
 * @class RRClientPlugin
 */
export class RRClientPlugin {

    //
    // default params
    public params: RRClientOptions = {
        ttl: 0,
        hook: {},
        token: {
            type: 'Bearer'
        }
    };

    constructor(options: RRClientOptions) {
        merge(this.params, options);

        if (!this.params.config) throw ('missing firebase config');
        if (!this.params.firebase) throw ('missing firebase sdk');
        if (!this.params.storage) throw ('missing storage instance');

        merge(this.params, <RROptions>{
            connector: {
                firebase: new FirebaseConnector(this.params.firebase, this.params.config),
                firestore: new FirestoreConnector(this.params.firebase, this.params.config)
            },
            hook: {
                //
                // customize http behavior
                http: {
                    pre: (config: AxiosRequestConfig) => {
                        if (this.params.token.value) config.headers['Authorization'] = `${this.params.token.type} ${this.params.token.value}`;
                        if (this.params.version) config.headers['accept-version'] = this.params.version;
                    },
                    post: {
                        before: (key, observer, RRExtraOptions) => {
                            console.log('hook.http.post.before');
                            return this.getCache(key, observer, RRExtraOptions);
                        },
                        after: async (key, network, observer, RRExtraOptions) => {
                            console.log('hook.http.post.after');
                            return this.setCache(key, network, observer, RRExtraOptions);
                        }
                    },
                    patch: {
                        before: (key, observer, RRExtraOptions) => {
                            console.log('hook.http.patch.before');
                            return this.getCache(key, observer, RRExtraOptions);
                        },
                        after: async (key, network, observer, RRExtraOptions) => {
                            console.log('hook.http.patch.after');
                            return this.setCache(key, network, observer, RRExtraOptions);
                        }
                    },
                    get: {
                        before: async (key, observer, RRExtraOptions) => {
                            console.log('hook.http.get.before');
                            return await this.getCache(key, observer, RRExtraOptions);
                        },
                        after: async (key, network, observer, RRExtraOptions) => {
                            console.log('hook.http.get.after');
                            return this.setCache(key, network, observer, RRExtraOptions);
                        }
                    }
                },
                //
                // customize search behavior
                find: {
                    //
                    // customize http endpoint
                    endpoint: this.params.hook.find.endpoint,
                    before: (key, observer, RRExtraOptions) => {
                        console.log('hook.find.before');
                        return this.getCache(key, observer, RRExtraOptions);
                    },
                    after: async (key, network, observer, RRExtraOptions) => {
                        console.log('hook.find.after');
                        return this.setCache(key, network, observer, RRExtraOptions);
                    }
                }
            }
        });

        return omit(this.params, ['config', 'firebase', 'storage', 'version', 'token']);
    }


    /**
     * get client cache
     *
     * @param {string} key
     * @param {PartialObserver<any>} observer
     * @param {RRExtraOptions} [extraOptions={}]
     * @returns
     * @memberof ClientSetup
     */
    async getCache(key: string, observer: PartialObserver<any>, extraOptions: RRExtraOptions = {}) {
        const cache: RRResponse & { ttl: number } = await this.params.storage.get(key);

        //
        // return cached response immediately to view
        if (cache && !isEmpty(cache.data))
            observer.next(cache);

        //
        // check for TTL
        // should not call network
        const seconds = new Date().getTime() / 1000 /*/ 60 / 60 / 24 / 365*/;
        if ((cache && seconds < cache.ttl) && (!isEmpty(cache.data))) {
            observer.complete();
            return false;
        }

        //
        // otherwise
        return true;
    }

    /**
     * set client cache
     *
     * @param {string} key
     * @param {(RRResponse & { ttl: number })} network
     * @param {PartialObserver<any>} observer
     * @param {RRExtraOptions} [extraOptions]
     * @memberof ClientSetup
     */
    async setCache(key: string, network: RRResponse & { ttl: number }, observer: PartialObserver<any>, extraOptions: RRExtraOptions = {}) {
        const cache: RRResponse & { ttl: number } = await this.params.storage.get(key);

        //
        // return network response only if different from cache
        if ((cache && !isEqual(cache.data, network.data)) || (cache && isEmpty(cache.data)) || !cache) {
            //
            // return network response
            observer.next(network);

            //
            // time to live
            let seconds = new Date().getTime() / 1000 /*/ 60 / 60 / 24 / 365*/;

            if (isEmpty(cache) || (cache && seconds >= cache.ttl) || extraOptions.forceCache) {
                console.log(`${key} cache empty or updated`);
                const transform: any = extraOptions.transformCache && typeof extraOptions.transformCache === 'function' ? extraOptions.transformCache : (data: RRResponse) => data;
                let ttl = extraOptions.ttl || this.params.ttl;
                //
                // set cache response
                ttl += seconds;
                network.ttl = ttl;
                this.params.storage.set(key, transform(omit(network, ['config', 'request', 'response.config', 'response.data', 'response.request'])));
            }

        }
        observer.complete();
    }
}


/**
 * @deprecated
 * @export
 * @class ClientSetup
 * @extends {RRClientPlugin}
 */
export class ClientSetup extends RRClientPlugin { }