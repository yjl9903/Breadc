import { FancyReporter } from './reporters/fancy';
import { BreadcLogger, LoggerOptions } from './logger';

export * from './logger';

export const Logger = (options: Partial<LoggerOptions> = {}) => {
  return new BreadcLogger({
    reporter: [FancyReporter()],
    level: 'info',
    format: {},
    stdout: process?.stdout,
    stderr: process?.stderr,
    plugins: [],
    ...options
  });
};
