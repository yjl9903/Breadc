import { BreadcError } from '../error.ts';

import type { IOption, OptionType } from './types.ts';

export interface OptionConfig<R = any> {
  initial?: undefined | string | string[];

  cast?: (value: any) => R;

  default?: any;
}

/**
 * Option abstraction
 *
 * - --long <name>
 * - -s, --long <name>
 *
 * Support argument:
 * - <required>
 * - [optional]
 * - [...remaining] (multiple options)
 */
export class Option<F extends string = string> {
  public readonly format: F;

  public readonly config: OptionConfig;

  public constructor(format: F, config: OptionConfig = {}) {
    this.format = format;
    this.config = config;
  }
}

const OptionRE =
  /^(-[a-zA-Z], )?--([a-zA-Z0-9\-]+)(?: (<[a-zA-Z0-9\-]+>|\[\.*[a-zA-Z0-9\-]+\]))?$/;

export function makeOption<F extends string = string>(
  option: Option<F>
): IOption<F> {
  const format = option.format;

  let resolved = false;
  let type!: OptionType;
  let long!: string;
  let short: string | undefined;
  let name: string | undefined;

  const madeOption = {
    option,
    type,
    long,
    short,
    name,
    resolve() {
      if (resolved) return madeOption;

      const match = OptionRE.exec(format);
      if (match) {
        madeOption.long = match[2];

        if (match[1]) {
          madeOption.short = match[1][1];
        }

        if (match[3]) {
          madeOption.name = name = match[3];
          if (name[0] === '<') {
            madeOption.type = type = 'required';
          } else if (name[1] === '.') {
            madeOption.type = type = 'array';
          } else {
            madeOption.type = type = 'optional';
          }
        } else {
          madeOption.type = type = 'boolean';
        }
      } else {
        throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
          format
        });
      }

      resolved = true;

      return madeOption;
    }
  };

  return madeOption;
}

export class ResolveOptionError extends BreadcError {
  static INVALID_OPTION = 'Resolving invalid option';

  public constructor(message: string, cause: { format: string }) {
    super(`${message} at the option "${cause.format}"`);
  }
}
