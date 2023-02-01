import type { AppOption } from './types';

import { Breadc } from './breadc';

export type { Breadc };

export type { Command, CommandConfig } from './command';

export type { Option, OptionConfig } from './option';

export default function breadc<T extends object = {}>(
  name: string,
  option: AppOption = {}
): Breadc<T> {
  return new Breadc(name, option);
}
