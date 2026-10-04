# 命令执行

## 完成任务后再报告成功

使用者希望命令完成所请求的任务，开发者希望耗时操作结束后再给出成功反馈。

### 代码示例

```ts
import { writeFile } from 'node:fs/promises';
import { breadc } from 'breadc';

const cli = breadc('note');

cli.command('<file> <text>', '保存笔记').action(async (file, text) => {
  await writeFile(file, text, 'utf8');
  console.log(`已保存：${file}`);
});

try {
  await cli.run(process.argv.slice(2));
} catch {
  console.error('保存失败，请检查路径和写入权限');
  process.exitCode = 1;
}
```

### 使用示例

```console
$ note note.txt 'Hello, Breadc!'
已保存：note.txt

$ cat note.txt
Hello, Breadc!
```

无法写入时提示“保存失败，请检查路径和写入权限”，不报告成功，退出码为 `1`。

## 为相关操作提供一致的公共反馈

开发者希望多个操作遵守共同约定，使用者希望同一工具中的任务具有一致的反馈方式。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('text').use(async (_context, next) => {
  console.log('开始处理');

  const context = await next();

  console.log('处理完成');

  return context;
});

cli.command('upper <text>').action((text) => console.log(text.toUpperCase()));

cli.command('lower <text>').action((text) => console.log(text.toLowerCase()));

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ text upper Breadc
开始处理
BREADC
处理完成

$ text lower Breadc
开始处理
breadc
处理完成
```
