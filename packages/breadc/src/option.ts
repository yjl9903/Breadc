import type { ExtractOptionType, Option } from './types';

import { BreadcError } from './error';

const OptionRE =
  /^(-[a-zA-Z0-9], )?--([a-zA-Z0-9\-]+)( \[...[a-zA-Z0-9]+\]| <[a-zA-Z0-9]+>)?$/;

export function makeOption<F extends string = string>(format: F): Option<F> {
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
      return <Option<F, ExtractOptionType<F>>>{
        format,
        type: 'string',
        value: '',
        name,
        short,
        description: ''
      };
    } else {
      return <Option<F, ExtractOptionType<F>>>{
        format,
        type: 'boolean',
        value: true,
        name,
        short,
        description: ''
      };
    }
  } else {
    throw new BreadcError(`Can not parse option format from "${format}"`);
  }
}
