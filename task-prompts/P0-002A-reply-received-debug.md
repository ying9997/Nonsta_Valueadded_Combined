# P0-002A Prompt：排查 reply_received 回流未闭环

请执行根目录 `TASK.md` 中的 `P0-002A`：

`排查 reply_received 回流未闭环问题（7 单）：定位 reassess_missing_detail、case-store 状态、详情缓存、重评触发断点，并确认审核员否定 AI 缺失项时是否能进入 badcase 自循环`

## 任务边界

1. 本会话只做 `P0-002A` 的诊断和必要修复：监听/回流状态机、人工回复解析、badcase 记录触发、自循环输入收集。
2. 可以修本地 reply status panel 的层级展示：`failureGate=check-completeness` 或 `node=check-scene-completeness` 必须显示为 `L2.5`，即使历史 `aiOutputPath/ruleOutputPath` 是 `needs_requirement_clarification`。
3. 不直接修场景识别、生产卡片文案、必填字段/附件规则或 SOP 生成；这些只能在报告中归因到 `P0-009` / `P0-010` / `P0-011` / `P0-012`，除非用户明确要求本会话同时处理 `P0-009`。
4. 先诊断完整 causal chain，再决定是否改代码。
5. 不部署 40，不写 OMS，不触发线上重评。
6. 不改现网 Query / recaller。

## 必读文件/证据

- `TASK.md`
- `internal-review-copilot/_workflow/20261008_会话交接_l1_l25_dashboard_40/HANDOFF.md`
- `internal-review-copilot/scripts/listen-card-actions.ts`
- `internal-review-copilot/scripts/poll-and-assess.ts`
- `internal-review-copilot/lib/reassess-loop.ts`
- `internal-review-copilot/lib/refresh-sop-edits.ts`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/p0-003-diagnostic-report.md`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/case-store.json`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/poll.log`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/listen.log`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/group-ai-question-contrast.md`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/group-ai-question-contrast.csv`
- `internal-review-copilot/scripts/build-reply-status-panel.ts`
- `internal-review-copilot/_runs/20261009_reply_status_panel/reply-status-panel.html`
- `internal-review-copilot/_runs/20261009_reply_status_panel/reply-status-panel.json`
- `internal-review-copilot/_runs/20261009_reply_status_panel/reply-status-panel.csv`

## 必验样本

这些样本不是普通卡住单，而是“审核员已经明确否定 AI 缺失项”的 badcase，自循环必须能记录：

1. `VASC000000448314`
   - AI/L1 缺失项：`SKU与入库单对应关系未说明`
   - 审核人员回复：`不需要补充对应关系@增值咨询`
   - 应验证：记录 badcase；回溯初次识别场景；列出该场景对应必填附件/字段；对照最终审核通过场景和最终必填附件/字段；记录“SKU与入库单对应关系不应要求客户补充”的人工否定证据。
2. `VASC000000420921`
   - AI/L1 缺失项：`处理数量或范围未说明`
   - 审核人员回复：`@增值咨询 客户提供的新的单据可以判断数量 cc@金萤`
   - 应验证：记录 badcase；回溯初次识别场景；列出该场景对应必填附件/字段；对照最终审核通过场景和最终必填附件/字段；记录“新的单据可以判断数量”的 context/tool facts 证据。
3. `VASC000000411852`
   - AI/L1 缺失项：`水印/时间戳要求未说明`
   - 审核人员回复：`@增值咨询 无时间戳的要求`
   - 应验证：记录 badcase；回溯初次识别场景；列出该场景对应必填附件/字段；对照最终审核通过场景和最终必填附件/字段；反推该字段来自哪个 L1/L2.5 规则。如果确认为 L2.5 必填规则误路由到 L1 或规则过严，只在报告中转入 `P0-009` / `P0-011`，不要在本会话直接改规则。

## 面板层级判定要求

