import { LogLevel, LogType } from './level';

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

export type InputLogItem = string | number | InputLogObject;

export interface Reporter {
  print: (log: LogObject) => void;
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
