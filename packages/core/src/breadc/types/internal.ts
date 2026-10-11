import type { Context } from '../../runtime/context.ts';

import type { BreadcInit, GroupInit } from './init.ts';
import type { Breadc, Option, Group, Command, Argument } from './app.ts';
import type { ActionMiddleware } from './middleware.ts';
import type { UnknownCommandHandler, UnknownOptionHandler } from './handler.ts';

/**
 * @internal
 */
export type InternalBreadc = Breadc<any, any> & {
  /**
   * @internal
   */
  _init: BreadcInit;

  /**
   * @internal
   */
  _commands: (InternalCommand | InternalGroup)[];

  /**
   * @internal
   */
  _options: InternalOption[];

  /**
   * @internal
   */
  _actionMiddlewares: ActionMiddleware<any, any>[];

  /**
   * @internal
   */
  _unknownCommandHandlers: UnknownCommandHandler<any>[];

  /**
   * @internal
   */
  _unknownOptionHandlers: UnknownOptionHandler<any>[];
};

export type InternalGroup = Group<string, GroupInit<string>, any, any> & {
  /**
   * Mark whether it is a default command
   *
   * @internal
   */
  _default?: false;

  /**
   * It is lazy built when running
   *
   * @internal
   */
  _pieces: [string[]];

  /**
   * @internal
   */
  _commands: InternalCommand[];

  /**
   * @internal
   */
  _options: InternalOption[];

  /**
   * @internal
   */
  _actionMiddlewares?: ActionMiddleware[];

  /**
   * @internal
   */
  _unknownOptionHandlers?: UnknownOptionHandler<any>[];
};

export type InternalCommand = Command & {
  /**
   * @internal
   */
  _group?: InternalGroup;

  /**
   * @internal
   */
  _aliases: string[];

  /**
   * Mark whether it is a default command
   *
   * @internal
   */
  _default?: boolean;

  /**
   * @internal
   */
  _pieces: string[][];

  /**
   * It is lazy built when running
   *
   * @internal
   */
  _arguments: InternalArgument[];

  /**
   * @internal
   */
  _options: InternalOption[];

  /**
   * @internal
   */
  _actionMiddlewares?: ActionMiddleware<any, any>[];

  /**
   * @internal
   */
  _unknownOptionHandlers?: UnknownOptionHandler<any>[];

  /**
   * @internal
   */
  _actionFn?: (...args: any[]) => unknown;
};

export type OptionType = 'boolean' | 'required' | 'optional' | 'spread';

export type BooleanForm = 'positive' | 'negative' | 'both';

export type InternalOption = Option & {
  _actionFn?: (value: any, context: Context) => unknown;

  _actionPriority?: number;

  type: OptionType;

  form?: BooleanForm;

  long: string;

  short?: string | undefined;

  argument?: string | undefined;
};

export type ArgumentType = 'required' | 'optional' | 'spread' | 'required-spread';

export type InternalArgument = Argument & {
  type: ArgumentType;
};
