# 项目包与职责

本文描述 workspace 的包划分、职责和依赖方向。声明与 argv 语法见 [parser](parser.md)，执行和转换见 [runtime](runtime.md)，静态推导见 [types](types.md)，完整 CLI 的默认行为见 [builtin](builtin.md)。

## Workspace 划分

仓库通过 pnpm workspace 管理 `packages/*` 和 `apps/*`，根包 `@breadc/monorepo` 为私有开发入口。库与 CLI 应用使用 tsdown 输出 ESM 和类型声明；用户文档站使用 VitePress。Turbo 根据包依赖安排构建，类型检查依赖构建，测试任务依赖构建和类型检查。

| 包 | 目录 | 当前职责 |
| --- | --- | --- |
| `@breadc/core` | `packages/core` | 应用、分组、命令、参数和选项声明；类型推导、argv 匹配、输入转换、诊断与动作执行 |
| `breadc` | `packages/breadc` | 面向使用者的完整 CLI 入口；组装 core、help/version、自动帮助和常用终端工具 |
| `@breadc/color` | `packages/color` | ANSI 前景色、背景色、文本样式、256 色和终端链接 |
| `@breadc/death` | `packages/death` | 进程终止信号回调、异步清理及取消注册 |
| `@breadc/tui` | `packages/tui` | 终端帧和缓冲区渲染、行内渲染器、聊天界面及 widget 类型 |
| `@breadc/complete` | `packages/complete` | 补全扩展入口；当前 `complete()` 只返回调用 `next()` 的中间件 |
| `breadcpack` | `apps/breadcpack` | CLI 工具链占位应用；已接入 breadc，命令动作尚为空 |
| `create-breadc` | `apps/create-breadc` | 项目创建工具占位应用；命令动作尚为空，当前 CLI 名称仍为 `breadcpack` |
| `@breadc/docs` | `apps/docs` | 私有 VitePress 用户文档站，与本目录的开发架构文档分开维护 |

补全生成、打包和项目创建不能视为当前可用能力。两个 CLI 应用的库入口目前也只是占位导出。

## 依赖方向

下表区分包清单中的依赖与实际承担的逻辑职责。

| 使用方 | Workspace 依赖 | 外部依赖与用途 |
| --- | --- | --- |
| `@breadc/core` | 无 | `@standard-schema/spec` 提供协议类型；源码以 type import 引用 |
| `breadc` | core、color、death、tui | `fast-string-width` 计算帮助文本显示宽度 |
| `@breadc/tui` | color、death | `fast-string-width` 计算终端显示宽度 |
| `@breadc/color`、`@breadc/death` | 无 | 无第三方生产依赖；death 使用 Node.js 进程与事件 API |
| `@breadc/complete` | core、color 为 peer dependencies | 清单声明 `omelette`；当前实现仅使用 core 的中间件类型 |
| `breadcpack`、`create-breadc` | breadc、core、color | 当前 CLI 实现通过 `breadc` 创建应用 |
| `@breadc/docs` | 无 | VitePress、Vue、llms 导出及部署工具均为开发依赖 |

core 不依赖 breadc 或终端工具。Zod 是 core、breadc 的开发和测试依赖，框架通过 Standard Schema 协议接入 schema，不要求使用者安装 Zod。

## Core 内部职责

| 层 | 输入与输出 | 边界 |
| --- | --- | --- |
| 声明 API | 字符串 spec、配置和 handler → 声明对象 | 保留声明及注册顺序；类型层从字面量推导签名 |
| 声明构建 | 声明对象 → 命令路径、参数序列、选项拼写与形态 | 部分校验在首次解析到相应范围时才发生 |
| 词法与匹配 | `string[]` → 带原始匹配值的 `Context` | 处理作用域、回退、值边界、选项动作选择和语法诊断，不调用 cast |
| 输入转换 | 匹配值 → 转换结果或 schema 诊断 | 按需执行同步 cast，缓存结果，保留原始输入 |
| 执行 | 已匹配的 `Context` → handler 返回值 | 调度选项动作、未知命令处理器或命令中间件和动作 |

通用声明语法、输入校验、作用域及执行规则属于 core。core 接受调用方传入的 argv，不读取 `process.argv`，也不决定帮助排版、错误输出或退出码。

## Breadc 与工具包

`breadc` 创建 core 应用后注册帮助、版本选项动作，并替换应用实例的 `run` 以提供自动帮助。其 `parse`、独立 `run(context)`、声明工厂和错误类型沿用 core；`printHelp`、`printVersion` 属于 breadc。

`breadc` 重新导出 death、tui 和选定的 color API，作为便利入口；这些工具仍可独立使用。导出工具不意味着每条命令都会启动 TUI 或注册清理回调。`@breadc/complete` 不在 breadc 的默认依赖和导出中。

用户文档站从 `apps/docs` 构建，当前配置包含本地搜索和 `vitepress-plugin-llms` 导出，首页参与 llms 文档生成。`docs/architecture` 是开发基线，不是该站点的构建输入。

## 维护依据

包边界以各包 `package.json` 和公开入口为准；行为以实现和测试共同核对。调整依赖或导出时，应同时检查受影响包的入口、构建及调用方，而非只修改包清单。
