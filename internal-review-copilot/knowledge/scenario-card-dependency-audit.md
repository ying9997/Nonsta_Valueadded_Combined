# 3 场景卡 + match-template v0.2 依赖盘点

- 日期：2026-09-02
- 范围：只盘点依赖。不实现 scenario cards，不改 `lib/match-template.ts` / `lib/types.ts` / dry-run 脚本。
- 前置已完成：`check-requirement` 是 pre-match 最低可路由门，映射见 `requirement-completeness.md`。权威 SOP 栏目以《非标增值服务SOP模板 及 填写示例》为准。

## 0. 总判断

**是否可进入 2B 实现：`READY_WITH_GAPS`。**

可以做 3 张 scenario card 骨架 + `match-template` v0.2 分流，但：

- F-001 附件规则必须标 **SIMULATED / pending**，不能写成业务已签批必填。
- 场景 A、B 没有独立签批附件表，也没有像 `2.1-inbound-relabel-shelving.md` 那样的运行边界文件；card 里的附件/字段必须标 **pending**，命中后不要按正式必填去拦单。
- 场景 A 与 F-001 边界未签批，v0.2 只能保守分流，不能两者都「高置信自动支持」。
- 本批 16 条 dry-run **没有** 拍照暂存正例；场景 B 的 smoke 只能先用知识库示例 + 近邻反例。

建议状态（给 2B 用，不是运行时已生效）：

| sceneKey | sceneName | 建议状态 | 场景级 2B |
|----------|-----------|----------|-----------|
| `inbound_label_identify` | 【入库】尺重/标签辨识后换标上架 | **supported** | READY_WITH_GAPS |
| `inbound_package_exception_relabel_shelving` | 【入库】包裹类异常换商品标签上架 | **candidate_supported** | READY_WITH_GAPS |
| `inbound_photo_hold` | 【入库】指定商品拍照暂存 | **candidate_supported** | READY_WITH_GAPS |

**建议继续执行 2B**，但首批只许：F-001 自动支持（附件仍模拟）；A/B 可召回、可转 `needs_field_clarification` 或 `transfer_human`，不得把未签批字段写成正式必填。

---

## 1. 候选来源检查

| 路径 | 对三个场景的角色 | 可信度 |
|------|------------------|--------|
| `workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md` | SOP **完整栏目**权威（场景概述…附件要求）。**不是**场景匹配权威，也不含这 3 个 OMS 场景定义 | authority（完整性模板） |
| `workspace/knowledge/sop/库内增值_知识库_SOP模板场景清单.md` | 从新版知识库抽出的**库内**清单。#7「拍摄照片/视频」是库内场景，**不是**「指定商品拍照暂存」。**不能当 A/B/F-001 权威** | deprecated_reference（错范围） |
| `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` | **F-001 主规则**：定义、A 层免追问、5 个 OMS 真附件名、模拟三必填、两类草稿 | authority（仅 F-001） |
| `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` | §2.1 / §2.5 / §2.7 是三场景的**历史审核 SOP 定义 + 模板**。2.1 已沉淀到独立文件；2.5 / 2.7 **没有**同等独立文件 | authority（场景定义/模板原文）；A/B 尚未单独立项 |
| `workspace/knowledge/cases/f001-inbound-relabel-shelving/` | F-001 教材：`rules.md` 8 条、`CASEBOOK.md` 12 组、`index.json` 183 张。**不是**自动金标。第 7/8 组是称重拍照/暂存，作 F-001 与拍照暂存的**反例** | derived（F-001）；B 的近邻反例 |
| `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md` | F-001 附件必填子集，状态 **SIMULATED**，业务未签批 | derived / simulated（仅 F-001） |
| `agent-inventory-assist/03_evaluation/datasets/oms-scene-f001-v0.1/` | F-001 倒查试用集（约 3 通会话 + 183 池）。部分 SOP 含「先不要上架 + 换商品标签」，是 F-001 / A / 拦截的近邻，**不是** A/B 金标 | derived（F-001） |
| `agent-inventory-assist/02_design/PRD-非标增值生成Agent-V1.0.md` §4.2 | 有 `inbound_label_identify`、`inbound_photo_hold` 字段表。**没有** `inbound_package_exception_relabel_shelving`。表内 `sku_mapping` / `photo_requirement` 等是自造 fieldKey，与 2.1「禁止自造 fieldKey」冲突 | derived（产品草案，字段不可当 OMS 校验权威） |
| `agent-inventory-assist/03_evaluation/Agent测试集-V1.0.md` B-006 | 构造/脱敏：`inbound_photo_hold`。可作文案 smoke，**不是**待审核 OMS 真单 | derived |
| `_runs/20260902_internal_review_dryrun_after_requirement_source_fix/` | 16 条 09-02 待审核 `OW01V1602`：1 条 F-001 命中（`348477`）、1 条直接上架转人工（`348495`）、14 条拦截不上架。无拍照暂存正例 | derived（当前工程样本） |
| `experts/.../prompts/inbound/kb-template-index.md` 等旧 38 场景 | 已标 DEPRECATED | **禁止当权威** |

