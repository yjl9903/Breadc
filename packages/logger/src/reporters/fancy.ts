import { formatWithOptions } from 'node:util';

import { LogLevels } from '../level';
import { bracket } from '../utils/format';
import { writeStream } from '../utils/stream';

import type { FormatReporter } from './types';

export const FancyReporter = (): FormatReporter => {
  return {
    formatArgs(opts, message?: string, args: any[] = []) {
      return formatWithOptions(opts, message, ...args);
    },
    formatLogObject(obj, ctx) {
      const message = this.formatArgs(
        ctx.options.format,
        obj.message,
        obj.args
      );

      return [
        bracket(obj.type === 'log' ? undefined : obj.type),
        bracket(obj.tag),
        message
      ]
        .filter(Boolean)
        .join(' ');
    },
    print(obj, ctx) {
      const message = this.formatLogObject(obj, ctx);
      const stream =
        obj.level < LogLevels.log
          ? ctx.options.stderr || process.stderr
          : ctx.options.stdout || process.stdout;
      writeStream(message, stream);
    }
  };
};
