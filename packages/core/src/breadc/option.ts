import { BreadcError } from '../error.ts';

import type { IOption } from './types.ts';
import type { InferOptionRawType } from './infer.ts';

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
  _option: Option<F>
): IOption<F> {
  const option = _option as unknown as IOption<F>;
  const format = option.format;

  let resolved = false;

  option.type = undefined!;
  option.long = undefined!;
  option.short = undefined;
  option.name = undefined;

  option.resolve = () => {
    if (resolved) return option;

    const match = OptionRE.exec(format);
    if (match) {
      option.long = match[2];

      if (match[1]) {
        option.short = match[1][1];
      }

      if (match[3]) {
        const name = match[3];
        option.name = name;
        if (name[0] === '<') {
          option.type = 'required';
        } else if (name[1] === '.') {
          option.type = 'array';
        } else {
          option.type = 'optional';
        }
      } else {
        option.type = 'boolean';
      }
    } else {
      throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
        format
      });
    }

    resolved = true;

    return option;
  };

  return option;
}

export class ResolveOptionError extends BreadcError {
  static INVALID_OPTION = 'Resolving invalid option';

  public constructor(message: string, cause: { format: string }) {
    super(`${message} at the option "${cause.format}"`);
  }
}
