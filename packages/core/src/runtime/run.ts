import type { Breadc } from '../breadc/types/app.ts';
import type { ActionMiddleware, ActionMiddlewareNextFn } from '../breadc/types/middleware.ts';

import { printHelp } from '../breadc/builtin/help.ts';
import { printVersion } from '../breadc/builtin/version.ts';

import { DefinitionError, ErrorCode } from '../error.ts';

import { parse, finalizeInput, isHelp, isVersion, resolveArgs, resolveOptions } from './parser.ts';

export async function run(app: Breadc, argv: string[]) {
  // 1. Parse arguments
  const context = parse(app, argv);

  // 2. Check builtin version and help command
  if (isVersion(context)) {
    return printVersion(context);
  }

  if (isHelp(context)) {
    return printHelp(context);
  }

  // 3. Decide whether execution is needed before converting user input.
  const { breadc, command } = context;

  if (!command && breadc._unknownCommandMiddlewares.length === 0) {
    return printHelp(context);
  }

  if (command && !command._actionFn) {
    throw new DefinitionError(ErrorCode.MISSING_COMMAND_ACTION, 'There is no action function bound in this command', {
      context,
      details: { command }
    });
  }

  finalizeInput(context);

  if (!command) {
    let res: any;
    for (const middleware of breadc._unknownCommandMiddlewares) {
      res = await middleware(context);
    }
    return res;
  }

  // 4. Collect middlewares
  const actionMiddlewares: ActionMiddleware[] = [
    ...context.breadc._actionMiddlewares,
    ...(context.group?._actionMiddlewares ?? []),
    ...(command._actionMiddlewares ?? [])
  ];

  // 5. Run

  const actionFn = command._actionFn!;
  if (actionMiddlewares.length === 0) {
    const args = resolveArgs(context);
    const options = resolveOptions(context);
    options['--'] = context.remaining;
    const output = await actionFn(...args, options, context);
    return output;
  } else {
    const invoked: boolean[] = [];
    const makeNextFn = (index: number): ActionMiddlewareNextFn => {
      return (async (nextContext) => {
        if (nextContext?.data) {
          context.data = { ...context.data, ...nextContext?.data };
        }
        invoked[index] = true;
        if (index === actionMiddlewares.length) {
          const args = resolveArgs(context);
          const options = resolveOptions(context);
          options['--'] = context.remaining;
          context.output = await actionFn(...args, options, context);
        } else {
          const next = makeNextFn(index + 1);
          await actionMiddlewares[index](context, next);
          if (!invoked[index + 1]) {
            await next();
          }
        }
        return context;
      }) as ActionMiddlewareNextFn;
    };
    await makeNextFn(0)(undefined);
    return context.output;
  }
}
