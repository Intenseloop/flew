import { Observable } from 'rxjs';
import { FetchServer } from './server';
import { FlewChainPayload } from '../interfaces/chain';
import { FlewOptions } from '../interfaces/options';
import { FlewVerb } from '../interfaces/verb';
export declare class FetchBrowser extends FetchServer {
    constructor(options: FlewOptions);
    get<T>(path?: string): Observable<T>;
    post<T>(path?: string, body?: any): Observable<T>;
    patch<T>(path?: string, body?: any): Observable<T>;
    find<T>(): Observable<T>;
    findOne<T>(): Observable<T>;
    on<T>(): Observable<T>;
    count(): Observable<number>;
    run<T>(name: string, payload: any): Observable<T>;
    protected call$<T>(verb: FlewVerb, path?: string, payload?: any): Observable<T>;
    protected getDataFromNetwork$<T>(key: any, chain: any, path: any, verb: any, payload: any): Observable<T>;
    protected setCache(verb: FlewVerb, key: string, chain: FlewChainPayload, data: any): Promise<void>;
    protected setState(verb: FlewVerb, key: string, chain: FlewChainPayload, data: any): void;
    private getDataFromStateOrCache$;
}
