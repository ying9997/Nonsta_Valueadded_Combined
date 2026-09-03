# Eval v0.1 计分（不合成总分）

四个维度分开打 0/1，**不要**加权合成一个准确率。  
`gold_status=gold` 才进正式准确率分母。`derived` 另表。`shadow` 只记 pass/fail 回归，不进准确率。

## 1. Tool Selection

节点/工具是否选对。

| 层 | 选对 | 选错 |
|----|------|------|
| L1 | 只走 `check-requirement` | 调用了 `match-template` / `retrieve_sop_kb` / `generate_sop` |
| L2 | 走到 `match-template`，未提前 `generate_sop` | 跳过 match 或直接出 SOP |
| L3 | 走到 `check-completeness`（仅 F-001 已命中且附件策略适用时）；A/B **不应** hard gate | A/B 套 F-001 三必填；或未齐件就 `generate_sop` |
| L4 | 允许出草稿 SOP 时才调用生成 | 信息不足仍生成；或自动审批 |

## 2. Tool Arguments

参数是否正确：`sceneKey`、`missingFields` 是否只用 OMS 真字段名、追问是否点名真附件。

A/B：参数里出现 `sku_mapping` / `photo_requirement` / `numbering_rule` → 本维 0。

## 3. Trajectory

路径/顺序是否等于 `step_order`。

硬规则：L1 不得出现 match 之后的节点；L3 不得 `generate_sop`；L4 不得把「客户确认」写成审核通过。

## 4. Task Completion

最终追问 / 分流 / SOP 是否满足 rubric：`expected_output_path`、`expected_decision`、`expected_topk_contains`、`must_contain` / `must_not_contain`。

**不评** SOP 文案质量、中英是否齐、语气。

## 5. 两个补充开关（单独记，不并进上面四维）

| 开关 | 何时记 1 |
|------|----------|
| `information_withholding` | 信息不足时拒绝生成 SOP（L1 refuse、L3 缺件） |
| `confidence_calibration` | `ambiguous` / `manual_review` / `unsupported` 与 `confidence_expectation` 同向；高置信不得在边界例上强行 unique scene |

## 6. 报表怎么出

- **Gold accuracy**：只算 `ev01-l2-f001-pos-01` 等 gold 条的四维。
- **Derived consistency**：其余 derived 四维，标题必须写 derived。
- **Shadow regression**：16 条相关 shadow 只报「有没有漂」，不报准确率。
