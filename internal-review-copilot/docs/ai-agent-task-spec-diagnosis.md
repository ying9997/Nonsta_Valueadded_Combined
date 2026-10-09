# AI Agent 协作问题诊断与解决方案

> 2026-10-09 · 针对 internal-review-copilot 闭环回流与 badcase 优化工作中暴露的 AI Agent 协作失效问题

## 1. 现象

在使用 Codex 对 `internal-review-copilot` 进行闭环回流和 badcase 优化的过程中，出现了以下症状：

- **Task 定好了，给 Codex 跑，跑完人工无法确认结果对不对。**
- **改动散乱**——多个 Codex 对话各做各的，产出之间没有关联。
- **"想不清楚的时候 AI 给的东西看不懂"**——无法判断 AI 产出是否满足预期。

## 2. 问题根因

### 2.1 指令诅咒（Instruction Curse）

> 参考：[How to Write a Good Spec for AI Agents](https://www.vibevibe.cn/Articles/04-engineering-practices/how-to-write-a-good-spec-for-ai-agents.html)
>
> "研究证实：提示中堆积更多指令时，模型遵守每个指令的性能显著下降。"

当前的 HANDOFF.md 是一份很好的**人类恢复上下文**文档，但它不是 AI 执行规范。当把 HANDOFF + 一段模糊的"继续做 L2.5 误路由修复"丢给 Codex 时，AI 同时面对：

- 255 条 case-store、118 条对照数据
- 4 个不同方向（误路由 / context facts / 状态机 / 场景识别）
- 6 个需要读的源文件
- 一套 P1-P6 红线规则

AI 不知道该聚焦哪一个，产出物也因此缺乏焦点，人工难以判断。

### 2.2 跳过了 Plan 阶段，直接进入 Implement

文章提出的四阶段门控工作流：

```
Specify → Plan → Task → Implement
```

当前的实际流程是：

```
脑中有方向 → 直接给 Codex 开对话让它改代码/分析 → 看产出看不懂 → 卡住
```

**缺失的环节是 Plan 阶段**——没有让 AI 先产出"我打算怎么做、做完怎么验证"的计划，也没有人工先确认计划是否说得通，就让它直接动手了。

### 2.3 缺少 task 级别的执行规范（六个核心领域不全）

GitHub 对 2,500+ 代理配置文件的分析发现有效的 AI 规范需要覆盖六个核心领域：

| 核心领域 | 项目现状 | 问题 |
|----------|---------|------|
| 命令 | ✅ 有（`npx tsx scripts/test-*.ts`） | — |
| 测试 | ✅ 有 test 脚本 | — |
| 项目结构 | ✅ README 有 | — |
| 代码风格 | ⚠️ 隐含 | 没显式写给 AI |
| Git 工作流 | ✅ AGENTS.md 有 | — |
| **边界/三层标记** | ❌ **缺** | 没有按 task 粒度写"哪些能改、哪些要先问、哪些绝对不碰" |

AGENTS.md 的 P1-P6 红线是**项目级别**的。AI 执行一个具体 task 时需要的是 **task 级别的边界**，例如："这个 task 只允许改 `feishu-card.ts` 和 `format-output.ts`，不允许碰 `run-pipeline.ts`"。

### 2.4 Codex 对话之间的"上下文隔离墙"

每个 Codex 对话是一个独立的上下文窗口。当前的问题：

- **对话 A 不知道对话 B 做了什么**——没有 HANDOFF 喂进去
- **对话不知道整体 backlog 状态**——不知道自己在做第几个 task、前置依赖做完没
- **产出物散落在 Codex 内部**——需要人工把改动 copy 出来才能验证

### 2.5 "人工无法确认"的本质——缺少可执行的验收标准

对于代码改动，验收流程是清晰的（P5 红线：先过本机 unit/integration/E2E，出验证报告）。但当前主要在做的**分析型任务**没有等价的验收标准：

- "场景认错 51 条"——修了以后应该降到多少？
- "L2.5 误路由 32 条"——抽几条确认？抽样结论怎么算通过？
- "reply_received 7 条"——是状态机 bug 还是业务正常？

没有具体的验收标准，看着 Codex 的产出就变成了"看起来做了什么但也不确定对不对"。

## 3. 问题总结

| 表面问题 | 实际根因 |
|---------|---------|
| "我需要一个 task 清单" | 清单已有（HANDOFF §4），缺的是每个 task 的**执行规范** |
| "Codex 做的东西看不懂" | 不是理解力问题，是**没定义验收标准**，AI 不知道该用什么形式交付 |
| "改动散乱" | 不是 AI 发散，是**没限定边界**（只允许碰哪些文件、产出写到哪里） |
| "人工无法确认" | 不是确认能力不够，是**没有把确认变成清单打勾的过程** |

## 4. 解决方案

### 4.1 建立 task spec 机制

在项目下新增 `_tasks/` 目录，每个 task 一个 spec 文件：

```
internal-review-copilot/
  _tasks/
    T001_misroute_sample.md
    T002_l25_route_fix.md
    T003_context_facts_probe.md
    ...
```

### 4.2 Task Spec 模板

每个 spec 覆盖文章提出的六个核心领域 + 三层边界：

```markdown
# T-XXX · [标题]

## 目标（What & Why）
一句话说清楚这个 task 要做什么、为什么做。

## 输入物（Context）
- 必读：AGENTS.md（红线）、本文件
- 数据源：[具体文件路径]
- 参考：[相关文档路径]

## 边界（Boundaries）
- ✅ 始终：[不需询问直接执行的行动]
- ⚠️ 先问：[需人工批准的高影响行动]
- 🚫 永不：[硬停止]

## 产出路径
_runs/YYYYMMDD_TXXX_描述/
  ├── [产出文件1]
  └── [产出文件2]

## 验收标准（Acceptance Criteria）
1. [具体的、可判定的条件]
2. [数字/文件/断言]
3. ...

## 命令（验证方法）
[怎么跑测试 / 怎么人工验证]

## 前置依赖
[依赖哪些 task 先完成，无则写"无"]
```

### 4.3 执行流程改为四阶段门控

```
┌─────────┐     ┌──────┐     ┌──────┐     ┌───────────┐
│ Specify │ ──▶ │ Plan │ ──▶ │ Task │ ──▶ │ Implement │
│ 写 spec │     │ AI产 │     │ 人工 │     │ Codex执行 │
│         │     │ 出计划│     │ 确认 │     │ 按spec    │
└─────────┘     └──────┘     └──────┘     └───────────┘
      ▲                                        │
      └──── 验收不通过：回到 Specify 改 spec ◄──┘
```

关键原则：**在当前阶段未验证完成前，不进入下一阶段。**

### 4.4 Codex 对话开头模板

每次给 Codex 开对话时，prompt 开头写：

```
读以下文件恢复上下文：
1. internal-review-copilot/AGENTS.md
2. internal-review-copilot/_tasks/T001_misroute_sample.md

执行 T-001。产出严格按 spec 中的"产出路径"写入。
完成后对照"验收标准"做自检报告。
```

**一个对话只做一个 task**——消除指令诅咒。

### 4.5 验收流程

Codex 执行完后：

1. 打开 `_runs/` 下对应目录，看产出文件
2. 打开 task spec，逐条对照"验收标准"打勾
3. 通过 → 标 DONE；不通过 → 标 REJECTED + 原因 → 回到 spec 补充

**"看不懂"不再是你的问题，而是 spec 没写清楚的信号**——回去改 spec，下次重跑。

## 5. 落地到当前 internal-review-copilot 的初版 Task 清单

基于 HANDOFF 和 l1-l25-readonly-report 已识别的四个方向：

| ID | 标题 | 类型 | 前置 | 状态 |
|----|------|------|------|------|
| T-001 | L2.5 误路由抽样核验（10 条） | 分析 | 无 | TODO |
| T-002 | L2.5 needs_field_clarification 路由分离 | 代码 | T-001 | TODO（已有本机改动待验收） |
| T-003 | context/tool facts 可补足性核验（5 条） | 分析 | T-001 | TODO |
| T-004 | reply_received 状态机排查（7 条） | 分析 | 无 | TODO |
| T-005 | L2 场景识别改进方案 | 代码 | T-001 + T-003 | TODO |

每个 task 的完整 spec 待单独文件编写。

## 6. 参考

- [How to Write a Good Spec for AI Agents (Addy Osmani)](https://www.vibevibe.cn/Articles/04-engineering-practices/how-to-write-a-good-spec-for-ai-agents.html)
- 本项目 `AGENTS.md` · 红线与改动五步
- 本项目 `_workflow/20261008_会话交接_l1_l25_dashboard_40/HANDOFF.md` · 最近一次交接
