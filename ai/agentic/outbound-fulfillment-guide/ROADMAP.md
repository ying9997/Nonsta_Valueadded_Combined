# ROADMAP

## 当前状态

- 当前阶段：Phase 0 - 安全预检和项目骨架已完成；Phase 1 待启动
- 阶段状态：`completed`
- 当前知识版本：`0.0.0`，未发布
- 运行时知识：不可用
- 远程仓库：腾讯工蜂 `agentic/outbound-fulfillment-guide`，`main` 已首次推送

## Phase 0：安全预检和项目骨架

状态：`completed`

目标：

- 创建项目级 `AGENTS.md` 和全部实际规则文件。
- 创建根文档、目录 README、Schema 和模板。
- 固定 Node.js、npm 和 lockfile。
- 实现 `phase0-skeleton` 校验和安全 capability stub。
- 初始化独立本地 Git；remote 和 push 只在 Henry 明确授权后执行。

已完成：

- 目标目录已创建。
- `AGENTS.md` 是项目内第一个文件。
- 已建立规则目录和 10 份规则文件。
- 已建立完整目录骨架、10 个顶层目录 README、9 个领域 README 和 21 个实体 README。
- 已建立 3 份机器 Schema、空来源台账、受控生成元数据、5 份模板和空目录保留文件。
- 已固定 Node.js `24.16.0`、npm `11.13.0`，并由声明版本生成 `package-lock.json`。
- 已真实实现 `kb:validate`；其余 7 个 `kb:*` 命令使用安全 capability stub。
- 已初始化独立本地 Git，当前分支为 `main`。
- 已执行 `npm ci`、脚本语法检查、空业务库校验和未实现命令探针。
- 已创建本地初始提交，并从已提交树完成隔离 clone 复现。
- 已修复 validator 与 clone 自带 `origin` 的冲突；remote 可读但名称和 URL 不进入报告。
- 经 Henry 授权创建腾讯工蜂私有仓库，配置 `origin` 并完成 `main` 首次推送。

待完成：

- 无。

完成门禁：

- 规则无悬空引用。
- 目录职责和命名明确。
- 空业务库校验通过且 `release_ready: false`。
- 本地 Git 根仅覆盖本项目；remote 只能在当次明确授权后配置。
- 初始提交存在，且已提交工作树在隔离 clone 中达到 `clone_ready: true`。

## Phase 1：来源盘点、分类和 Schema

状态：`pending`

只有 Phase 0 完成后才能开始。目标包括冻结“订单创建至仓库出库交接”范围内的来源清单、来源台账、权威矩阵、敏感与图片依赖报告，以及仓内出库业务 Schema。尾程来源只做排除标记，不迁移业务内容。

## 后续阶段

| 阶段 | 主题 | 状态 |
|---|---|---|
| Phase 2 | 场景、订单创建、字段与资格校验 | pending |
| Phase 3 | 库存分配、订单释放、波次与拣货 | pending |
| Phase 4 | 复核、增值、装箱、包装与打托 | pending |
| Phase 5 | 称重量方、面单、仓库出库与交接 | pending |
| Phase 6 | 仓内异常、动作、SLA 和费用 | pending |
| Phase 7 | 全链路整合和候选发布 | pending |
| Phase 8 | `v1.0.0` 完整版本 | pending |

## 阻塞

- 当前无 Phase 0 阻塞。
- Phase 1 尚未启动；业务来源盘点和迁移不在本次提交范围内。

## 最近验证

- 2026-08-04：Node.js `24.16.0`、npm `11.13.0` 与声明版本一致。
- 2026-08-04：`npm ci --ignore-scripts --no-audit --no-fund` 通过。
- 2026-08-04：3 个 `.mjs` 文件的 `node --check` 均通过。
- 2026-08-04：`npm run kb:validate` 退出码为 `0`；168 项检查中 167 项通过、1 项因没有初始提交跳过、0 项失败、0 个错误、1 个预期警告。
- 初始提交前的校验报告声明 `validation_profile: phase0-skeleton`、`business_content_status: empty`、`clone_ready: false`、`release_ready: false`，且校验前后权威输入摘要一致。
- 其余 7 个 `kb:*` 命令均写入各自独立的 `not_implemented` 报告并返回退出码 `3`，未写入 Canonical、来源或业务生成视图。
- 初始提交前的检查确认：本地 Git 根等于项目根，分支为 `main`，当时没有 remote 和初始提交。
- 2026-08-04：范围调整为止于仓库出库交接；尾程内容延期且不进入本次来源、Canonical、生成、测试和发布范围。
- 2026-08-04：完成范围收敛和仓内流程细化后重新运行 `npm run kb:validate`，退出码为 `0`；168 项检查中 167 项通过、1 项因没有初始提交跳过、0 项失败。报告继续声明 `business_content_status: empty`、`clone_ready: false`、`release_ready: false`。
- 2026-08-04：创建本地初始提交 `93ba010`，并提交 validator clone 兼容修复 `7685960`。
- 2026-08-04：从已提交树进行隔离 clone；`npm ci --ignore-scripts --no-audit --no-fund` 通过，`npm run kb:validate` 168/168 通过，0 错误、0 警告，`clone_ready: true`、`release_ready: false`。
- 2026-08-04：腾讯工蜂私有项目 ID `391106` 已创建，`origin/main` 首次推送已核验。

## 下一步

待 Henry 明确启动 Phase 1 后，开始盘点“订单创建至仓库出库交接”范围内的来源、权威性、敏感性、图片依赖和范围排除；在来源盘点完成前不写入正式业务 Canonical。
