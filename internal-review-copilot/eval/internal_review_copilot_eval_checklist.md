# 内部审核 Copilot：人工评测清单与飞书 Bot 灰度准入

- 日期：2026-09-02（对照 `_runs/20260902_internal_review_dryrun` 实盘重写；同日校正 check-requirement 口径来源）
- 范围：知识库核对、人工金标设计、飞书 Bot 内部灰度准入。不写 jsonl 金标文件。
- 本文件是**人工复评清单**，不是自动评测金标。CASEBOOK / `rules.md` 只解释追问对不对，不自动灌进金标。

对照源：

- 修复前：`_runs/20260902_internal_review_dryrun/`
- 去掉伪槽后：`_runs/20260902_internal_review_dryrun_after_check_requirement_fix/`
- **当前（口径对齐 SOP 模板）**：`_runs/20260902_internal_review_dryrun_after_requirement_source_fix/`

`check-requirement` 是从《非标增值服务SOP模板 及 填写示例》抽象出的 **pre-match 最低可路由门**，不是完整 SOP 校验器，也不是通用需求完整性的权威标准。权威原文：`workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md`。映射说明：`internal-review-copilot/knowledge/requirement-completeness.md`。完整 SOP 校验由后续 scenario card + `check-completeness` + `llm-generate-sop` 承担。未改 `match-template`、未做 3 场景卡、未接飞书 Bot。

## 0. 权威与禁止源

| 资产 | 角色 | 准入时怎么用 |
|------|------|----------------|
| `workspace/knowledge/sop/非标增值服务SOP模板及填写示例.md` | **需求完整性权威**（《非标增值服务SOP模板 及 填写示例》） | SOP 完整栏目：场景概述、客户名称、业务单据、商品SKU、需求背景、操作目的、适用范围、操作步骤、关键输出、异常处理、附件要求。`check-requirement` 只从中抽出 pre-match 最低门，不替代本文件 |
| `internal-review-copilot/knowledge/requirement-completeness.md` | 内部映射（非权威原文） | 说明三槽如何对应 SOP 模板；三槽不是最终完整性标准 |
| `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` | **F-001 主规则** | 场景定义、A 层免追问、B 层 5 个真附件名、两类草稿拆分、禁止自造 fieldKey |
| `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md` | **模拟必填附件**（状态 SIMULATED） | 工程干跑暂用三必填：操作说明附件、商品和标签的对应关系、标签文件。业务未签批前**不能当正式规则**，也不能当 Bot 对审核员的「已确认必填」话术 |
| `workspace/knowledge/cases/f001-inbound-relabel-shelving/rules.md` | 教材 / 人工复评依据 | 8 条规则解释追问对不对。不是自动金标 |
| `workspace/knowledge/cases/f001-inbound-relabel-shelving/CASEBOOK.md` | 教材 / 12 组 7 格对照 | 抽样看 badcase。不是自动金标 |
| `experts/.../prompts/inbound/main.md` | SOP 生成 Prompt | 仅 `sop_generated` 之后才用。当前单块 `sopText`（需求背景 / 操作要求 / 注意事项），与 2.1「需求背景 / 需求描述 / 仓库 SOP」必拆分不一致 |
| `experts/.../prompts/inbound/kb-sop-templates.md` | 旧 38 场景 SOP 模板 | 文件已标 DEPRECATED，**不能当 F-001 权威** |
| `prompts/inbound/kb-template-index.md` | 旧 38 场景索引 | 已废弃，**不能当 F-001 匹配权威** |
| `prompts/inbound/kb-field-requirements.md` | 旧场景 1–23 字段 | 已废弃，**不能当 F-001 附件权威** |

2.1 对评测人最要紧的四条：

1. 上下文层（`eventNo` / `businessOrderNo` / 仓库）有则免追问，缺了是上下文失败，不是对客业务槽。
2. 完整性校验只允许 5 个 OMS 真字段名；禁止自造「数量」「是否补包裹标」「sku_mapping」当 fieldKey。
3. 缺任一「业务已确认必填」附件 → 只追问缺失必填项，不得出两类草稿。
4. 客户确认草稿 ≠ 审核通过。

