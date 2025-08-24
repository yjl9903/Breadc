export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export type LoggerFn = (...args: any[]) => void;

export type Logger = Partial<Record<'log' | LogLevel, LoggerFn>>;

export type LoggerInit = ({ log: LoggerFn } & Partial<Record<'log', LoggerFn>>) | LoggerFn;
