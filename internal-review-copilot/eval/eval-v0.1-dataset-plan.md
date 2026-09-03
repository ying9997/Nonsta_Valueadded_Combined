# 内部审核 Copilot · 3 场景 Eval v0.1 抽样计划

- 日期：2026-09-02
- 范围：F-001 + 场景 A + 场景 B 的**最小**评测集规划（≤20 条）
- 本文件只定抽样逻辑、层级、schema、候选线索。**不写 jsonl，不写脱敏脚本，不改运行时代码**
- 前置：
  - `internal-review-copilot/knowledge/scenario-card-dependency-audit.md`
  - `internal-review-copilot/knowledge/scenario-evidence/inbound-package-exception-relabel-shelving-evidence.md`
  - `internal-review-copilot/knowledge/scenario-evidence/inbound-photo-hold-evidence.md`
  - 已有 F-001 教材 / 倒查集；已有 16 条待审核 dry-run（**shadow only**）

---

## 0. 一句话

v0.1 不是 100 条体系，也不是正式准确率发布。它只回答：

**3 张 scenario cards + `match-template` v0.2 会不会把 F-001 / A / B / 拦截 / 边界分错。**

重点在 **L2**。A/B **没有**完整金标。16 条待审核单**不得**计入准确率。

---

## 1. 规模与层级（上限 20）

建议配比（可在授权落盘时 ±1，总数仍 ≤20）：

| layer | 建议条数 | 测什么 | v0.1 权重 |
|-------|----------|--------|-----------|
| `L1_requirement_incomplete` | 3 | pre-match 最低门：对象 / 动作 / 去向不够，应停在 `check-requirement` | 回归，防伪槽回潮 |
| `L2_template_routing` | **10** | 场景分流：topK、decision、must_not | **主评** |
| `L3_materials_incomplete` | 5 | 命中后附件/字段：只允许已签批或已标明 simulated 的槽；A/B 必须证明**不拦** | 次评 |
| `L4_end_to_end` | 2 | 从需求到 outputPath 的贯通（仍可用 mock SOP） | 烟囱，不扩规模 |

当前 16 条修复后：**0** 条停在 `check-requirement`。因此 L1 不能从这 16 条里凑，必须另造 derived 或缺字段的历史/构造样本。

已有 `eval/match-template-v0.2-smoke-cases.json`（6 条）是 **smoke**，不是本计划的 gold 集；v0.1 正式样本应另建，可复用其文案作 derived。

---

## 2. 为什么 v0.1 重点是 L2

下一步要验收的是 **scenario cards + match-template v0.2**，不是完整 SOP 生成，也不是附件签批。

- L1 已有独立口径（`requirement-completeness.md`），本轮只留 3 条防回潮。
- L3：F-001 三必填仍是 **SIMULATED**；A/B 附件 **pending**。L3 只能测「有没有误用未签批字段」，不能给 A/B 打附件准确率。
- L4：本批 16 条没有 `sop_generated`，没有真实 LLM。2 条够看通路。

L2 必须覆盖：三场景正例、互相反例、F-001↔A / F-001↔B 边界、unsupported、ambiguous。

---

## 3. 三场景配比（落在 20 条之内）

下面是**建议格子**，不是已落盘样本。同一条可以同时承担「某场景反例」。