---

## 1. 16 条待审核样本：建议抽哪几条做人工金标

本批 16 张均为 2026-09-02 待审核 `OW01V1602`，OMS 场景名为空，没有按原子码预判 F-001。本地 mock，未调真实 LLM，未拉实时 OMS。16 条均跑完，无脚本错误、无 `invalid_input`、无 `sop_generated`。

口径校正后（`_runs/20260902_internal_review_dryrun_after_requirement_source_fix`；分流与上一轮修复相同）：

| outputPath | 条数 | 命中节点 | 代表单 |
|------------|------|----------|--------|
| `needs_requirement_clarification` | 0 | — | 已无。`348495` 不再停在 check-requirement |
| `needs_field_clarification` | 1 | check-completeness | `VASC000000348477`（未变） |
| `transfer_human` | 15 | match-template | `VASC000000348495` + 14 条拦截单 `347559` … `347517` |

14 条拦截单（`347559`–`347517`）客户、提交人、正文完全相同，只换 WI。评测上算 **1 个作业 × 14 张单**，不能当成 14 个独立追问用例去凑「5 条以上追问方向正确」。

### 1.1 建议抽 6 条（必抽 2 + 拦截层 3 + 对照 1）

准入要求「人工抽样 5 条以上追问方向正确」。本批有信息量的分流只有 3 层，建议标 **6 条**：2 条特殊单全标，拦截层抽 3 条验一致性，再留 1 条备选对照。不要随机抽。

| 抽序号 | orderNo | 层 | 为什么抽 | 主要测什么 |
|--------|---------|----|----------|------------|
| **G1 必抽** | `VASC000000348495` | `transfer_human`（修复后） | 作业是「入库单晚推送 → 直接扫描上架，第三方箱唛已关联」，不是换标。修复前误追「数量或范围」；修复后过需求门，`failureGate=match-template` | 回归：通用门不再套 F-001；规则 2（先对作业）；规则 3（第三方箱唛） |
| **G2 必抽** | `VASC000000348477` | `needs_field_clarification` | 本批唯一命中 F-001。标签文件已传 `111.png`；按模拟规则追「操作说明附件」「商品和标签的对应关系」。正文写「见附件图片 / 绿标 SKU」 | `match-template` 真阳性；`check-completeness` 是否只报白名单真字段；模拟三必填未签批；规则 4、5（另有 `WI50893267` 未写入上架字段） |
| **G3** | `VASC000000347559` | `transfer_human` | 14 条拦截单的第一条（`WI51408601`，入口 `INBOUND`，无 EB） | 规则 2：拦截不上架不是 F-001；需求已完整应转人工，不追换标附件 |
| **G4** | `VASC000000347538` | `transfer_human` | 同文，WI 段换成 `WI51559985` | 确认换 WI 不会改分流、不会误命中 F-001 |
| **G5** | `VASC000000347517` | `transfer_human` | 14 条最后一张（`WI51560616`） | 与 G3/G4 对照：同作业多单一致性 |
| **G6 备选** | `VASC000000347556` | `transfer_human` | 与 G3 相邻、同客户同文 | 分层不够或 G3 标不清时补；**不要再从剩余 11 条里加码** |

不抽其余 11 条拦截单：加进去不会增加新的追问判断，只会把知识门做成重复计数。

本批没有 `sop_generated`，金标里不要编一条「期望出 SOP」的完成单。SOP 文案质量本批测不到。

CASEBOOK 历史完成单（`333147` / `323364` 等）仍可作教材对照，**不能替代这 16 条工程门，也不能算进本批「5 条追问正确」**。

---

## 2. 每条人工金标要标哪些字段

每条只标人工判断，不抄 dry-run 当答案。

