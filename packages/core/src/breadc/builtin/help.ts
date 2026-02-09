import { bold, underline } from '@breadc/color';

import type { Context } from '../../runtime/context.ts';
import type { InternalOption, InternalGroup, InternalCommand } from '../types/internal.ts';

import { buildGroup, isGroup, resolveCommand, resolveGroup, resolveOption } from '../../runtime/builder.ts';

import { option as makeOption, rawOption } from '../option.ts';

import { i18n } from './i18n.ts';
import { buildVersionOption } from './version.ts';

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

function readDescription(context: Context<any>, value: unknown) {
  return typeof value === 'string' ? i18n(context, value) : '';
}

function formatOption(option: InternalOption) {
  return option.spec;
}

function formatArgument(command: InternalCommand) {
  return command._arguments.map((argument) => {
    switch (argument.type) {
      case 'required':
        return `<${argument.name}>`;
      case 'optional':
        return `[${argument.name}]`;
      case 'spread':
        return `[...${argument.name}]`;
    }
  });
}

function formatCommand(command: InternalCommand) {
  resolveCommand(command);
  const pieces = command._pieces[0].join(' ');
  const args = formatArgument(command).join(' ');
  return pieces && args ? `${pieces} ${args}` : pieces;
}

function commandStartsWith(command: InternalGroup | InternalCommand, prefix: string[]) {
  if (prefix.length === 0) {
    return true;
  }

  for (const pieces of command._pieces) {
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

function commandIncludes(command: InternalGroup | InternalCommand, prefix: string[]) {
  for (const pieces of command._pieces) {
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
  const allCommands: InternalCommand[] = [];
  const commands: InternalCommand[] = [];
  const options = new Map<string, InternalOption>();

  const append = (option: InternalOption) => {
    const resolved = resolveOption(option);
    options.set(resolved.long, resolved);
  };

  for (const option of context.breadc._options) {
    append(option);
  }

  for (const command of context.breadc._commands) {
    if (isGroup(command)) {
      const group = command;
      resolveGroup(group);
      buildGroup(group);
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
      resolveCommand(command);
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

  if (context.breadc._init.builtin?.help !== false) {
    append(buildHelpOption(context));
  }
  if (context.breadc._init.builtin?.version !== false) {
    append(buildVersionOption(context));
  }

  return { allCommands, commands, options: [...options.values()] };
}

export function buildHelpOption(context: Context) {
  const { breadc } = context;
  if (breadc._help) return breadc._help;
  const spec = typeof breadc._init.builtin?.help === 'object' ? breadc._init.builtin.help.spec : undefined;
  const option = spec
    ? resolveOption(makeOption(spec, 'Print help'))
    : rawOption('-h, --help', 'boolean', 'help', 'h', { description: 'Print help' });
  breadc._help = option;
  return option;
}

export function printHelp(context: Context) {
  const { breadc, pieces } = context;
  const { allCommands, commands, options } = collect(context, pieces);

  const usage =
    allCommands.length === 0
      ? '[OPTIONS]'
      : allCommands.length === 1
        ? `[OPTIONS] ${formatCommand(allCommands[0])}`
        : allCommands.some((command) => command._default)
          ? '[OPTIONS] [COMMAND]'
          : '[OPTIONS] <COMMAND>';

  const output: HelpMessage = [
    `${breadc.name}/${breadc._init.version ?? 'unknown'}`,
    () => {
      const description = readDescription(context, breadc._init.description);
      if (description) {
        return ['', description];
      }
      return undefined;
    },
    '',
    `${bold(underline(i18n(context, 'Usage:')))} ${bold(breadc.name)} ${usage}`,
    () => {
      if (commands.length === 0) {
        return undefined;
      }
      return [
        '',
        bold(underline(i18n(context, 'Commands:'))),
        commands.map((command) => [
          `  ${bold(breadc.name)} ${bold(formatCommand(command))}`,
          readDescription(context, (command.init as { description?: unknown } | undefined)?.description)
        ])
      ];
    },
    () => {
      if (options.length === 0) {
        return undefined;
      }
      return [
        '',
        bold(underline(i18n(context, 'Options:'))),
        options.map((option) => [
          `  ${!option.short ? '    ' : ''}${bold(formatOption(option))}`,
          readDescription(context, option.init.description)
        ])
      ];
    },
    ''
  ];

  const text = expandMessage(output).join('\n');

  console.log(text);

  return text;
}
