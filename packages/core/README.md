# @breadc/core

[![version](https://img.shields.io/npm/v/breadc?label=Breadc)](https://www.npmjs.com/package/breadc) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/yjl9903/Breadc/branch/main/graph/badge.svg?token=F7PGOG62EF)](https://codecov.io/gh/yjl9903/Breadc)

Yet another Command Line Application Framework with fully strong **[TypeScript](https://www.typescriptlang.org/) support**.

![vscode](https://raw.githubusercontent.com/yjl9903/Breadc/v1.0.0-beta.1/assets/typescript.png)

## Installation

```bash
npm i @breadc/core
```

## Usage

Try [./examples/echo.ts](./examples/echo.ts).

```ts
import { breadc } from '@breadc/core';

const cli = breadc('echo', { version: '1.0.0' })
  .option('--host <host>', 'specify hostname', { initial: 'localhost' })
  .option('--port <port>', 'specify port', { initial: '3000', cast: (t) => +t });

cli.command('[message]', 'Say something!').action((message, option) => {
  console.log(message ?? 'You can say anything!');
  const { host, port } = option; // { host: string, port: number, '--': string[] }
  console.log(`Host: ${host}`);
  console.log(`Port: ${port}`);
});

cli.run(process.argv.slice(2)).catch((err) => console.error(err));
```

If you are using IDEs that support TypeScript (like [Visual Studio Code](https://code.visualstudio.com/)), input something using `option`, and then you will find the `option` is automatically typed with `{ host: string, port: number }`. In the figure below, [Visual Studio Code](https://code.visualstudio.com/) will automatically infer that the type of `option.host` is `string` and the type of `option.port` is `number`.

![vscode](https://raw.githubusercontent.com/yjl9903/Breadc/v1.0.0-beta.1/assets/typescript.png)

## Inspiration

+ [cac](https://github.com/cacjs/cac): Simple yet powerful framework for building command-line apps.
+ [TypeScript: Documentation - Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
