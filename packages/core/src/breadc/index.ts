import type { BreadcOptions } from './types.ts';

import { Breadc } from './app.ts';

export function breadc(name: string, options: BreadcOptions = {}) {
  const program = new Breadc(name);

  return program;
}
