# P0-014 Prompt：建立 reply 后 badcase 闭环优化体系

请执行根目录 `TASK.md` 中的 `P0-014`：

`建立 reply 后 badcase 闭环优化体系：reply_received 后重新读取 OMS 事实，落独立闭环表，先分桶再决定修 OMS facts / 知识库 / 召回 / 场景卡 / L2 场景识别 / 多轮上下文；固定 gold cases 回归集，防止“修一个坏两个”`

## 核心原则

本任务的核心不是“把 badcase 都喂给模型”，而是先建立闭环数据，再分桶，再决定修哪里。

`reply_received` 后即使原单已经取消、流转出待审核、或待审核详情缓存缺失，也要重新读取 OMS 事实，形成独立闭环表。闭环表至少保存：

- AI 初判
- 人工回复
- 审核轨迹
- 终态场景
- 关联新单
- 差异桶
- 是否进入优化闭环
- 后续原子修复任务编号

## 任务边界

1. 本会话只处理 `P0-014` 的闭环体系设计、闭环表、分桶报告、固定回归集和后续任务映射。
2. 不要在本会话里直接修全部问题；只有为闭环体系所需的最小代码/脚本/测试可以修改。
3. `P0-010` 的 `queryPackageInfos` 接入、`P0-011` 的场景卡必填规则、`P1-001` 的 L2 场景识别回归，应作为后续原子任务映射，不要混成一个提交。
4. 不部署 40，不写 OMS/TOM，不触发线上重评。
5. 不改现网 Query / recaller。
6. 不提交 `_runs`、截图、cookie、token、临时实验包。

## 必读文件/证据

- `TASK.md`
- `task-prompts/P0-002A-reply-received-debug.md`
- `task-prompts/P0-010-package-info-context-facts.md`
- `internal-review-copilot/_runs/20261009_reply_closure_live/reply-closure-report.md`
- `internal-review-copilot/_runs/20261009_reply_closure_live/live-oms-readonly.json`
- `internal-review-copilot/scripts/analyze-reply-closure.ts`
- `internal-review-copilot/lib/reply-closure.ts`
- `internal-review-copilot/lib/oms-adapter.ts`
- `internal-review-copilot/lib/context-bind.ts`
- `internal-review-copilot/lib/check-scene-completeness.ts`
- `oms.SystemOrderService_queryPackageInfos-api.md`
- `queryStandardExceptionWithPlanPage接口文档.md`

## 必须覆盖的样本

排除样本：

- `VASC000000391044`
- `VASC000000403008`

固定 gold cases：

- `VASC000000415983`
  - 分桶：必填规则 gap
  - AI 问“处理数量”
  - 人工真实退回要求是“上下架单据”
  - 场景不是错：`【库内】商品拆箱加/减配件`
  - 后续应转 `P0-011`，修场景卡 requiredInfoFields / requiredAttachments 口径
- `VASC000000420921`
  - 分桶：事实/链路缺失或 context facts 未注入
  - AI 问“处理数量或范围”
  - 人工回复“客户提供的新的单据可以判断数量”
  - 后续应转 `P0-010`，通过上架入库单号走 `oms.SystemOrderService_queryPackageInfos` 补数量事实
- `VASC000000416175`
  - 分桶：L2 场景识别问题
  - 后续应转 `P1-001` 场景识别回归
- `VASC000000411852`
  - 分桶：场景/规则 nuance
  - AI 问“水印/时间戳要求”
  - 人工回复“无时间戳的要求”
  - 不能把时间戳粗暴设成所有照片/视频场景必填

非优化闭环样本：

- `VASC000000420954`
  - 有回复但不是有效修正，不得进入优化闭环

## 实现/产出要求

优先产出这些文件或等价内容：

1. 闭环表结构定义：字段要能表达 AI 初判、人工回复、审核轨迹、终态场景、关联新单、差异桶、是否进入优化闭环。
2. 分桶逻辑：至少覆盖：
   - 事实/链路缺失
   - 必填规则错
   - 场景错判
   - 多轮上下文/指代错
   - 非有效修正，排除
