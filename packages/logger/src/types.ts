export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogObject {
  level?: LogLevel;
  tag?: string;
  date?: Date;
  message?: string;
}

export interface Reporter {
  print: (log: LogObject) => void;
}

export interface FormatOptions {}
