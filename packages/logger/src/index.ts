import { hasTTY, isDebug, isTest, isCI } from 'std-env';

import { BasicReporter } from './reporters/basic';
import { FancyReporter } from './reporters/fancy';

import { LogLevels } from './level';
import { BreadcLogger, LoggerOptions } from './logger';

export * from './types';
export * from './logger';
export * from './reporters';

export const Logger = (
  options: Partial<LoggerOptions> & { fancy?: boolean } = {}
) => {
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
