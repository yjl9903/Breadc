# Breadc

[![version](https://img.shields.io/npm/v/breadc?color=rgb%2850%2C203%2C86%29&label=Breadc)](https://www.npmjs.com/package/breadc) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

Yet another Command Line Application Framework powered by [minimist](https://www.npmjs.com/package/minimist), but with fully [TypeScript](https://www.typescriptlang.org/) support.

## Installation

```bash
npm i breadc
```

## Usage

```ts
import Breadc from 'breadc'

const cli = Breadc('vite', { version: '1.0.0' })
  .option('--host <host>')
  .option('--port <port>')

cli.command('dev')
  .action((option) => {
    console.log(`Host: ${option.host}`);
    console.log(`Port: ${option.port}`);
  })

cli.run(process.argv.slice(2))
  .catch(err => cli.logger.error(err.message))
```

If you are using IDEs that support TypeScript (like [Visual Studio Code](https://code.visualstudio.com/)), move your cursor to the parameter `option` in this `dev` command, and then you will find the `option` is automatically typed with `{ host: string, port: string }` or `Record<'host' | 'port', string>`.

## License

MIT License © 2021 [XLor](https://github.com/yjl9903)
