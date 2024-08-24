import { bench, describe } from 'vitest';

import cac from 'cac';
import { Command } from 'commander';

import { Breadc } from '../src';

describe('Init empty cli', () => {
  bench('breadc', () => {
    new Breadc('cli', {
      version: '0.0.0',
      description: 'This is an empty cli'
    });
  });

  bench('cac', () => {
    const cli = cac('cli');
    cli.help();
    cli.version('0.0.0');
  });

  bench('commander.js', () => {
    const program = new Command();
    program.name('cli').description('This is an empty cli').version('0.0.0');
  });
});

describe('Parse simple option', () => {
  // breadc
  const b = new Breadc('cli');
  b.option('--flag')
    .command('')
    .action(() => {});

  // cac
  const c = cac('cli');
  c.option('--flag', '')
    .command('')
    .action(() => {});

  // commander.js
  const d = new Command();
  d.name('cli');
  d.option('--flag', '');
  d.action(() => {});

  const args = ['--flag'];
  const argv = ['node', 'cli', ...args];

  bench('breadc', () => {
    b.parse(args);
  });

  bench('cac', () => {
    c.parse(args);
  });

  bench('commander.js', () => {
    d.parse(argv);
  });
});

describe('Parse more option', () => {
  const b = new Breadc('cli');
  b.option('--flag')
    .option('--host <addr>')
    .option('--local')
    .option('--root <root>')
    .command('')
    .action(() => {});

  const c = cac('cli');
  c.option('--flag', '')
    .option('--host <addr>', '')
    .option('--local', '')
    .option('--root <root>', '')
    .command('')
    .action(() => {});

  const d = new Command();
  d.name('cli');
  d.option('--flag', '')
    .option('--host <addr>', '')
    .option('--local', '')
    .option('--root <root>', '');
  d.action(() => {});

  const args = ['--flag', '--host', '1.1.1.1', '--local', '--root=./'];
  const argv = ['node', 'cli', ...args];

  bench('breadc', () => {
    b.parse(args);
  });

  bench('cac', () => {
    c.parse(args);
  });

  bench('commander.js', () => {
    d.parse(argv);
  });
});

describe('Parse sub-commands', () => {
  const action = () => {};

  bench('breadc', () => {
    const b = new Breadc('cli');
    b.command('[op]').action(action);
    b.command('dev').action(action);
    b.command('build <root>').action(action);
    b.command('preview').action(action);
    b.command('test [case]').action(action);
    b.command('run [...args]').action(action);
    b.parse([
      'run',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n'
    ]);
  });

  bench('cac', () => {
    const c = cac('cli');
    c.command('[op]').action(action);
    c.command('dev').action(action);
    c.command('build <root>').action(action);
    c.command('preview').action(action);
    c.command('test [case]').action(action);
    c.command('run [...args]').action(action);
    c.parse([
      'run',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n'
    ]);
  });
  bench('commander.js', () => {
    const d = new Command();
    d.name('cli');
    d.argument('[op]').action(action);
    d.command('dev').action(action);
    d.command('build <root>').action(action);
    d.command('preview').action(action);
    d.command('test [case]').action(action);
    d.command('run [...args]').action(action);
    d.parse([
      'run',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
      'g',
      'h',
      'i',
      'j',
      'k',
      'l',
      'm',
      'n'
    ]);
  });
});
