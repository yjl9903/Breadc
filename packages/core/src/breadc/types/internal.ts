import type { BreadcInit, GroupInit } from './init.ts';
import type { Breadc, Option, Group, Command, Argument } from './app.ts';
import type {
  ActionMiddleware,
  UnknownCommandMiddleware,
  UnknownOptionMiddleware
} from './middleware.ts';

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
  _version?: InternalOption;

  /**
   * @internal
   */
  _help?: InternalOption;

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
  _unknownCommandMiddlewares: UnknownCommandMiddleware<any>[];

  /**
   * @internal
   */
  _unknownOptionMiddlewares: UnknownOptionMiddleware<any>[];
};

export type InternalGroup = Group<string, GroupInit<string>, any, any> & {
  /**
   * Lazy resolve the command:
   * - Split command and alias pieces
   * - Merge arguments config
   *
   * @internal
   */
  _resolve(): void;

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
  _unknownOptionMiddlewares?: UnknownOptionMiddleware<any>[];
};

export type InternalCommand = Command & {
  /**
   * Lazy resolve the command:
   * - Split command and alias pieces
   * - Merge arguments config
   *
   * @internal
   */
  _resolve(group?: InternalGroup): void;

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
  _unknownOptionMiddlewares?: UnknownOptionMiddleware<any>[];

  /**
   * @internal
   */
  _actionFn?: Function;
};

export type OptionType = 'boolean' | 'required' | 'optional' | 'spread';

export type InternalOption = Option & {
  type: OptionType;

  long: string;

  short?: string | undefined;

  argument?: string | undefined;

  /**
   * Lazy resolve the option
   *
   * @internal
   */
  _resolve(): void;
};

export type ArgumentType = 'required' | 'optional' | 'spread';

export type InternalArgument = Argument & {
  type: ArgumentType;
};
