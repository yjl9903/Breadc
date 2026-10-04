# 帮助与发现

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
