import type { Group, Command, Option } from '../breadc/types/app.ts';
import type {
  InternalBreadc,
  InternalGroup,
  InternalCommand,
  InternalOption,
  InternalArgument
} from '../breadc/types/internal.ts';

import { rawArgument } from '../breadc/command.ts';
import { DefinitionError, ErrorCode } from '../error.ts';

export function isGroup(command: InternalGroup | InternalCommand): command is InternalGroup {
  return !!(command as InternalGroup)._commands;
}

export function resolveGroup(group: Group | InternalGroup) {
  if ((group as InternalGroup)._pieces) return;

  const { spec } = group;

  const pieces: string[] = [];
  for (let i = 0; i < spec.length;) {
    if (spec[i] === '<' || spec[i] === '[') {
      throw new DefinitionError(
        ErrorCode.ARGUMENT_IN_GROUP_SPEC,
        `Resolving argument in group spec at the command "${spec}", position ${i}`,
        { details: { spec, position: i } }
      );
    } else if (spec[i] === ' ') {
      while (i < spec.length && spec[i] === ' ') {
        i++;
      }
    } else {
      let j = i;
      while (j < spec.length && spec[j] !== ' ') {
        j++;
      }
      pieces.push(spec.slice(i, j));
      i = j;
    }
  }

  (group as InternalGroup)._pieces = [pieces];
}

