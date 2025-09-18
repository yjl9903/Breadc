import type { BreadcInit, CommandInit, GroupInit } from './init.ts';
import type { Breadc, Option, Group, Command, Argument } from './app.ts';
import type {
  ActionMiddleware,
  UnknownOptionMiddleware
} from './middleware.ts';

/**
 * @internal
 */
export type BreadcInstance = {
  name: string;

  init: BreadcInit;

  commands: (InternalCommand | InternalGroup)[];

  options: InternalOption[];

  actionMiddlewares: ActionMiddleware<any, any>[];

  unknownOptionMiddlewares: UnknownOptionMiddleware<any>[];
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

export type InternalGroup = Group<string, GroupInit<string>, {}, {}> & {
  /**
   * @internal
   */
  init: GroupInit<string>;

  /**
   * @internal
   */
  commands: InternalCommand[];

  /**
   * @internal
   */
  options: InternalOption[];

  /**
   * @internal
   */
  actionMiddlewares: ActionMiddleware<any, any>[];

  /**
   * @internal
   */
  unknownOptionMiddlewares: UnknownOptionMiddleware<any>[];
};

export type InternalCommand = Command & {
  /**
   * @internal
   */
  init: CommandInit<string>;

  /**
   * @internal
   */
  options?: InternalOption[];

  /**
   * @internal
   */
  actionMiddlewares?: ActionMiddleware<any, any>[];

  /**
   * @internal
   */
  unknownOptionMiddlewares?: UnknownOptionMiddleware<any>[];

  /**
   * @internal
   */
  actionFn?: Function;
};

export type InternalOption = Option & {};

export type InternalArgument = Argument & {};
