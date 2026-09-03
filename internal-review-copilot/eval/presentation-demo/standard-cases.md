# 汇报用四条标准样例（方案 C）

- 性质：**演示样例**，不是正式准确率评测，不是 gold
- 输入：`standard-cases.details.json`（假 VASC / EB / WI，无真实客户 PII）
- 干跑：复用 `internal-review-copilot/scripts/run-internal-review-dryrun.ts`（不改 lib）
- 产物：`_runs/20260902_presentation_standard_cases/`（`summary.md` / `dryrun-results.json` / `presentation-table.md`）
- 干跑已对齐期望：L1 `needs_requirement_clarification` · L2 `transfer_human` · L3 `needs_field_clarification` · L4 `sop_generated`

方案 C 三块里，本包只覆盖第 2 块「四条标准样例证明 L1–L4」。第 1 块用已有 16 条待审核 dry-run；第 3 块用本包 `presentation-table.md` 的群聊动作列。

16 条待审核 **不能当 gold**。A/B 场景 **不能自动执行**。L4 **只用 F-001**（当前唯一 `supported`）。

| 样例 | 假单号 | 停哪一层 | 期望 outputPath | 不得进入 |
|------|--------|----------|-----------------|----------|
| L1 | `VASC000009901001` | check-requirement | `needs_requirement_clarification` | match-template / SOP |
| L2 | `VASC000009901002` | match-template | `transfer_human` | 强行套 F-001/A/B、生成 SOP |
| L3 | `VASC000009901003` | check-completeness | `needs_field_clarification` | 生成 SOP |
| L4 | `VASC000009901004` | format-output | `sop_generated` | 自动审核通过 |

L2 用「拦截不上架 / 先放一边」，与 16 条里 14 张同文同类，证明 **不支持的作业转人工**，不把 A/B 当可执行场景。

L4 SOP 为本地 mock，不调用真实 LLM。草稿须艾特审核员确认，确认 ≠ 审核通过。
