# Runtime 执行规范

本文规定解析后的输入转换、动作中间件和动作执行。argv 语法与匹配见 [parser](parser.md)，breadc 的输出策略见 [builtin](builtin.md)。

## 回调术语

| 术语 | 注册入口与类型 | 执行阶段 |
| --- | --- | --- |
| 动作中间件 | `.use(handler)`，`ActionMiddleware` | 普通命令执行时，通过 `next()` 包围后续中间件和命令动作 |
| 未知选项处理器 | `.allowUnknownOption(handler)`，`UnknownOptionMiddleware` | parser 扫描未知选项时同步调用，决定是否接受该输入 |
| 未知命令处理器 | `.onUnknownCommand(handler)`，`UnknownCommandMiddleware` | 没有匹配命令和选项动作时，由 run 调用 |

文档中的“中间件”专指动作中间件。后两者虽然在公开类型名中使用 Middleware，正文统一称为“处理器”；它们不属于 `.use()` 的动作中间件链。

## 公开入口

| 入口 | 解析与转换 | 执行 |
| --- | --- | --- |
| `parse(app, argv)` | 匹配、语法校验，返回原始 `Context` | 不执行动作；扫描可能调用未知选项处理器 |
| `app.parse(argv)` | 在上述结果上转换全部有效选项及已绑定参数 | 返回 `{ args, options, '--', context }`；扫描可能调用未知选项处理器，不执行动作、动作中间件或未知命令处理器 |
| `run(context)` | 不重扫 argv，按执行分支决定转换范围 | 执行已选选项动作、未知命令处理器或命令 |
| core 的 `app.run(argv)` | 等价于先 `parse` 再 `run` | 返回执行结果的 Promise |
| breadc 的 `app.run(argv)` | 使用相同 parser | 额外提供自动帮助 |

`app.parse()` 即使匹配选项动作，也仍转换全部有效选项；`run(context)` 的选项动作分支只转换获选选项。不能将两个入口的转换范围视为相同。

`app.parse()` 的透传数组是返回对象独立的 `'--'` 字段；命令动作收到的透传数组位于 `options['--']`。

## Context 与匹配值

每次 parse 创建独立 Context，包含应用、匹配分组/命令、实际匹配路径 `pieces`、获选 `actionOption`、选项 Map、位置参数数组、透传数组 `remaining`、语法 `issues`、token 流以及中间件数据 `data`。选项 Map 使用规范长名称；输出选项对象再将名称转换为 camelCase。

`MatchedOption` 和 `MatchedArgument` 保存 `raw`、是否成功显式赋值的 `dirty`，以及转换缓存。`value()` 在 finalize 之前返回原始值，之后返回缓存结果；缓存为 schema 失败时，读取也会抛出输入错误。`value()` 本身不会启动转换。

通过 `accept()` 成功赋值会使转换缓存失效；普通路径在输入不变时只转换一次。直接改写 `raw` 不会自动清除缓存，不能当作与 `accept()` 等价的赋值接口。单值参数重复绑定属于内部 API 误用。

## 输入选择与转换

输入先按“显式值 → 配置的非 undefined 默认值 → 形态内置值”选择，再执行 cast。布尔和 spread 形态有内置原始值；其他缺失值为 `undefined`。默认数组在匹配对象创建时复制，显式数组替换默认数组，不在默认值后追加。

| 输入状态 | 是否调用 cast |
| --- | --- |
| 显式值，包括 `''`、`false`、空值可选选项的 `undefined` | 是 |
| 未出现，但配置非 undefined 默认值 | 是，传入原始默认值 |
| 未出现、无配置默认值的布尔或 spread | 是，传入内置布尔值或 `[]` |
| 未出现、无默认值的普通可选输入 | 否，保留 `undefined` |

必填位置参数必须由 argv 满足；选项显式缺少必填值也不能用默认值或 cast 补救。schema 自带的默认机制只在 schema 被调用时生效，不会让完全缺失且无配置默认值的普通可选输入自动进入转换；布尔和 spread 仍按上表转换其内置值。

cast 支持普通函数或 Standard Schema V1。有效的 `~standard` 协议优先于函数调用，即使 schema 对象也可调用。schema 接收原始 CLI 值并返回验证或转换结果；框架不会预先做数字等隐式转换。spread 以完整数组调用一次，不逐项调用 cast。

