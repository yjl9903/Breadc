---
description: Install Breadc, create a typed command-line app, and run it with built-in help and version output.
---

# Getting Started

Breadc turns command declarations into a typed CLI. This guide uses Node.js and `tsx` to run a TypeScript entry point.

## Install

In a Node.js project, install Breadc and the TypeScript development tools:

::: code-group

```sh [npm]
npm install breadc
npm install -D typescript tsx @types/node
```

```sh [pnpm]
pnpm add breadc
pnpm add -D typescript tsx @types/node
```

```sh [yarn]
yarn add breadc
yarn add -D typescript tsx @types/node
```

:::

## Create a command

Create `cli.ts`:

```ts
import { breadc } from 'breadc';

const cli = breadc('hello', { version: '1.0.0' });

cli.command('[name]', 'Say hello')
  .option('--shout', 'Use uppercase output')
  .action((name, options) => {
    const message = `Hello, ${name ?? 'world'}!`;
    console.log(options.shout ? message.toUpperCase() : message);
  });

cli.run(process.argv.slice(2)).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

`[name]` declares an optional positional argument on the default command. TypeScript infers `name` as `string | undefined` and `options.shout` as `boolean`. Use `<name>` instead when an argument is required.

Pass `process.argv.slice(2)` so Breadc receives only the CLI arguments, without the Node.js executable or script path. The error handler prints failures and sets a nonzero exit code.

## Run your CLI

```sh
npx tsx cli.ts
# Hello, world!

npx tsx cli.ts Breadc
# Hello, Breadc!

npx tsx cli.ts Breadc --shout
# HELLO, BREADC!
```

### Built-in help and version

Breadc adds `--help` (`-h`) and `--version` (`-v`) automatically:

```sh
npx tsx cli.ts --help

npx tsx cli.ts --version
# hello/1.0.0
```

The help page lists the command's arguments and options. The version comes from the value passed to `breadc()`.

## Next steps

- Explore [Examples](./examples.md) for typed options, defaults and validation with Zod.
- Browse [Toolkits](./toolkits/index.md) for terminal utilities you can use alongside your CLI.
