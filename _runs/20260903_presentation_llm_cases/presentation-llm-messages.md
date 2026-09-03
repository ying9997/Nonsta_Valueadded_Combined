# 内部审核 AI 汇报演示 — 真实 LLM 群聊消息

> 汇报演示材料，**不是**正式准确率评测，**不是** mock 话术。  
> 输入是脱敏假单（`standard-cases.details.json`），无真实客户 PII。  
> 规则 gate 仍由规则链路决定；下面带 **【真实 LLM · claude-sonnet-4-5】** 的正文，是 2026-09-02 当晚经 `https://uslitellm.winit.com/v1` 真实调用返回的。  
> `llm-results.json` 里对应记录为 `mocked: false` / `model: claude-sonnet-4-5`。

## 怎么读这份材料

| 标记 | 含义 | 会上怎么说 |
|---|---|---|
| **【真实 LLM · claude-sonnet-4-5】** | 这次跑通的模型原文 | 「已经接真实模型，不是本地 mock」 |
| **【规则结果，非模型】** | `outputPath` / 停留节点 / 缺失项 / matchResult | 「L1–L3 谁停、停哪一层，仍是规则判的」 |
| **【脚本套壳，非模型】** | L4 群消息标题、处理人、确认提示、边界说明 | 「外壳是演示脚本按规则结果拼的，SOP 正文才是模型写的」 |

| 样例 | 模型生成了什么 | 模型没生成什么 |
|---|---|---|
| L1 | **整条飞书群消息正文** | gate：`needs_requirement_clarification` / 停在 `check-requirement` |
| L2 | **整条飞书群消息正文** | gate：`transfer_human` / `unsupported_intercept_hold` |
| L3 | **整条飞书群消息正文** | gate：`needs_field_clarification` / 缺 3 个附件 |
| L4 | **SOP 草稿全文**（需求背景 / 需求描述 / 仓库 SOP / fieldsUsed） | 群消息外壳；以及「不等于审核通过」这句确认提示 |

---

## L1 需求不完整 · VASC000009901001

**【规则结果，非模型】**

- 停留：`check-requirement` / `needs_requirement_clarification`
- 未进入：`match-template` / 完整性 / SOP
- 缺失：操作对象不清、操作动作不清、需求背景/操作目的/处理去向不清
- LLM 步骤：`im_draft` · 模型：`claude-sonnet-4-5` · `mocked: false`

**【真实 LLM · claude-sonnet-4-5 · 群消息正文】**

```
增值单号
VASC000009901001

当前停留层级
L1 / check-requirement

需求描述 & 需求背景说明
需求描述：请帮忙看一下这单,尽快处理。
需求背景说明：未填写

已提交附件 / 字段摘要
仓库：Demo Warehouse / USDEMO
已提交字段：需求描述
已上传附件：无
未上传附件：操作说明附件、商品和标签的对应关系、包裹和标签的对应关系、视频拍摄SOP(中文+英文)、标签文件

AI 当前判断
需求不完整,停在 L1 / check-requirement。缺失：操作对象不清、操作动作不清、需求背景/操作目的/处理去向不清。未进入 match-template,不生成 SOP。

需要谁处理
客服 / 销售 / 提交人

需要补什么或判断什么
1. 需求里看不出要处理的业务单据、SKU、商品、包裹、箱、库位或附件上下文,请补充处理对象。
2. 需求里看不出要做什么操作,请补充处理动作。
3. 需求里看不出需求背景、操作目的或处理后的去向,请补充为什么做、做到什么结果、或处理后去哪里。

边界说明
AI 不代填事实、不自动审核。本次只做需求完整性检查,需提交人补充完整信息后重新提交。
```

---

## L2 场景不支持（拦截不上架） · VASC000009901002

**【规则结果，非模型】**

- 停留：`match-template` / `transfer_human`
- reason：`unsupported_intercept_hold`（不套 F-001 / A / B）
- 未进入：完整性 / SOP
- LLM 步骤：`im_draft` · 模型：`claude-sonnet-4-5` · `mocked: false`

**【真实 LLM · claude-sonnet-4-5 · 群消息正文】**

