type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogObject {
  level?: LogLevel;
  tag?: string;
  date?: Date;
  message?: string;
}

interface Reporter {
  print: (log: LogObject) => void;
}

interface FormatOptions {}

interface LoggerOptions {
  reporter: Reporter[];
  level: LogLevel;
  format: FormatOptions;
  stdout: NodeJS.WriteStream;
  stderr: NodeJS.WriteStream;
}

export function createLogger(options: Partial<LoggerOptions> = {}) {
  return {};
}
