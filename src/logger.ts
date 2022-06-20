import type { Logger } from './types';

import createDebug from 'debug';
import { blue, red, yellow } from 'kolorist';

export function createDefaultLogger(name: string): Logger {
  const debug = createDebug(name + ':breadc');

  return {
    println(message) {
      console.log(message);
    },
    info(message, ...args) {
      console.log(`${blue('INFO')} ${message}`, ...args);
    },
    warn(message, ...args) {
      console.log(`${yellow('WARN')} ${message}`, ...args);
    },
    error(message, ...args) {
      console.log(`${red('ERROR')} ${message}`, ...args);
    },
    debug(message, ...args) {
      debug(message, ...args);
    }
  };
}