仓库内 **不存在** `inbound_package_exception_relabel_shelving` 这个 sceneKey（本次拟新增）。不存在 `2.5-*.md` / `2.7-*.md` 独立规则文件。

---

## 2. 分场景依赖表

### 2.1 F-001 · `inbound_label_identify`

| 项 | 结论 |
|----|------|
| sceneKey | `inbound_label_identify` |
| sceneName | 【入库】尺重/标签辨识后换标上架 |
| 权威来源是否存在 | **是**（独立 2.1 + 新版 §2.1） |
| 可用来源 | `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md`（主）；新版知识库 §2.1；CASEBOOK / `rules.md`（教材）；`F-001-SIMULATED-BUSINESS-RULES.md`（模拟附件） |
| 来源可信度 | **authority**（场景与校验白名单）；附件勾选 **derived / simulated** |
| 正向识别信号是否足够 | **够做 supported**。辨识后换标再上架；尺重/标签不符；SKU↔商品条码对应；上到指定 WI。OMS 场景码 `20250407004` 可辅助，**不能单独当命中** |
| 反向排除信号是否足够 | **基本够**。`rules.md` 规则 2：称重/拍照不是换标。现网 `match-template` 已排除「拦截 / 不上架 / 先放在一边 / 暂存不上架」和纯称重拍照。缺的是与场景 A 的边界（见 §3） |
| 必填附件/字段是否已业务签批 | **否**。5 个真字段名权威在 2.1；三必填仍是模拟 |
| 是否有真实样本 | **有**。183 张 F-001 种子；CASEBOOK 12 组；oms-scene-f001-v0.1 三通会话；本批 `VASC000000348477` |
| 是否有 smoke case | **有**。正：`348477`（换标上架、已过 pre-match）。反：`348495`（直接扫描上架）、14 条拦截、CASEBOOK 第 7/8 组 |
| 能否进 v0.2 首批支持 | **能**（已是当前唯一自动模板） |
| 风险与缺口 | 附件未签批；`348477` 也可能被理解成「包裹类异常换商品标签」（物流标盖住绿标 SKU），v0.2 必须写清与 A 的优先规则；禁止 `OW01V1602` 短路；禁止用旧 38 场景索引 |

建议状态：**supported**。场景级：READY_WITH_GAPS。

### 2.2 场景 A · `inbound_package_exception_relabel_shelving`