```
增值单号
VASC000009901002

当前停留层级
L2 - match-template 节点

需求描述 & 需求背景说明
- 需求描述：入库单 WI59990002 上所有包裹需要拦截不上架，先放在一边。异常单 EB0126099900000002。
- 需求背景说明：客户要求这票货先不要上架。

已提交附件 / 字段摘要
- 仓库：Demo Warehouse / USDEMO
- 上架入库单号：WI59990002
- 异常单：EB0126099900000002
- 已上传附件：无
- 未上传附件：操作说明附件、商品和标签的对应关系、包裹和标签的对应关系、视频拍摄SOP（中文+英文）、标签文件

AI 当前判断
需求描述已完整，但当前模板库只自动支持 F-001。match-template decision=unsupported，reason=unsupported_intercept_hold。停在 L2，不套 F-001/A/B，不生成 SOP，转人工审核并记为后续模板候选。

需要谁处理
固定审核员

需要补什么或判断什么
这是「拦截不上架」场景，目前模板库未覆盖。需要固定审核员人工判断：
1. 是否可以直接操作（入库单 WI59990002 + 异常单 EB0126099900000002 信息是否足够）
2. 是否需要提交人补充操作说明附件或其他材料
3. 后续是否可以沉淀为标准模板

边界说明
AI 不代填事实、不自动审核。本单已由规则链路判定为转人工，最终操作由固定审核员确认后执行。
```

---

## L3 F-001 已识别但附件不齐 · VASC000009901003

**【规则结果，非模型】**

- 停留：`check-completeness` / `needs_field_clarification`
- 已识别：F-001 `inbound_label_identify`
- 缺失附件：操作说明附件、商品和标签的对应关系、标签文件
- 未进入：SOP
- LLM 步骤：`im_draft` · 模型：`claude-sonnet-4-5` · `mocked: false`

**【真实 LLM · claude-sonnet-4-5 · 群消息正文】**

```
增值单号
VASC000009901003

当前停留层级
L3 / check-completeness

需求描述 & 需求背景说明
需求背景说明：到仓后发现商品条码与包裹条码不对应，需按附件辨识办法找到商品后再换标上架。
需求描述：根据异常单 EB0126099900000003 找到包裹。按附件辨识办法（尺重/绿标SKU）找到对应商品后补贴商品条码，上架到新入库单 WI59990003，完成后关闭异常单。

已提交附件 / 字段摘要
- 已填字段：需求背景说明、需求描述、上架入库单号（WI59990003）
- 已上传附件：无
- 关联异常单：EB0126099900000003
- 关联入库单：WI59990003
- 仓库：Demo Warehouse / USDEMO

AI 当前判断
已识别 F-001（【入库】尺重/标签辨识后换标上架），但附件/字段不齐。停在 L3 / check-completeness。缺失：操作说明附件、商品和标签的对应关系、标签文件。不生成 SOP。

需要谁处理
客服 / 销售 / 提交人

需要补什么或判断什么
请补充以下附件后再生成 SOP：
1. 操作说明附件
2. 商品和标签的对应关系
3. 标签文件

边界说明
AI 不代填事实、不自动审核。所有附件和字段需由提交人或相关同事确认后补齐，补齐后系统会重新判断是否可生成 SOP。
```

---

## L4 F-001 信息齐全可出 SOP 草稿 · VASC000009901004

**【规则结果，非模型】**

- 停留：`format-output` / `sop_generated`
- match：F-001 `supported_clear_top1`（score=24）
- 完整性：三份演示附件已齐
- LLM 步骤：`sop_generate` · prompt：`experts/value-add/nonstandard-sop-guide/prompts/inbound/main.md`
- 模型：`claude-sonnet-4-5` · `mocked: false`

### ① 模型原文（请优先展示这一段证明「已跑通真实 LLM」）

**【真实 LLM · claude-sonnet-4-5 · sopText 原文】**

```
【需求背景】
到仓商品条码与包裹条码不对应，需按客户提供的辨识办法（尺重/绿标SKU）找到对应商品后补贴新标签上架。

【操作要求】
1. 根据异常单 EB0126099900000004 找到待处理包裹
2. 按附件「操作说明附件」中的辨识办法（尺重/绿标SKU）确认实物商品
3. 参照「商品和标签的对应关系」找到对应的新商品条码
4. 使用「标签文件」补贴正确的商品条码标签
5. 扫描新标签后使用入库单 WI59990004 上架
6. 完成后关闭异常单 EB0126099900000004

【注意事项】
- 严格按附件辨识办法操作，确保商品与标签匹配准确
- 补贴标签需平整牢固，完全覆盖原错误条码
```

