import { expect, it } from 'vitest';
import {
  breadc,
  group,
  command,
  option,
  argument,
  type AppDescription,
  type CommandDescription
} from '../src/index.ts';

const description = 'Summary\nDetails\n\n  indented';
const commandDescription: CommandDescription = {
  summary: 'Summary',
  details: 'Details\n\n  indented',
  examples: [{ command: 'cli run', comment: 'Example' }]
};

const appDescription: AppDescription = {
  description,
  examples: [{ command: 'cli store run', comment: 'Example' }]
};

it('preserves descriptions through parsing at every scope', () => {
  const app = breadc('cli', { description: appDescription });
  const grp = app.group('store', commandDescription);
  const cmd = grp
    .command('run', commandDescription)
    .option('--count <n>', description, { default: '2', cast: Number })
    .argument('[file]', description, { default: '1', cast: Number });
  const { context, args, options } = app.parse(['store', 'run']);
  expect(context.breadc._init.description).toBe(appDescription);
  expect(grp.description).toBe(commandDescription);
  expect(cmd.description).toBe(commandDescription);
  expect(context.command?._options[0].description).toBe(description);
  expect(context.command?._arguments[0].description).toBe(description);
  expect({ args, options }).toEqual({ args: [1], options: { count: 2 } });
});

it('supports standalone declarations with separate descriptions and init', () => {
  const app = breadc('cli');
  const grp = group('store', commandDescription);
  const cmd = command('run', commandDescription);
  const opt = option('--mode <name>', description, { default: 'local' });
  const arg = argument('[file]', description, { default: 'report' });
  app.group(grp).command(cmd).option(opt).argument(arg);
  const { args, options } = app.parse(['store', 'run']);
  expect({ args, options }).toEqual({ args: ['report'], options: { mode: 'local' } });
  expect(grp.description).toBe(commandDescription);
  expect(cmd.description).toBe(commandDescription);
  expect(opt.description).toBe(description);
  expect(arg.description).toBe(description);
});
