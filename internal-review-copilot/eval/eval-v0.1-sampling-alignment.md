# Eval v0.1 抽样计划校准确认

- 日期：2026-09-02
- 性质：抽样口径对齐。**不是**正式样本集，**不是** candidates.jsonl
- 对照：`eval-v0.1-dataset-plan.md`（上一版计划；本文校正其中过松的 gold 口径）
- 本文件不改运行时代码，不落盘正式评测样本

**在这个抽样计划被确认前，不生成正式 `candidates.jsonl`。**

---

## 0. 对上一版计划的校正

上一版 `eval-v0.1-dataset-plan.md` 有一处过松：把 CASEBOOK 第 1 组完成单 `VASC000000333147` 直接标成 `gold`。

按本次原则，校正为：

- CASEBOOK / `rules.md` = **derived**（人工整理教材），**不能**单独当正式 gold，也**不能**计入正式准确率。
- 同一张单若要升 `gold`，必须回到 OMS 事实源，并能看到：**最终状态、人工 SOP、取消/驳回原因或处理结论**。F-001 可回指 `_runs/20260901_oms_facts/`（`pagequery_raw.json` / `va_atoms.json` / `details.json`）。
- extras 里带 A 场景名的已完成单（如 `VASC000000233940`）有 `isAuditThrough=Y` 和短 SOP，但**尚未按 §2.5 定义核验**，且多数 SOP 过短、缺「包裹条码正常 / 商品条码异常」原文。**现在不声称 A 已有 gold。**
- B **没有**已核验的历史通过/取消/驳回 gold。udesk cache 只有场景名命中，未见本项目可用的最终审核字段。**现在不声称 B 已有 gold。**

---

## 1. 我理解的 gold / derived / shadow

### 1.1 gold

正式金标。必须同时满足：

1. 来源只能是历史单，优先这四类：
   - 历史已通过单
   - 历史取消单
   - 历史驳回 / 审核未过单
   - 取消后重开并通过的链路（旧单 + 新单用同一 EB 捆在一起看）
2. 必须能指出**来源路径**，并在该路径看到：
   - 最终状态（如已完成 / 已取消 / 异常终止 / 审核未通过）
   - 人工 SOP（或等价的审核确认作业说明）
   - 取消原因 / 驳回原因 / 处理结论（取消、驳回、终止单尤其要有；通过单至少要有 SOP + 审核通过/完成结论）
3. 场景判定必须能从上述正文和结论读出来，不能只凭 OMS 场景名或原子码。
4. **计入正式准确率**（只评本条已标注的识别层字段）。

当前待审核、客服会话、知识库模板、CASEBOOK 格子，**单独都不构成 gold**。

### 1.2 derived

教材 / 模板 / 规则抽出。可以来自：

- F-001 CASEBOOK、`rules.md`
- SOP 知识库 §2.1 / §2.5 / §2.7 定义与示例
- 人工整理规则、构造/脱敏文案（如 B-006）、v0.2 smoke 文案

用途：把识别规则写清楚，做分流一致性观察。

**不计入正式准确率。** 可另开 derived 报表，不得与 gold 混报「准确率 xx%」。

### 1.3 shadow

观察线上分布、防回归。当前主要是 16 条 09-02 待审核 `OW01V1602`。

用途：看 `check-requirement` / `match-template` / `must_not` 会不会漂。

**不计入正式准确率。** 没有最终审核结论，不能当对错标准。

---

## 2. 当前 16 条待审核单为什么不能当 gold

路径：`_runs/20260902_internal_review_dryrun_after_requirement_source_fix/`  
输入：`_runs/20260902_ow01v1602_review_orders/`

| 事实 | 含义 |
|------|------|
| 16 张都是 2026-09-02 **待审核** | 没有最终审核结论 |
| OMS 场景名为空 | 不能用场景码回标 gold |
| 没有取消 / 驳回原因 | 不满足 gold 的「原因或处理结论」 |
| 没有审核通过后的人工 SOP 定稿 | 只有客户提交正文 + 本地 dry-run 分流 |
| 本地 dry-run 未调真实 LLM、未拉实时 OMS | 工程输出不能当业务金标 |
| 14 条拦截同文 | 最多当 1 个 shadow 作业，不能当 14 个独立标准答案 |

因此 16 条只能是 **shadow / regression guard**：

- `VASC000000348477`：现网命中 F-001、缺模拟附件 → 防「静默改判 A」
- `VASC000000348495`：直接扫描上架 → 防误收 F-001 / A / B
- `VASC000000347559` 代表 14 条拦截 → 防误收 F-001 / B

**不能**把 dry-run 的 `outputPath` 抄成 expected。

---

## 3. 每个 workflow 层级需要什么样本

