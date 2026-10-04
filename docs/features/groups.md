# 命令分组

## 按用户理解的业务领域组织命令

功能增多时，使用者希望相关操作集中在一起，开发者希望共同设置在这些操作中保持一致。

### 代码示例

```ts
import { breadc } from 'breadc';

const cli = breadc('tool');

const config = cli.group('config', '查看配置')
  .option('--profile <name>', '配置名称', { default: 'dev' });

config.command('show', '显示当前配置').action((options) => {
  console.log(`当前配置：${options.profile}`);
});

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ tool config show
当前配置：dev

$ tool config show --profile prod
当前配置：prod
```


## 在较长路径中保留默认入口与简写

业务领域需要多个单词表达时，使用者仍希望只输入领域名称就能执行常用任务，也能选择完整命令或简写。

### 代码示例

```ts
import { breadc, group } from 'breadc';

const remote = group('remote cloud', '查看云端资源');

remote.command('list [name]', '列出资源')
  .alias('')
  .alias('ls')
  .action((name) => console.log(`资源范围：${name ?? '全部'}`));

const cli = breadc('tool');
cli.group(remote);

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ tool remote cloud
资源范围：全部

$ tool remote cloud prod
资源范围：prod

$ tool remote cloud list prod
资源范围：prod

$ tool remote cloud ls prod
资源范围：prod
```

## 为不同业务安排入口

开发者希望按业务需要选择简短或完整的命令路径，使用者希望同一领域的操作共享设置，并有方便的默认入口。

### 代码示例

```ts
import { breadc, group } from 'breadc';

const cli = breadc('tool');

// 分组中的默认操作可以不需要输入，也可以接受参数。
cli.group('status').command('').action(() => console.log('运行正常'));

const config = cli.group('config').option('--profile <name>', '配置名称', { default: 'dev' });
config.command('[name]').action((name, options) => {
  console.log(`配置：${options.profile}，项目：${name ?? '全部'}`);
});
config.command('show').action((options) => console.log(`配置：${options.profile}`));
config.command('profile show <name>').alias('s').action((name) => console.log(`配置：${name}`));

// 较长的业务路径可以独立声明，再加入工具；别名同样保留业务前缀。
const remote = group('remote cloud');
remote.command('list [name]').alias('').alias('ls')
  .action((name) => console.log(`资源：${name ?? '全部'}`));
cli.group(remote);

await cli.run(process.argv.slice(2));
```

### 使用示例

```console
$ tool status
运行正常

$ tool config
配置：dev，项目：全部

$ tool config app
配置：dev，项目：app

$ tool config show
配置：dev

$ tool config --profile prod show
配置：prod

$ tool config show --profile prod
配置：prod

$ tool config profile show prod
配置：prod

$ tool config s prod
配置：prod

$ tool remote cloud
资源：全部

$ tool remote cloud prod
资源：prod

$ tool remote cloud list prod
资源：prod

$ tool remote cloud ls prod
资源：prod
```
