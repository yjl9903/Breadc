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

## License

MIT License © 2023 [XLor](https://github.com/yjl9903)
