export type LogLevel = 0 | 1 | 2 | 3 | 4 | 5 | (number & {});

export const LogLevels: Record<LogType, number> = {
  silent: Number.NEGATIVE_INFINITY,

  fatal: 0,
  error: 0,

  warn: 1,

  log: 2,
  info: 3,

  success: 3,
  fail: 3,
  ready: 3,
  start: 3,
  box: 3,

  debug: 4,

  trace: 5,

  verbose: Number.POSITIVE_INFINITY
};

export type LogType =
  // 0
  | 'silent'
  | 'fatal'
  | 'error'
  // 1
  | 'warn'
  // 2
  | 'log'
  // 3
  | 'info'
  | 'success'
  | 'fail'
  | 'ready'
  | 'start'
  | 'box'
  // Verbose
  | 'debug'
  | 'trace'
  | 'verbose';
