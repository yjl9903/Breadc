# 类型推导规范

本文描述当前 TypeScript 声明如何推导参数、选项、转换结果和动作签名。运行时语法见 [parser](parser.md)，转换时机见 [runtime](runtime.md)。类型层以字符串字面量为主要输入，不替代运行时校验。

## 类型载体与组合

| 类型 | 携带的信息 |
| --- | --- |
| `Breadc<Data, Options>` | 中间件数据和全局选项 |
| `Group<Spec, Init, Data, Options>` | 分组声明、数据和可见选项 |
| `Command<Spec, Init, Data, Options, Arguments, Return>` | 命令声明、数据、选项、位置参数元组和动作返回类型 |
| `Option<Spec, Init>`、`Argument<Spec, Init>` | 独立声明及其 default/cast 配置 |
| `Context<Data>` | 执行数据类型；匹配命令和输入容器仍为通用运行时结构 |

链式 `.option()` 将 `InferOption` 与既有 Options 相交；从应用创建分组、从应用或分组创建命令时，传递当前链上的 Data 和 Options。`.argument()` 在既有 Arguments 元组末尾追加一项。独立 `option()`、`argument()` 注册重载提取实例的 Spec 和 Init，保留转换结果推导。

注册方法在运行时修改同一对象，但 TypeScript 只在返回值上反映新泛型。忽略链式返回值后，旧变量的静态类型不会随对象修改而自动拓宽。独立 group/command 注册也不能理解为会重新推导其此前绑定的动作签名。

## 位置参数元组

固定命令名称不进入动作参数。`InferArgumentsType<Spec>` 从命令 spec 提取有序元组：

| spec | 推导元组 |
| --- | --- |
| `build` | `[]` |
| `build <entry>` | `[string]` |
| `build <entry> [target]` | `[string, string \| undefined]` |
| `build [target] [...files]` | `[string \| undefined, string[]]` |
| `build <...files>` | `[string[]]` |

可选参数占据固定元组位置，其值可为 `undefined`；spread 是单个数组位置。必填 spread 的“至少一个”由运行时检查，静态类型仍为 `string[]`，不是非空数组元组。

类型层将识别到的非法参数顺序推导为 `never`，包括必填跟在可选之后、spread 后仍有参数或参数后出现固定名称。这不是完整的 spec 编译期验证器；手动 `.argument()` 的跨调用顺序仍由运行时构建校验。

## 选项名称与原始类型

类型层先去掉 `-x, ` 短别名前缀，再剥离长名的 `no-` 或 `[no-]` 形态标记和值占位符。例如 `-c, --[no-]use-cache` 对应 `useCache` 属性，值类型为 boolean。

Options 中的属性本身始终存在；“未输入”通过属性值中的 `undefined` 表达，不通过可选属性 `?` 表达。`--name <value>` 要求出现时带值，但其输出仍可能缺失。

当前名称推导的 camelCase 模式显式处理一处或两处连字符，不是递归实现；运行时逐段转换。超过两处连字符等复杂名称不能假设静态键与运行时完全一致。

## Default、cast 输入与输出矩阵

默认值必须是转换前的 CLI 原始类型；schema 输出是 number，不代表可以配置 number 默认值。`default: undefined` 或类型可能为 undefined 的默认值，不提供“必定存在”的静态保证。

以下 `R` 表示普通函数返回类型或 schema 输出类型；“有默认值”指类型上确定为非 undefined 的合法默认值。缺失导致的 undefined 与 R 本身包含的 undefined 分开计算。

### 选项

| 声明形态 | default 类型 | 函数 cast 输入 | 无 cast、无默认值 | 无 cast、有默认值 | 有 cast、无默认值 | 有 cast、有默认值 |
| --- | --- | --- | --- | --- | --- | --- |
| 布尔（三种形态） | `boolean` | `boolean` | `boolean` | `boolean` | `R` | `R` |
| `--name <value>` | `string` | `string` | `string \| undefined` | `string` | `R \| undefined` | `R` |
| `--name [value]` | `string` | `string \| undefined` | `string \| undefined` | `string \| undefined` | `R \| undefined` | `R` |
| `--name <...value>` | `string[]` | `string[]` | `string[]` | `string[]` | `R` | `R` |

