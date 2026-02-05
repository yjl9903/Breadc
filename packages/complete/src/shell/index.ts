import type { Breadc, Command, Option } from 'breadc';

import type { ShellType } from './types';

import { ParseError } from 'breadc';

import { generatePowershell } from './powershell';

export * from './types';

export function generate(shell: ShellType, breadc: Breadc, allCommands: Command[], globalOptions: Option[]) {
  if (shell === 'powershell') {
    return generatePowershell(breadc, allCommands, globalOptions);
  } else {
    throw new ParseError(`Unsupport shell ${shell}`);
  }
}
