import { blue, gray, red, yellow } from 'kolorist';

export type LoggerFn = (message: string, ...args: any[]) => void;

export interface Logger {
  println: LoggerFn;
  info: LoggerFn;
  warn: LoggerFn;
  error: LoggerFn;
  debug: LoggerFn;
}

export function createDefaultLogger(
  name: string,
  logger?: Partial<Logger> | LoggerFn
): Logger {
  const println: LoggerFn =
    !!logger && typeof logger === 'function'
      ? logger
      : logger?.println ??
        ((message: string, ...args: any[]) => {
          console.log(message, ...args);
        });

  const info =
    typeof logger === 'object' && logger?.info
      ? logger.info
      : (message: string, ...args: any[]) => {
          println(`${blue('INFO')} ${message}`, ...args);
        };
  const warn =
    typeof logger === 'object' && logger?.warn
      ? logger.warn
      : (message: string, ...args: any[]) => {
          println(`${yellow('WARN')} ${message}`, ...args);
        };
  const error =
    typeof logger === 'object' && logger?.error
      ? logger.error
      : (message: string, ...args: any[]) => {
          println(`${red('ERROR')} ${message}`, ...args);
        };
  const debug =
    typeof logger === 'object' && logger?.debug
      ? logger.debug
      : (message: string, ...args: any[]) => {
          println(`${gray(name)} ${message}`, ...args);
        };

  return {
    println,
    info,
    warn,
    error,
    debug
  };
}
