# 方案 C 汇报：四条标准样例本地干跑

**这是「标准样例 / 演示样例」，不是正式准确率评测，不能当 gold。**

- 性质：明天业务汇报用 presentation demo；证明 L1–L4 路径设计完整
- 输入：`internal-review-copilot/eval/presentation-demo/standard-cases.details.json`（假 VASC / EB / WI，无真实客户 PII）
- 脚本：复用现有 `internal-review-copilot/scripts/run-internal-review-dryrun.ts`（未改 `lib/**`、`experts/**`、`scripts/oms/**`）
- 样本数：4
- SOP：本地 mock，未调用真实 LLM，未拉实时 OMS
- 本目录贴汇报表：`presentation-table.md`

## 方案 C 三块怎么用（不要混）

| 块 | 用途 | 材料 | 不能当什么 |
|---|---|---|---|
| 1 | 证明链路已在真实待审核单上跑通 | `_runs/20260902_internal_review_dryrun_after_match_template_v02/`（16 条：15 `transfer_human` + 1 `needs_field_clarification`） | **不能当 gold**；无最终审核结论 |
| 2 | 证明 L1–L4 每种路径设计完整 | 本目录四条假单干跑 | **不是准确率**；不是评测集 |
| 3 | 证明协作形态 | 下表「群聊动作」+ 实测 `messageDraft` | 不是线上已上线的群机器人 |

A/B 场景（包裹类异常换标 / 指定商品拍照暂存）当前是 `candidate_supported`，**不得当成可自动执行场景**。L4 **只用 F-001**（当前唯一 `supported`），不用 B 证明 SOP 生成。

## 干跑结果（与期望一致）

| 样例 | 假单号 | 停在哪一层 | outputPath | 未进入 |
|---|---|---|---|---|
| L1 需求不完整 | `VASC000009901001` | check-requirement | `needs_requirement_clarification` | match-template / 完整性 / SOP |
| L2 场景不支持 | `VASC000009901002` | match-template | `transfer_human` | 强行套 F-001/A/B、完整性、SOP |
| L3 场景明确但附件不齐 | `VASC000009901003` | check-completeness | `needs_field_clarification` | SOP |
| L4 信息齐全出草稿 | `VASC000009901004` | format-output | `sop_generated` | 自动审核通过 |

match-template 实测：

| 假单号 | decision | top1 | reason |
|---|---|---|---|
| VASC000009901001 | （未进入） | - | - |
| VASC000009901002 | unsupported | - | `unsupported_intercept_hold` |
| VASC000009901003 | supported | `inbound_label_identify`（F-001） | `supported_clear_top1` |
| VASC000009901004 | supported | `inbound_label_identify`（F-001） | `supported_clear_top1` |

## 群聊协作（实测，不是设计稿）

| 样例 | mentionRoles | 草稿要点 |
|---|---|---|
| L1 | `customerService`, `sales` | 需求描述不完整，请补充对象/动作/目的；AI 不代填事实 |
| L2 | **空数组** | 「请转人工审核，并记为后续模板候选」；**当前运行时不会自动艾特审核员** |
| L3 | `customerService`, `sales` | 已识别 F-001，缺：操作说明附件、商品和标签的对应关系、标签文件 |
| L4 | `reviewers` | 已生成 SOP **草稿**供审核确认；**确认不等于审核通过** |

L2 设计意图是「艾特固定审核人员人工判断」。本次**不改运行时**，表格按实测填写：转人工话术已出，艾特审核员尚未接到 `mentionRoles`。汇报时不要说成「已经会自动 @ 审核员」。

L4 mock SOP 末句已写：「本草稿仅供审核确认，确认不等于审核通过。」

## 不要在会上说的话

- 不要把 16 条待审核分流比例说成准确率
- 不要把 L2 拦截不上架说成 A 或 B 已可自动执行
- 不要用拍照暂存（B）演示 SOP 生成
- 不要把本目录四条说成 eval-v0.1 gold
