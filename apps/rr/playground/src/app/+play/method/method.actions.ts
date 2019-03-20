import { PlayActionTypes } from '../play.actions';
import { PlayMethod } from '../../interfaces/method.interface';
import { Action } from '@ngrx/store';

export class AddChainMethod implements Action {
  readonly type = PlayActionTypes.ADD_CHAIN_METHOD;
  constructor(public payload: PlayMethod) {}
}
export class RemoveChainMethod implements Action {
  readonly type = PlayActionTypes.REMOVE_CHAIN_METHOD;
  constructor(public payload: PlayMethod) {}
}
export class RemoveAllChainMethods implements Action {
  readonly type = PlayActionTypes.REMOVE_ALL_CHAIN_METHODS;
  constructor() {}
}

export class UpdateChainMethod implements Action {
  readonly type = PlayActionTypes.UPDATE_CHAIN_METHOD;
  constructor(public payload: PlayMethod) {}
}
export class UpdateChainVerb implements Action {
  readonly type = PlayActionTypes.UPDATE_CHAIN_VERB;
  constructor(public payload: PlayMethod) {}
}
