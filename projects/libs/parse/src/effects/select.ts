import { isEmpty } from 'lodash';

/**
 * Apply select on query
 *
 * @export
 * @param {string[]} it
 * @param {*} connector
 */
export function select(it: string[], connector: any) {
  if (isEmpty(it)) return;
  connector.select(...it);
}
