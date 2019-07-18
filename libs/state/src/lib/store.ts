import { State, Action, StateContext } from '@ngxs/store';
import { isEqual, cloneDeep, get, isArray, isObject } from 'lodash';
import {
  Response,
  shouldTransformResponse,
  Config
} from '@firetask/reactive-record';

export interface StateModel {
  responses: Response[];
}

export class ResponseSync {
  public static readonly type = '[ReactiveState] Sync Response';
  constructor(public payload: Response) {}
}

export class ResponseReset {
  public static readonly type = '[ReactiveState] Reset Responses';
  constructor() {}
}

@State<StateModel>({
  name: 'ReactiveState',
  defaults: {
    responses: []
  }
})
export class ReactiveState {
  @Action(ResponseSync) syncResponse(
    context: StateContext<StateModel>,
    action: ResponseSync
  ) {
    const state = context.getState();
    const responses = [...state.responses];
    const exists = responses.find(it => it.key === action.payload.key);

    if (!exists) {
      responses.push(action.payload);
    }

    context.patchState({
      responses: exists
        ? Object.assign(responses, {
            [responses.indexOf(exists)]: action.payload
          })
        : responses
    });
  }

  @Action(ResponseReset) resetResponse(context: StateContext<StateModel>) {
    context.patchState({
      responses: []
    });
  }

  constructor() {}
}

export function key(name: string, data = true) {
  return (state: any) => {
    const response = state.ReactiveState.responses.find(it => it.key === name);
    const transform: any = shouldTransformResponse(
      { transformData: data },
      response
    );
    return response && transform(response);
  };
}

export function getState(key: string, data = true): any {
  const response = Config.store.search && Config.store.search(key);
  const transform: any = shouldTransformResponse(
    { transformData: data },
    response
  );
  return transform(response);
}

export function setState(key: string, value: any) {
  const currentState: any = getState(key, false) || {};
  const isElastic = get(currentState, 'data.hits.hits');
  let newState = { ...currentState, data: value };

  //
  // elastic case
  if (isElastic) {
    const currentStateSource = currentState.data.hits.hits.find(
      h => h._source.id === value.id
    );

    const newStateHitsHits = [
      ...currentState.data.hits.hits.filter(h => h._source.id != value.id),
      ...[
        {
          ...currentStateSource,
          _source: value
        }
      ]
    ];

    const newStateHits = {
      ...currentState.data.hits,
      hits: newStateHitsHits
    };
    const newStateData = { ...currentState.data, hits: newStateHits };
    newState = { ...currentState, data: newStateData };
  }

  //
  // set the new state
  return Config.store.change && Config.store.change(key, newState);
}
