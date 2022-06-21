# Breadc

[![version](https://img.shields.io/npm/v/breadc?color=rgb%2850%2C203%2C86%29&label=Breadc)](https://www.npmjs.com/package/breadc) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

Yet another Command Line Application Framework powered by [minimist](https://www.npmjs.com/package/minimist), but with fully [TypeScript](https://www.typescriptlang.org/) support.

## Installation

```bash
npm i breadc
```

## Usage

See [./examples/echo.ts](./examples/echo.ts).

```ts
import Breadc from 'breadc'

const cli = Breadc('echo', { version: '1.0.0' })
  .option('--host <host>')
  .option('--port <port>')

cli
  .command('[message]')
  .action((message, option) => {
    console.log(message ?? 'You can say anything!')
    console.log(`Host: ${option.host}`)
    console.log(`Port: ${option.port}`)
  })

cli.run(process.argv.slice(2))
  .catch(err => cli.logger.error(err.message))
```

If you are using IDEs that support TypeScript (like [Visual Studio Code](https://code.visualstudio.com/)), move your cursor to the parameter `option` in this `dev` command, and then you will find the `option` is automatically typed with `{ host: string, port: string }` or `Record<'host' | 'port', string>`.

![vscode](./images/vscode.png)

### Limitation

For the limitation of TypeScript, in the command format string, you can only write up to **5** pieces. That is to say, you can only write format string like `<p1> <p2> <p3> <p4> [p5]`, but `<p1> <p2> <p3> <p4> <p5> [p6]` does not work.

You should always use method chaining when registering options and commands. The example below will fail to infer the option `--host`.

```ts
const cli = Breadc('cli')

cli
  .option('--host')

cli
  .option('--port')
  .command('')
  .action((option) => {
    // The type of option is Record<'port', string>
  })
```

## Inspiration

+ [cac](https://github.com/cacjs/cac): Simple yet powerful framework for building command-line apps.
+ [TypeScript: Documentation - Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)

## License

MIT License © 2021 [XLor](https://github.com/yjl9903)
