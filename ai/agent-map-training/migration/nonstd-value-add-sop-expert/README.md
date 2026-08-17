# 非标增值 SOP Expert 迁移设计工作区

状态：草稿

## 目录定位

本目录是 `nonstd-value-add-sop-expert` 的迁移设计区：

`agent-map-training/migration/nonstd-value-add-sop-expert/`

它不是 appointment baseline 拆解区，也不承载 baseline expert 的拆解产物。

appointment baseline 拆解目录保持为：

`agent-map-training/baseline/inbound-appointment-manage/`

本目录可以参考 appointment baseline 的结构与经验，但不能把非标增值 SOP expert 的设计文件写入 appointment baseline 目录。

## 当前阶段边界

当前只初始化迁移设计工作区，不开始实现 expert 代码。

暂不创建以下实现相关文件或目录：

- `design.md`
- `workflow.json`
- `nodes/`
- `prompts/`

这些文件和目录需要等待 `01-constitution-7-questions.md` 中 1.1-1.7 的边界问题由用户确认后再创建。

## 文件清单

| 文件 | 状态 | 用途 |
|---|---|---|
| `README.md` | 草稿 | 说明目录定位、边界和当前工作规则 |
| `v0-execution-plan.md` | 草稿 | 从本机 V0 执行方案复制整理而来 |
| `01-constitution-7-questions.md` | 待用户填写 | 7 个边界问题模板，等待用户手写回答 |
| `02-mainline-design.md` | 待 7 问确认后填写 | 主链路设计草案承载文件 |
| `03-node-lighting.md` | 待主链路确认后填写 | 核心节点点亮验收承载文件 |
| `04-v0-acceptance.md` | 待设计确认后填写 | V0 验收清单承载文件 |
| `correction-log.md` | 待运行中记录 | 纠偏记录 |
| `archive.md` | 待归档 | 已废弃草稿、决策快照和历史备注 |

## 当前工作规则

- 先由用户回答 1.1-1.7，不由 AI 代答。
- 每次只推进一个文件，每个文件必须有产物和验收。
- AI 输出只能作为草稿，最终边界、验收标准和是否通过由用户确认。
- 任何实现代码都必须等迁移设计边界通过后再开始。