v0.1 核心是 **3 场景识别层**，不重点评估 SOP 文案质量。

### L1 · `check-requirement`

要测：对象 / 动作 / 去向够不够往下走，该不该追问。

| 需要 | 说明 |
|------|------|
| 缺对象 / 缺动作 / 缺去向 | 应停在 `check-requirement` → `needs_requirement_clarification` |
| 三槽已够、作业却不是三场景 | 应放行到 `match-template`，不要用 F-001 附件槽卡在 L1 |
| 不要从本批 16 条凑 L1 | 口径修复后这 16 条需求门都过了 |

gold 优先：历史审核未过 / 取消、且正文能看出「作业没写清」或「写清了但审没过」的单，并带原因。  
derived 可补：按 SOP 模板三槽反造的残缺句。  
shadow：本批 16 条只证明「现在不会误停 L1」，不计准确率。

### L2 · `match-template`（v0.1 主评）

要测：topK 是否包含正确场景；`supported` / `unsupported` / `ambiguous` / 置信度是否合理。

| 需要 | 说明 |
|------|------|
| 三场景正例 | topK 含正确 `sceneKey` |
| 三场景互斥反例 | F-001 正例 must_not 高置信独占 A/B；反之亦然 |
| 边界例 | 换标+上架分不清 F-001/A；拍照但无暂存；称重拍照 |
| unsupported | 拦截不上架、直接扫描上架 |
| ambiguous | 两边信号都不够，不能强行 `supported` |

不测：SOP 句子好不好、中英是否齐、费用话术。

### L3 · `check-completeness`

要测：命中后附件/字段追问是否越权。v0.1 **不是**附件准确率发布。

| 需要 | 说明 |
|------|------|
| F-001 缺件（若进 L3） | 只允许 2.1 白名单真字段；三必填仍标 **SIMULATED** |
| A/B 正例 | 证明 **不** 套 F-001 三必填，**不** 套 PRD 自造 key |
| 历史取消且能看到缺件/写错种类 | 仅当 OMS 结论能支持「当时缺什么」；接口没字就按规则 8 不编 |

A/B 附件未签批 → L3 不对 A/B 打正式缺件分。

### L4 · SOP generation

v0.1 **不重点评估 SOP 文案质量**。

| 需要 | 说明 |
|------|------|
| 最多 0–2 条通路烟囱 | 只看该不该走到生成节点，不打文案分 |
| 本批 16 条没有 `sop_generated` | 不能从 shadow 抽 L4 金标 |

未点名授权前，L4 可以空着或只留 1 条 derived 通路，不占 gold 名额。

---

## 4. 三个场景分别需要什么样本

### 4.1 F-001 · `inbound_label_identify`

| 格子 | 需要 | 现阶段从哪来 |
|------|------|--------------|
| 正例 | 辨识 / 尺重 / 绿标 / 混 SKU 后换标再上架 | **可抽 gold**：`_runs/20260901_oms_facts/` 已完成且 `isAuditThrough=Y`、原子 `sop` 可读。CASEBOOK 只作 derived 索引 |
| 反例 | 称重拍照、直接上架、拦截不上架 | 称重：CASEBOOK 第 7/8 组 = derived；若回 OMS 事实且 SOP/结论齐全可升 gold。直接上架 / 拦截 = 本批 shadow |
| 边界 | 与 A 都写「换标+上架」 | `348477` = shadow。derived 可造「只写换标上架、无辨识也无包裹类异常」 |
| 取消 / 未过 / 重开 | 标签种类写错取消、审核未过后新号完成 | CASEBOOK 第 1、6 组 = derived 线索。升 gold 必须回 `oms_facts` / 扩查空场景旧单，看到 `cancelReason` / `failReason` / SOP |

F-001 是唯一现在**有条件**出 gold 的场景。池子：183 张，已完成 147、已取消 22、异常终止 13；取消单列表含 `cancelReason`/`failReason`。入集前仍要逐条确认 SOP 够不够判断作业。

### 4.2 场景 A · `inbound_package_exception_relabel_shelving`

| 格子 | 需要 | 现阶段从哪来 |
|------|------|--------------|
| 正例 | 正文明确「包裹条码正常、商品条码异常 / 包裹类异常」+ 换商品标 + 上架 | **现无 gold**。v0.1 只用 §2.5 **derived** |
| 反例 | F-001 辨识换标；只换包裹标盲贴；拦截；拍照暂存 | derived（§2.1 / `301812` 文案）或 shadow 拦截 |
| 边界 | 只有「换商品标签并上架」 | derived 或 shadow `348477`（现网走 F-001，禁止当 A 正例 gold） |

