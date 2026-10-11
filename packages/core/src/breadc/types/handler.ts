import type { Context } from '../../runtime/context.ts';
import type { MatchedUnknownOption } from '../../runtime/matched.ts';

/**
 * Unknown command handler
 *
 * @public
 */
export type UnknownCommandHandler<Data extends {} = {}> = (context: Context<Data>) => Promise<any> | any;

/**
 * Unknown option handler
 * Return a match to accept the option, or null/undefined to try the next handler.
 * If no handler accepts it, parsing throws an InputError.
 *
 * @public
 */
export type UnknownOptionHandler<Data extends {} = {}> = (
  context: Context<Data>,
  key: string,
  value: string | undefined
) => MatchedUnknownOption | null | undefined;