| 项 | 结论 |
|----|------|
| sceneKey | `inbound_package_exception_relabel_shelving`（拟新增，仓库内尚无此 key） |
| sceneName | 【入库】包裹类异常换商品标签上架 |
| 权威来源是否存在 | **有场景定义，无独立运行规则文件** |
| 可用来源 | 新版知识库 **§2.5**（47 条）：定义=「包裹条码正常，商品条码异常」；模板=补包裹标/商品标后上新 WI、关异常单。PRD §4.2 **未列**此 key |
| 来源可信度 | 场景名与短定义 **authority**（新版 §2.5）；运行边界 / 附件勾选 **missing**；与 F-001 边界 **missing** |
| 正向识别信号是否足够 | **勉强够做 candidate**。可用：包裹类异常、包裹条码正常、商品条码异常、换商品标签、上架。模板极短，没有 2.1 那种典型触发列表 |
| 反向排除信号是否足够 | **不够**。2.1 典型触发已含「商品条码与包裹条码不对应」「供应商贴错条码后换商品标签」，与 2.5 重叠。没有业务签批的互斥规则。不能靠「都有换标+上架」区分 |
| 必填附件/字段是否已业务签批 | **否**。无模拟表。不得借用 F-001 三必填当 A 的正式必填，也不得把 PRD 的 `sku_mapping` 写成 fieldKey |
| 是否有真实样本 | **无本目录已标注集**。知识库写 47 条历史，未抽到本项目的 casebook / jsonl。本批 16 条未标此 OMS 场景名（场景名为空）。udesk 分层集里出现过该 OMS 场景名，是客服会话不是待审核金标 |
| 是否有 smoke case | **弱**。可用 §2.5 模板造 1 条正例草稿；`348477` 只能当「A vs F-001 边界待判」，不能当 A 的金标正例。反例：14 条拦截、`348495`、拍照暂存（2.7 示例） |
| 能否进 v0.2 首批支持 | **可以进 card，不宜与 F-001 同级自动放行**。建议 `candidate_supported`：高置信才标 A，模糊则保持 F-001 或 `transfer_human` |
| 风险与缺口 | ① 与 F-001 边界未写清，最可能返工。② 无签批附件。③ 无真实标注样本。④ sceneKey 是新造的，OMS 场景名存在但码表未核。⑤ 本批 `348477` 若改判 A，会动现有 F-001 回归 |

建议状态：**candidate_supported**。场景级：READY_WITH_GAPS。

### 2.3 场景 B · `inbound_photo_hold`

| 项 | 结论 |
|----|------|
| sceneKey | `inbound_photo_hold`（PRD 已用此 key） |
| sceneName | 【入库】指定商品拍照暂存 |
| 权威来源是否存在 | **有场景定义 + 填写示例，无独立 2.7 规则文件、无签批附件** |
| 可用来源 | 新版知识库 **§2.7**（24 条）：定义=「异常包裹需拍照核实后再决定处理方式」；含数字标识、拍照要求、回传命名、暂存区。PRD §4.2 有字段草案。SOP 填写示例「库内库存验证拍照」是**库内**近邻，不是本场景。库内清单 #7「拍摄照片/视频」**不能当权威** |
| 来源可信度 | 场景定义与 SOP 示例 **authority**（新版 §2.7）；PRD 必填字段 **derived**（自造 key，pending）；库内拍照模板 **deprecated_reference** |
| 正向识别信号是否足够 | **够做 candidate**。指定商品/包裹 + 拍照/拍摄 + 暂存/先不要上架/放暂存区 + 回传照片。§2.7 两则示例可抽关键词 |
| 反向排除信号是否足够 | **对 F-001 / 拦截基本够，对「称重拍照」要写死**。必须排除：换标后上架（F-001/A）；「拦截不上架 / 先放一边」且**无拍照要求**（本批 14 条）；CASEBOOK 第 7/8 组称重拍照/暂存（规则 2：不是指定商品拍照暂存）。禁止把「暂存」一词单独当成 B |
| 必填附件/字段是否已业务签批 | **否**。PRD 的 `photo_requirement` / `numbering_rule` 不是 OMS 真字段。2.7 要的是拍照要求、命名、标识——应进 SOP 自然语言，不能当 `missingFields` 正式 fieldKey |
| 是否有真实样本 | **当前 16 条待审核池没有正例**。知识库 24 条未入库为本项目 casebook。B-006 是构造样本。udesk 有「入库拍照暂存」客服对话，未切成内部审核金标 |
| 是否有 smoke case | **有草稿级**。正：§2.7 两则（EB0126032028217574 等，数字标识+外箱照+暂存）。反：14 条拦截（无拍照）、`348477`（换标上架）、CASEBOOK 第 7/8 组 |
| 能否进 v0.2 首批支持 | **能进 card 做分流**，完整性只能 pending。没有本批真单，v0.2 回归必须自带 1 条构造正例 + 14 条拦截反例 |
| 风险与缺口 | ① 易与「拦截暂存」「称重暂存」「库内拍照」合并。② 无签批附件。③ 本批无正例。④ PRD 字段与 2.1 真字段模型冲突。⑤ `match-template` 现把「拍照且无换标」当 weighOnly 排除 F-001，v0.2 要改成「排除 F-001，但可进 B」，否则 B 永远走 `transfer_human` |

