import { ResolveOptionError } from '../error.ts';

import type { IOption } from './types.ts';
import type { InferOptionRawType } from './infer.ts';

export interface OptionConfig<F extends string = string, R = {}> {
  /**
   * Option description
   */
  description?: string;

  /**
   * Generate negated option
   */
  negated?: InferOptionRawType<F> extends boolean ? boolean : never;

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
  /^(?:(-[a-zA-Z]), )?--(no-)?([a-zA-Z0-9\-]+)(?: (<[a-zA-Z0-9\-]+>|\[\.*[a-zA-Z0-9\-]+\]))?$/;

export function makeOption<F extends string = string>(
  _option: Option<F>
): IOption<F> {
  const option = _option as unknown as IOption<F>;
  const format = option.format;

  let resolved = false;

  option.type = undefined!;
  option.long = undefined!;
  option.short = undefined;
  option.argument = undefined;

  option.resolve = () => {
    if (resolved) return option;

    const match = OptionRE.exec(format);
    if (match) {
      // long: --([a-zA-Z0-9\-]+)
      const name = match[3];
      option.name = name;
      option.long = '--' + name;

      // short: (-[a-zA-Z])
      if (match[1]) {
        option.short = match[1];
      }

      // argument
      if (match[4]) {
        const arg = match[4];
        option.argument = arg;
        if (arg[0] === '<') {
          option.type = 'required';
        } else if (arg[1] === '.') {
          option.type = 'array';
        } else {
          option.type = 'optional';
        }
        if (match[2]) {
          // Invalid --no-option <value>
          throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
            format
          });
        }
      } else {
        option.type = 'boolean';
        if (
          match[2] &&
          option.config.negated === undefined &&
          option.config.initial === undefined &&
          option.config.default === undefined
        ) {
          // @ts-ignore
          option.config.negated = true;
          option.config.initial = true;
        }
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
