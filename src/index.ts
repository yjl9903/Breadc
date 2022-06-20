import type { AppOption } from './types';

import kolorist from 'kolorist';
import minimist from 'minimist';
import createDebug from 'debug';

import { Breadc } from './breadc';

export default function breadc(name: string, option: AppOption = {}) {
  return new Breadc(name, option);
}

export { kolorist, minimist, createDebug };
