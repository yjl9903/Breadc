import type { Context } from './context.ts';
import type { ActionMiddleware, ActionMiddlewareNextFn } from '../breadc/types/middleware.ts';

import { DefinitionError, InputError, ErrorCode } from '../error.ts';

import { finalizeInput, resolveArgs, resolveOptions } from './parser.ts';

/** Execute an already matched input context without scanning argv again. */
export async function run(context: Context) {
  // 2. Option actions finalize only their own input and bypass command execution.
  const { actionOption } = context;
  if (actionOption) {
    const result = actionOption.finalize();
    if (result.issues) throw new InputError(result.issues, { context });
    return actionOption.option._actionFn!(result.value, context);
  }

  // 3. Decide whether execution is needed before converting user input.
  const { breadc, command } = context;

  if (!command && breadc._unknownCommandMiddlewares.length === 0) {
    return;
  }

  if (command && !command._actionFn) {
    throw new DefinitionError(ErrorCode.MISSING_COMMAND_ACTION, 'There is no action function bound in this command', {
      context,
      details: { command }
    });
  }

  if (!command) {
    let res: any;
    for (const middleware of breadc._unknownCommandMiddlewares) {
      res = await middleware(context);
    }
    finalizeInput(context);
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
  const invokeAction = async () => {
    // Input validity is guaranteed at action entry. Changes made by middleware
    // after the action completes (after awaiting next()) are not revalidated.
    finalizeInput(context);
    const args = resolveArgs(context);
    const options = resolveOptions(context);
    options['--'] = context.remaining;
    return actionFn(...args, options, context);
  };

  if (actionMiddlewares.length === 0) {
    return invokeAction();
  } else {
    const invoked: boolean[] = [];
    const makeNextFn = (index: number): ActionMiddlewareNextFn => {
      return (async (nextContext) => {
        if (nextContext?.data) {
          context.data = { ...context.data, ...nextContext?.data };
        }
        invoked[index] = true;
        if (index === actionMiddlewares.length) {
          context.output = await invokeAction();
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
