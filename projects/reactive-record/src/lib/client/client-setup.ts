import * as _ from 'lodash';
import { AxiosRequestConfig } from 'axios';
import { PartialObserver } from 'rxjs';

import { FirebaseConnector } from "../connectors/firebase";
import { FirestoreConnector } from "../connectors/firestore";

import { RROptions } from '../interfaces/rr-options';
import { RRResponse } from '../interfaces/rr-response';
import { RRExtraOptions } from '../interfaces/rr-extra-options';
import { ClientSetupOptions } from '../interfaces/client-setup-options';

/**
 * configure client usage with things like cache
 * 
 * @export
 * @class RRClientSetup
 * @returns RROptions
 */
export class ClientSetup {

    /**
     * @type {ClientSetupOptions}
     * @memberof ClientSetup
     */
    public params: ClientSetupOptions;


    /**
     * Creates an instance of ClientSetup
     * 
     * @param {ClientSetupOptions} options
     * @memberof ClientSetup
     */
    constructor(options: ClientSetupOptions) {

        //
        // default params
        const params: ClientSetupOptions = {
            ttl: 0,
            hook: {
                find: {
                    endpoint: () => '/find'
                }
            },
            token: {
                type: 'Bearer'
            }
        };

        _.extend(params, options);

        if (!params.config) throw ('missing firebase config');
        if (!params.firebase) throw ('missing firebase sdk');
        if (!params.storage) throw ('missing storage instance');

        this.params = _.merge(params, <RROptions>{
            connector: {
                firebase: new FirebaseConnector(params.firebase, params.config),
                firestore: new FirestoreConnector(params.firebase, params.config)
            },
            hook: {
                //
                // customize http behavior
                http: {
                    pre: (config: AxiosRequestConfig) => {
                        if (params.token.value) config.headers['Authorization'] = `${params.token.type} ${params.token.value}`;
                        if (params.version) config.headers['accept-version'] = params.version;
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
                    endpoint: params.hook.find.endpoint,
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

        return _.omit(this.params, ['config', 'firebase', 'storage', 'version', 'token']);
    }


    /**
     * get client cache
     *
     * @param {string} key
     * @param {PartialObserver<any>} observer
     * @param {RRExtraOptions} [RRExtraOptions={}]
     * @returns
     * @memberof ClientSetup
     */
    async getCache(key: string, observer: PartialObserver<any>, RRExtraOptions: RRExtraOptions = {}) {
        const cache: RRResponse & { ttl: number } = await this.params.storage.get(key);

        //
        // return cached response immediately to view
        if (cache && !_.isEmpty(cache.data))
            observer.next(cache);

        //
        // check for TTL
        const seconds = new Date().getTime() / 1000 /*/ 60 / 60 / 24 / 365*/;
        if ((cache && seconds < cache.ttl) && (!_.isEmpty(cache.data))) return false;

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
     * @param {RRExtraOptions} [RRExtraOptions]
     * @memberof ClientSetup
     */
    async setCache(key: string, network: RRResponse & { ttl: number }, observer: PartialObserver<any>, RRExtraOptions: RRExtraOptions = {}) {
        const cache: RRResponse & { ttl: number } = await this.params.storage.get(key);
        if ((cache && !_.isEqual(cache.data, network.data)) || (cache && _.isEmpty(cache.data)) || !cache) {

            //
            // return network response only if different from cache
            observer.next(network);

            //
            // time to live
            let seconds = new Date().getTime() / 1000 /*/ 60 / 60 / 24 / 365*/;

            if (_.isEmpty(cache) || (cache && seconds >= cache.ttl) || RRExtraOptions.forceCache) {
                console.log(`${key} cache empty or updated`);
                const transform: any = RRExtraOptions.transformCache && typeof RRExtraOptions.transformCache === 'function' ? RRExtraOptions.transformCache : (data: RRResponse) => data;
                let ttl = RRExtraOptions.ttl || this.params.ttl;
                //
                // set cache response
                ttl += seconds;
                network.ttl = ttl;
                this.params.storage.set(key, transform(_.omit(network, ['config', 'request', 'response.config', 'response.data', 'response.request'])));
            }

        }
        observer.complete();
    }
}