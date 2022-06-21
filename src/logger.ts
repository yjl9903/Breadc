import type { Logger, LoggerFn } from './types';

import { blue, gray, red, yellow } from 'kolorist';

export function createDefaultLogger(
  name: string,
  logger?: Logger | LoggerFn
): Logger {
  if (!!logger && typeof logger === 'object') {
    return logger;
  }

  const println: LoggerFn =
    !!logger && typeof logger === 'function'
      ? logger
      : (message: string, ...args: any[]) => {
          console.log(message, ...args);
        };

  return {
    println,
    info(message, ...args) {
      println(`${blue('INFO')} ${message}`, ...args);
    },
    warn(message, ...args) {
      println(`${yellow('WARN')} ${message}`, ...args);
    },
    error(message, ...args) {
      println(`${red('ERROR')} ${message}`, ...args);
    },
    debug(message, ...args) {
      println(`${gray(name)} ${message}`, ...args);
    }
  };
}
