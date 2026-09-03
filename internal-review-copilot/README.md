# internal-review-copilot

内部审核 Copilot 的本地验证与灰度准备目录。

本目录只放内部审核链路相关脚本、测试说明和后续 Bot 灰度适配代码。不要把这些文件放进 `experts/value-add/nonstandard-sop-guide/`，后者是线上外部客服 Expert 包。

## 边界

| 目录 | 用途 |
| --- | --- |
| `scripts/` | OMS 待审核单拉取、Agent 输入转换、本地 dry-run |
| `knowledge/` | 内部口径映射（权威原文仍在 `workspace/knowledge/sop/`，此处不复制模板） |
| `knowledge/scenario-cards/` | 3 张场景卡 JSON。F-001=`supported`；A/B=`candidate_supported`，附件策略 pending，**不是**业务签批 |
| `eval/` | 人工评测清单、match-template v0.2 smoke cases（不是金标） |
| `bot/` | 后续飞书 Bot 只读建议模式适配 |

## 本地 dry-run 链路

内部审核代码只放在本目录。线上 Expert 包仅做兼容引用（当前只引用 `validate-input`）。

```
validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
```

| 节点 | 位置 | 规则 |
| --- | --- | --- |
| `validate-input` | 兼容引用 Expert 包 | 基础入参 / 兜底原子校验 |
| `context-bind` | `lib/context-bind.ts` | 绑定 OMS 已有 EB/WI/仓/附件，已有事实不再追问 |
| `check-requirement` | `lib/check-requirement.ts` | pre-match 最低可路由门；权威见《非标增值服务SOP模板 及 填写示例》，映射见 `knowledge/requirement-completeness.md` |
| `match-template` | `lib/match-template.ts` | **v0.2**：Load Scenario Cards → deterministic score → merge → rank → select。只自动放行 `status=supported` 且 `decision=supported` 的 F-001。A/B 可进 topK，不进 `check-completeness`。当前是关键词/结构打分，**不是**真向量 RAG；SOP KB / casebook / reranker 端口已留空 |
| `check-completeness` | `lib/check-completeness.ts` | 仅 F-001 自动支持后查附件；A/B 附件策略 pending，不走正式校验 |
| `format-output` | `lib/format-output.ts` | 缺需求 → `needs_requirement_clarification`；缺附件/字段 → `needs_field_clarification`；齐全 → `sop_generated`。`llmGeneratedText` 来自真实 LiteLLM；失败降级 `transfer_human` + `llmError` |

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/test-match-template-v02.ts
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <_runs/YYYYMMDD_internal_review_dryrun>
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <_runs/YYYYMMDD_internal_review_llm> --order VASC000000348477
npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once --input <details.json> --skip-feishu
npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "先补对应关系"
npx tsx internal-review-copilot/scripts/feishu-login.ts
npx tsx internal-review-copilot/scripts/test-feishu-bot.ts
```

凭证只放 `.env`（`LITELLM_*` / `FEISHU_*`）。LLM 失败降级为 `transfer_human` + `llmError`，不中断批次。确定性分流看 `ruleOutputPath`。试点手册见 `docs/pilot-runbook.md`。

match-template v0.2 决策（详见 `lib/match-template.ts`）：

- 不能仅凭 `OW01V1602` / 「入库其他服务需求」命中任一场景。
- 「拦截不上架 / 先放一边 / 暂存不上架」不命中 F-001，也不命中 B（除非同时有明确拍照要求）。
- Top1 高且 Top1−Top2 差距明显 → `decision=supported`；仅 F-001 会把旧字段 `supported=true` 并进入附件门。
- 无候选达阈值 → `unsupported`；Top1/Top2 接近（含 F-001 vs A）→ `ambiguous`，`supported=false`，转人工。
- A/B 是 candidate/pending，附件不得写成正式必填。

## 依赖关系

内部审核 Copilot 可以读取线上 Expert 包里的规则节点和 Prompt 做兼容测试，但不能把内部审核逻辑写进线上 Expert 包。

允许引用：

- `experts/value-add/nonstandard-sop-guide/nodes/`
- `experts/value-add/nonstandard-sop-guide/prompts/inbound/`
- `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md`
- `workspace/knowledge/cases/f001-inbound-relabel-shelving/`
- `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md`

