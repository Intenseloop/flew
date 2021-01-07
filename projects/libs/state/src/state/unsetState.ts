import { dispatch } from '../store/dispatch';
import { Rebased } from '@rebased/core';

/**
 * Remove specific fetch state
 *
 * @export
 * @param {string} key
 * @param {{ cache: boolean }} [options={ cache: true }]
 * @returns {Promise<void>}
 */
export function unsetState(
  key: string,
  options: { cache: boolean } = { cache: true }
): Promise<void> {
  dispatch({
    type: 'fetchStateRemove',
    key: key
  });
  if (options.cache) {
    return Rebased.storage.remove(key);
  }
  return Promise.resolve();
}