可选值选项即使有默认值，无 cast 时仍可能因裸 `--name` 得到 undefined；有 cast 时，该裸输入会传给转换器，所以由 R 表示结果。必填值选项的 cast 输入没有 undefined，因为显式缺值会先被 parser 拒绝，完全未出现且无默认值则跳过 cast。

### 位置参数

| 声明形态 | default 类型 | 函数 cast 输入 | 无 cast、无默认值 | 无 cast、有默认值 | 有 cast、无默认值 | 有 cast、有默认值 |
| --- | --- | --- | --- | --- | --- | --- |
| `<name>` | 不允许非 undefined 默认值 | `string` | `string` | 不适用 | `R` | 不适用 |
| `[name]` | `string` | `string` | `string \| undefined` | `string` | `R \| undefined` | `R` |
| `<...name>` | 不允许非 undefined 默认值 | `string[]` | `string[]` | 不适用 | `R` | 不适用 |
| `[...name]` | `string[]` | `string[]` | `string[]` | `string[]` | `R` | `R` |

位置参数不存在“显式出现却没有值”的裸状态，因此可选位置参数的函数 cast 输入也不包含 undefined。普通可选位置参数 `[name]` 未提供且无默认值时，不调用转换器；可选 spread `[...name]` 在同样情况下仍以 `[]` 调用转换器。有配置默认值时，将默认值传入转换器。必填位置参数缺失时先报告语法错误，不进入转换。

`CheckedOptionInit`、`CheckedArgumentInit` 限定配置键为 `default` 和 `cast`，对额外键施加 `never` 约束；旧式或拼错的配置不能借助泛型推导静默通过。

## Schema 与结果保留

`Cast<Input, Output>` 是函数与 `StandardSchemaV1<unknown, Output>` 的联合。函数获得上表中的上下文输入类型；schema 输入不要求与 CLI 原始类型静态相等，以容纳 enum、coerce 等 validator，由运行时验证值是否合法。

`InferCastOutput` 优先提取 Standard Schema 输出，其次提取函数返回类型。可调用 schema 同样优先协议类型。转换得到的对象、字面量联合、品牌类型、Set、null、undefined 等均保留，不自动排除假值。

类型层不会 Awaited 转换结果，也没有全面禁止异步 converter 的类型约束；异步 cast 由运行时拒绝，不能据其推导结果认定该 converter 可执行。

## 动作、中间件与入口返回类型

命令 `.action()` 接收 `(...args: [...Arguments, Options & { '--': string[] }, Context<Data>])` 形式的回调，允许同步或异步返回，并把返回类型保存在 Command 的 Return 泛型中。

选项 `.action()` 的 value 使用 `InferOptionActionValue`：有 cast 时直接为 R；无 cast 时为该选项的 cast 输入类型。因为动作仅由显式有效输入触发，必填值选项动作没有“选项未出现”所带来的 undefined；可选值选项动作仍可能收到 undefined。

`.use()` 从中间件返回的 `Promise<Context<NextData>>` 推导下一阶段 Data，`next({ data })` 建立该返回类型。运行时对 data 做浅合并，但静态类型取中间件返回 Context 的 Data，不自动表示全部历史数据的交集；需要保留旧键的精确类型时，应在返回的数据类型中体现它们。

| 入口 | 当前静态契约 |
| --- | --- |
| `app.parse<PArgs, POpts>()` | args 默认 `any[]`；options 为应用 Options 与调用方 POpts 的交集；不依据任意 argv 自动推导某个命令 |
| `app.run<T>()` | `Promise<T>`，T 由调用方指定或上下文决定，不从命令集合推导 |
| `parse(app, argv)` | 通用 `Context` |
| `run(context)` | 通用异步执行结果，不保留具体命令的 Return 泛型 |
| `breadc(...)` | 返回 core 的 `Breadc`；默认 help/version 不加入静态 Options |

公开 Command 的可调用签名声明 `Promise<Return>`，但直接调用的运行时实现尚为空；该签名不是已可用执行入口。

## 当前一致性边界

运行时同名选项采用有效声明替换，类型层仍使用 `Options & InferOption`，不模拟覆盖；用不同类型覆盖同名属性可能得到不符合运行时替换语义的交叉类型。动态字符串也无法提供与字面量相同的名称和参数精度。

修改这些规则时，需同时核对运行时与类型断言，不应把现有推导缺口写成已实现保证。
