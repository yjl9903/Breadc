import { bold, underline } from '@breadc/color';
import stringWidth from 'fast-string-width';
import { option as makeOption, type Context, type AppDescription, type CommandDescription } from '@breadc/core';

import type { BreadcInit } from '../types.ts';

import { getDefaultOutput } from '../output.ts';

import { i18n, type TranslationKey } from './i18n.ts';
import { list, wrap, formatExamples } from './layout.ts';

type Command = NonNullable<Context['command']>;
type Group = NonNullable<Context['group']>;
type Option = Context['breadc']['_options'][number] & { _builtin?: 'help' | 'version' };
type HelpOption = { option: Option; short?: string };

function displayOrder(option: Option): number {
  const builtin = option._builtin;
  return builtin === 'help' ? 1 : builtin === 'version' ? 2 : 0;
}

function summary(description?: CommandDescription): string {
  const text = typeof description === 'string' ? description : description?.summary;
  return text?.split(/\r?\n/).find((line) => line.trim()) ?? '';
}

function prose(description?: AppDescription | CommandDescription): string {
  if (typeof description === 'string') return description;
  if (!description) return '';
  if ('description' in description) return description.description;
  return [description.summary, description.details].filter(Boolean).join('\n\n');
}

function startsWith(path: string[], prefix: string[]) {
  return prefix.every((piece, index) => path[index] === piece);
}

function argumentSpec(argument: Command['_arguments'][number]) {
  const name = `${argument.type.includes('spread') ? '...' : ''}${argument.name}`;
  return argument.type.startsWith('required') ? `<${name}>` : `[${name}]`;
}

function argumentsSpec(command: Command) {
  return command._arguments.map(argumentSpec).join(' ');
}

