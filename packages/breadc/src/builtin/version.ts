import type { BreadcInit } from '../types.ts';
import type { Context } from '@breadc/core';

import { option as makeOption } from '@breadc/core';

export function buildVersionOption(init: BreadcInit) {
  const config = typeof init.builtin?.version === 'object' ? init.builtin.version : undefined;
  const option = makeOption(config?.spec ?? '-v, --version').action((_value, context) => printVersion(context), {
    priority: 20
  });
  return Object.assign(option, { _builtin: 'version' as const });
}

export function printVersion(context: Context) {
  const { breadc } = context;
  const text = `${breadc.name}/${breadc.version ?? 'unknown'}`;
  console.log(text);
  return text;
}
