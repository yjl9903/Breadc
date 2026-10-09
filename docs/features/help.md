# 帮助与发现

## 沿用应用的输出方式与宽度

开发者希望帮助和版本信息能写入应用选择的终端或日志系统，并按目标的可用宽度排版。使用者在窄终端中也应能阅读帮助；重定向后的示例命令应保留原文，便于复制执行。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello', {
  version: '1.0.0',
  output: {
    columns: 40,
    write: (text) => process.stderr.write(text)
  }
});

cli.command('greet <name>', '向指定的人发送问候，并显示问候结果。');
await cli.run(process.argv.slice(2));
```

### 使用示例

```sh
hello --help 2>help.txt
# 帮助写入 help.txt，正文和列表按 40 个显示列排版。

hello 2>help.txt
# 自动帮助也使用相同的输出方式与宽度。
```

```console
$ hello --version
hello/1.0.0
```

版本信息同样写入 stderr。省略 output 时使用 stdout 的当前宽度，无法获取宽度时使用 80 列。没有 process 或可写 stdout 的环境中，帮助和版本信息通过 console.log 输出，帮助按 80 列排版。

## 不离开终端就能了解命令用法

使用者希望在首次接触或忘记用法时获得相关指引；开发者希望说明与功能保持一致，不必另写一套帮助系统。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello', { version: '1.0.0', description: '一个问候工具' });

cli.command('greet <name>', {
  summary: '向指定的人问好',
  examples: [{ command: 'hello greet Breadc', comment: '发送问候' }]
})
  .option('--shout', '大声问好')
  .action((name, options) => {
    const message = `Hello, ${name}!`;

    console.log(options.shout ? message.toUpperCase() : message);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

```sh
hello
# 显示工具说明和可用命令。

hello greet --help
# 显示问候命令的用法、姓名要求、选项和示例，不要求先提供姓名，也不发送问候。
```

```console
$ hello --version
hello/1.0.0
```

## 适应受众语言与应用约定

开发者希望帮助适合自己的用户，并能沿用应用既有的入口约定。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello', {
  i18n: 'zh',
  builtin: { help: { spec: '-H, --usage' }, version: false }
});

cli.command('<name>', '问好').action((name) => console.log(`你好，${name}！`));

await cli.run(process.argv.slice(2));
```

### 使用示例

```sh
hello -H
# 显示中文帮助，包括“用法”“选项”和姓名用法；没有版本选项，不发送问候。

hello --usage
# 显示中文帮助，包括“用法”“选项”和姓名用法；没有版本选项，不发送问候。
```
