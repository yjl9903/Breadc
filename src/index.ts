import type { AppOption } from './types';

import { Breadc } from './breadc';

export default function breadc(name: string, option: AppOption = {}) {
  return new Breadc(name, option);
}
