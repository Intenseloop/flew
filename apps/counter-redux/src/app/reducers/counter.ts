import { createReducer } from '@reative/state';

export const counter = createReducer(0, {
  increment: (state, action) => state + action.payload,
  decrement: (state, action) => state - action.payload
});
