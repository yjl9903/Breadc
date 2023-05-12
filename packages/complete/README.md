# @breadc/complete

[![version](https://img.shields.io/npm/v/@breadc/complete?label=@breadc/complete)](https://www.npmjs.com/package/@breadc/complete) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

👷 Work in progress.

## Installation

```bash
npm i @breadc/complete
```

Add this plugin to your CLI script.

```ts
import breadc from 'breadc'
import complete from '@breadc/complete'

const cli = breadc('echo', { version: '1.0.0', plugins: [complete()] })
  .option('--host <host>', { default: 'localhost' })
  .option('--port <port>', { default: '3000', cast: p => +p })

cli
  .command('[message]', 'Say something!')
  .action((message, option) => {
    const host = option.host
    const port = option.port
    console.log(`Host: ${host}`)
    console.log(`Port: ${port}`)
  })

cli.run(process.argv.slice(2)).catch(err => console.error(err))
```

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
