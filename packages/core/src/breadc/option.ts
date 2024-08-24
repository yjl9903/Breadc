import { BreadcError } from '../error.ts';

import type { InferOptionRawType } from './infer.ts';
import type { IOption, OptionType } from './types.ts';

export interface OptionConfig<F extends string = string, R = {}> {
  /**
   * Option description
   */
  description?: string;

  /**
   * Overwrite the initial value of the corresponding matched option
   * - &lt;required&gt;: undefined
   * - [optional]: false
   * - [...remaining]: []
   */
  initial?: InferOptionRawType<F>;

  cast?: (value: InferOptionRawType<F>) => R;

  default?: R;
}

/**
 * Option definition syntax:
 *
 * - --long
 * - --s, --long
 * - --long &lt;name&gt;
 * - -s, --long &lt;name&gt;
 *
 * Support argument syntax:
 * - &lt;required&gt;
 * - [optional]
 * - [...remaining] (multiple options)
 */
export class Option<
  F extends string,
  C extends OptionConfig<F> = OptionConfig<F>
> {
  readonly format: F;

  readonly config: C;

  public constructor(format: F, config?: C) {
    this.format = format;
    this.config = config ?? ({} as any);
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
  let name: string | undefined;
  let short: string | undefined;

  const madeOption = {
    format,
    config: option.config,
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
