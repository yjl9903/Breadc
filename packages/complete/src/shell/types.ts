import type { Breadc, Command, Option } from 'breadc';

export type ShellType = 'powershell' | 'bash' | 'zsh';

export type CompletionGenerator = (breadc: Breadc, allCommands: Command[], globalOptions: Option[]) => string;