| 字段 | 取值 | 标法 |
|------|------|------|
| `orderNo` | VASC 号 | 原样 |
| `requirementComplete` | `yes` / `no` / `cannot_tell` | 这里的「完整」只表示过了 pre-match 最低可路由门（对象 / 动作 / 背景·目的·去向之一），**不是**权威 SOP 模板 11 栏都齐。审核员能否看懂要干什么即可。**不**因为没写「N 件」就标 no。件数、材料、工具、附件、关键输出、异常处理留给 scenario card / `check-completeness` / SOP 成稿 |
| `requirementMissing` | 自由文本，可空 | 只写业务上真缺的内容（对象、动作、去向、标签种类、可执行对应关系、WI 是否写全）。禁止写自造槽位名。接口没字标「看不出」（规则 8） |
| `isF001` | `yes` / `no` / `unclear` | 是否「辨识后换标再上架」。拦截/直接扫描上架/称重/拍照/寻货/销毁主作业标 `no`（规则 2）。仅原子码 `OW01V1602` 或场景名为空，不够判 yes |
| `attachmentsComplete` | `yes` / `no` / `simulated_only` / `cannot_tell` / `not_applicable` | 对照 2.1 白名单 5 项。非 F-001 标 `not_applicable`，不要按换标三件去判。业务未签批时：可按模拟三件记一列，但必须同时标 `simulated_only`，不得写成正式必填。包裹标作业有「包裹和标签的对应关系」即可，不要因为缺「商品和标签的对应关系」判不齐 |
| `missingAttachmentsOrFields` | 真字段名列表，可空 | 只许这 5 个：`操作说明附件`、`商品和标签的对应关系`、`包裹和标签的对应关系`、`视频拍摄SOP（中文+英文）`、`标签文件`。上下文单号/仓库/「数量或范围」不得出现 |
| `expectedOutputPath` | 见下表 | 人工期望分流，不是 dry-run 实际值 |
| `expectedAsk` | 对审核员/客服的一句话，可空 | 只问 `requirementMissing` 或白名单缺失项。不追问已注入 EB/WI/仓。不承诺审核通过。非 F-001 且需求完整：追问应空，只转人工 |

`expectedOutputPath` 只许：

| 值 | 何时 |
|----|------|
| `needs_requirement_clarification` | 连 pre-match 最低可路由门都过不了，还没到「是不是某场景 / 附件齐不齐」 |
| `transfer_human` | 已过最低可路由门，但不是当前自动模板 F-001 |
| `needs_field_clarification` | 是 F-001，且按**当时有效**的必填附件规则仍缺真附件 |
| `sop_generated` | 是 F-001 且必填附件齐；只表示可以出草稿，不等于审核通过 |
| `invalid_input` | 输入校验失败 |

附加记录（便于复评，不进入自动打分）：

- `dryrunOutputPath` / `dryrunNode` / `dryrunMissing`：对照用
- `askDirectionOk`：`yes` / `no` — 追问方向是否符合 2.1 + 规则 1–8
- `annotatorNote`：规则号（3 标签种类 / 4 对应关系 / 5 WI / 2 不同作业 / 8 看不出）

`askDirectionOk = yes` 的最低标准：没把 A 层单号当业务追问；没自造 fieldKey（含「数量或范围」）；没在非换标作业上追 F-001 三附件；没对「看不出」的扩出单编附件缺口。

### 2.1 建议 6 条的人工预填（供标注人改，不是已落盘金标）

下列取值是对照 2.1 + 规则 1–8 + 本批正文后的**建议答案**。标注人可以改，但改之前先写依据。

#### G1 `VASC000000348495`

| 字段 | 建议值 |
|------|--------|
| `requirementComplete` | `yes` |
| `requirementMissing` | （空）对象=8 个 EB 所列包裹，动作=直接扫描上架，去向=`WI52227487`；「第三方箱唛已关联」已说明不换标 |
| `isF001` | `no`（晚推送导致扫不到入库单，不是辨识后换标） |
| `attachmentsComplete` | `not_applicable` |
| `missingAttachmentsOrFields` | （空） |
| `expectedOutputPath` | `transfer_human` |
| `expectedAsk` | （空）不要问数量或范围，不要按 F-001 补三附件 |
| dry-run 对照（修复前） | `needs_requirement_clarification` / check-requirement / 数量或范围 |
| dry-run 对照（去掉伪槽后） | `transfer_human` / match-template / 无缺失项。`_runs/20260902_internal_review_dryrun_after_check_requirement_fix` |
| dry-run 对照（口径校正后） | 仍为 `transfer_human` / match-template。`_runs/20260902_internal_review_dryrun_after_requirement_source_fix` |
| `askDirectionOk`（对校正后 dry-run） | `yes` |

