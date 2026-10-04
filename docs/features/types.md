# 开发体验

## 声明输入后，直接获得准确提示

CLI 开发者希望编辑器能理解命令接受的数据，减少重复描述，让输入定义变化后相关提示仍然一致。

### 代码示例

```ts
import { breadc } from 'breadc';
import { z } from 'zod';

const cli = breadc('hello');

cli.command('<name> [title]')
  .option('--count <value>', '次数', { default: '1', cast: Number })
  .option('--style <value>', '样式', { default: 'plain', cast: z.enum(['plain', 'upper']) })
  .action((name, title, options) => {
    const greeting = `Hello, ${title ? `${title} ` : ''}${name}!`;
    const text = options.style === 'upper' ? greeting.toUpperCase() : greeting;

    for (let i = 0; i < options.count; i++) console.log(text);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

开发者在编辑器中查看动作参数：`name` 为 `string`，`title` 为 `string | undefined`，`options.count` 为 `number`，`options.style` 为 `'plain' | 'upper'`，无需另写对应的类型声明。

```console
$ hello Breadc --style upper --count 2
HELLO, BREADC!
HELLO, BREADC!
```

## 在交付前发现误用

开发者希望在编写和重构 CLI 时尽早发现不成立的配置与不安全的假设，而不是等用户运行后才遇到问题。

### 代码示例

以下为有意保留错误的独立示例：

```ts
import { breadc, option } from 'breadc';

option('--count <value>', '次数', { default: 3, cast: Number });

const cli = breadc('hello');

cli.command('[name]').action((name) => console.log(name.toUpperCase()));
```

### 使用示例

在开启严格检查的 TypeScript 项目中，编辑器指出默认值应为文本，并提示姓名可能未提供；无需启动命令即可发现这些问题。
