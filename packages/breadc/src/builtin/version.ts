import type { BreadcInit } from '../types.ts';
import type { Context } from '@breadc/core';

import { option as makeOption } from '@breadc/core';

export function buildVersionOption(init: BreadcInit) {
  const config = typeof init.builtin?.version === 'object' ? init.builtin.version : undefined;

  return makeOption(config?.spec ?? '-v, --version', config?.description ?? 'Print version').action(
    (_value, context) => printVersion(context),
    { priority: 20 }
  );
}

export function printVersion(context: Context) {
  const { breadc } = context;
  const text = `${breadc.name}/${breadc.version ?? 'unknown'}`;
  console.log(text);
  return text;
}
