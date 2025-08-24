import type { OnUnknownOptions } from '../parser/context.ts';

import type { OptionConfig } from './option.ts';
import type { CommandConfig, CommandHooks, ArgumentConfig } from './command.ts';

export type OptionType = 'boolean' | 'optional' | 'required' | 'array';

export type IOption<F extends string = string> = {
  format: F;
  config: OptionConfig;
  type: OptionType;
  name: string;
  long: string;
  short: string | undefined;
  argument: string | undefined;
  resolve(): IOption<F>;
};

export type ICommand<F extends string = string> = {
  format: F;

  config: CommandConfig;

  aliases: string[];

  /**
   * Whether it is a default command
   */
  isDefault: boolean;

  hooks?: { [K in keyof CommandHooks]?: CommandHooks[K][] };

  /**
   * The bound action function
   */
  actionFn: Function | undefined;

  /**
   * The bound arguments
   */
  arguments: IArgument[];

  /**
   * The bound options
   */
  options: IOption[];

  /**
   * Callback on handling unknown options
   */
  onUnknownOptions: OnUnknownOptions | undefined;

  // --- Internal ---
  /**
   * Const pieces
   *
   * &nbsp;↓ &nbsp;&nbsp;&nbsp; ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  pieces: string[];

  /**
   * The lazy matching position for each alias
   */
  aliasPos: number[];

  /**
   * Like const pieces, but for each alias
   */
  aliasPieces: string[][];

  /**
   * Required arguments
   *
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * ↓ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  requireds: IArgument[];

  /**
   * Optional arguments
   *
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;
   * ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  optionals: IArgument[];

  /**
   * Spread arguments
   *
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
   * ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  spread: IArgument | undefined;

  resolveSubCommand(): ICommand<F>;
  resolveAliasSubCommand(index: number): ICommand<F>;
  resolve(): ICommand<F>;
};

export type ArgumentType = 'required' | 'optional' | 'spread';

export type IArgument<
  AF extends string = string,
  I extends unknown = unknown
> = {
  type: ArgumentType;
  config: ArgumentConfig<AF, I>;
  name: string;
  format: string;
};