export function resolveCommand(command: Command | InternalCommand) {
  if ((command as InternalCommand)._pieces) return;

  const { spec, _aliases: aliases } = command as InternalCommand;

  let i = 0;

  const parent = (command as InternalCommand)._group?._pieces[0] ?? [];
  const pieces: string[] = [...parent];

  // 1. Resolve const pieces
  for (; i < spec.length;) {
    if (spec[i] === '<' || spec[i] === '[') {
      break;
    } else if (spec[i] === ' ') {
      while (i < spec.length && spec[i] === ' ') {
        i++;
      }
    } else {
      let j = i;
      while (j < spec.length && spec[j] !== ' ') {
        j++;
      }
      pieces.push(spec.slice(i, j));
      i = j;
    }
  }

  // 2. Resolve arguments
  /**
   * States:
   *
   * 0 := aaa bbb  (0 -> 0, 0 -> 1, 0 -> 2, 0 -> 3)
   * 1 := aaa bbb <xxx> <yyy>  (1 -> 1, 1 -> 2, 1 -> 3)
   * 2 := aaa bbb <xxx> <yyy> [zzz]  (2 -> 2, 2 -> 3)
   * 3 := aaa bbb <xxx> <yyy> [zzz] [...www]  (3 -> empty)
   */
  let state = 1;

  const resolvedArguments: InternalArgument[] = [];
  let spread: InternalArgument | undefined;

  for (; i < spec.length;) {
    if (spec[i] === '<') {
      if (i + 1 >= spec.length || spec[i + 1] === ' ') {
        throw new DefinitionError(
          ErrorCode.INVALID_REQUIRED_ARGUMENT,
          `Resolving invalid required argument at the command "${spec}", position ${i}`,
          { details: { spec, position: i } }
        );
      } else {
        i++;
      }

      if (state >= 2) {
        throw new DefinitionError(
          ErrorCode.REQUIRED_AFTER_OPTIONAL,
          `Required argument should be placed before optional arguments at the command "${spec}", position ${i}`,
          { details: { spec, position: i } }
        );
      }

      // Parse argument name
      let piece = '';
      while (i < spec.length && spec[i] !== '>') {
        piece += spec[i++];
      }

      // Check the close bracket
      if (i === spec.length || spec[i] !== '>') {
        throw new DefinitionError(
          ErrorCode.INVALID_REQUIRED_ARGUMENT,
          `Resolving invalid required argument at the command "${spec}", position ${i}`,
          { details: { spec: spec, position: i } }
        );
      } else {
        i++;
      }

      // Check the space separator
      if (i < spec.length && spec[i] !== ' ') {
        throw new DefinitionError(
          ErrorCode.INVALID_REQUIRED_ARGUMENT,
          `Resolving invalid required argument at the command "${spec}", position ${i}`,
          { details: { spec, position: i } }
        );
      }

      // Check empty argument name
      if (piece === '') {
        throw new DefinitionError(
          ErrorCode.EMPTY_ARGUMENT,
          `Resolving invalid empty argument at the command "${spec}", position ${i}`,
          { details: { spec, position: i } }
        );
      }

      // State -> 1
      state = 1;
      resolvedArguments.push(rawArgument('required', piece));
    } else if (spec[i] === '[') {
      if (i + 1 >= spec.length || spec[i + 1] === ' ') {
        throw new DefinitionError(
          ErrorCode.INVALID_OPTIONAL_ARGUMENT,
          `Resolving invalid optional argument at the command "${spec}", position ${i}`,
          { details: { spec, position: i } }
        );
      } else {
        i++;
      }

      if (spec[i] === '.') {
        if (state >= 3) {
          throw new DefinitionError(
            ErrorCode.DUPLICATE_SPREAD_ARGUMENT,
            `Spread argument can only appear once at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }

        // Skip all the dots [...
        while (i < spec.length && spec[i] === '.') {
          i++;
        }

        // Parse argument name
        let piece = '';
        while (i < spec.length && spec[i] !== ']') {
          piece += spec[i++];
        }

        // Check the close bracket
        if (i === spec.length || spec[i] !== ']') {
          throw new DefinitionError(
            ErrorCode.INVALID_SPREAD_ARGUMENT,
            `Resolving invalid spread argument at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        } else {
          i++;
        }

        // Check the next space separator
        if (i < spec.length && spec[i] !== ' ') {
          throw new DefinitionError(
            ErrorCode.INVALID_SPREAD_ARGUMENT,
            `Resolving invalid spread argument at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }

        // Check empty argument name
        if (piece === '') {
          throw new DefinitionError(
            ErrorCode.EMPTY_ARGUMENT,
            `Resolving invalid empty argument at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }

        // State -> 3
        state = 3;
        spread = rawArgument('spread', piece);
        resolvedArguments.push(spread);
      } else {
        if (state >= 3) {
          throw new DefinitionError(
            ErrorCode.OPTIONAL_AFTER_SPREAD,
            `Optional argument should be placed before spread arguments at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }

        // Parse argument name
        let piece = '';
        while (i < spec.length && spec[i] !== ']') {
          piece += spec[i++];
        }

        // Check the close bracket
        if (i === spec.length || spec[i] !== ']') {
          throw new DefinitionError(
            ErrorCode.INVALID_OPTIONAL_ARGUMENT,
            `Resolving invalid optional argument at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        } else {
          i++;
        }

        // Check the next space separator
        if (i < spec.length && spec[i] !== ' ') {
          throw new DefinitionError(
            ErrorCode.INVALID_OPTIONAL_ARGUMENT,
            `Resolving invalid optional argument at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }

        // Check empty argument name
        if (piece === '') {
          throw new DefinitionError(
            ErrorCode.EMPTY_ARGUMENT,
            `Resolving invalid empty argument at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }

        // State -> 2
        state = 2;
        resolvedArguments.push(rawArgument('optional', piece));
      }
    } else if (spec[i] === ' ') {
      // Skip spaces
      while (i < spec.length && spec[i] === ' ') {
        i++;
      }
    } else {
      throw new DefinitionError(
        ErrorCode.COMMAND_AFTER_ARGUMENT,
        `Sub-command should be placed in the beginning at the command "${spec}", position ${i}`,
        { details: { spec, position: i } }
      );
    }
  }

  if (pieces.length === 0) {
    (command as InternalCommand)._default = true;
  }

  // 3. Append maually added arguments
  // For now, command._arguments contains only manual added arguments
  for (const argument of (command as InternalCommand)._arguments) {
    switch (argument.type) {
      case 'required': {
        if (state === 1) {
          resolvedArguments.push(argument);
        } else {
          throw new DefinitionError(
            ErrorCode.REQUIRED_AFTER_OPTIONAL,
            `Required argument should be placed before optional arguments at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }
        break;
      }
      case 'optional': {
        if (state <= 2) {
          state = 2;
          resolvedArguments.push(argument);
        } else {
          throw new DefinitionError(
            ErrorCode.OPTIONAL_AFTER_SPREAD,
            `Optional argument should be placed before spread arguments at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }
        break;
      }
      case 'spread': {
        if (spread) {
          throw new DefinitionError(
            ErrorCode.DUPLICATE_SPREAD_ARGUMENT,
            `Spread argument can only appear once at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        }
        state = 3;
        spread = argument;
        resolvedArguments.push(argument);
        break;
      }
    }
  }

  // Fully resolved arguments
  (command as InternalCommand)._arguments = resolvedArguments;

  // 4. Resolve aliases
  if (aliases.length > 0) {
    const resolvedAliases: string[][] = [pieces];
    for (const spec of aliases) {
      const aliasPieces: string[] = [...parent];
      for (let i = 0; i < spec.length;) {
        if (spec[i] === '<' || spec[i] === '[') {
          throw new DefinitionError(
            ErrorCode.INVALID_ALIAS_FORMAT,
            `Alias command format should not have arguments at the command "${spec}", position ${i}`,
            { details: { spec, position: i } }
          );
        } else if (spec[i] === ' ') {
          while (i < spec.length && spec[i] === ' ') {
            i++;
          }
        } else {
          let j = i;
          while (j < spec.length && spec[j] !== ' ') {
            j++;
          }
          aliasPieces.push(spec.slice(i, j));
          i = j;
        }
      }
      if (aliasPieces.length === 0) {
        (command as InternalCommand)._default = true;
      }
      resolvedAliases.push(aliasPieces);
    }
    (command as InternalCommand)._pieces = resolvedAliases;
  } else {
    (command as InternalCommand)._pieces = [pieces];
  }

  return command;
}

const OptionRE = /^(?:-([a-zA-Z]), )?--(no-|\[no-\])?([a-zA-Z0-9\-]+)(?: (<[a-zA-Z0-9\-]+>|\[\.*[a-zA-Z0-9\-]+\]))?$/;

export function resolveOption(option: Option<string, any> | InternalOption) {
  if ((option as InternalOption).type) return option as InternalOption;

  const { spec } = option;

  const match = OptionRE.exec(spec);

  if (match) {
    // Negation forms only apply to boolean options. Validate before marking the option resolved.
    if (match[2] && match[4]) {
      throw new DefinitionError(ErrorCode.INVALID_OPTION_SPEC, `Resolving invalid option at the option "${spec}"`, {
        details: { spec }
      });
    }

    // long: --([a-zA-Z0-9\-]+)
    const name = match[3];
    (option as InternalOption).long = name;

    // short: -([a-zA-Z])
    if (match[1]) {
      (option as InternalOption).short = match[1];
    }

    // argument
    if (match[4]) {
      const arg = match[4];
      (option as InternalOption).argument = arg;
      if (arg[0] === '<') {
        (option as InternalOption).type = 'required';
      } else if (arg[1] === '.') {
        (option as InternalOption).type = 'spread';
      } else {
        (option as InternalOption).type = 'optional';
      }
    } else {
      (option as InternalOption).type = 'boolean';
      (option as InternalOption).form = match[2] === '[no-]' ? 'both' : match[2] === 'no-' ? 'negative' : 'positive';
    }

    return option as InternalOption;
  } else {
    throw new DefinitionError(ErrorCode.INVALID_OPTION_SPEC, `Resolving invalid option at the option "${spec}"`, {
      details: { spec }
    });
  }
}

export function buildApp(instance: InternalBreadc) {
  for (const option of instance._options) {
    resolveOption(option);
  }
  for (const command of instance._commands) {
    if (isGroup(command)) {
      resolveGroup(command);
    } else {
      resolveCommand(command);
    }
    if (command._default) {
      for (const option of instance._options) {
        resolveOption(option);
      }
    }
  }
}

export function buildCommand(command: InternalCommand) {
  for (const option of command._options) {
    resolveOption(option);
  }
}

export function buildGroup(group: InternalGroup) {
  for (const option of group._options) {
    resolveOption(option);
  }
  for (const command of group._commands) {
    resolveCommand(command);
  }
}
