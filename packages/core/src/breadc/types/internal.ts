import type { BreadcInit, GroupInit } from './init.ts';
import type { Breadc, Command, Option, Argument, Group } from './app.ts';

/**
 * @internal
 */
export type BreadcInstance = {
  name: string;

  init: BreadcInit;

  commands: (InternalCommand | InternalGroup)[];

  options: InternalOption[];
};

/**
 * @internal
 */
export type GroupInstance = {
  init: GroupInit<string>;

  commands: InternalCommand[];

  options: InternalOption[];
};

/**
 * @internal
 */
export type InternalBreadc<GO extends Record<never, never>> = Breadc<
  Record<never, never>,
  GO
> & {
  /**
   * @internal
   */
  instance: BreadcInstance;
};

export type InternalGroup = Group & {
  /**
   * @internal
   */
  instance: GroupInstance;
};

export type InternalCommand = Command & {};

export type InternalOption = Option & {};

export type InternalArgument = Argument & {};