function groupCommandSpec(group: Group, label: string) {
  // Child commands are resolved lazily, so a parent page reads their declarations.
  const names = group._commands.flatMap((child) =>
    [child.spec, ...child._aliases].map((spec) => spec.split(/[<[]/, 1)[0].trim())
  );
  if (!names.some(Boolean)) return '';
  return names.includes('') ? `[${label}]` : `<${label}>`;
}

function collect(context: Context) {
  const prefix = context.pieces;
  const groupPage = context.group?._pieces[0].length === prefix.length;
  const scopePage = prefix.length === 0 || groupPage;
  const commands: Array<{ command: Command | Group; path: string[] }> = [];
  let current = context.command;
  const declarations = context.breadc._commands.flatMap((command) =>
    '_commands' in command && startsWith(prefix, command._pieces[0]) ? command._commands : [command]
  );
  for (const command of declarations) {
    const matching = command._pieces.filter((path) => startsWith(path, prefix));
    if (!current && !('_commands' in command) && matching.some((path) => path.length === prefix.length)) {
      current = command;
    }
    const path = matching.find((path) => path.length > prefix.length);
    if (path && (command !== current || scopePage)) commands.push({ command, path });
  }
  return { groupPage, scopePage, current, commands };
}

function collectOptions(declarations: Option[]): HelpOption[] {
  const options = new Map<string, HelpOption>();
  const shortOwners = new Map<string, HelpOption>();
  for (const option of declarations) {
    // Read declarations consistently: --help can skip resolution of default-command options.
    const [, short, name] = option.spec.match(/^(?:-([a-zA-Z]), )?--(?:no-|\[no-\])?([a-zA-Z0-9-]+)/)!;
    const entry: HelpOption = { option, short };
    options.delete(name);
    options.set(name, entry);
    if (short) shortOwners.set(short, entry);
  }
  // Overridden declarations never regain a short alias claimed by a later declaration.
  return [...options.values()]
    .map((entry) => ({
      option: entry.option,
      short: entry.short && shortOwners.get(entry.short) === entry ? entry.short : undefined
    }))
    .sort((a, b) => displayOrder(a.option) - displayOrder(b.option));
}

export function buildHelpOption(init: BreadcInit) {
  const config = typeof init.builtin?.help === 'object' ? init.builtin.help : undefined;
  const option = makeOption(config?.spec ?? '-h, --help').action(
    (_value, context) => printHelp(context, { i18n: init.i18n, output: init.output }),
    { priority: 10 }
  );
  return Object.assign(option, { _builtin: 'help' as const });
}

/** Print static help for the declarations resolved by the current parse. */
export function printHelp(
  context: Context,
  { i18n: locale = 'en', output: destination = getDefaultOutput() }: Pick<BreadcInit, 'i18n' | 'output'> = {}
) {
  const columns = destination.columns ?? 80;
  const width = Number.isFinite(columns) && columns >= 1 ? Math.floor(columns) : 80;
  const { groupPage, scopePage, current, commands } = collect(context);
  const { breadc: app, pieces: prefix, group } = context;
  // Include the default command shown in Usage even when an option action skipped its resolution.
  const options = collectOptions([...app._options, ...(group?._options ?? []), ...(current?._options ?? [])]);
  const path = [app.name, ...prefix].join(' ');
  const description = groupPage
    ? group?.description
    : prefix.length === 0
      ? app._init.description
      : current?.description;
  const output: string[] = [`${app.name}/${app.version ?? 'unknown'}`];
  const heading = (key: TranslationKey) => bold(underline(i18n(locale, key)));
  const section = (key: TranslationKey, rows: string[]) => {
    if (rows.length) output.push('', heading(key), ...rows);
  };
  const content = prose(description);
  if (content) output.push('', ...wrap(content, width));

  const optionsSpec = `[${i18n(locale, 'OPTIONS')}]`;
  const commandLabel = i18n(locale, 'COMMAND');
  const usages: string[] = [];
  const combineUsages = scopePage && current?._arguments.length === 0 && commands.length > 0;
  if (current && !combineUsages) {
    const commandPath = scopePage ? path : [app.name, ...current._pieces[0]].join(' ');
    usages.push([commandPath, argumentsSpec(current), optionsSpec].filter(Boolean).join(' '));
  }
  if (commands.length) {
    usages.push(`${path} ${combineUsages ? `[${commandLabel}]` : `<${commandLabel}>`} ${optionsSpec}`);
  }
  if (!usages.length) usages.push(`${path} ${optionsSpec}`);
  output.push(
    '',
    ...(usages.length === 1 && stringWidth(i18n(locale, 'Usage:') + ' ' + usages[0]) <= width
      ? [`${heading('Usage:')} ${usages[0]}`]
      : [heading('Usage:'), ...usages.flatMap((usage) => wrap(usage, width - 2).map((line) => `  ${line}`))])
  );

  if (current && !scopePage && current._pieces.length > 1) {
    const aliases = current._pieces
      .slice(1)
      .map((pieces) => pieces.join(' '))
      .join(', ');
    section(
      'Aliases:',
      wrap(aliases, width - 2).map((line) => `  ${line}`)
    );
  }

  section(
    'Commands:',
    list(
      commands.map(({ command, path }) => {
        const suffix = '_commands' in command ? groupCommandSpec(command, commandLabel) : argumentsSpec(command);
        return [[path.join(' '), suffix].filter(Boolean).join(' '), summary(command.description)];
      }),
      width
    )
  );

  if (current?._arguments.some((argument) => argument.description?.trim())) {
    section(
      'Arguments:',
      list(
        current._arguments.map((argument) => [argumentSpec(argument), argument.description ?? '']),
        width
      )
    );
  }

  section(
    'Options:',
    list(
      options.map(({ option, short }) => {
        let spec = short ? option.spec : option.spec.replace(/^-[a-zA-Z], /, '');
        spec = spec.replace(/--\[no-\]([a-zA-Z0-9-]+)/, '--$1, --no-$1');
        const builtin = option._builtin;
        const description =
          builtin === 'help'
            ? i18n(locale, 'Show help')
            : builtin === 'version'
              ? i18n(locale, 'Show version')
              : option.description;
        return [`${short ? '' : '    '}${spec}`, description ?? ''];
      }),
      width
    )
  );
  if (typeof description === 'object' && description.examples) {
    section(
      'Examples:',
      formatExamples(description.examples, width - 2).map((line) => (line ? `  ${line}` : ''))
    );
  }
  const text = [...output, ''].join('\n');
  destination.write(`${text}\n`);
  return text;
}
