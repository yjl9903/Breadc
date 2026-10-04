# 转换与校验

## 按业务要求理解输入

开发者希望集中表达输入要求，业务操作只处理符合条件的数据；使用者希望输入不合法时获得明确反馈。

### 代码示例

```ts
import { breadc, InputError } from 'breadc';
import { z } from 'zod';

const cli = breadc('repeat');

cli.command('<text>')
  .option('--count <value>', '重复次数', {
    default: '1',
    cast: z.coerce.number().int().min(1).max(3)
  })
  .action((text, options) => {
    for (let i = 0; i < options.count; i++) console.log(text);
  });

try {
  await cli.run(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof InputError)) throw error;

  console.error('请提供文本，并将重复次数设为 1 到 3 的整数');
  process.exitCode = 1;
}
```

### 使用示例

```console
$ repeat hello
hello

$ repeat hello --count 2
hello
hello

$ repeat hello --count invalid
请提供文本，并将重复次数设为 1 到 3 的整数
```

无效次数只产生错误提示，不执行重复输出，退出码为 `1`。

## 帮助用户定位多个输入问题

使用者希望知道哪些输入阻止了操作，尽可能一次修正多个问题；开发者希望按应用的受众表达错误。

### 代码示例

```ts
import { breadc, InputError, ErrorCode } from 'breadc';

const cli = breadc('hello');

cli.command('<name>')
  .option('--prefix <text>', '问候前缀', { default: 'Hello' })
  .action((name, options) => console.log(`${options.prefix}, ${name}!`));

try {
  await cli.run(process.argv.slice(2));
} catch (error) {
  if (!(error instanceof InputError)) throw error;

  for (const issue of error.issues) {
    if (issue.code === ErrorCode.UNKNOWN_OPTION) console.error(`无法识别选项：${issue.name}`);
    else if (issue.code === ErrorCode.MISSING_OPTION_VALUE) console.error('请提供问候前缀');
    else if (issue.code === ErrorCode.MISSING_ARGUMENT) console.error('请提供姓名');
    else console.error(issue.message);
  }

  process.exitCode = 1;
}
```

### 使用示例

```console
$ hello --typo --prefix
无法识别选项：--typo
请提供问候前缀
请提供姓名
```

不输出问候，退出码为 `1`。
