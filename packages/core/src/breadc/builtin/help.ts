import { bold, underline } from '@breadc/color';

import type { BreadcConfig } from '../app.ts';

import { Command, makeCommand } from '../command.ts';

import { twoColumn } from './utils.ts';

type Block = string | Array<[string, string]>;

export function makeHelpCommand(name: string, config: BreadcConfig) {
  const raw = config.builtin?.help?.format;

  const command = new Command('', { description: 'Print help' });
  if (raw === undefined) {
    command.aliases.push('-h', '--help');
  } else if (Array.isArray(raw)) {
    command.aliases.push(...raw);
  } else {
    command.aliases.push(raw);
  }

  command.hook('pre:action', function (context) {
    // Prepare commands
    for (const command of context.container.commands) {
      command.resolve();
      for (let i = 0; i < command.aliases.length; i++) {
        command.resolveAliasSubCommand(i);
      }
    }

    const pieces = context.matching.pieces.slice(
      0,
      context.matching.pieces.length - 1
    );

    // Find available sub-commands
    const allCommands =
      pieces.length === 0
        ? context.container.commands
        : context.container.commands.filter((command) => {
            if (isStartsWith(command.pieces, pieces)) {
              return true;
            }
            for (let i = 0; i < command.aliases.length; i++) {
              if (isStartsWith(command.aliasPieces[i], pieces)) {
                return true;
              }
            }
            return false;
          });
    if (allCommands.length === 0) {
      allCommands.push(...context.container.commands);
    }

    const allOptions = allCommands.flatMap((command) => {
      for (const option of command.options) {
        option.resolve();
      }
      return command.options;
    });
    allOptions.unshift(...context.container.globalOptions);

    // Usage
    const usage =
      allCommands.length === 0
        ? `[OPTIONS]`
        : allCommands.length === 1
          ? `${allCommands[0].format ? allCommands[0].format + ' ' : ''}[OPTIONS]`
          : allCommands.some((c) => c.isDefault)
            ? `[COMMAND] [OPTIONS]`
            : `<COMMAND> [OPTIONS]`;

    // Help messages
    const blocks: (Block | undefined)[] = [
      `${name}/${config.version ? config.version : 'unknown'}`,
      ...(config.description ? ['', config.description] : []),
      '',
      `${bold(underline('Usage:'))} ${bold(name)} ${usage}`,
      ...(allCommands.length > 1
        ? [
            '',
            bold(underline('Commands:')),
            allCommands.map(
              (command) =>
                [
                  `  ${bold(name)} ${bold(command.format)}`,
                  command.config.description ?? ''
                ] as [string, string]
            )
          ]
        : []),
      ...(allOptions.length > 0 ||
      context.container.help ||
      context.container.version
        ? [
            '',
            bold(underline('Options:')),
            allOptions
              .map(
                (option) =>
                  [
                    `  ${!option.short ? '    ' : ''}${bold(option.format)}`,
                    option.config.description ?? ''
                  ] as [string, string]
              )
              .concat(
                [
                  context.container.help
                    ? [
                        `  ${bold(context.container.help.aliases.join(', '))}`,
                        context.container.help.config.description!
                      ]
                    : undefined,
                  context.container.version
                    ? [
                        `  ${bold(context.container.version.aliases.join(', '))}`,
                        context.container.version.config.description!
                      ]
                    : undefined
                ].filter(Boolean) as [string, string][]
              )
          ]
        : [])
    ];

    // Render help messages
    for (const block of blocks) {
      if (typeof block === 'string') {
        console.log(block);
      } else if (Array.isArray(block)) {
        const lines = twoColumn(block);
        for (const line of lines) {
          console.log(line);
        }
      }
    }

    return blocks;
  });

  return makeCommand(command);
}

function isStartsWith(pieces: string[], prefix: string[]) {
  for (let i = 0; i < prefix.length; i++) {
    if (prefix[i] !== pieces[i]) return false;
  }
  return true;
}
