import type { ExtractOptionType, Option, OptionOption } from './types/index.ts';

import { Context } from './parser/index.ts';
import { camelCase } from './utils.ts';
import { BreadcError } from './error.ts';

const OptionRE = /^(-[a-zA-Z], )?--([a-zA-Z0-9\-]+)( <[a-zA-Z0-9\-]+>)?$/;

export function makeOption<
  F extends string = string,
  T extends string | boolean = ExtractOptionType<F>,
  R extends unknown = any
>(
  format: F,
  config: OptionOption<T, R> = { default: undefined }
): Option<F, T> {
  let name = '';
  let short = undefined;

  const match = OptionRE.exec(format);
  if (match) {
    name = match[2];

    if (match[1]) {
      short = match[1][1];
    }

    if (match[3]) {
      if (name.startsWith('no-')) {
        throw new BreadcError(`Can not parse option format (${format})`);
      }

      const initial = config.default ?? undefined;
      return <Option<F, T>>{
        format,
        type: 'string',
        name,
        short,
        description: config.description ?? '',
        order: 0,
        // @ts-ignore
        initial: config.cast ? config.cast(initial) : initial,
        cast: config.cast
      };
    } else {
      if (name.startsWith('no-')) {
        name = name.slice(3);
        // @ts-ignore
        config.default = true;
      }

      const initial =
        config.default === undefined || config.default === null
          ? false
          : config.default;

      return <Option<F, T>>{
        format,
        type: 'boolean',
        name,
        short,
        description: config.description ?? '',
        order: 0,
        // @ts-ignore
        initial: config.cast ? config.cast(initial) : initial,
        cast: config.cast
      };
    }
  } else {
    throw new BreadcError(`Can not parse option format (${format})`);
  }
}

export const initContextOptions = (options: Option[], context: Context) => {
  for (const option of options) {
    context.options.set(option.name, option);
    // Append option shortcut
    if (option.short) {
      context.options.set(option.short, option);
    }
    // Append negative boolean
    if (option.type === 'boolean') {
      context.options.set('no-' + option.name, option);
    }

    if (option.initial !== undefined) {
      context.result.options[camelCase(option.name)] = option.initial;
    }
  }
};
