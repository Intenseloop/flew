import { Subject } from 'rxjs';
import { Log, LogParams } from '../interfaces/log';
import moment from 'moment';

export class Logger {
  private useLog: boolean;
  private useLogTrace: boolean;

  private subject: Subject<Log> = new Subject();

  constructor(params: LogParams) {
    Object.assign(this, params);
  }

  /**
   * Getter/setter to set active state
   */
  public enabled(active?: boolean): boolean | void {
    return active || active === false ? (this.useLog = active) : this.useLog;
  }

  /**
   * Getter/setter to set trace state
   */
  public traced(active?: boolean): boolean | void {
    // console.log('additional data hidden inside collapsed group');
    // console.trace(); // hidden in collapsed group
    // console.groupEnd();

    return active || active === false
      ? (this.useLogTrace = active)
      : this.useLogTrace;
  }

  public success() {
    return this.useLogTrace
      ? this.useLog === false
        ? msg => {}
        : msg => {
            console.groupCollapsed('success');
            console.trace(msg);
            console.groupEnd();
          }
      : (msg: string) => this.add(msg, 'green');
  }

  public danger() {
    return this.useLogTrace
      ? this.useLog === false
        ? msg => {}
        : msg => {
            console.groupCollapsed('danger');
            console.trace(msg);
            console.groupEnd();
          }
      : (msg: string) => this.add(msg, 'red');
  }

  public warn() {
    return this.useLogTrace
      ? this.useLog === false
        ? msg => {}
        : msg => {
            console.groupCollapsed('warn');
            console.trace(msg);
            console.groupEnd();
          }
      : (msg: string) => this.add(msg, 'yellow');
  }

  private add(msg: string, bg: string = 'green') {
    const style = `background: ${bg}; color: ${
      bg === 'yellow' ? '#333333' : '#ffffff'
    }; display: block`;

    const log =
      this.useLogTrace === true
        ? msg
        : ` <span style="${style}">${msg}</span> `;

    if (this.useLog === true) {
      console.log(`%c ${msg} `, style);
      this.subject.next(<Log>{ created: moment().toISOString(), message: log });
    }
  }
}
