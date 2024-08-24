import { bench, describe } from 'vitest';

import cac from 'cac';
import { Command } from 'commander';

import { Breadc } from '../src';

const name = 'cli';
const version = '0.0.0';
const description = 'This is an empty cli';

describe('Init empty cli', () => {
  bench('breadc', () => {
    new Breadc(name, {
      version,
      description
    });
  });

  bench('cac', () => {
    const cli = cac(name);
    cli.help();
    cli.version(version);
  });

  bench('commander.js', () => {
    const program = new Command();
    program.name(name).description(description).version(version);
  });
});

describe('Parse simple option', () => {
  const argv = ['node', name, '--flag'];

  bench('breadc', () => {
    const b = new Breadc(name, {
      version
    });
    b.option('--flag')
      .command('')
      .action(() => {});
    b.parse(argv.slice(2));
  });

  bench('cac', () => {
    const c = cac(name);
    c.help();
    c.version(version);
    c.option('--flag', '')
      .command('')
      .action(() => {});
    c.parse(argv.slice(2));
  });

  bench('commander.js', () => {
    const d = new Command();
    d.name(name).description(description).version(version);
    d.option('--flag', '');
    d.action(() => {});
    d.parse(argv);
  });
});

describe('Parse more option', () => {
  const argv = [
    'node',
    name,
    '--flag',
    '--host',
    '1.1.1.1',
    '--local',
    '--root=./'
  ];

  bench('breadc', () => {
    const b = new Breadc(name, {
      version
    });
    b.option('--flag')
      .option('--host <addr>')
      .option('--local')
      .option('--root <root>')
      .command('')
      .action(() => {});
    b.parse(argv.slice(2));
  });

  bench('cac', () => {
    const c = cac(name);
    c.help();
    c.version(version);
    c.option('--flag', '')
      .option('--host <addr>', '')
      .option('--local', '')
      .option('--root <root>', '')
      .command('')
      .action(() => {});
    c.parse(argv.slice(2));
  });

  bench('commander.js', () => {
    const d = new Command();
    d.name(name).description(description).version(version);
    d.option('--flag', '')
      .option('--host <addr>', '')
      .option('--local', '')
      .option('--root <root>', '');
    d.action(() => {});
    d.parse(argv);
  });
});

describe('Parse sub-commands', () => {
  const action = () => {};

  bench('breadc', () => {
    const b = new Breadc(name, { version });
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
    const c = cac(name);
    c.help();
    c.version(version);
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
    d.name(name).description(description).version(version);
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
