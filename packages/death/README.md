# @breadc/death

[![version](https://img.shields.io/npm/v/@breadc/death&label=@breadc/death)](https://www.npmjs.com/package/@breadc/death) [![CI](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml/badge.svg)](https://github.com/yjl9903/Breadc/actions/workflows/ci.yml)

Easily register termination signals callbacks.

It will listen `SIGINT`, `SIGTERM`, `SIGQUIT` these three signals. When receive any one of them, it will invoke all the callbacks **in the reverse order** (it also **await the asynchronous callbacks**), and finally send the original signal again.

> In [Signal events](https://nodejs.org/dist/latest-v20.x/docs/api/process.html#signal-events), it says that `SIGTERM` and `SIGINT` have default handlers on non-Windows platforms that reset the terminal mode before exiting with code 128 + signal number. **If one of these signals has a listener installed, its default behavior will be removed (Node.js will no longer exit).**

## Installation

```bash
npm i @breadc/death
```

## Usage

```ts
import { onDeath } from '@breadc/death'

onDeath((signal) => {
  console.log(`Receive signal: ${signal}`);
  console.log('Process is being killed');
})
```

You can also use `process.exit` instead of `process.kill`, or disable terminating the current process, which is the default behavior of this package. Note that **the context object is shared between different callbacks**.

```ts
onDeath((signal, context) => {
  // Use process.exit(1)
  context.terminate = 'exit'
  context.exit = 1
})
```

```ts
onDeath((signal, context) => {
  // Disable terminate
  context.terminate = false
})
```

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