3. 固定 gold cases 清单：保留上述排除样本和纳入样本，后续 workflow 改动必须跑。
4. 后续任务映射：
   - `420921` -> `P0-010`
   - `415983` -> `P0-011`
   - `416175` -> `P1-001`
   - `411852` -> 规则 nuance 样本，可按证据决定转 `P0-011` 或 `P1-001`
   - `420954` -> 排除，不进入优化闭环
5. 一份可读报告：说明为什么当前只验证一个接口不够，真正闭环需要先落表、分桶、再按桶修复。

## Agent 自验证

修改前：

1. 说明当前 `reply_received` 为什么会卡在 `reassess_missing_detail` 或依赖待审核详情缓存。
2. 说明当前闭环数据是否能在原单取消/流转出待审核后仍保留 AI 初判、人工回复、审核轨迹和终态。
3. 说明 `P0-010` 为什么只是 `420921` 的子修复，不代表整个 workflow 优化完成。

修改后：

1. 新增或更新测试，至少覆盖：
   - `391044`、`403008` 被排除。
   - `415983` 分到必填规则 gap，并映射到 `P0-011`。
   - `420921` 分到 facts/context 注入，并映射到 `P0-010`。
   - `416175` 分到 L2 场景识别，并映射到 `P1-001`。
   - `411852` 保留为时间戳规则 nuance，不允许粗暴扩大必填规则。
   - `420954` 有回复但不进入优化闭环。
2. 至少运行：
   - `npx tsx scripts/test-reply-closure.ts`
   - 相关新增测试
   - 如影响 L2.5 prompt/context 链路，再运行 `npx tsx scripts/test-g2-pipeline.ts`
3. 生成闭环表/分桶报告/回归集报告，并写清楚路径。
4. 运行 `git diff -- <相关文件>`，确认本会话只改了 `P0-014` 所需范围。

## 最终 E2E 测试群

如果本机验证通过，并且用户要求做最终端到端验收，请把改动后的样本单发送到这个飞书群：

`oc_d45527b0abea480fcca82c269798c376`

E2E 发送要求：

1. 发送前列出全部 VASC 单号和每单预期结果。
2. 本任务默认只验证闭环表/分桶/回归集，不默认发送所有样本。
3. 未经用户明确要求“开始 E2E 发送”或“授权发送到验收群”，不得主动发群。
4. 发送前必须说明是否只是发验收群卡片，还是会触发 OMS/TOM 写入。
5. E2E 只能发到 `oc_d45527b0abea480fcca82c269798c376`，不得发到生产业务群。

## 人工验收

产出验证报告，至少包含：

1. 闭环表字段说明。
2. 每个样本的分桶结果和证据：
   - `391044`
   - `403008`
   - `415983`
   - `420921`
   - `416175`
   - `411852`
   - `420954`
3. 后续原子修复任务映射。
4. gold cases 回归集如何运行、如何判定通过。
5. 测试命令和结果。
6. 未覆盖风险：
   - OMS 事实回读失败时如何 fail-closed。
   - 原单和关联新单如何稳定匹配。
   - 人工回复如何判断是否为有效修正。
   - 分桶错了会不会把问题送到错误修复入口。

## 40 部署准入

不得部署 40。

如果后续认为可以部署 40，必须先输出：

1. 本机 unit/integration/E2E 或等价只读验证结果。
2. 影响文件和影响服务。
3. 是否涉及 TOM/OMS 只读调用。
4. fail-closed 保护。
5. 回滚方案。
6. 是否需要先执行 `40-snapshot-code.sh`。
7. 等待用户明确回复“授权部署 40”。

## TASK.md 回写

结束前在 `P0-014` 后补：

1. 执行会话链接。
2. 修改文件。
3. 验证命令和结果。
4. 报告路径。
5. 每个样本最终分桶。
6. 后续转出的 TASK 编号。
7. 当前状态：完成 / 阻塞 / 等人工确认 / 等 40 授权。
