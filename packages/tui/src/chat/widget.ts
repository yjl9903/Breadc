import type { AnyState } from './types';

export interface ProgressBarRenderOptions {
  width: number;
  complete: string;
  incomplete: string;
}

export interface RenderContext<S extends AnyState = AnyState> {
  tick: number;
  state: S;
  fields: AnyState;
}

export type WidgetTemplate<S extends AnyState = AnyState> =
  | string
  | string[]
  | ((ctx: RenderContext<S>) => string | string[]);

export type WidgetFieldResolver<S extends AnyState = AnyState> = (ctx: RenderContext<S>) => unknown;

export type WidgetFields<S extends AnyState = AnyState> = Record<string, WidgetFieldResolver<S>>;

export interface WidgetSpec<S extends AnyState = AnyState> {
  state: S;
  template: WidgetTemplate<S>;
  fields?: WidgetFields<S>;
}

export interface CreateWidgetOptions {
  fixedBottom?: boolean;
}

export interface WidgetHandle<S extends AnyState = AnyState> {
  readonly id: string;
  setState(next: Partial<S> | ((previous: S) => Partial<S> | S)): WidgetHandle<S>;
  setTemplate(template: WidgetTemplate<S>): WidgetHandle<S>;
  setFields(fields: WidgetFields<S>): WidgetHandle<S>;
  remove(): void;
}

export interface SpinnerWidgetState {
  message: string;
}

export interface SpinnerWidgetOptions<S extends AnyState = AnyState> {
  fixedBottom?: boolean;
  frames?: string[];
  template?: WidgetTemplate<SpinnerWidgetState & S>;
  state?: S;
  fields?: WidgetFields<SpinnerWidgetState & S>;
}

export interface ProgressWidgetState {
  message: string;
  value: number;
  total: number;
}

export interface ProgressWidgetOptions<S extends AnyState = AnyState> {
  fixedBottom?: boolean;
  value?: number;
  total?: number;
  width?: number;
  complete?: string;
  incomplete?: string;
  template?: WidgetTemplate<ProgressWidgetState & S>;
  state?: S;
  fields?: WidgetFields<ProgressWidgetState & S>;
}