| 格子 | 建议条数 | 期望 | gold_status 约束 |
|------|----------|------|------------------|
| F-001 正例 | 2 | `expected_scene=inbound_label_identify`；decision=`supported`；可进后续节点 | **至少 1 条 gold**（CASEBOOK 已完成+审核通过）。另 1 条可以是 derived（2.1 示例）或 conversation |
| F-001 反例 | 2 | must_not 含 `inbound_label_identify` | 1 条 gold/casebook（称重第 7/8 组或直接上架）；1 条可以 shadow 拦截（**不计准确率**） |
| F-001 边界例 | 1 | `348477` 或「只写换标上架、无辨识也无包裹类异常」→ ambiguous 或保持 F-001，**禁止静默改 A** | `348477` 只能 **shadow** |
| A 正例 | 2 | topK 含 `inbound_package_exception_relabel_shelving`；card 仍是 candidate，**不得**因此进正式附件校验 | **只许 derived**（§2.5）。历史完成单核验前不得标 gold |
| A 反例 | 1 | 换包裹标盲贴 / 拦截 / F-001 辨识换标 | derived 或 casebook；`301812` 场景名脏，不能当 A 正例 |
| A 边界例 | 1 | 与 F-001 抢「换标+上架」→ `ambiguous` / `manual_review` | derived 或 shadow |
| B 正例 | 2 | topK 含 `inbound_photo_hold`；不得 auto-run 附件 | **只许 derived**（§2.7 两则）。cache 候选核验前不得标 gold |
| B 反例 | 1 | 14 条拦截同文 **或** 称重暂存第 8 组 | 称重组可作 casebook/derived；拦截是 shadow |
| B 边界例 | 1 | 有拍照、无暂存/无「客户确认后再处理」→ ambiguous，must_not F-001 | derived（cache `244686` 文案可改写） |
| unsupported 负例 | 2 | `expected_decision=unsupported`；must_not 三场景 | 1 条直接上架（`348495` shadow）；1 条拦截（shadow，**同一作业只计 1 条**） |
| ambiguous 例子 | 1 | `expected_decision=ambiguous`（可与 A 边界格合并，总数仍 ≤20） | derived |

粗算：2+2+1+2+1+1+2+1+1+2+1 = 16，剩余 4 条给 L1×3 + L4 补位（L3 优先复用 F-001 缺附件的 gold/derived，不另开新作业）。

**禁止：** 把 14 条拦截展开成 14 个独立正/反例；把 16 条全部灌进 v0.1 当 gold。

---

## 4. 数据源等级

| gold_status | 定义 | 本阶段有没有 | 计入准确率 |
|-------------|------|--------------|------------|
| `gold` | 历史已通过单；历史取消 / 驳回 / 审核未过单；取消后重开通过链路（CASEBOOK 用 EB 捆旧新单） | **仅 F-001 有**（CASEBOOK / 183 池）。A/B **没有**已核验 gold | **计入**（只评已标期望的字段） |
| `derived` | casebook 规则抽出、SOP 知识库示例、2.1/§2.5/§2.7 模板、人工整理、B-006 构造 | A/B 正例目前只能走这里 | **可计分流一致性，须单独报表**，不得与 gold 混报准确率 |
| `shadow` | 当前 16 条 09-02 待审核 `OW01V1602` | 1 条 F-001 命中、1 条直接上架、14 条拦截 | **不计入准确率**。只作 regression guard：outputPath / must_not 不能漂 |

补充：

- CASEBOOK / `rules.md` **不是**自动金标；抽进 v0.1 的 F-001 完成/取消对照，要人工标 `gold` 并写清只评 L2/L3 哪几列。
- oms-scene-f001-v0.1 三通会话是客服对话，默认 `derived`（除非锚点 VASC 已在 CASEBOOK 且本条只用 OMS SOP、不用对话金标）。
- extras 里带 A 场景名的已完成单（`233940` 等）：有审批结果，但**尚未核验是否符合 §2.5** → 现阶段仍标 `derived` 或「候选，未入集」。
- udesk cache 的 A/B 命中：`exactScene=false`，默认不是 gold。

---

## 5. Eval v0.1 JSON Schema（本阶段必需项）

一条样本只保留这些字段。不在本阶段发明 100 列。

