# 参数输入

选项让使用者调整一项操作：开关决定是否启用行为，单值选项指定一项设置，多值选项收集一组输入。长短名称、等号和短选项组合提供不同的书写方式。

## 开启或关闭一项行为

使用者希望按需开启额外功能、关闭默认行为，或明确选择开启与关闭。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('build');

cli.command('')
  .option('-v, --verbose', '显示详细信息')
  .option('-c, --no-cache', '禁用缓存')
  .option('-C, --[no-]color', '选择彩色输出')
  .action((options) => {
    console.log(`详细信息：${options.verbose}`);
    console.log(`使用缓存：${options.cache}`);
    console.log(`彩色输出：${options.color}`);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ build
详细信息：false
使用缓存：true
彩色输出：false

$ build --verbose --no-cache --color
详细信息：true
使用缓存：false
彩色输出：true

$ build -v -c -C
详细信息：true
使用缓存：false
彩色输出：true

$ build --verbose=false --no-color
详细信息：false
使用缓存：true
彩色输出：false

$ build --no-cache=false
详细信息：false
使用缓存：true
彩色输出：false

$ build --verbose=YES --color=1
详细信息：true
使用缓存：true
彩色输出：true

$ build --verbose=off --no-color=0
详细信息：false
使用缓存：true
彩色输出：true
```

布尔值写在等号右侧：`true/t/yes/y/on/1` 表示真，`false/f/no/n/off/0` 表示假，不区分大小写。反向选项会取反，因此 `--no-cache=false` 表示使用缓存。

`build -v --verbose` 重复指定同一开关时报告错误；`--verbose false` 不表示关闭开关。

## 为操作指定一个设置值

使用者希望指定输出位置等设置；省略选项时可以使用工具的常规行为，但写出选项后应提供完整的值。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('report');

cli.command('')
  .option('-o, --output <file>', '输出位置')
  .action((options) => console.log(`输出位置：${options.output ?? '终端'}`));

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ report
输出位置：终端

$ report --output out.txt
输出位置：out.txt

$ report --output=out.txt
输出位置：out.txt

$ report -o out.txt
输出位置：out.txt

$ report -o=out.txt
输出位置：out.txt

$ report -oout.txt
输出位置：out.txt
```

`report --output` 缺少值时报告错误；`report -o a.txt --output b.txt` 重复指定输出位置时报告错误，不覆盖前一次选择。

## 在默认设置之外保留自动选择和留空

使用者希望常用任务少填内容，也能主动指定标签、交给应用自动选择，或明确不设置标签。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('label');

cli.command('')
  .option('-t, --text [value]', '标签内容', { default: 'release' })
  .action((options) => {
    if (options.text === undefined) console.log('自动选择标签');
    else if (options.text === '') console.log('不设置标签');
    else console.log(`标签：${options.text}`);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ label
标签：release

$ label --text preview
标签：preview

$ label --text=preview
标签：preview

$ label -t preview
标签：preview

$ label -t=preview
标签：preview

$ label -tpreview
标签：preview

$ label --text
自动选择标签

$ label -t
自动选择标签

$ label --text=
不设置标签

$ label --text ''
不设置标签
```

## 一次选择多个对象

使用者希望一次指定多个路径，也能重复补充路径，并保留输入顺序。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('collect');

cli.command('[...files]')
  .option('-i, --include <...path>', '包含的路径')
  .action((files, options) => {
    console.log(`路径：${JSON.stringify(options.include)}`);
    console.log(`文件：${JSON.stringify(files)}`);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ collect
路径：[]
文件：[]

$ collect --include src test
路径：["src","test"]
文件：[]

$ collect --include=src --include=test
路径：["src","test"]
文件：[]

$ collect -i src test
路径：["src","test"]
文件：[]

$ collect -isrc -itest
路径：["src","test"]
文件：[]

$ collect -i=src -i=test
路径：["src","test"]
文件：[]

$ collect --include src main.ts
路径：["src","main.ts"]
文件：[]

$ collect --include=src main.ts
路径：["src"]
文件：["main.ts"]
```

`collect --include` 没有提供路径时报告错误。

## 用简写减少重复输入

熟练使用者希望合并常用开关，并在同一次输入中指定设置值。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('settings');

cli.command('')
  .option('-a, --all', '全部内容')
  .option('-b, --brief', '简短显示')
  .option('-o, --output <file>', '输出名称', { default: 'out.txt' })
  .action((options) => {
    console.log(`全部：${options.all}，简短：${options.brief}，输出：${options.output}`);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ settings -ab
全部：true，简短：true，输出：out.txt

$ settings -abo result.txt
全部：true，简短：true，输出：result.txt

$ settings -abo=result.txt
全部：true，简短：true，输出：result.txt

$ settings -aboresult.txt
全部：true，简短：true，输出：result.txt

$ settings -ab=false
全部：true，简短：false，输出：out.txt

$ settings -oab
全部：false，简短：false，输出：ab
```

## 准确传入包含特殊字符的值

使用者希望含空格、等号、负号的内容保留原意，即使内容看起来像另一个选项。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('input');

cli.command('')
  .option('-t, --text <value>', '输入内容')
  .action((options) => console.log(JSON.stringify(options.text)));

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ input --text 'hello world'
"hello world"

$ input --text=a=b
"a=b"

$ input --text -2.5
"-2.5"

$ input --text -2e-3
"-2e-3"

$ input --text -
"-"

$ input --text=--draft
"--draft"

$ input -t--draft
"--draft"
```

## 把剩余输入交给其他工具

使用者希望组合多个工具时，明确区分外层工具的设置与交给下游的参数。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('wrapper');

cli.command('')
  .option('--verbose', '显示详细信息')
  .action((options) => {
    console.log(`外层详细信息：${options.verbose}`);
    console.log(`下游参数：${JSON.stringify(options['--'])}`);
  });

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ wrapper --verbose -- --watch 'a b' -x
外层详细信息：true
下游参数：["--watch","a b","-x"]

$ wrapper -- --verbose
外层详细信息：false
下游参数：["--verbose"]
```