extras 旁证（**不是 gold**）：`_runs/20260901_oms_eb_expand/extras_details.json` 有 6 张 `sceneOverviewCode=20250407008`、已完成、`isAuditThrough=Y`。SOP 过短或未写 §2.5 关键句。**在按 §2.5 核验并确认人工 SOP / 结论之前，不声称 A 已有 gold。**

### 4.3 场景 B · `inbound_photo_hold`

| 格子 | 需要 | 现阶段从哪来 |
|------|------|--------------|
| 正例 | 指定对象 + 拍照核实 + 暂存 / 等客户确认后再处理 | **现无 gold**。v0.1 只用 §2.7 两则 **derived** |
| 反例 | 拦截无拍照；换标上架；称重拍照/称重暂存；库内拍照 | shadow 拦截；CASEBOOK 第 7/8 组 derived；§库内示例 derived |
| 边界 | 有拍照、无暂存/无「客户确认后再处理」 | derived |

udesk cache 的 `297567` / `305556` 等只有场景名，**本缓存未见最终审核状态**。**不声称 B 已有 gold。**

---

## 5. 哪些来源可以直接抽样，哪些只能 derived / shadow

「可以直接抽样」= 允许进入选样池，**不等于已经是 gold**。升 gold 仍要满足 §1.1。

