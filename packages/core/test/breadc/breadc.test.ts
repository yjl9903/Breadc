import { describe, it, expect } from 'vitest';

import { parse } from '../../src/parser/index.ts';
import { Command, makeCommand } from '../../src/breadc/command.ts';
import { Breadc, Context } from '../../src/index.ts';

describe('breadc', () => {
  it('should create breadc', () => {
    const app = new Breadc('cli', { version: '0.0.0', description: 'app' });
  });

  it('should not parse duplicated default command', () => {
    const context = new Context(
      {
        globalOptions: [],
        commands: [makeCommand(new Command('')), makeCommand(new Command(''))],
        version: undefined,
        help: undefined
      },
      []
    );
    expect(() => parse(context)).toThrow('Find duplicated default command');
  });
});
