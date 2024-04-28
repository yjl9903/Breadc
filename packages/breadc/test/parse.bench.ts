import { bench, describe } from 'vitest';

import cac from 'cac';
import { Command } from 'commander';

import { breadc } from '../src';

describe('Init empty cli', () => {
  bench('breadc', () => {
    breadc('cli', { version: '0.0.0', description: 'This is an empty cli' });
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
  const b = breadc('cli');
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
  const b = breadc('cli');
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
    const b = breadc('cli');
    b.command('[op]').action(action);
    b.command('dev').action(action);
    b.command('build <root>').action(action);
    b.command('preview').action(action);
    b.command('test [case]').action(action);
    b.command('run [...args]').action(action);

    b.parse(['op']);
    b.parse(['dev']);
    b.parse(['build', 'root']);
    b.parse(['preview']);
    b.parse(['test']);
    b.parse(['test', '1']);
    b.parse(['run', 'a', 'b', 'c', 'd', 'e']);
  });

  bench('cac', () => {
    const c = cac('cli');
    c.command('[op]').action(action);
    c.command('dev').action(action);
    c.command('build <root>').action(action);
    c.command('preview').action(action);
    c.command('test [case]').action(action);
    c.command('run [...args]').action(action);

    c.parse(['op']);
    c.parse(['dev']);
    c.parse(['build', 'root']);
    c.parse(['preview']);
    c.parse(['test']);
    c.parse(['test', '1']);
    c.parse(['run', 'a', 'b', 'c', 'd', 'e']);
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

    d.parse(['node', 'cli', 'op']);
    d.parse(['node', 'cli', 'dev']);
    d.parse(['node', 'cli', 'build', 'root']);
    d.parse(['node', 'cli', 'preview']);
    d.parse(['node', 'cli', 'test']);
    d.parse(['node', 'cli', 'test', '1']);
    d.parse(['node', 'cli', 'run', 'a', 'b', 'c', 'd', 'e']);
  });
});
