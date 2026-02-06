import type { Group, Command, Option } from '../breadc/types/app.ts';
import type {
  InternalBreadc,
  InternalGroup,
  InternalCommand,
  InternalOption,
  InternalArgument
} from '../breadc/types/internal.ts';

import { rawArgument } from '../breadc/command.ts';
import { ResolveCommandError, ResolveGroupError, ResolveOptionError } from '../error.ts';

export function isGroup(command: InternalGroup | InternalCommand): command is InternalGroup {
  return !!(command as InternalGroup)._commands;
}

export function resolveGroup(group: Group | InternalGroup) {
  if ((group as InternalGroup)._pieces) return;

  const { spec } = group;

  const pieces: string[] = [];
  for (let i = 0; i < spec.length; ) {
    if (spec[i] === '<' || spec[i] === '[') {
      throw new ResolveGroupError(ResolveGroupError.INVALID_ARG_IN_GROUP, {
        spec,
        position: i
      });
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
  for (; i < spec.length; ) {
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

  for (; i < spec.length; ) {
    if (spec[i] === '<') {
      if (i + 1 >= spec.length || spec[i + 1] === ' ') {
        throw new ResolveCommandError(ResolveCommandError.INVALID_REQUIRED_ARG, { spec, position: i });
      } else {
        i++;
      }

      if (state >= 2) {
        throw new ResolveCommandError(ResolveCommandError.REQUIRED_BEFORE_OPTIONAL, { spec, position: i });
      }

      // Parse argument name
      let piece = '';
      while (i < spec.length && spec[i] !== '>') {
        piece += spec[i++];
      }

      // Check the close bracket
      if (i === spec.length || spec[i] !== '>') {
        throw new ResolveCommandError(ResolveCommandError.INVALID_REQUIRED_ARG, { spec: spec, position: i });
      } else {
        i++;
      }

      // Check the space separator
      if (i < spec.length && spec[i] !== ' ') {
        throw new ResolveCommandError(ResolveCommandError.INVALID_REQUIRED_ARG, { spec, position: i });
      }

      // Check empty argument name
      if (piece === '') {
        throw new ResolveCommandError(ResolveCommandError.INVALID_EMPTY_ARG, {
          spec,
          position: i
        });
      }

      // State -> 1
      state = 1;
      resolvedArguments.push(rawArgument('required', piece));
    } else if (spec[i] === '[') {
      if (i + 1 >= spec.length || spec[i + 1] === ' ') {
        throw new ResolveCommandError(ResolveCommandError.INVALID_OPTIONAL_ARG, { spec, position: i });
      } else {
        i++;
      }

      if (spec[i] === '.') {
        if (state >= 3) {
          throw new ResolveCommandError(ResolveCommandError.SPREAD_ONLY_ONCE, { spec, position: i });
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
          throw new ResolveCommandError(ResolveCommandError.INVALID_SPREAD_ARG, { spec, position: i });
        } else {
          i++;
        }

        // Check the next space separator
        if (i < spec.length && spec[i] !== ' ') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_SPREAD_ARG, { spec, position: i });
        }

        // Check empty argument name
        if (piece === '') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_EMPTY_ARG, { spec, position: i });
        }

        // State -> 3
        state = 3;
        spread = rawArgument('spread', piece);
        resolvedArguments.push(spread);
      } else {
        if (state >= 3) {
          throw new ResolveCommandError(ResolveCommandError.OPTIONAL_BEFORE_SPREAD, { spec, position: i });
        }

        // Parse argument name
        let piece = '';
        while (i < spec.length && spec[i] !== ']') {
          piece += spec[i++];
        }

        // Check the close bracket
        if (i === spec.length || spec[i] !== ']') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_OPTIONAL_ARG, { spec, position: i });
        } else {
          i++;
        }

        // Check the next space separator
        if (i < spec.length && spec[i] !== ' ') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_OPTIONAL_ARG, { spec, position: i });
        }

        // Check empty argument name
        if (piece === '') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_EMPTY_ARG, { spec, position: i });
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
      throw new ResolveCommandError(ResolveCommandError.PIECE_BEFORE_REQUIRED, { spec, position: i });
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
          throw new ResolveCommandError(ResolveCommandError.REQUIRED_BEFORE_OPTIONAL, { spec, position: i });
        }
        break;
      }
      case 'optional': {
        if (state <= 2) {
          state = 2;
          resolvedArguments.push(argument);
        } else {
          throw new ResolveCommandError(ResolveCommandError.OPTIONAL_BEFORE_SPREAD, { spec, position: i });
        }
        break;
      }
      case 'spread': {
        if (spread) {
          throw new ResolveCommandError(ResolveCommandError.SPREAD_ONLY_ONCE, { spec, position: i });
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
      for (let i = 0; i < spec.length; ) {
        if (spec[i] === '<' || spec[i] === '[') {
          throw new ResolveCommandError(ResolveCommandError.INVALID_ALIAS_FORMAT, { spec, position: i });
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

const OptionRE = /^(?:-([a-zA-Z]), )?--(no-)?([a-zA-Z0-9\-]+)(?: (<[a-zA-Z0-9\-]+>|\[\.*[a-zA-Z0-9\-]+\]))?$/;

export function resolveOption(option: Option<string, any, any> | InternalOption) {
  if ((option as InternalOption).type) return option as InternalOption;

  const { spec } = option;

  const match = OptionRE.exec(spec);

  if (match) {
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
      if (match[2]) {
        // Invalid --no-option <value>
        throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
          spec
        });
      }
    } else {
      (option as InternalOption).type = 'boolean';
      if (
        match[2] &&
        option.init.negated === undefined &&
        option.init.initial === undefined &&
        option.init.default === undefined
      ) {
        option.init.negated = true as unknown as undefined;
        option.init.initial = true;
      }
    }

    return option as InternalOption;
  } else {
    throw new ResolveOptionError(ResolveOptionError.INVALID_OPTION, {
      spec
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
