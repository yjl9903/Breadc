# 测试规范

## 验证目标

Vitest 测试以可观察行为为主。`.test.ts` 验证运行时，`.test-d.ts` 验证类型契约，`.bench.ts` 用于按需运行的性能测试。

验证从用户需求出发：使用场景和预期结果用于确定行为是否达成，架构规范用于检查职责边界和具体契约。涉及用户行为的测试优先通过公开入口表达，不能只验证内部步骤而遗漏用户目标。新增或改变需求时，同步检查相关正常路径、失败路径和类型提示；需求与现有测试冲突时，先确认意图，不以测试现状反向定义需求。

根据变更范围覆盖下列重点：

- core：声明语法、别名和默认命令、选项作用域、透传输入、转换时机、诊断汇总、选项动作和中间件顺序。
- 类型 API：参数与选项推导、默认值、转换输出、独立声明组合及无效配置。
- breadc：通过公开入口验证内置帮助和版本、自动帮助、语言和排版，以及与 core 的组合行为。
- 终端工具：验证输出、光标、屏幕状态和资源释放；复用现有终端测试辅助设施。

纯转换使用明确的输入输出断言。输出测试控制终端、时间和进程信号等外部条件，避免依赖开发机状态。快照只用于确定且跨平台稳定的结果；不要以内部调用次数代替最终行为。

TUI 的详细约定沿用其[现有测试说明](../packages/tui/test/README.md)。

## 常用命令

使用 package.json 固定的 pnpm 版本安装依赖。当前 CI 使用 Node.js 24。

| 命令 | 用途 |
| --- | --- |
| pnpm install | 安装 workspace 依赖 |
| pnpm -C packages/core test | core 本地监听测试，包含类型检查 |
| pnpm -C packages/xxx test:ci | 单包非交互测试，适用于定义此脚本的包 |
| pnpm -C packages/core test:coverage | core 覆盖率与类型测试 |
| pnpm build | 通过 Turbo 构建所有 workspace |
| pnpm typecheck | 通过 Turbo 检查类型 |
| pnpm test:ci | 通过 Turbo 运行已定义的测试任务 |
| pnpm test:coverage | 通过 Turbo 运行已定义的覆盖率任务 |
| pnpm docs:build | 构建 VitePress 用户文档站 |

根级 typecheck 依赖构建；test:ci 和 test:coverage 依赖构建及类型检查。直接运行单包脚本不会经过这些 Turbo 前置任务，需要构建依赖时先运行构建。

## 完成条件

实现变更先运行相关包的非交互测试。修改 core 必须运行其 test:coverage 并阅读覆盖率结果，重点检查受影响分支，不能只看测试通过数量。

推送前运行 `pnpm build` 和 `pnpm test:ci`；当前 CI 还运行 `pnpm test:coverage`。core 和 breadc 已配置覆盖率任务，其他包不会因此自动生成覆盖率报告。

只修改开发文档时，核对事实、相对链接和 `git diff --check`，无需运行运行时测试。修改文档站内容或配置时运行 `pnpm docs:build`。交付时说明实际执行的验证及未完成项。
