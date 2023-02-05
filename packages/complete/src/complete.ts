import {
  type Plugin,
  type Breadc,
  type Option,
  type Command,
  makeTreeNode
} from 'breadc';

import { generate, ShellType } from './shell';

export function complete(): Plugin {
  return {
    onInit(breadc, allCommands, globalOptions) {
      globalOptions.push(
        makeCompleteOption(breadc, allCommands, globalOptions)
      );
    }
  };
}

function makeCompleteOption(
  breadc: Breadc,
  allCommands: Command[],
  globalOptions: Option[]
): Option {
  const command: Command = {
    async callback(result) {
      const shell: string = detectShellType(result.options['shell']);
      return generate(shell as any, breadc, allCommands, globalOptions);
    },
    format: '-c, --complete <shell>',
    description: 'Export shell complete script',
    _arguments: [],
    _options: [],
    // @ts-ignore
    option: undefined,
    // @ts-ignore
    alias: undefined,
    // @ts-ignore
    action: undefined
  };

  const node = makeTreeNode({
    command,
    next() {
      return false;
    }
  });

  const option: Option = {
    format: '-c, --complete <shell>',
    name: 'complete',
    short: 'c',
    type: 'string',
    initial: '',
    order: 999999999 - 1,
    description: 'Export shell complete script',
    action() {
      return node;
    }
  };

  return option;
}

function detectShellType(shell: string): ShellType {
  if (!shell) {
    return 'powershell';
  } else {
    return shell as ShellType;
  }
}