| 来源 | 路径 | 角色 | 现可否标 gold |
|------|------|------|----------------|
| F-001 OMS 事实池 | `_runs/20260901_oms_facts/`（183；含状态、审核、SOP、`cancelReason`/`failReason`） | **可直接抽样**（F-001） | **可以，逐条核验后**。缺 SOP 或原因的取消/终止单不要硬标 |
| F-001 CASEBOOK / rules | `workspace/knowledge/cases/f001-inbound-relabel-shelving/` | **只能 derived** | 否。可当索引，回 OMS 事实再升 gold |
| F-001 倒查会话 | `agent-inventory-assist/03_evaluation/datasets/oms-scene-f001-v0.1/` | **只能 derived** | 否。客服对话不是审核结论 |
| 新版知识库 §2.1 / §2.5 / §2.7 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` | **只能 derived** | 否。模板/示例 |
| 2.1 运行文件 | `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` | **只能 derived** | 否 |
| SOP 栏目模板 | `workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md` | **只能 derived**（L1 残缺句、完整性栏目） | 否。不是场景匹配权威 |
| 库内场景清单 | `workspace/knowledge/sop/库内增值_知识库_SOP模板场景清单.md` | **只能 derived 负例** | 否。错范围 |
| A extras 已完成单 | `_runs/20260901_oms_eb_expand/extras_details.json` | **线索，未核验** | **否**。有终态和短 SOP，未按 §2.5 核验 |
| A/B udesk cache | `_tmp/20260831_oms_f001_expand/udesk_vasc_oms_cache.json` | **只能 derived 线索** | 否。`exactScene=false`，未见审核结论 |
| 09-02 16 条待审核 | `_runs/20260902_internal_review_dryrun_after_requirement_source_fix/` | **只能 shadow** | 否 |
| v0.2 smoke | `eval/match-template-v0.2-smoke-cases.json` | **只能 derived** | 否 |
| B-006 / PRD §4.2 | Agent 测试集 / PRD | **只能 derived** | 否。构造或自造 fieldKey |
| 旧 38 场景索引 | `experts/.../kb-template-index.md` 等 | **禁止抽样** | 否 |

---

## 6. 第一批不超过 20 条时的建议配比

原则：L2 为主；gold 只出在现在能回指 OMS 终态+SOP 的 F-001；A/B 正例全 derived；16 条只占少量 shadow 守卫；L4 不评文案。

建议总数 **18**（预留 2 个空位，确认后再补，不超过 20）：

| 层 | 条数 | gold | derived | shadow | 作用 |
|----|------|------|---------|--------|------|
| L1 | 2 | 0–1（若 F-001 历史未过/取消且正文残缺、原因可见） | 1–2 | 0 | 该不该追问 |
| L2 | **10** | 2–3（F-001 正例 1–2 + F-001 取消/未过 0–1，均来自 `oms_facts` 核验后） | 5–6（A 正 1、B 正 1、A/B 边界 1–2、F-001↔A 边界 derived 1、称重反例 1） | 2（`348477` 边界守卫 + `347559` 拦截守卫） | 识别层主评 |
| L3 | 4 | 0–1（F-001 历史取消且结论能支持缺件/种类，否则不编） | 2–3（F-001 模拟缺件 1；A/B 各 1 条证明不套未签批字段） | 0–1（可复用 `348477` 附件状态，仍 shadow） | 只测越权，不测 A/B 附件准确率 |
| L4 | 0–2 | 0 | 0–2（只看是否走到生成节点） | 0 | 不打 SOP 文案分 |

L2 十格建议（仍是计划，不是已落盘 id）：

1. F-001 正例 · gold（`oms_facts` 已完成 + SOP 可读）
2. F-001 取消或未过 · gold（有 `cancelReason`/`failReason` + SOP 或结论）
3. F-001 正例 · derived（§2.1 或 CASEBOOK 索引，不计入准确率）
4. A 正例 · derived（§2.5）
5. B 正例 · derived（§2.7 示例 1）
6. F-001 ↔ A 边界 · derived（只写换标上架）或 shadow `348477`
7. B 边界 · derived（有拍照无暂存）
8. 称重拍照/暂存 · derived（CASEBOOK 第 8 组）；回 OMS 核验前不升 gold
9. unsupported 拦截 · shadow `347559`（14 条同文只计 1）
10. unsupported 直接上架 · shadow `348495`

**计入正式准确率的，第一批大概只有 2–4 条 F-001 gold。** 其余是 derived 一致性 + shadow 不漂。  
**禁止**为了凑 20 条把 14 条拦截拆开，或把 16 条待审核标成 gold。

---

## 7. 若 A/B 暂时没有 gold，下一步应从 OMS 按什么条件拉

在确认本抽样计划之前，**先不拉、不写 jsonl**。下面只写以后若要补 A/B gold 的条件。

### 共同门槛（入 gold 才用，缺一不可）

1. 最终状态可见：已完成 / 已取消 / 异常终止 / 审核未通过（`status` + `statusDesc` + `isAuditThrough`）。
2. 人工 SOP 可见且足够判断作业（`getVasList.sop` 不是空、不是一句无法判场景的套话）。
3. 取消 / 驳回 / 终止单必须有 `cancelReason` 或 `failReason` 或等价处理结论。
4. 正文或 SOP 能按 evidence 正向信号核验，**不能只凭场景名**。
5. 待审核、进行中、场景名为空、SOP 看不出 → 不入 gold。

### 场景 A

- 列表过滤：`sceneOverviewName = 【入库】包裹类异常换商品标签上架`，或已核码表后的 `sceneOverviewCode`（extras 旁证 `20250407008`，拉前仍要核码表）。
- **不要**只按 `OW01V1602`。
- 状态不过滤（通过 / 取消 / 终止都要）。
- 拉 `pageQuery` + `getVasList`（SOP）+ 如有异常则 `getEventOrder`。
- 人工核验 SOP 必须能读出：包裹条码正常 / 商品条码异常或「包裹类异常」，且作业是换**商品**标签后上架。
- 丢掉：只换包裹标、不用辨识盲贴、辨识/绿标/混 SKU（应归 F-001）、SOP 过短。
- 目标：先核验 1 张通过 + 1 张取消/驳回，再谈 A 的 gold 正/反例。现有 extras 6 张只作回查清单，不自动入 gold。

### 场景 B

- 列表过滤：`sceneOverviewName = 【入库】指定商品拍照暂存`。本轮 extras **未抽出** B 的场景码，**不要猜码**。
- 同样拉全状态 + SOP + 原因字段。
- 人工核验必须同时有：指定对象、拍照/拍摄、暂存或「等客户确认后再处理」。
- 丢掉：拦截无拍照、称重拍照、换标上架、库内拍摄照片/视频、只有「拍照」没有去向。
- 知识库提到的 `VASC000000307116` 可作回查锚点，但单条本身不是 gold，直到拉到终态和 SOP。
- 目标：同样先 1 张通过 + 1 张取消/驳回。cache 会话不入 gold。

### 与 F-001 已有池的关系

- F-001 已有 `_runs/20260901_oms_facts/`，**不必为 v0.1 再全量重拉**。
- 取消后重开链路：通过单在 F-001 池、旧单常是空场景，需要按 EB 扩查。这是补 gold 链路，不是现在写 jsonl 的前提。

---

## 8. 硬约束（再确认）

**在这个抽样计划被确认前，不生成正式 `candidates.jsonl`。**

同时：

- 不把 16 条 09-02 待审核单当 gold。
- 不声称 A/B 已经有 gold。
- 不落盘正式样本集。
- 不改 `internal-review-copilot/lib/**`、`scripts/**`，不改线上 Expert 包。
- 不评 SOP 文案质量作为 v0.1 主指标。

---

## 待确认（确认前不落盘样本）

请确认下面理解是否正确。只确认口径，不视为授权写 jsonl。

1. gold / derived / shadow 三分法，以及「CASEBOOK ≠ gold、16 条 ≠ gold、A/B 现无 gold」。
2. v0.1 主评 L2 识别层；L3 只防越权；L4 不评文案。
3. 第一批 ≤20、建议 18 条、正式准确率只算 2–4 条 F-001 gold 的配比是否可接受。
4. A/B 补 gold 的 OMS 过滤条件（先不执行）。
