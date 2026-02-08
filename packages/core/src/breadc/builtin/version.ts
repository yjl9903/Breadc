import type { Context } from '../../runtime/context.ts';

import { resolveOption } from '../../runtime/builder.ts';

import { option as makeOption, rawOption } from '../option.ts';

export function buildVersionOption(context: Context) {
  const { breadc } = context;
  if (breadc._version) return breadc._version;
  const spec = typeof breadc._init.builtin?.version === 'object' ? breadc._init.builtin.version.spec : undefined;
  const option = spec
    ? resolveOption(makeOption(spec, 'Print version'))
    : rawOption('-v, --version', 'boolean', 'version', 'v', { description: 'Print version' });
  breadc._version = option;
  return option;
}

export function printVersion(context: Context) {
  const { breadc } = context;
  const text = `${breadc.name}/${breadc._init.version ?? 'unknown'}`;
  console.log(text);
  return text;
}