依据：《非标增值服务SOP模板 及 填写示例》里数量属于适用范围量化，不是所有场景的 pre-match 硬槽；规则 2 先对作业。8 个 EB 已写在需求里，WI 已注入。最低可路由门（对象 / 扫描上架 / 上到该 WI）已够，本单进入 match-template 并转人工。不是 SOP 11 栏已齐。

#### G2 `VASC000000348477`

| 字段 | 建议值 |
|------|--------|
| `requirementComplete` | `yes` |
| `requirementMissing` | 可执行对应关系是否已落到「商品和标签的对应关系」（正文只说绿标 SKU 见附件图，图挂在标签文件）；上架字段只写了 `WI52118288`，上下文另有 `WI50893267`（规则 5，写入 `annotatorNote`，不要自造成 fieldKey） |
| `isF001` | `yes`（撕开覆盖标 → 按露出 SKU 对应商品条码补贴 → 再上架） |
| `attachmentsComplete` | `simulated_only`：标签文件已传；操作说明附件、商品和标签的对应关系未传。**不得写成业务已确认必填** |
| `missingAttachmentsOrFields` | 按模拟规则：`操作说明附件`；`商品和标签的对应关系`。签批前话术必须加「按模拟规则，待业务确认」 |
| `expectedOutputPath` | `needs_field_clarification`（在模拟规则仍有效时） |
| `expectedAsk` | 请上传「操作说明附件」「商品和标签的对应关系」（模拟必填，待业务确认）。已传标签文件不要再要。不要问 EB/仓/`WI52118288` |
| dry-run 对照 | `needs_field_clarification` / check-completeness / 操作说明附件；商品和标签的对应关系 |
| `askDirectionOk`（对 dry-run） | `partial` → 标 `yes` 仅当话术已标明模拟未签批；若对审核员说成「已确认必填」则 `no`。缺项字段名本身落在白名单内 |

依据：模拟规则 §3 三必填；2.1 B.1 同样标明模拟；规则 4 对应关系要落到附件。正文已把操作写得很细，业务若认定「需求描述可替代操作说明附件」，必须先改签批再改节点，评测人不得自行把该项从必填里拿掉。

dry-run `completenessResult.totalRequired = 4`、`providedCount = 2`：除模拟三附件外还把上架单字段算进必填计数。2.1 规定 WI 属 A 层，有则免追问。本条 `missingFields` 没把 WI 问出去，但计数口径与 2.1 不一致，复评时记一笔。

#### G3 / G4 / G5 / G6（拦截不上架，同文）

| 字段 | 建议值 |
|------|--------|
| `requirementComplete` | `yes` |
| `requirementMissing` | （空）对象=该入库单全部包裹，动作=拦截不上架先放一边，去向=暂存/放一边 |
| `isF001` | `no` |
| `attachmentsComplete` | `not_applicable` |
| `missingAttachmentsOrFields` | （空） |
| `expectedOutputPath` | `transfer_human` |
| `expectedAsk` | （空）可提示「当前模板只自动支持 F-001，转人工；可记为后续模板候选」。不要追换标三附件，不要因无 EB 对客追异常单号（入口是 `INBOUND` 不是异常入口；缺 EB 不是对客业务槽） |
| dry-run 对照 | `transfer_human` / match-template / 无缺失项 |
| `askDirectionOk`（对 dry-run） | `yes` |

G3/G4/G5 三张只验证「换 WI 结果不变」。三张 `askDirectionOk` 都 yes，在知识门里只计 **1 个作业正确**，不要计成 3。

---

## 3. 当前 dry-run 能否进入飞书 Bot 内部灰度

**不能。**

