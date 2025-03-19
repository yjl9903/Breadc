import type { Context, OnUnknownOptions } from '../parser/context.ts';

import { defaultOnUnknownOptions } from '../parser/parser.ts';

import type { InferOption } from './infer.ts';
import type { ICommand, IOption } from './types.ts';

import { type OptionConfig, makeOption, Option } from './option.ts';

export interface GroupConfig {}

export interface GroupHooks {
  'pre:action': (this: Group<string>, context: Context) => any;

  'post:action': (this: Group<string>, context: Context, ret: any) => any;
}

/**
 * Group sub-commands.
 */
export class Group<F extends string, O extends Record<string, any> = {}> {
  readonly format: F;

  readonly config: GroupConfig;

  readonly aliases: string[] = [];

  isDefault: boolean;

  hooks?: { [K in keyof GroupHooks]?: GroupHooks[K][] };

  /**
   * The bound options
   */
  options: IOption[] = [];

  /**
   * Callback on handling unknown options
   */
  onUnknownOptions: OnUnknownOptions | undefined;

  public constructor(format: F, config: GroupConfig = {}) {
    this.format = format;
    this.config = config;
    this.isDefault = format === '' || format[0] === '[' || format[0] === '<';
  }

  public addOption<OF extends string, C extends OptionConfig<OF>>(
    option: Option<OF, C>
  ): Group<F, O & InferOption<OF, C>> {
    this.options.push(makeOption(option));
    return this as any;
  }

  public option<OF extends string, C extends OptionConfig<OF>>(
    format: OF,
    descriptionOrConfig?: string | C,
    config?: Omit<C, 'description'>
  ): Group<F, O & InferOption<OF, C>> {
    const resolvedConfig =
      typeof descriptionOrConfig === 'string'
        ? { ...config, description: descriptionOrConfig }
        : { ...descriptionOrConfig, ...config };
    const option = new Option<OF>(format, resolvedConfig);
    this.options.push(makeOption(option));
    return this as any;
  }

  public allowUnknownOptions(
    fn?: boolean | OnUnknownOptions
  ): Group<F, O & { [key in string]: any }> {
    if (typeof fn === 'boolean') {
      this.onUnknownOptions = fn ? defaultOnUnknownOptions : undefined;
    } else if (typeof fn === 'function') {
      this.onUnknownOptions = fn;
    } else if (fn === undefined) {
      this.onUnknownOptions = defaultOnUnknownOptions;
    }
    return this;
  }

  /**
   * Register 'pre:action' or 'post:action' hooks
   */
  public hook<E extends keyof GroupHooks>(event: E, fn: GroupHooks[E]): this {
    if (!this.hooks) this.hooks = {};
    if (!this.hooks[event]) this.hooks[event] = [];
    this.hooks[event].push(fn);
    return this;
  }
}

export function makeGroup<F extends string = string>(
  _command: Group<F>
): ICommand<F> {
  // TODO
  throw new Error();
}
