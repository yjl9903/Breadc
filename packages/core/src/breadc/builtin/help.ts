import type { Context } from '../../runtime/context.ts';

export function printHelp(context: Context) {
  // TODO
  const { breadc } = context;
  const text = `${breadc.name}/${breadc._init.version ?? 'unknown'}`;
  console.log(text);
  return text;
}
