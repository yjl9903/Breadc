import type {
  Reporter,
  LogObject,
  PrintContext,
  FormatOptions
} from '../types';

export interface FormatReporterOptions {
  prefix: string;
}

export interface FormatReporter extends Reporter {
  formatArgs(opts: FormatOptions, message?: string, args?: any[]): string;

  formatLogObject(obj: LogObject, ctx: PrintContext): string;
}
