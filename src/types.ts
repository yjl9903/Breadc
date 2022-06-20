export interface AppOption {
  version?: string;

  help?: string | string[] | (() => string | string[]);

  logger?: Logger;
}

export interface Logger {
  println: (message: string) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}
