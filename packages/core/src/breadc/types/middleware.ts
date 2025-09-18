import type { Context } from '../../parser/context.ts';

/**
 * Unknown option middleware
 *
 * @public
 */
export type UnknownOptionMiddleware<Data> = (payload: {
  context: Context<Data, unknown>;
}) => boolean | void | undefined | null;

export interface MiddlewareNextFn<Return> {
  <Data>(nextContext: { data: Data }): Promise<Context<Data, Return>>;
}

export type ActionMiddlewarePayload<Data, Return> = {
  context: Context<Data, Return>;
  next: MiddlewareNextFn<Return>;
};

export type InferMiddlewarePayloadData<
  Payload extends ActionMiddlewarePayload<any, any>
> = Awaited<ReturnType<Payload['next']>>['data'];

/**
 * Command action middleware
 *
 * @public
 */
export type ActionMiddleware<
  Data,
  Return,
  Payload extends ActionMiddlewarePayload<
    Data,
    Return
  > = ActionMiddlewarePayload<Data, Return>
> = (
  payload: Payload
) => Promise<Context<InferMiddlewarePayloadData<Payload>, Return>>;

export type InferMiddlewareData<
  Middleware extends ActionMiddleware<any, any, any>
> = Awaited<ReturnType<Middleware>>['data'];
