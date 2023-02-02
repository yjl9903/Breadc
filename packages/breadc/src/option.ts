import type { Option } from './types';

import { BreadcError } from './error';

// TODO: support --no-xxx

const OptionRE =
  /^(-[a-zA-Z0-9], )?--([a-zA-Z0-9\-]+)( \[...[a-zA-Z0-9]+\]| <[a-zA-Z0-9]+>)?$/;

export function makeOption<F extends string = string>(format: F): Option<F> {
  let type: 'string' | 'boolean' = 'string';
  let name = '';
  let short = undefined;

  const match = OptionRE.exec(format);
  if (match) {
    if (match[3]) {
      type = 'string';
    } else {
      type = 'boolean';
    }
    name = match[2];
    if (match[1]) {
      short = match[1][1];
    }

    return {
      format,
      type,
      name,
      short,
      description: ''
    };
  } else {
    throw new BreadcError(`Can not parse option format from "${format}"`);
  }
}