| 门 | 准入规则 | 当前事实 | 结论 |
|----|----------|----------|------|
| 工程门 | 16 条无脚本错误，每条有明确分流原因 | 16/16 有 `outputPath`；无脚本错误、无 `invalid_input` | **过** |
| 知识门 | 人工抽样 ≥5 条追问方向正确 | G1 修复后追问方向已对（转人工、不问数量）。诚实抽样仍须含 G1+G2。14 条拦截同文不能拆成 14 次正确。有信息量的作业仍不足 5 类 | **未过** |
| 业务门 | 审核员确认追问不误伤、SOP 不编造、不自动通过 | 附件仍是模拟规则；本批 0 条 `sop_generated`，SOP / `main.md` 未测；审核员未看 | **未过** |

机械套「抽 5 条拦截单都转人工」会让知识门假通过，禁止这样签。

对照建议金标与 dry-run：

| 单号 | dry-run 追问 | 人工期望 | 方向 |
|------|--------------|----------|------|
| `348495` | 修复前：请补充数量或范围。校正后：无追问，转人工 | 已过 pre-match 最低门，转人工，不问数量 | **校正后仍对。** 见 `_runs/20260902_internal_review_dryrun_after_requirement_source_fix`。P0 `check-requirement` 伪槽已去掉，口径已挂到 SOP 模板 |
| `348477` | 操作说明附件；商品和标签的对应关系 | 字段名落在白名单；必须标明模拟未签批 | 字段名可接受；**话术未达业务门**。触发：「附件缺失项不准，先确认业务必填附件并修 check-completeness」 |
| 14 条拦截 | 无追问，转人工 | 无追问，转人工 | 对。说明本批 `match-template` **没有**把拦截单短路成 F-001，也没有只凭 `OW01V1602` 全员命中 |

F-001 命中（修复后）：1 真阳（`348477`）、15 真阴（`348495` + 14 条拦截）。`348495` 已进入 match-template 且未短路成 F-001。**本批不能下「命中不稳定」的结论**。若后续把 `348495` 或拦截单收成换标三附件，再按准入规则修 `match-template`。本次未做 match-template v0.2。

另：本地 dry-run 未调 LLM，`sop_generated` 即使出现也不等于文案可发。`main.md` 与 2.1 两类草稿拆分尚未对齐。

---

## 4. 不能灰度时，必须先修的节点

按用户准入规则排序。本清单只点名，不改代码。

### P0 — `check-requirement`（伪槽已去掉，口径已挂 SOP 模板，2026-09-02）

依据：准入规则「check-requirement 大量误判，先修需求完整性规则」；权威来源《非标增值服务SOP模板 及 填写示例》。本批实证 `VASC000000348495`。

已改 `internal-review-copilot/lib/check-requirement.ts` 与 `knowledge/requirement-completeness.md`（未改线上 Expert 包）：

1. 三槽是 pre-match 最低可路由门，**不是**完整 SOP 完整性权威标准。
2. 不再输出「数量或范围」。文本完全看不出对象时只报「操作对象不清」（例如「帮我处理一下」）。
3. 不再输出「对象对应关系」。对应关系、附件、材料、工具、关键输出、异常处理留给 scenario card / `check-completeness` / `llm-generate-sop`。
4. 最低门只看：处理对象（单据/SKU/商品/包裹/箱/库位/附件上下文）、处理动作、以及需求背景/操作目的/处理去向之一。已绑定的 EB/WI/仓/客户/附件状态不再追问。
5. 回归：`348495` → `match-template` → `transfer_human`。14 条拦截单与 `348477` 分流未变。

当前 dry-run：`_runs/20260902_internal_review_dryrun_after_requirement_source_fix`。本项不再挡住后续多场景扩展的前置门。灰度仍被知识门样本多样性、附件签批、Bot 只读配置挡住。

### P0 — 业务确认必填附件，再谈 `check-completeness`

依据：准入规则「附件缺失项不准，先确认业务必填附件并修 check-completeness」；本批实证 `VASC000000348477`。

