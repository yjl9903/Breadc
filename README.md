# Breadc

[![version](https://img.shields.io/npm/v/breadc?color=rgb%2850%2C203%2C86%29&label=Breadc)](https://www.npmjs.com/package/breadc) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

Yet another Command Line Application Framework powered by [minimist](https://www.npmjs.com/package/minimist).

## Installation

```bash
npm i breadc
```

## Usage

```ts
import Breadc from 'breadc'

const cli = Breadc('cli', { version: '1.0.0' })

cli.parse(process.argv.slice(2))
```

## License

MIT License © 2021 [XLor](https://github.com/yjl9903)
