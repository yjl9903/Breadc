# 命令组织

## 从一个简单命令开始

开发者希望快速编写一个 CLI：用户输入命令，工具完成一项任务，并在终端给出结果。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello');

cli.command('', '问好').action(() => {
  console.log('Hello, world!');
});

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ hello
Hello, world!
```

## 为任务提供多个输入

用户希望为同一任务提供多个信息，其中有些必须填写，有些可以省略。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello');

cli.command('<name> [title]', '问好').action((name, title) => {
  console.log(`Hello, ${title ? `${title} ` : ''}${name}!`);
});

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ hello Alice
Hello, Alice!

$ hello Alice Dr.
Hello, Dr. Alice!
```

## 一次处理多个对象

用户希望一次向多个人问好，而不必重复执行命令。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello');

cli.command('[...names]', '向多人问好').action((names) => {
  console.log(`Hello, ${names.length ? names.join(', ') : 'world'}!`);
});

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ hello
Hello, world!

$ hello Alice
Hello, Alice!

$ hello Alice Bob
Hello, Alice, Bob!
```

## 为不同操作提供命令名称

工具承担多个任务时，用户希望通过名称选择操作；相关操作也可以用更完整的路径表达。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('text');

cli.command('about', '查看工具说明').action(() => console.log('文本处理工具'));
cli.command('upper <text>', '转为大写').action((text) => console.log(text.toUpperCase()));
cli.command('lower <text>', '转为小写').action((text) => console.log(text.toLowerCase()));

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ text about
文本处理工具

$ text upper Breadc
BREADC

$ text lower Breadc
breadc
```

## 为同一操作提供便捷入口

使用者希望既能写出完整名称，也能用简写执行熟悉的任务；最常用的操作还可以直接作为工具的默认行为。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('hello');

cli.command('greet [name]', '问好')
  .alias('g')
  .alias('message greet')
  .action((name) => console.log(`Hello, ${name ?? 'world'}!`));

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ hello greet Breadc
Hello, Breadc!

$ hello g Breadc
Hello, Breadc!

$ hello message greet Breadc
Hello, Breadc!
```

## 明确命令的输入要求

开发者希望按任务需要声明必填、可选或多个输入，使用者希望按照命令约定提供这些信息。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('spec');

// 空声明提供默认入口；也可以写为 command('about').alias('')。
cli.command('').alias('about').action(() => console.log('无位置参数'));

// 单个输入：必填或可选。
cli.command('required <name>').action((name) => console.log(name));
cli.command('optional [name]').action((name) => console.log(name));

// 多个输入：按声明顺序接收，必填在前，可选在后。
cli.command('pair <name> <title>').action((name, title) => console.log(name, title));
cli.command('mixed <name> [title]').action((name, title) => console.log(name, title));
cli.command('optional-pair [name] [title]').action((name, title) => console.log(name, title));

// 多值输入：至少一个，或允许不提供；多值参数放在最后。
cli.command('many <...names>').action((names) => console.log(JSON.stringify(names)));
cli.command('any [...names]').action((names) => console.log(JSON.stringify(names)));
cli.command('required-many <greeting> <...names>')
  .action((greeting, names) => console.log(greeting, JSON.stringify(names)));
cli.command('mixed-many <greeting> [...names]')
  .action((greeting, names) => console.log(greeting, JSON.stringify(names)));
cli.command('optional-many [greeting] [...names]')
  .action((greeting, names) => console.log(greeting, JSON.stringify(names)));

// 命令名称可以有多段；参数也可以逐项声明。
cli.command('message greet <name>').action((name) => console.log(name));
cli.command('manual').argument('<name>').argument('[title]')
  .action((name, title) => console.log(name, title));

// 多个别名共用同一套参数声明。
cli.command('greet [name]').alias('g').alias('hi').alias('message hello')
  .action((name) => console.log(name));

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ spec
无位置参数

$ spec about
无位置参数

$ spec required Alice
Alice

$ spec optional
undefined

$ spec optional Alice
Alice

$ spec pair Alice Dr.
Alice Dr.

$ spec mixed Alice
Alice undefined

$ spec mixed Alice Dr.
Alice Dr.

$ spec optional-pair
undefined undefined

$ spec optional-pair Alice
Alice undefined

$ spec optional-pair Alice Dr.
Alice Dr.

$ spec many Alice
["Alice"]

$ spec many Alice Bob
["Alice","Bob"]

$ spec any
[]

$ spec any Alice Bob
["Alice","Bob"]

$ spec required-many Hi Alice Bob
Hi ["Alice","Bob"]

$ spec mixed-many Hi
Hi []

$ spec mixed-many Hi Alice Bob
Hi ["Alice","Bob"]

$ spec optional-many
undefined []

$ spec optional-many Hi
Hi []

$ spec optional-many Hi Alice Bob
Hi ["Alice","Bob"]

$ spec message greet Alice
Alice

$ spec manual Alice
Alice undefined

$ spec manual Alice Dr.
Alice Dr.

$ spec greet Alice
Alice

$ spec g Alice
Alice

$ spec hi Alice
Alice

$ spec message hello Alice
Alice
```

`spec required`、`spec pair Alice`、`spec many` 和 `spec required-many Hi` 缺少必填输入时，命令报告缺少参数，不执行动作。
