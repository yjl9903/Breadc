---
outline: deep
---

# Examples

```ts
import { breadc } from 'breadc'

const cli = breadc('echo', { version: '1.0.0' })
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

If you are using IDEs that support TypeScript (like [Visual Studio Code](https://code.visualstudio.com/)), input something using `option`, and then you will find the `option` is automatically typed with `{ host: string, port: number }`. In the figure below, [Visual Studio Code](https://code.visualstudio.com/) will automatically infer that the type of `option.host` is `string` and the type of `option.port` is `number`.

![vscode](https://cdn.jsdelivr.net/gh/yjl9903/Breadc/assets/vscode.png)
