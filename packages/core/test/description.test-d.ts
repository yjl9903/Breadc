import { it, expectTypeOf } from 'vitest';
import { breadc, command, group, argument, type AppDescription, type CommandDescription } from '../src/index.ts';

const description = {
  summary: 'Run a tool',
  details: 'Details\n\n  indented',
  examples: [{ command: 'cli tools run', comment: 'Example' }]
} as const satisfies CommandDescription;

it('accepts structured descriptions while preserving fluent argument inference', () => {
  const appDescription: AppDescription = { description: 'Tools', examples: description.examples };
  const tools = breadc('cli', { description: appDescription }).group('tools', description);
  const run = tools.command('run', description);
  expectTypeOf(tools.description).toEqualTypeOf<CommandDescription | undefined>();
  expectTypeOf(run.description).toEqualTypeOf<CommandDescription | undefined>();
  run
    .argument('<file>', 'Input file', {
      cast: (value) => {
        expectTypeOf(value).toEqualTypeOf<string>();
        return value.length;
      }
    })
    .argument('[name]', 'Display name')
    .action((file, name) => {
      expectTypeOf(file).toEqualTypeOf<number>();
      expectTypeOf(name).toEqualTypeOf<string | undefined>();
    });
});

it('accepts standalone descriptions with argument initialization in the third parameter', () => {
  const file = argument('[file]', 'Input file', { default: '2', cast: Number });
  expectTypeOf(file.description).toEqualTypeOf<string | undefined>();
  group('tools', description)
    .command(command('run', description))
    .argument(file)
    .action((file) => {
      expectTypeOf(file).toEqualTypeOf<number>();
    });
});
