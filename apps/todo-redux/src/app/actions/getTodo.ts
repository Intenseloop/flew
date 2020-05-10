import { findTodo } from '../effects/findTodo';
import { TodoFindOptions } from '../interfaces/todoFindOptions';
import { addTodoError } from './addTodoError';
import { addTodoView } from './addTodoView';

export function getTodo(id, options: TodoFindOptions) {
  return function(dispatch) {
    //
    // just a flag to be logged in state
    dispatch({
      type: `LOADING_TODO`,
      id: id
    });
    // execute a "side effect" to obtain a list of todos and then dispatch to the store
    // in this particular case we don't need to unsubscribe because reative already does that internally
    findTodo(id, options).subscribe(
      todo => dispatch(addTodoView(todo)),
      error => dispatch(addTodoError(error))
    );
  };
}
