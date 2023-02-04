import { breadc } from './breadc';

export type {
  AppOption,
  Breadc,
  Command,
  Option,
  Argument,
  Plugin
} from './types';

export { breadc } from './breadc';

export { definePlugin } from './plugin';

export { ParseError, BreadcError } from './error';

export default breadc;