建议状态：**candidate_supported**。场景级：READY_WITH_GAPS。

---

## 3. 2B 实现会被卡住的缺口

按影响排序：

1. **F-001 vs 场景 A 边界未签批。** 不写互斥，v0.2 会把 `348477` 这类「撕覆盖标 → 按绿标 SKU 换商品标上架」在两卡之间抖。建议 2B 先写一条 pending 规则：有「尺重/辨识/混 SKU/对应关系附件」优先 F-001；仅当正文明确「包裹条码正常、商品条码异常 / 包裹类异常」且换商品标上架时才标 A；模糊 → F-001 或转人工，不要两卡抢。
2. **A/B 无业务签批附件。** 2B 可列「场景关心哪些 OMS 真字段」，一律 `pending` / `simulated`。不能抄 F-001 三必填到 A，不能把 PRD 自造 key 写入 `check-completeness`。
3. **场景 B 本批无真单。** 2B 必须自带构造正例 + 拦截反例，否则无法证明「不会把 14 条拦截收成拍照暂存」。
4. **现网 `match-template` 只有 F-001 通道。** v0.2 要同时保住：14 条拦截仍 `transfer_human`；`348495` 仍 `transfer_human`；`348477` 仍能进 F-001（或经边界规则显式改判，不能静默漂）。
5. **完整 SOP 11 栏不在 match-template。** 数量、材料、工具、关键输出、异常处理、附件要求仍走 scenario card + `check-completeness` + `llm-generate-sop`。pre-match 三槽保持不动。

不挡 2B 开工、但必须写进 card 的：F-001 模拟三必填继续标明未签批；旧 38 场景文件只许当「禁止源」。

---

## 4. 本期不能做

- 不能把未签批的附件规则写成正式必填。
- 不能用旧 38 场景废弃文件（`kb-template-index.md` / `kb-sop-templates.md` / `kb-field-requirements.md` / 库内场景清单）当权威。
- 不能只凭原子 `OW01V1602` 命中任一场景。
- 不能把「拍照暂存」误合并进 F-001。
- 不能把「拦截不上架 / 先放一边」误命中 F-001，也不能误命中拍照暂存。
- 不能把 CASEBOOK / rules.md 当自动金标。
- 不能把 PRD 自造 fieldKey（`sku_mapping`、`photo_requirement` 等）写成 OMS 校验槽。
- 本轮不改运行时代码、不新增 scenario card 文件。

---

## 5. 若做 2B，建议的最小依赖包

只列 2B 需要读的文件，不在本轮创建 card：

| 场景 | 2B 必读 | 2B 必须标 pending |
|------|---------|-------------------|
| F-001 | `2.1-inbound-relabel-shelving.md`；模拟附件表；`348477` / `348495` / 14 条拦截；`rules.md` 规则 2 | 三必填未签批 |
| A | 新版 §2.5；与 2.1 的对照段；`348477` 作边界待判 | 全部附件/字段；与 F-001 互斥 |
| B | 新版 §2.7 定义+两则示例；本批 14 条拦截作反例；CASEBOOK 第 7/8 组作称重近邻反例 | PRD 拍照字段；本批无正例 |

`check-requirement` 保持通用最低门，不按这 3 张卡提前套附件。

---

## 6. 检索摘记（避免 2B 重复翻）

| 关键词 | 主要落点 | 对 2B 的含义 |
|--------|----------|----------------|
| 包裹类异常 / 换商品标签 / 商品标签上架 | 新版 §2.5；udesk 分层 OMS 场景名；F-001 CASEBOOK 多组也是换商品标 | A 有历史场景名；与 F-001 用语重叠 |
| 指定商品拍照 / 拍照暂存 | 新版 §2.7；PRD `inbound_photo_hold`；B-006；客服 CSV 大量「拍照暂存」常是退货/库内标准产品 | B 有定义；口语「拍照暂存」不等于本场景 |
| 拍摄照片/视频 | 库内清单 #7；PRD `stock_photo_video` | **库内**，不要并进 B |
| 先不要上架 / 暂存 | oms-scene-f001 部分 SOP（先到仓不换标不上架，再换标）；本批 14 条「拦截不上架先放一边」 | 前者可能是 F-001 时序；后者必须转人工，不是 B |