当前 `reply-status-panel.html/json/csv` 里这三个样本显示为 `L1`，但历史只读报告已把它们归为 `L2_5_misrouted_to_L1_card`。面板应显示真实 workflow 层级，而不是只看历史卡片文案。

判定优先级建议：

1. `failureGate=check-completeness` 或 `node=check-scene-completeness` → `L2.5`
2. `aiOutputPath/ruleOutputPath=needs_field_clarification` → `L2.5`
3. `failureGate=check-requirement` → `L1`
4. `aiOutputPath/ruleOutputPath=needs_requirement_clarification` 且无 L2.5 证据 → `L1`

必须验证：

- `VASC000000448314` 面板层级应显示 `L2.5`
- `VASC000000420921` 面板层级应显示 `L2.5`
- `VASC000000411852` 面板层级应显示 `L2.5`

## Agent 自验证

1. 找出 7 个 `reply_received` 样本，列出每单当前状态、最近回复时间、reassess 尝试次数、失败原因。
2. 解释从 IM/卡片回复进入 case-store，再到 poll 重评的完整链路。
3. 明确断点属于：监听未收到、状态未写入、详情缓存缺失、重评输入缺失、重评后未写回、或其他。
4. 对三个必验样本逐单输出 badcase 自循环链路：
   - AI 初次出口与缺失项。
   - AI 初次识别场景。
   - 初次场景卡的必填附件和必填字段。
   - 审核人员回复原文和语义：否定缺失项 / 指出可由系统事实判断 / 指出规则不应必填。
   - 最终审核通过场景。
   - 最终场景对应必填附件和必填字段。
   - 归因桶：`P0-002` 回流、`P0-009` 路由/卡片、`P0-010` context/tool facts、`P0-011` 必填规则、`P1-001` 场景识别。
5. 验证 reply status panel 层级显示：三个必验样本必须从 `L1` 修正为 `L2.5`，并解释判定依据来自 `failureGate/node` 还是只读报告分类。
6. 验证 badcase 是否被写入或是否具备写入所需字段；如果当前没有 badcase 存储机制，提出最小数据结构和写入位置，但不要混入其它任务实现。
7. 若改代码，必须新增或更新本地测试，覆盖至少一个 `reply_received -> badcase -> reassess/self-loop input` 样本，以及一个 `check-completeness -> panel level L2.5` 样本。
8. 至少运行：
   - `npx tsx scripts/test-reassess-loop.ts`
   - `npx tsx scripts/build-reply-status-panel.ts --store _runs/20261008_l1_l25_readonly/case-store.json --poll-log _runs/20261008_l1_l25_readonly/poll.log --listen-log _runs/20261008_l1_l25_readonly/listen.log --out _runs/20261009_reply_status_panel --fetch-threads`
   - 相关新增测试
9. 运行 `git diff -- <相关文件>`，说明改动是否只限 `P0-002A` 或用户明确授权的 `P0-009` 范围。

## 人工验收

产出报告，至少包含：

1. 7 个 `reply_received` 样本表格。
2. 每个样本的断点判断。
3. 三个必验 badcase 样本的“AI 初判 vs 审核员回复 vs 最终审核通过规则”对照表。
4. 三个必验样本在 `reply-status-panel.html/json/csv` 中的层级修正截图或数据摘录，必须显示 `L2.5`。
5. 修改前/修改后的状态流。
6. 本机测试命令和结果。
7. 后续应转入哪些 TASK：`P0-009` / `P0-010` / `P0-011` / `P0-012` / `P1-001`。
8. 是否仍需人工提供线上 IM 样本或 40 日志。

## 40 部署准入

不得部署 40。若认为可以部署，先输出本机验证结果、影响服务、回滚方案，并等待用户明确说“授权部署 40”。

## TASK.md 回写

结束前在 `P0-002A` 后补：执行会话、诊断报告路径、验证命令、结论、是否等待人工确认。
