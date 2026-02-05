import type { Context } from '../../runtime/context.ts';
import type { MatchedUnknownOption } from '../../runtime/matched.ts';

/**
 * Unknown command middleware
 *
 * @public
 */
export type UnknownCommandMiddleware<Data extends {} = {}> = (context: Context<Data>) => Promise<any> | any;

/**
 * Unknown option middleware
 *
 * @public
 */
export type UnknownOptionMiddleware<Data extends {} = {}> = (
  context: Context<Data>,
  key: string,
  value: string | undefined
) => MatchedUnknownOption | null | undefined;

export interface ActionMiddlewareNextFn {
  <NextData extends {} = {}>(nextContextData?: { data?: NextData }): Promise<Context<NextData>>;
}

export type InferMiddlewareNextFn<Fn extends ActionMiddlewareNextFn> = Awaited<ReturnType<Fn>>['data'];

/**
 * Command action middleware
 *
 * @public
 */
export type ActionMiddleware<Data extends {} = {}, NextFn extends ActionMiddlewareNextFn = ActionMiddlewareNextFn> = (
  context: Context<Data>,
  next: NextFn
) => Promise<Context<InferMiddlewareNextFn<NextFn>>>;

export type InferMiddlewareData<Middleware extends ActionMiddleware<any, ActionMiddlewareNextFn>> = Awaited<
  ReturnType<Middleware>
>['data'];
