
/**
 * @export
 * @interface ExtraOptions
 */
export interface ExtraOptions {
    ttl?: number,                          // time to live (in seconds. default: 0)
    key?: string,                          // key used to cache. defaults to requested path
    forceCache?: boolean,
    forceNetwork?: boolean,
    disableHook?: string[] & any,          // disable any hook. eg: http.post.before
    transformCache?: (data: any) => any    // transform function for cache
}