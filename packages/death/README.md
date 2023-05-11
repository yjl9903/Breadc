# @breadc/death

[![version](https://img.shields.io/npm/v/@breadc/death&label=@breadc/death)](https://www.npmjs.com/package/@breadc/death) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

## Installation

```bash
npm i @breadc/death
```

## Usage

```ts
import { onDeath } from '@breadc/death'

onDeath(() => {
  console.log('Process is being killed')
})
```

## Note

In [Signal events](https://nodejs.org/dist/latest-v20.x/docs/api/process.html#signal-events), it says that `SIGTERM` and `SIGINT` have default handlers on non-Windows platforms that reset the terminal mode before exiting with code 128 + signal number. **If one of these signals has a listener installed, its default behavior will be removed (Node.js will no longer exit).**

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
