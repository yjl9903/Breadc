---
layout: home

hero:
  name: "Breadc"
  text: "Yet another CLI App Framework"
  tagline: Build command-line apps with strong TypeScript inference
  image:
    src: /breadc.svg
    alt: Breadc sandwich
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Examples
      link: /examples

features:
  - title: TypeScript Infer
    details: IDE will automatically infer the type of your command action function
  - title: Commands
    details: Supports default command, command alias and sub-commands
  - title: Toolkits
    details: Contains many useful tools to build your next CLI application
---

## Start with a small CLI

Install Breadc in your project:

```sh
npm install breadc
```

Define a command and let TypeScript infer its arguments and options:

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

Follow [Getting Started](./getting-started.md) to run this example and try the built-in help and version commands.
