import type {
  InternalBreadc,
  InternalGroup,
  InternalCommand
} from '../breadc/types/internal.ts';

export function isGroup(
  command: InternalGroup | InternalCommand
): command is InternalGroup {
  return !!(command as InternalGroup)._commands;
}

// TODO: move resolve logic here

export function buildApp(instance: InternalBreadc) {
  for (const option of instance._options) {
    option._resolve();
  }
  for (const command of instance._commands) {
    command._resolve();
    if (command._default) {
      for (const option of instance._options) {
        option._resolve();
      }
    }
  }
}

export function buildCommand(command: InternalCommand) {
  for (const option of command._options) {
    option._resolve();
  }
}

export function buildGroup(group: InternalGroup) {
  for (const option of group._options) {
    option._resolve();
  }
  for (const command of group._commands) {
    command._resolve(group);
  }
}
