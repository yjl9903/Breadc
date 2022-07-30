import type { AppOption } from './types';

import { Breadc } from './breadc';

export default function breadc<T extends object = {}>(
  name: string,
  option: AppOption = {}
): Breadc<T> {
  return new Breadc(name, option);
}
