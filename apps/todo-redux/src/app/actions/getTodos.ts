import { findTodos } from '../effects/findTodos';
import { addTodoList } from './addTodoList';
import { addTodoError } from './addTodoError';
import { TodoFindOptions } from '../interfaces/todoFindOptions';

export function getTodos(options: TodoFindOptions) {
  return function(dispatch) {
    //
    // just a flag to be logged in state
    dispatch({
      type: 'ADD_TODO_LOAD'
    });
    // execute a "side effect" to obtain a list of todos and then dispatch to the store
    // in this particular case we don't need to unsubscribe because reative already does that internally
    findTodos(options).subscribe(
      todos => dispatch(addTodoList(todos)),
      error => dispatch(addTodoError(error))
    );
  };
}
