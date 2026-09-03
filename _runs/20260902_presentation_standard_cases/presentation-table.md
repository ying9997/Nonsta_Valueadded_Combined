# 方案 C 贴汇报表（四条标准样例）

> 演示样例，不是正式准确率评测。16 条待审核不能当 gold。A/B 不能自动执行。L4 只用 F-001。

| 情况 | 输入摘要 | Agent 停在哪一层 | outputPath | 群聊动作 | 展示结论 |
|---|---|---|---|---|---|
| L1 需求不完整 | 假单 `VASC000009901001`。需求只有「请帮忙看一下这单，尽快处理。」无 EB/WI，无附件。 | L1 / `check-requirement`（未进 match-template） | `needs_requirement_clarification` | 艾特客服 + 销售：补充操作对象、动作、目的/去向。AI 不代填事实。 | 需求不清就停，不猜场景、不套模板、不写 SOP。 |
| L2 场景不支持 | 假单 `VASC000009901002`。明确「拦截不上架 / 先放一边」，带假 EB/WI。 | L2 / `match-template`（reason=`unsupported_intercept_hold`） | `transfer_human` | 草稿：转人工审核，记为后续模板候选。**当前运行时不自动艾特审核员**（`mentionRoles` 为空）。 | 不支持就不强行套 F-001/A/B，不生成 SOP。A/B 不是可自动执行场景。 |
| L3 场景明确但附件不齐 | 假单 `VASC000009901003`。F-001 话术齐全（辨识 + 换标 + 上架），假 EB/WI 已有，**未传附件**。 | L3 / `check-completeness`（已识别 F-001） | `needs_field_clarification` | 艾特客服 + 销售：补齐操作说明附件、商品和标签的对应关系、标签文件后再审。 | 场景对了也不写 SOP；先把缺件清单甩回提交侧。 |
| L4 信息齐全出草稿 | 假单 `VASC000009901004`。同一套 F-001 话术 + 假 EB/WI + 三份附件齐。 | L4 / `format-output`（本地 mock SOP，未调真实 LLM） | `sop_generated` | 艾特审核员：SOP **草稿**请确认。确认 ≠ 审核通过。不自动审核通过。 | 当前只有 F-001 可出草稿。草稿给审核员看，不是系统替人过单。 |

## 会上配套一句（方案 C 另外两块）

1. **链路已跑**：真实 16 条待审核 dry-run 在 `_runs/20260902_internal_review_dryrun_after_match_template_v02/`（15 转人工 + 1 条 F-001 缺附件）。证明链路，**不是准确率**。
2. **路径设计**：上表四条假单，L1–L4 各停一层。
3. **协作形态**：L1/L3 找客服销售补信息；L2 转人工（话术已出）；L4 找审核员确认草稿。
