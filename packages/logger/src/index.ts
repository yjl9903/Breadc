import { hasTTY, isDebug, isTest, isCI } from 'std-env';

import { BasicReporter } from './reporters/basic';
import { FancyReporter } from './reporters/fancy';

import type { LoggerOptions } from './types';

import { LogLevels } from './level';
import { BreadcLogger, BreadcLoggerInstance } from './logger';

export * from './level';
export * from './types';
export * from './logger';
export * from './reporters';

export const Logger = (
  options: Partial<LoggerOptions> & { fancy?: boolean } = {}
): BreadcLoggerInstance => {
  const level = getDefaultLogLevel();
  const isFancy =
    options.fancy === true || (options.fancy === undefined && hasTTY);

  return new BreadcLogger({
    reporter: [
      isFancy && !(isCI || isTest) ? FancyReporter() : BasicReporter()
    ],
    level,
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
