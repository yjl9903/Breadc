import type { ExtractOptionType, Option, OptionOption } from './types';

import { Context } from './parser';
import { camelCase } from './utils';
import { BreadcError } from './error';

const OptionRE = /^(-[a-zA-Z], )?--([a-zA-Z0-9\-]+)( <[a-zA-Z0-9\-]+>)?$/;

export function makeOption<
  F extends string = string,
  T extends string | boolean = ExtractOptionType<F>
>(format: F, config: OptionOption<T> = {}): Option<F, T> {
  let name = '';
  let short = undefined;

  const match = OptionRE.exec(format);
  if (match) {
    name = match[2];
    if (name.startsWith('no-')) {
      throw new BreadcError(`Can not parse option format from "${format}"`);
    }

    if (match[1]) {
      short = match[1][1];
    }

    if (match[3]) {
      return <Option<F, T>>{
        format,
        type: 'string',
        initial: config.default ?? '',
        name,
        short,
        description: ''
      };
    } else {
      const initial =
        config.default === undefined || config.default === null
          ? false
          : config.default;
      return <Option<F, T>>{
        format,
        type: 'boolean',
        initial,
        name,
        short,
        description: config.description ?? ''
      };
    }
  } else {
    throw new BreadcError(`Can not parse option format from "${format}"`);
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