转换结果原样保留，包括 `undefined`、`null`、`false`、`0`、空字符串；转换后不再选择默认值。cast 必须同步，返回 Promise 或其他 PromiseLike 会抛出 `ASYNC_CAST_UNSUPPORTED` 声明错误。命令动作、选项动作和动作中间件可以异步。

全部输入 finalize 时，先检查 Context 中新增的语法问题，再按选项 Map 顺序、位置参数顺序执行转换。schema 诊断汇总后统一抛出；普通函数或 schema 自身抛出的异常直接传播，会中断后续转换。

## 执行分支

### 选项动作

选项可通过 `option(...).action(handler, { priority })` 绑定动作。parser 从最终有效声明中选择至多一个动作：

1. 必须有 handler，匹配对象属于该有效声明，且 `dirty=true`。
2. 布尔选项还要求转换前的 `raw === true`。默认 `true` 不触发；显式 `false` 不触发；cast 输出不参与选择。
3. 优先级较高者获选，默认优先级为 0；相同优先级按有效声明的注册顺序选第一个，与 argv 顺序无关。同名覆盖会更新有效注册位置。

执行时只 finalize 获选选项，调用 `handler(value, context)` 并返回其结果。保留匹配命令供 handler 读取，但跳过所有应用/分组/命令动作中间件、未知命令处理器、命令动作及命令动作存在性检查。其他选项和位置参数不转换，失败或无效默认值也不会影响此分支；parser 已发现的扫描错误仍会阻止进入执行。

### 普通命令

匹配命令但没有 `.action()` 时，先抛出 `MISSING_COMMAND_ACTION`，不运行中间件或 cast。有动作时执行顺序为：

1. 应用中间件，按注册顺序。
2. 匹配分组的中间件，按注册顺序。
3. 命令中间件，按注册顺序。
4. 最终语法检查与全部输入转换。
5. `action(...args, options, context)`。

动作位置参数按声明顺序展开；spread 是一个数组参数，不展开成多个函数实参。options 包含全部有效选项（即使值为 `undefined`）及 `'--'`。普通执行返回动作结果，异步结果会被等待。

### 动作中间件与 next

中间件签名为 `(context, next)`；`await next()` 执行后续链并返回同一个 Context，因此 `next` 前后可以分别执行准备和清理逻辑。`next({ data })` 对 `context.data` 做浅合并，同名键由后者覆盖。

中间件正常返回却没有调用 `next()` 时，框架会自动继续后续链。省略 next 不能短路；抛错会中断执行。实现没有防止重复调用 next 的保护，调用方应只推进一次并等待它完成。

中间件链忽略中间件本身的普通返回值，使用 `context.output` 保存并返回动作输出。动作后处理中间件可读到转换缓存，也可以修改 output。无中间件的直接执行分支返回动作结果，不负责将结果写入 `context.output`。

输入有效性保证位于动作入口：中间件在 next 前通过匹配 API 修改的输入会最终校验；在动作完成、next 返回之后做的修改不重新校验。

### 未匹配命令

没有命令和选项动作时，core 若未注册未知命令处理器就直接返回 `undefined`，不转换输入，也不输出内容。

有未知命令处理器时，按注册顺序依次等待 `handler(context)`，所有处理器结束后才统一检查和转换输入；全部通过后返回最后一个处理器的结果。此分支不运行动作中间件。处理器读取输入时看到的是原始值，后续转换失败仍会使整个执行失败。

## 错误契约

| 错误类 | 含义 |
| --- | --- |
| `DefinitionError` | 无效声明、缺少命令动作、schema 拒绝配置的默认值，或异步 cast |
| `InputError` | argv 语法问题或 schema 拒绝输入，`code=INVALID_INPUT`，携带非空 `issues` |
| `InternalError` | 框架内部约束破坏或低层匹配 API 误用 |

三者继承 `BreadcError`，通过稳定 `ErrorCode` 区分原因；错误可以携带 `details` 及非枚举 `context`。schema issue 保留目标参数/选项、原始值和协议 path，并在消息中格式化路径。schema 返回空 issues 数组仍算失败，会补充一条 `Invalid value` 诊断。

显式配置默认值被 schema 拒绝时为 `INVALID_DEFAULT_VALUE`；内置 `false/true/[]` 被拒绝时为输入错误。普通 cast、handler、中间件抛出的异常原样传播。core 不统一打印异常，不设置进程退出码，也不提供自动重试。

当前 `Command` 类型虽然声明了可调用签名，但命令对象的直接调用仍为空实现。实际执行使用应用 `run(argv)` 或 `run(context)`。