```json
{
  "id": "eval-v0.1-l2-f001-pos-01",
  "layer": "L1_requirement_incomplete | L2_template_routing | L3_materials_incomplete | L4_end_to_end",
  "source_type": "historical_completed | historical_cancelled | conversation | casebook | shadow_pending | derived_example",
  "source_ref": "path#anchor 或 VASC/EB/sessionKey",
  "gold_status": "gold | derived | shadow",
  "input_message": "评审员/模型看到的需求正文",
  "available_context": {
    "eventNo": "",
    "businessOrderNo": "",
    "warehouseCode": "",
    "attachmentStatus": {},
    "sceneName": "",
    "notes": "有则填，没有留空；禁止伪造 OMS 字段"
  },
  "expected_next_node": "check-requirement | match-template | check-completeness | format-output | transfer_human",
  "expected_output_path": "needs_requirement_clarification | needs_field_clarification | transfer_human | sop_generated | ambiguous_manual_review",
  "expected_scene": "inbound_label_identify | inbound_package_exception_relabel_shelving | inbound_photo_hold | null",
  "expected_topk_contains": ["inbound_label_identify"],
  "expected_decision": "supported | unsupported | ambiguous | manual_review",
  "confidence_expectation": "high | medium | low | any",
  "must_not": ["inbound_photo_hold"],
  "notes": "为什么是这条；gold 只评哪些列"
}
```

字段约定：

- `expected_scene`：高置信唯一场景；分不清时用 `null`，把候选放进 `expected_topk_contains`，`expected_decision=ambiguous`。
- `must_not`：硬排除。14 条拦截必须 `must_not` 含 F-001 与 B。
- A/B 正例即使 `expected_decision=supported`（识别到），`notes` 必须写：**candidate，不得进入正式附件校验**。
- shadow 条：`gold_status=shadow`，评测脚本应跳过 accuracy 分子分母。

本阶段**不**要求：切叶、udesk 全文、脱敏前后对照、LLM 文案打分。

---

## 6. 候选样本（8–10 条，不是完整 JSON）

只列来源和 `gold_status`。授权落盘后再写成 jsonl。

| id（建议） | layer | 格子 | source_ref | source_type | gold_status | 期望要点 |
|------------|-------|------|------------|-------------|-------------|----------|
| `l2-f001-pos-333147` | L2 | F-001 正例 | CASEBOOK 第 1 组新单 `VASC000000333147`；`index.json` role=`G1-pass` | historical_completed / casebook | **gold** | 贴 Winit 包裹条码后上原 WI。topK 含 F-001。must_not A/B 高置信独占 |
| `l2-f001-neg-weigh-218202` | L2 | F-001 反例 + B 反例 | CASEBOOK 第 8 组 `VASC000000218202` | casebook / historical_completed | **gold**（只评「不是 F-001、不是 B」） | 称重+拍秤面后暂存。decision≠supported F-001/B |
| `l2-f001-cancel-332778` | L3 兼 L2 | F-001 材料/标签种类 | CASEBOOK 第 1 组旧单 `VASC000000332778`（已取消） | historical_cancelled | **gold** | 标签种类写成第三方箱唛后取消。L3：种类必须写死。不是 A |
| `l2-a-pos-s25` | L2 | A 正例 | 新版知识库 §2.5 定义+模板 | derived_example | **derived** | 「包裹类异常，包裹条码正常但商品条码异常，换商品标签后上新 WI」。topK 含 A。不得正式附件校验 |
| `l2-a-bound-348477` | L2 / L3 | F-001↔A 边界 | `_runs/20260902_internal_review_dryrun_after_requirement_source_fix` · `VASC000000348477` | shadow_pending | **shadow** | 现网 F-001 + 缺两附件。禁止静默改 A。不计准确率 |
| `l2-b-pos-s27` | L2 | B 正例 | 新版 §2.7 示例 `EB0126032028217574` | derived_example | **derived** | 数字标识+外箱照+暂存区。topK 含 B。must_not F-001/A |
| `l2-b-bound-nopath` | L2 | B 边界 / ambiguous | §2.7 弱化，或 cache `VASC000000244686` 文案（只补拍、无暂存） | derived_example | **derived** | 有拍照、无暂存 → ambiguous。must_not F-001 |
| `l2-unsup-intercept` | L2 | unsupported | 本批 `VASC000000347559`（代表 14 条同文） | shadow_pending | **shadow** | unsupported。must_not F-001 与 B。不计准确率 |
| `l2-unsup-direct-348495` | L2 | unsupported | 本批 `VASC000000348495` 直接扫描上架 | shadow_pending | **shadow** | unsupported。不是换标、不是拍照暂存 |
| `l1-req-incomplete-01` | L1 | 需求不全 | 从 SOP 模板三槽反造：只有「帮我处理一下异常」 | derived_example | **derived** | `expected_next_node=check-requirement`；`needs_requirement_clarification`。16 条里已经没有 L1 |

