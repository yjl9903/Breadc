import { ResolveOptionError } from '../error.ts';

import type { Option, OptionInit, InferOptionInitialType, InternalOption, OptionType } from './types/index.ts';

const OptionRE = /^(?:(-[a-zA-Z]), )?--(no-)?([a-zA-Z0-9\-]+)(?: (<[a-zA-Z0-9\-]+>|\[\.*[a-zA-Z0-9\-]+\]))?$/;

export function option<
  Spec extends string,
  Initial extends InferOptionInitialType<Spec>,
  Init extends OptionInit<Spec, Initial, unknown>
>(spec: Spec, description?: string, init?: Init): Option<Spec, Initial, Init> {
  const option: InternalOption = {
    spec,
    init: {
      description,
      ...(init as unknown as InternalOption['init'])
    },

    type: undefined as unknown as OptionType,
    long: '',

    _resolve: () => {
      if (option.type) return;

      const match = OptionRE.exec(spec);

      if (match) {
        // long: --([a-zA-Z0-9\-]+)
        const name = match[3];
        option.long = name;

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
            option.type = 'spread';
          } else {
            option.type = 'optional';
          }
          if (match[2]) {
            // Invalid --no-option <value>
            throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
              spec
            });
          }
        } else {
          option.type = 'boolean';
          if (
            match[2] &&
            option.init.negated === undefined &&
            option.init.initial === undefined &&
            option.init.default === undefined
          ) {
            option.init.negated = true as unknown as undefined;
            option.init.initial = true;
          }
        }
      } else {
        throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
          spec
        });
      }
    }
  };

  return option as unknown as Option<Spec, Initial, Init>;
}

export function rawOption(
  type: OptionType,
  long: string,
  short: string | undefined,
  init: InternalOption['init']
): InternalOption {
  return {
    spec: '',
    init,
    type,
    long,
    short
  } as InternalOption;
}
