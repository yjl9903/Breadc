import { isDebug, isTest } from 'std-env';

import type { LoggerOptions } from './types';

import { LogLevels } from './level';
import { FormatReporter } from './reporters';
import { BreadcLogger, BreadcLoggerInstance } from './logger';

export * from './level';
export * from './types';
export * from './logger';
export * from './reporters';

export const Logger = (
  options: Partial<LoggerOptions> & { fancy?: boolean } = {}
): BreadcLoggerInstance => {
  const level = getDefaultLogLevel();

  return new BreadcLogger({
    reporter: options.reporter || [FormatReporter({ fancy: options.fancy })],
    level,
    defaults: {},
    format: {},
    stdout: process?.stdout,
    stderr: process?.stderr,
    plugins: [],
    ...options
  });
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
