import { type Plugin, type Breadc, type Option, type Command, makeTreeNode } from 'breadc';

import { generate, ShellType } from './shell';

export function complete(): Plugin {
  return {
    onInit(breadc, allCommands, globalOptions) {
      globalOptions.push(makeCompleteOption(breadc, allCommands, globalOptions));
    }
  };
}

function makeCompleteOption(breadc: Breadc, allCommands: Command[], globalOptions: Option[]): Option {
  const node = makeTreeNode({
    next() {
      return false;
    },
    finish() {
      return (result) => {
        const shell: string = detectShellType(result.options['shell']);
        const text = generate(shell as any, breadc, allCommands, globalOptions);
        console.log(text);
        return text;
      };
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
    parse() {
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
