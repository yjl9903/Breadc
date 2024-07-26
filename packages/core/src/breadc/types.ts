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
  pieces: string[];
  aliases: string[][];
  required: string[];
  optionals: string[];
  spread: string | undefined;
  isDefault(): boolean;
  resolveSubCommand(): ICommand<F>;
  resolveAliasSubCommand(index: number): ICommand<F>;
  resolve(): ICommand<F>;
};
