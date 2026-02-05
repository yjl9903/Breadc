import { isDebug, isTest } from 'std-env';

import type { InputLogItem, InputLogObject, LoggerOptions } from './types';

import { FormatReporter } from './reporters';
import { LogLevels, LogType } from './level';
import { BreadcLogger, LogFn } from './logger';

export * from './level';
export * from './types';
export * from './logger';
export * from './reporters';

export const Logger = (
  options: Partial<LoggerOptions> & { fancy?: boolean } = {}
): BreadcLogger<Record<LogType, LogFn>> & Record<LogType, LogFn> => {
  const level = getDefaultLogLevel();

  const logger = new BreadcLogger({
    reporter: options.reporter || [FormatReporter({ fancy: options.fancy })],
    level,
    defaults: {},
    format: {},
    stdout: process?.stdout,
    stderr: process?.stderr,
    plugins: [],
    ...options
  });

  const types: LogType[] = [
    'fatal',
    'error',
    'warn',
    'info',
    'fail',
    'ready',
    'box',
    'start',
    'success',
    'debug',
    'trace',
    'verbose'
  ];

  const fns = Object.fromEntries(
    types.map(
      (type) =>
        [
          type,
          function (this: BreadcLogger<{}>, input: InputLogItem, ...args: any[]) {
            const level = LogLevels[type];
            const defaults: InputLogObject = { type, level };
            this.print(defaults, this.resolveInput(input, args));
          }
        ] as const
    )
  ) as Record<LogType, LogFn>;

  return logger.extend(fns);
};

function getDefaultLogLevel() {
  if (isDebug) {
    return LogLevels.debug;
  } else if (isTest) {
    return LogLevels.warn;
  } else {
    return LogLevels.info;
  }
}
