import { LogLevel, LogType } from './level';

export interface LoggerPlugin {}

export interface LoggerOptions {
  reporter: Reporter[];
  level: LogLevel;
  format: FormatOptions;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  plugins: LoggerPlugin[];
}

export interface InputLogObject {
  level?: LogLevel;
  type?: LogType;
  tag?: string;
  date?: Date;

  message?: string;
  args?: any[];
}

export interface LogObject extends InputLogObject {
  level: LogLevel;
  type: LogType;
  date: Date;
}

export type InputLogItem =
  | string
  | number
  | Omit<InputLogObject, 'level' | 'type'>;

export interface PrintContext {
  options: LoggerOptions;
}

export interface Reporter {
  print: (log: LogObject, ctx: PrintContext) => void;
}

/**
 * @see https://nodejs.org/api/util.html#util_util_inspect_object_showhidden_depth_colors
 */
export interface FormatOptions {
  columns?: number;
  date?: boolean;
  colors?: boolean;
  compact?: boolean | number;
  [key: string]: unknown;
}
