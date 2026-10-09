# P0-009 Prompt：修 L2.5 误路由到 L1/错误卡片

请执行根目录 `TASK.md` 中的 `P0-009`：

`修 L2.5 误路由到 L1/错误卡片问题：缺场景字段/附件时必须走 L2.5 资料待补充，不再展示“客户需求描述不完整”`

## 任务边界

1. 本会话只修 L2.5 出口/卡片文案，不改场景识别、不改必填规则、不改回流状态机。
2. 目标是：当 `failureGate=check-completeness` 或 `node=check-scene-completeness` 时，卡片和状态明确表达“资料待补充/场景资料缺失”，不要冒充 L1 需求不完整。
3. 如果用户明确要求和 `P0-002A` 一起处理，可以同时修本地 reply status panel 的层级显示，但不能混入 badcase 规则学习或必填规则修改。
4. 不部署 40。

## 必读文件/证据

- `TASK.md`
- `internal-review-copilot/_runs/20261008_l1_l25_readonly/p0-003-diagnostic-report.md`
- `internal-review-copilot/lib/check-scene-completeness.ts`
- `internal-review-copilot/lib/run-pipeline.ts`
- `internal-review-copilot/lib/feishu-card.ts`
- `internal-review-copilot/lib/format-output.ts`
- `internal-review-copilot/scripts/poll-and-assess.ts`
- `internal-review-copilot/scripts/test-feishu-card.ts`
- `internal-review-copilot/scripts/test-g2-pipeline.ts`
- `internal-review-copilot/scripts/build-reply-status-panel.ts`
- `internal-review-copilot/_runs/20261009_reply_status_panel/reply-status-panel.json`

必验样本：

- `VASC000000448314`：历史输出 `needs_requirement_clarification`，但 `failureGate=check-completeness`，面板/报告层级应显示 `L2.5`。
- `VASC000000420921`：历史输出 `needs_requirement_clarification`，但属于 `L2_5_misrouted_to_L1_card`，面板/报告层级应显示 `L2.5`。
- `VASC000000411852`：历史输出 `needs_requirement_clarification`，但属于 `L2_5_misrouted_to_L1_card`，面板/报告层级应显示 `L2.5`。

## Agent 自验证

1. 找出 L1 与 L2.5 当前如何共用 `needs_requirement_clarification` 或卡片文案。
2. 设计最小改动，让 L2.5 缺资料卡片标题/正文/状态与 L1 区分。
3. 覆盖至少两个样本：
   - L1 真需求不完整。
   - L2.5 场景字段/附件缺失。
4. 若同时修面板，必须验证 `failureGate=check-completeness` 或 `node=check-scene-completeness` 优先显示为 `L2.5`，不能被 `needs_requirement_clarification` 覆盖成 `L1`。
5. 至少运行：
   - `npx tsx scripts/test-feishu-card.ts`
   - `npx tsx scripts/test-g2-pipeline.ts`
   - 如改了面板：`npx tsx scripts/build-reply-status-panel.ts --store _runs/20261008_l1_l25_readonly/case-store.json --poll-log _runs/20261008_l1_l25_readonly/poll.log --listen-log _runs/20261008_l1_l25_readonly/listen.log --out _runs/20261009_reply_status_panel --fetch-threads`
   - 如有新增测试，运行新增测试
6. 检查卡片 JSON，不得再出现 L2.5 场景使用“客户需求描述不完整/需求不清晰”的误导文案。
7. 运行 `git diff -- <相关文件>`，说明只改 P0-009 范围，或用户明确授权的 P0-002A 面板范围。

## 人工验收

产出验证报告，至少包含：

1. L1 样本卡片。
2. L2.5 样本卡片。
3. 两者标题、正文、@人话术、按钮或状态差异。
4. 如修面板，提供三个必验样本在面板 JSON/CSV/HTML 中显示为 `L2.5` 的证据。
5. 测试命令和结果。
6. 未覆盖风险。

## 40 部署准入

不得部署 40。部署前必须提供本机验证报告、影响服务、回滚方案，并等待用户明确授权。

## TASK.md 回写

结束前在 `P0-009` 后补：执行会话、修改文件、测试命令、报告路径、状态。