备用（未计入上表 10 条，授权后可替换，不扩到 20 以外乱加）：

- F-001 conversation：`oms-scene-f001-v0.1` `#h28xxs7z` / `VASC000000260013` → `derived`（或与 CASEBOOK 第 10 组完成单对齐后升 gold）。
- A 历史完成待核验：`extras_details.json` `VASC000000233940`（审核通过）。**核验前不得标 gold**。
- B 会话待核验：cache `VASC000000297567` / `305556`。**核验前不得标 gold**。
- L4：用 2.1 示例走通 F-001（derived）+ 一条 A 或 B derived 只看到 match-template 为止。
- L3 另外 2–3 条：F-001 模拟缺「操作说明附件 / 对应关系」（可 derived 复用 `348477` 的附件状态，但 gold_status 仍是 shadow）；A/B 各 1 条证明 **不** 把 PRD 自造 key 或 F-001 三必填套上去。

---

## 7. 判断

### 7.1 能否与「3 scenario cards + match-template v0.2」并行

**可以并行。**

v0.2 骨架需要的是：三张 card 的 key / 正反向信号 / pending 附件策略 / 保守边界。这些在 dependency-audit 和两份 evidence 里已经够写。Eval v0.1 用 derived 正例 + shadow 回归就能验收分流，不必等 A/B 金标抽完。

并行时约定：

- 先落地 card + v0.2，用已有 6 条 smoke + 本计划 L2 derived/shadow 做门禁。
- **不要**等 20 条 jsonl 写完再改 `match-template`。
- **不要**把并行理解成「A/B 已可正式 auto-run」。

### 7.2 哪些缺口会阻塞正式评测（准确率 / 发布）

1. A **0** 条已核验历史通过 gold，**0** 条取消/驳回 gold。
2. B **0** 条已核验历史通过 gold，**0** 条取消/驳回 gold；本批 16 条也无正例。
3. F-001 ↔ A 边界未签批；`348477` 若两边都当正例会互相打脸。
4. A/B 附件未签批 → L3 不能给 A/B 打「缺件该不该拦」的正式分。
5. 16 条待审核若被算进准确率，数字无效。

未补齐 1–3 之前，对外只许报：**L2 smoke / derived 一致性 + shadow 不漂**，不许报「三场景准确率 xx%」。

### 7.3 哪些缺口不阻塞 v0.2 骨架

- A/B 没有独立 2.5 / 2.7 运行文件。
- A/B 没有签批附件（card 标 pending 即可）。
- B 本批无真单（自带 §2.7 构造正例 + 14 条拦截反例即可）。
- extras / cache 里的历史单尚未核验（骨架用模板句，不依赖这些单）。
- L1 不能从 16 条里取（造 3 条 derived 即可）。
- 不需要 100 条、不需要脱敏脚本、不需要先写 jsonl。

---

## 8. 未授权前不做

按评测协作契约，本文件只到计划。未点名之前禁止：

- 生成 / 修改 eval jsonl、候选 json、金标
- 跑新的 OMS / udesk 探针
- 把 `233940` / `297567` 等直接标成 gold
- 改 `lib/match-template.ts` 或 scenario card 运行逻辑

若继续，需要点名：试点规模（是否就按本表 ≤20）、是否允许把 CASEBOOK `333147` / `218202` / `332778` 写入 v0.1 jsonl、A/B 正例是否接受「全 derived」。
