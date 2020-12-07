import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { RebasedDriverOption } from '@rebased/core';
import { connect, dispatch, getState } from '@rebased/state';
import { THE_CAT_API_SEARCH } from '../../configs/cat';
import { Todo } from '../../interfaces/todo';
import { getTodos } from '../../actions/getTodos';
import { navigateTo } from '../../actions/navigateTo';
import { useState } from '../../actions/useState';
import { useCache } from '../../actions/useCache';
import { useNetwork } from '../../actions/useNetwork';
import { setDriver } from '../../actions/setDriver';
import { setPathname } from '../../actions/setPathname';
import { setSimulateError } from '../../actions/setSimulateError';

@Component({
  selector: 'rebased-todo-list',
  templateUrl: './todo-list.component.html',
  styleUrls: ['./todo-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TodoListComponent implements OnInit {
  loading$ = connect<boolean>('todo.loading');
  error$ = connect<boolean>('todo.error');
  todos$ = connect<Todo[]>('todo.list');

  useState$ = connect<boolean>('control.useState');
  useCache$ = connect<boolean>('control.useCache');
  useNetwork$ = connect<boolean>('control.useNetwork');
  simulateHttpError$ = connect<boolean>('control.simulateHttpError');

  driver$ = connect<RebasedDriverOption>('control.driver');
  drivers = ['firestore', 'firebase', 'http', 'parse'];

  constructor() {}

  ngOnInit() {
    this.load();
  }

  load() {
    dispatch(
      getTodos({
        useState: getState('control.useState'),
        useCache: getState('control.useCache'),
        useNetwork: getState('control.useNetwork'),
        driver: getState('control.driver'),
        pathname: getState('control.pathname')
      })
    );
  }

  edit(todoID) {
    dispatch(navigateTo(`/edit/${todoID}`));
  }

  create() {
    dispatch(navigateTo(`/edit`));
  }

  changeDriver($event) {
    dispatch(setDriver($event.target.value));
  }

  changeUseMemo($event) {
    dispatch(useState($event.target.checked));
  }

  changeUseCache($event) {
    dispatch(useCache($event.target.checked));
  }

  changeUseNetwork($event) {
    dispatch(useNetwork($event.target.checked));
  }

  simulateHttpError($event) {
    const isChecked = $event.target.checked;
    dispatch(setSimulateError(isChecked));
    if (isChecked) {
      dispatch(setDriver('http'));
      dispatch(setPathname('/some-weird-path'));
    } else {
      dispatch(setDriver('firestore'));
      dispatch(setPathname(THE_CAT_API_SEARCH));
    }
    this.load();
  }
}
