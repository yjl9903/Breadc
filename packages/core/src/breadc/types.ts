import type { Option } from './option.ts';
import type { Command } from './command.ts';

export type OptionType = 'boolean' | 'optional' | 'required' | 'array';

export type IOption<F extends string = string> = {
  option: Option<F>;
  type: OptionType;
  long: string;
  short: string | undefined;
  name: string | undefined;
  resolve(): IOption<F>;
};

export type ICommand<F extends string = string> = {
  command: Command<F>;
  /**
   * Const pieces
   *
   * &nbsp;↓ &nbsp;&nbsp;&nbsp; ↓
   *
   * aaa bbb &lt;xxx&gt; &lt;yyy&gt; [zzz] [...www]
   */
  pieces: string[];
  /**
   * Like const pieces, but for each alias
   */
  aliases: string[][];
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
  /**
   * Whether it is a default command
   */
  isDefault: boolean;
  resolveSubCommand(): ICommand<F>;
  resolveAliasSubCommand(index: number): ICommand<F>;
  resolve(): ICommand<F>;
};

export type ArgumentType = 'required' | 'optional' | 'spread';

export type IArgument<F extends string = string> = {
  type: ArgumentType;
  name: string;
  format: string;
};