**【真实 LLM · claude-sonnet-4-5 · 结构化字段】**

| 字段 | 来源 | 内容 |
|---|---|---|
| `requirementBackground` | 模型 | 到仓后发现商品条码与包裹条码不对应，需按客户提供的辨识办法（尺重/绿标SKU）找到对应商品后补贴新标签上架到指定入库单。 |
| `requirementDescription` | 模型（基于已提交需求描述整理，未加新单号） | 根据异常单 EB0126099900000004 找到包裹。按附件辨识办法（尺重/绿标SKU）找到对应商品后补贴商品条码，上架到新入库单 WI59990004，完成后关闭异常单。已上传附件：操作说明附件（demo-ops-instruction.pdf）、商品和标签的对应关系（demo-sku-label-mapping.xlsx）、标签文件（demo-label-file.pdf）。 |
| `warehouseSop` | 模型 | 见下 |
| `fieldsUsed` | 模型 | `eventNo`、`VAS_ATTR_REL_NWEON`、`VAS_ATTR_REL_AOOI`、`VAS_ATTR_REL_TCRBCAL`、`VAS_ATTR_REL_LF`、`BEOR`、`VAS_ATTR_REL_RD` |
| `scenarioName` | 模型 | 【入库】尺重/标签辨识后换标上架 |

**【真实 LLM · claude-sonnet-4-5 · warehouseSop】**

```
1. 根据异常单 EB0126099900000004 定位待处理货物；
2. 按客户提供的「操作说明附件」中辨识办法（尺重/绿标SKU）确认实物商品；
3. 参照「商品和标签的对应关系」找到对应的新商品条码；
4. 使用「标签文件」补贴正确的商品条码标签；
5. 使用入库单 WI59990004 扫描上架；
6. 完成后关闭/推进异常单 EB0126099900000004。
```

### ② 群消息外壳（脚本拼的，不是模型）

**【脚本套壳，非模型】** 下面只是把规则结论 + 上面的模型 SOP 拼成一条可发群聊的稿。标题、处理人、确认提示、边界说明不是 Claude 写的。

```
【内部审核协作】增值单 VASC000009901004

当前停留层级：L4 / format-output（信息齐全，已生成 SOP 草稿）

需求背景：
<上面模型 requirementBackground>

需求描述：
<上面模型 requirementDescription>

已提交附件 / 字段摘要：
- 字段：需求背景说明=到仓后发现商品条码与包裹条码不对应，需按附件辨识办法找到商品后再换标上架。；需求描述=根据异常单 EB0126099900000004 找到包裹。按附件辨识办法（尺重/绿标SKU）找到对应商品后补贴商品条码，上架到新入库单 WI59990004，完成后关闭异常单。；上架入库单号=WI59990004
- 附件：操作说明附件（demo-ops-instruction.pdf）、商品和标签的对应关系（demo-sku-label-mapping.xlsx）、标签文件（demo-label-file.pdf）
- 已引用字段 fieldsUsed：eventNo、VAS_ATTR_REL_NWEON、VAS_ATTR_REL_AOOI、VAS_ATTR_REL_TCRBCAL、VAS_ATTR_REL_LF、BEOR、VAS_ATTR_REL_RD

AI 当前判断：已识别 F-001，附件与关键字段齐全，生成仓库 SOP 草稿，提交固定审核员确认。

需要谁处理：固定审核员

需要判断什么：请审核员核对草稿是否与客户已提交事实一致、仓库是否可执行。

仓库 SOP：
<上面模型 warehouseSop>

审核员确认提示：
请固定审核员确认：以上需求背景、需求描述、仓库 SOP 是否可执行。确认只表示认可草稿内容，不等于审核通过。

边界说明：
SOP 草稿供审核确认，不等于审核通过。AI 不代填事实、不自动审核。
```

---

## 和昨天 mock 的差别（会上可对照）

昨天 `_runs/20260902_presentation_standard_cases/` 的 L4 SOP 是本地 `mockGenerateSop`，`mocked: true`，末句是固定模板「本草稿仅供审核确认…」。

今天 L4 的 `sopText` / `warehouseSop` / `requirementBackground` / `requirementDescription` / `fieldsUsed` 来自 `claude-sonnet-4-5`，`mocked: false`。L1–L3 昨天只有规则短句 `messageDraft`；今天这三条完整群消息也是同一次真实模型调用写的。
