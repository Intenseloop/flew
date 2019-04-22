import { State, Action, StateContext, createSelector } from '@ngxs/store';
import { isEqual, cloneDeep } from 'lodash';
import { Response } from '../../../reactive-record/src/lib/interfaces/response';

export interface StateModel {
  responses: Response[];
}

export class SyncReactiveResponse {
  public static readonly type = '[ReactiveState] Sync Response';
  constructor(public payload: Response) {}
}

@State<StateModel>({
  name: 'ReactiveState',
  defaults: {
    responses: []
  }
})
export class ReactiveState {
  static key(name: string, data?: boolean) {
    return createSelector(
      [ReactiveState],
      // @dynamic
      (state: StateModel) => {
        const response = state.responses.find(it => it.key === name);
        return response && data && response.data ? response.data : response;
      }
    );
  }

  @Action(SyncReactiveResponse) syncResponse(
    context: StateContext<StateModel>,
    action: SyncReactiveResponse
  ) {
    const state = context.getState();
    const responses = cloneDeep(state.responses);
    const exists = responses.find(it => it.key === action.payload.key);
    const changed = exists && !isEqual(exists, action.payload);

    if (changed) {
      Object.assign(exists, action.payload);
    }

    const result = changed
      ? [...responses]
      : [...responses, ...[action.payload]];

    context.patchState({
      responses: result
    });
  }

  constructor() {}
}

export function key(name: string, data?: boolean) {
  return (state: any) => {
    const response = state.ReactiveState.responses.find(it => it.key === name);
    return response && data && response.data ? response.data : response;
  };
}
