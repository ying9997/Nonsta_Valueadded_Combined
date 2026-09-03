# 汇报演示：真实 LLM 群聊 / SOP（不是正式准确率评测）

- **性质**：内部审核 AI 应用汇报演示材料。**不是**正式准确率评测，**不是** gold。
- **输入**：`internal-review-copilot/eval/presentation-demo/standard-cases.details.json`（脱敏假 VASC / EB / WI，无真实客户 PII）
- **规则内核未改**：validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
- **LLM 边界**：L1–L3 的 `outputPath` / `node` / `missingFields` / `missingAttachments` / `matchResult` 仍以规则结果为准；LLM 只生成飞书群消息草稿。
- **L4**：使用现有 prompt `experts/value-add/nonstandard-sop-guide/prompts/inbound/main.md` + 脱敏 F-001 完整样例，调用真实 LLM 生成 SOP 草稿。
- **模型**：`claude-sonnet-4-5` @ `https://uslitellm.winit.com/v1`（key 来自环境变量，未写入本目录）
- **未改生产运行时代码**：未改 `lib/**`、`experts/**`、`run-internal-review-dryrun.ts`。

## 四条路径

| 样例 | 假单号 | 规则停留 | outputPath | LLM 做了什么 | 未进入 |
|---|---|---|---|---|---|
| L1 需求不完整 | `VASC000009901001` | `check-requirement` | `needs_requirement_clarification` | 真实 LLM 群消息（不改 gate） | match-template / 完整性 / SOP |
| L2 场景不支持（拦截不上架） | `VASC000009901002` | `match-template` | `transfer_human` | 真实 LLM 群消息（不改 gate） | SOP |
| L3 F-001 已识别但附件不齐 | `VASC000009901003` | `check-completeness` | `needs_field_clarification` | 真实 LLM 群消息（不改 gate） | SOP |
| L4 F-001 信息齐全可出 SOP 草稿 | `VASC000009901004` | `format-output` | `sop_generated` | 真实 LLM SOP 草稿 + 群消息 | 自动审核通过 |

## 哪些是模型生成的（对照标注）

| 位置 | 是不是模型 | 依据 |
|---|---|---|
| L1 整条群消息正文 | **是** `claude-sonnet-4-5` | `llm.step=im_draft`，`mocked` 未走本地 mock |
| L2 整条群消息正文 | **是** `claude-sonnet-4-5` | 同上 |
| L3 整条群消息正文 | **是** `claude-sonnet-4-5` | 同上 |
| L4 `sopText` / `warehouseSop` / `requirementBackground` / `requirementDescription` / `fieldsUsed` | **是** `claude-sonnet-4-5` | `llm.sop.mocked=false`，prompt=`prompts/inbound/main.md` |
| L1–L4 的 `outputPath` / `node` / `missing*` / `matchResult` | **否**，规则 | LLM 不得改 gate |
| L4 群消息外壳（处理人、确认提示、边界说明） | **否**，演示脚本套壳 | 把模型 SOP 拼进群聊格式 |

标注后的可贴稿：`presentation-llm-messages.md`。模型原文以 `llm-results.json` 的 `llm.groupMessage`（L1–L3）和 `llm.sop`（L4）为准。

## 验收

- 4 条样例都生成了完整可读群消息
- L1 未进入 match-template / SOP
- L2 / L3 未生成 SOP
- L4 生成了真实 LLM SOP 草稿（含需求背景、需求描述、仓库 SOP、fieldsUsed、审核员确认提示）
- 所有消息未写「AI 已审核通过」
- 未发现编造 OMS 单号

## 会上不要说的话

- 不要把本目录说成准确率评测或 eval-v0.1 gold
- 不要说 AI 已经审核通过
- 不要说 L2 拦截不上架已可自动执行
- L2 运行时 `mentionRoles` 仍为空；本演示群消息按设计意图写「固定审核员」，不是线上已自动 @ 审核员

