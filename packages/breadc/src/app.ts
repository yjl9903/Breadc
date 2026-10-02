import { breadc as createCore, parse, run, type Breadc } from '@breadc/core';

import type { BreadcInit } from './types.ts';

import { buildVersionOption } from './builtin/version.ts';
import { buildHelpOption, printHelp } from './builtin/help.ts';

/** Create a CLI with the standard help/version actions and automatic help. */
export function breadc(name: string, init: BreadcInit = {}): Breadc {
  const app = createCore(name, { version: init.version, description: init.description });

  if (init.builtin?.help !== false) app.option(buildHelpOption(init));
  if (init.builtin?.version !== false) app.option(buildVersionOption(init));

  let hasUnknownHandler = false;
  const onUnknownCommand = app.onUnknownCommand;
  app.onUnknownCommand = (handler) => {
    hasUnknownHandler = true;
    return onUnknownCommand(handler);
  };

  app.run = async (argv) => {
    const context = parse(app, argv);
    if (!context.command && !context.actionOption && !hasUnknownHandler) {
      return printHelp(context, { i18n: init.i18n });
    }
    return run(context);
  };

  return app;
}
