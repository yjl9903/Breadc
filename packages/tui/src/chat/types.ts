export type AnyState = Record<string, unknown>;

export type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  tag?: string;
  message: string;
  createdAt: Date;
}
