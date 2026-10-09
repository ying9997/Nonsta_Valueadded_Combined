# P0-006 Prompt：修 SOP 生成失败兜底机制

请执行根目录 `TASK.md` 中的 `P0-006`：

`修 SOP 生成失败兜底机制：覆盖 JSON 解析失败和模型不可用失败，样本 VASC000000448800 / VASC000000421227`

## 任务边界

1. 本会话只处理 SOP 生成失败兜底，不改场景识别、L2.5 必填规则、回流状态机或白名单。
2. 目标是让 SOP 生成失败可分类、可重试、可降级展示，不误判为场景不确定。
3. 不部署 40，不写 OMS。

## 必读文件/证据

- `TASK.md`
- `internal-review-copilot/lib/generate-text.ts`
- `internal-review-copilot/lib/llm-client.ts`
- `internal-review-copilot/lib/run-pipeline.ts`
- `internal-review-copilot/lib/feishu-card.ts`
- `internal-review-copilot/scripts/test-llm-fallback.ts`
- `internal-review-copilot/scripts/test-jsonish.ts`
- `internal-review-copilot/scripts/test-feishu-card.ts`
- `internal-review-copilot/scripts/run-e2e-full.ts`

样本：

- `VASC000000448800`：JSON 解析失败，`Expected ',' or '}' after property value...`
- `VASC000000421227`：模型不可用，`Access to Anthropic models is not allowed`

## Agent 自验证

1. 复盘两类失败路径：JSON 不合法、模型不可用/API 400/502。
2. 明确每类失败应该进入哪个 failureType/failureGate，以及卡片如何展示。
3. 若改代码，必须覆盖：
   - JSON 解析失败后重试或稳定降级。
   - 模型不可用时 fallback 或清晰失败分类。
   - SOP 失败卡不出现“场景不确定”误导。
4. 至少运行：
   - `npx tsx scripts/test-jsonish.ts`
   - `npx tsx scripts/test-llm-fallback.ts`
   - `npx tsx scripts/test-feishu-card.ts`
   - 与 `run-pipeline` 相关的最小回归测试
5. 运行 `git diff -- <相关文件>`，说明只改了 P0-006 范围。

## 人工验收

产出报告，至少包含：

1. 两个样本失败原因。
2. 修改前卡片/错误表现。
3. 修改后失败分类和卡片文案。
4. 本机测试命令和结果。
5. 未覆盖的模型供应商/网络异常风险。

## 40 部署准入

不得部署 40。若后续要部署，必须先说明影响服务、回滚方案、是否需要 `40-snapshot-code.sh`，并等待用户明确授权。

## TASK.md 回写

结束前在 `P0-006` 后补：执行会话、修改文件、测试命令、报告路径、状态。

