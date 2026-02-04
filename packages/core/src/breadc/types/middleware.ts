import type { Context } from '../../runtime/context.ts';

/**
 * Unknown option middleware
 *
 * @public
 */
export type UnknownOptionMiddleware<Data extends {} = {}> = (
  context: Context<Data, unknown>
) => boolean | void | undefined | null;

export interface ActionMiddlewareNextFn<Return extends any = any> {
  <NextData extends {} = {}>(nextContextData?: {
    data?: NextData;
  }): Promise<Context<NextData, Return>>;
}

export type InferMiddlewareNextFn<Fn extends ActionMiddlewareNextFn<any>> =
  Awaited<ReturnType<Fn>>['data'];

/**
 * Command action middleware
 *
 * @public
 */
export type ActionMiddleware<
  Data extends {} = {},
  Return extends any = any,
  NextFn extends ActionMiddlewareNextFn<any> = ActionMiddlewareNextFn<any>
> = (
  context: Context<Data, Return>,
  next: NextFn
) => Promise<Context<InferMiddlewareNextFn<NextFn>, Return>>;

export type InferMiddlewareData<Middleware extends ActionMiddleware> = Awaited<
  ReturnType<Middleware>
>['data'];