1. **先**让业务在模拟表上勾选 5 个白名单里哪些必填，再改节点。签批前 Bot 话术必须标明「按模拟规则，待业务确认」。
2. 缺项只列真字段名；可选两项（包裹对应、视频 SOP）默认不进 `missingFields`，除非需求明确要补包裹标（模拟规则 §3）。
3. `totalRequired` 不要把 A 层 WI / 自造槽算进去。
4. 作业是箱序/包裹标映射时，已传「包裹和标签的对应关系」不应再强追「商品和标签的对应关系」（教材 `333147` / `303444`；本批未出现，修节点时一并带上）。
5. 禁止使用 `kb-field-requirements.md` 旧 1–23 字段。

### P1 — `match-template`（本批未爆，但是 G1 回归门）

依据：准入规则「F-001 命中不稳定，先修 match-template」；规则 2。本批 14 条拦截未误伤，**不是当前挡住灰度的主因**。

修完 P0 后必须验证：

1. 内部审核 dry-run 与运行时节点同一套：只能 F-001 自动通过，其他完整需求 `transfer_human`。
2. 禁止仅凭原子 `OW01V1602` 全量短路成 F-001（会把 `348495`、拦截单、称重/拍照当成换标）。
3. 不得回退到已废弃的 `kb-template-index.md` 38 场景。

若回归后 `348495` 或拦截单被收成 F-001，本项升级为 P0。

### P2 — SOP 草稿质量（本批未挡住灰度的主因，但首期 Bot 若发草稿必须先对齐）

- `main.md` 输出单块 `sopText`，2.1 要求拆成需求背景、需求描述、仓库 SOP。
- `kb-sop-templates.md` 已废弃，不得当 F-001 模板。
- 本地 dry-run 未调 LLM，`sop_generated` 不等于文案可发。本批 0 条到达该节点。

---

## 5. 飞书 Bot 首期：只读建议模式（硬约束）

即使后续工程门/知识门过了，**首期只许只读建议**，否则不能开内部小群。

| 允许 | 禁止 |
|------|------|
| 发内部群消息 | 写 OMS、改增值单字段、上传/替换附件 |
| 列出需求缺失项（自然语言，非自造 fieldKey） | 自动审核通过、自动驳回、改审核状态 |
| 列出白名单内缺失附件（真字段名；模拟规则须标明未签批） | 对客户或仓库承诺时效、费用、标准产品一定能做（规则 6、7） |
| 在门禁通过后发 SOP **草稿** 供审核员参考 | 把客户确认或审核员点「看起来对」当成审核通过 |
| 艾特客服/销售补信息（话术建议） | 在已取消/已终止旧 VASC 上继续填（规则 1） |

建议群消息结构：

1. 单号 / 仓 / EB / WI（只回显已注入值，不问）
2. 分流：`needs_requirement_clarification` \| `transfer_human` \| `needs_field_clarification` \| `sop_generated`
3. 建议追问或建议缺失附件
4. 若有草稿：需求背景、需求描述、仓库 SOP 三块；文末固定句：「此为只读建议，不等于审核通过，最终以审核和仓库可执行为准。」

---

## 6. 准入复检（修完后再勾）

- [x] 16 条 dry-run 目录存在，且无脚本错误（工程门，2026-09-02 已过）
- [x] `check-requirement` 已按 SOP 模板抽出 pre-match 最低可路由门（不是完整 SOP 标准）；不再输出数量/对应关系伪槽；G1 `348495` 仍为 `transfer_human`（`_runs/20260902_internal_review_dryrun_after_requirement_source_fix`）
- [ ] 诚实抽样（G1+G2+拦截作业，不把 14 条同文拆成 14 次）追问方向正确；不足 5 个**不同作业**时，不得用重复单凑数，应再拉一批待审核单或用教材完成单补知识门（教材单仍不能替代工程门）
- [ ] `match-template` 只自动放行真 F-001；`348495` 与拦截单不短路
- [ ] 业务签批必填附件，或 Bot 明确标注仍用模拟规则
- [ ] `check-completeness` 只报白名单真缺项；`totalRequired` 不含 A 层 WI
- [ ] Bot 配置已确认：只发群、不写 OMS、不自动通过

全部勾上之前：**不进入飞书 Bot 内部灰度。**
