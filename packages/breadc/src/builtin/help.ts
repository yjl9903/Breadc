import { bold, underline } from '@breadc/color';
import { option as makeOption, type Context } from '@breadc/core';

import type { BreadcInit } from '../types.ts';

import { i18n } from './i18n.ts';

type Command = NonNullable<Context['command']>;
type Group = NonNullable<Context['group']>;
type Option = Context['breadc']['_options'][number];

type HelpBlock = string | Array<[string, string]>;

type HelpMessage = Array<HelpBlock | (() => HelpBlock[] | undefined)>;

function padRight(texts: string[], fill = ' ') {
  const length = texts.reduce((max, text) => Math.max(max, text.length), 0);
  return texts.map((text) => text + fill.repeat(length - text.length));
}

function twoColumn(texts: Array<[string, string]>, split = '  ') {
  const left = padRight(texts.map((text) => text[0]));
  return left.map((text, index) => text + split + texts[index][1]);
}

function expandMessage(message: HelpMessage) {
  const result: string[] = [];
  for (const row of message) {
    if (typeof row === 'function') {
      const rows = row();
      if (rows) {
        result.push(...expandMessage(rows));
      }
    } else if (typeof row === 'string') {
      result.push(row);
    } else {
      result.push(...twoColumn(row));
    }
  }
  return result;
}

function readDescription(locale: BreadcInit['i18n'], value: unknown) {
  return typeof value === 'string' ? i18n(locale, value) : '';
}

function formatOption(option: Option) {
  return option.spec.replace(/--\[no-\]([a-zA-Z0-9-]+)/, '--$1, --no-$1');
}

// Unvisited group commands still contain their original, unresolved declarations.
function commandPaths(command: Group | Command): string[][] {
  if (command._pieces) return command._pieces;
  const parent = '_group' in command && command._group ? commandPaths(command._group)[0] : [];
  const specs = '_aliases' in command ? [command.spec, ...command._aliases] : [command.spec];
  return specs.map((spec) => [...parent, ...spec.split(/[<[]/, 1)[0].split(' ').filter(Boolean)]);
}

function formatArgument(command: Command) {
  return command._arguments.map((argument) => {
    switch (argument.type) {
      case 'required':
        return `<${argument.name}>`;
      case 'optional':
        return `[${argument.name}]`;
      case 'required-spread':
        return `<...${argument.name}>`;
      case 'spread':
        return `[...${argument.name}]`;
    }
  });
}

function formatCommand(command: Command) {
  const pieces = commandPaths(command)[0].join(' ');
  const inlineArgs = command._pieces ? '' : command.spec.match(/[<[].*$/)?.[0];
  return [pieces, inlineArgs, ...formatArgument(command)].filter(Boolean).join(' ');
}

function commandStartsWith(command: Group | Command, prefix: string[]) {
  if (prefix.length === 0) {
    return true;
  }

  for (const pieces of commandPaths(command)) {
    if (pieces.length < prefix.length) {
      continue;
    }

    let ok = true;
    for (let i = 0; i < prefix.length; i++) {
      if (pieces[i] !== prefix[i]) {
        ok = false;
        break;
      }
    }

    if (ok) {
      return true;
    }
  }

  return false;
}

function commandIncludes(command: Group | Command, prefix: string[]) {
  for (const pieces of commandPaths(command)) {
    if (pieces.length > prefix.length) {
      continue;
    }

    let ok = true;
    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i] !== prefix[i]) {
        ok = false;
        break;
      }
    }

    if (ok) {
      return true;
    }
  }

  return false;
}

function collect(context: Context, pieces: string[]) {
  const app = context.breadc;
  const allCommands: Command[] = [];
  const commands: Command[] = [];
  const options = new Map<string, Option>();

  const append = (option: Option) => {
    const name = option.long || option.spec.match(/--(?:no-|\[no-\])?([a-zA-Z0-9-]+)/)?.[1] || option.spec;
    options.set(name, option);
  };

  for (const option of app._options) {
    append(option);
  }

  for (const command of app._commands) {
    if ('_commands' in command) {
      const group = command;
      allCommands.push(...group._commands);

      if (commandIncludes(group, pieces)) {
        for (const option of group._options) {
          append(option);
        }
      }

      for (const command of group._commands) {
        if (commandStartsWith(command, pieces)) {
          commands.push(command);

          if (commandIncludes(command, pieces)) {
            for (const option of command._options) {
              append(option);
            }
          }
        }
      }
    } else {
      allCommands.push(command);

      if (commandStartsWith(command, pieces)) {
        commands.push(command);

        if (commandIncludes(command, pieces)) {
          for (const option of command._options) {
            append(option);
          }
        }
      }
    }
  }

  return { app, allCommands, commands, options: [...options.values()] };
}

export function buildHelpOption(init: BreadcInit) {
  const config = typeof init.builtin?.help === 'object' ? init.builtin.help : undefined;
  return makeOption(config?.spec ?? '-h, --help', config?.description ?? 'Print help').action(
    (_value, context) => printHelp(context, { i18n: init.i18n }),
    { priority: 10 }
  );
}

/** Print help with an explicit presentation locale; direct calls default to English. */
export function printHelp(context: Context, { i18n: locale = 'en' }: Pick<BreadcInit, 'i18n'> = {}) {
  const { pieces } = context;
  const { app, allCommands, commands, options } = collect(context, pieces);

  const usage =
    allCommands.length === 0
      ? `[${i18n(locale, 'OPTIONS')}]`
      : allCommands.length === 1
        ? `${formatCommand(allCommands[0])} [${i18n(locale, 'OPTIONS')}]`
        : app._commands.some((command) => !('_commands' in command) && command._default)
          ? `[${i18n(locale, 'COMMAND')}] [${i18n(locale, 'OPTIONS')}]`
          : `<${i18n(locale, 'COMMAND')}> [${i18n(locale, 'OPTIONS')}]`;

  const output: HelpMessage = [
    `${app.name}/${app.version ?? 'unknown'}`,
    () => {
      const description = readDescription(locale, app._init.description);
      if (description) {
        return ['', description];
      }
      return undefined;
    },
    '',
    `${bold(underline(i18n(locale, 'Usage:')))} ${bold(app.name)} ${usage}`,
    () => {
      if (commands.length === 0) {
        return undefined;
      }
      return [
        '',
        bold(underline(i18n(locale, 'Commands:'))),
        commands.map((command) => [
          `  ${bold(app.name)} ${bold(formatCommand(command))}`,
          readDescription(locale, (command.init as { description?: unknown } | undefined)?.description)
        ])
      ];
    },
    () => {
      if (options.length === 0) {
        return undefined;
      }
      return [
        '',
        bold(underline(i18n(locale, 'Options:'))),
        options.map((option) => [
          `  ${!/^-[a-zA-Z], /.test(option.spec) ? '    ' : ''}${bold(formatOption(option))}`,
          readDescription(locale, option.description)
        ])
      ];
    },
    ''
  ];

  const text = expandMessage(output).join('\n');

  console.log(text);

  return text;
}
