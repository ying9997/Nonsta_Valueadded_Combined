# 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 — 节点级理想 I/O：VASC000000315774（L2 场景识别错误）

> 材料：`traces/VASC000000315774.trace.md`、场景卡 `inbound_package_barcode_batch_relabel` / `inbound_label_identify`、SOP §2.33 / §2.1、Prompt 1 动作约束草案  
> OMS / 群聊定性：【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架；pipeline 实际判【入库】尺重/标签辨识后换标上架；出口 L3（缺标签文件）

## 业务摘要（一句话）

14 个异常包裹：按外箱 A+ 包裹标签辨识 SKU → **补贴新入库单 WI50734175 的包裹标签** → 新单上架；典型【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架，被【入库】尺重/标签辨识后换标上架的「辨识」强信号抢走。

---

## ② context-bind

### 当前实际输出（从 trace 抄）
- boundKeys: `[eventNo, businessOrderNo, warehouseCode, customerCode, VAS_ATTR_REL_NWEON]`
- 异常单: `[EB0126060330032532]`
- 入库单: `[WI50734175]`
- 附件：标签文件=**missing**（其余多数 missing）

### 理想输出
- bind 与实际一致；标签文件缺失应在 completeness 暴露（实际也暴露了，但是在错误场景【入库】尺重/标签辨识后换标上架的策略下）。

---

## ③ check-requirement（L1 需求完整度）

### 当前实际输出（从 trace 抄）
- normalizedRequirement: `"外箱上有贴包裹标签的话，可以根据外箱上的商品条码辨识 可根据外箱上的A+ 包裹标签确认SKU ，辨识出：EB0126060330032532，此异常的14个包裹的SKU 。 然后将上述14个包裹，根据辨识结果补贴新入库单WI50734175的包裹标签，在新单上架。确认都是计划内的产品。"`
- objectMatch: `"箱"` | context 兜底 Yes
- actionMatch: `"辨识"`
- purposeMatch: `"EB0126060330032532"` | context 兜底 Yes
- complete: true

### 理想输出
- 应该提取的动作: `["辨识", "补贴包裹标签", "上架"]`  
  - 「辨识」→ 候选场景 `[inbound_label_identify, inbound_package_barcode_batch_relabel]`（Prompt 1 映射；**不能**只绑 `inbound_label_identify`）  
  - 「补贴包裹标签」（原文「补贴新入库单WI50734175的包裹标签」，中间隔字）→ 候选 `[inbound_package_barcode_batch_relabel]`，并应排斥纯商品换标的 `inbound_label_identify` 独占  
  - 「上架」→ 共有
- complete 应该是: true
- 如果 false，应该追问什么？N/A（群聊焦点是新单下单方式、计划外确认，非 L1 缺动作）

### 差异分析
- 判对：抽出「辨识」、complete=true。
- 判错/不足：未抽出「补贴包裹标签」作为独立动作（间隔字导致后续 match 也丢 strong）。
- 错误归类：动作提取不全 / 短语中间隔字

---

## ④ match-template（L2 场景匹配）

### 当前实际输出（从 trace 抄）
- querySignals: hasRelabel=true, hasIdentify=true, interceptHold=false, hasPhoto=false, hasShelve=true, hasPackageException=false, hasPhotoHold=false, hasDirectScanShelve=false
- 打分表：

| sceneKey | OMS场景 | 分数 | 命中信号 | 排除信号 |
|----------|---------|------|----------|----------|
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 12 | strong:辨识, weak:补贴, weak:包裹标签, weak:上架, weak:新单, weak:新入库单, structural:identify+relabel+shelve | - |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 1 | weak:上架 | - |
| inbound_package_exception_relabel_shelving | 【入库】包裹类异常换商品标签上架 | 0 | - | identify_without_package_exception |
| inbound_photo_hold | 【入库】指定商品拍照暂存 | 0 | - | relabel_then_shelve |
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | 0 | - | - |

> 分数/信号照抄 trace；原 trace 短标签 F-001/A/B 已改写为 OMS 全名。

- decision: supported
- decisionPath: `top1=【入库】尺重/标签辨识后换标上架(12) ≥ HIGH(7) gap=12 ≥ CLEAR(3) status=supported → supported`（trace 原文 top1=F-001）

### 理想输出
- 理想动作约束: `["辨识","补贴包裹标签"]` → 候选场景优先 `[inbound_package_barcode_batch_relabel]`（boundary：辨识+包裹标签 → `inbound_package_barcode_batch_relabel`；非辨识+商品标签/换标 → `inbound_label_identify`）
- **标注：若 Prompt 1 动作约束已生效**  
  1. 「辨识」不再只给 `inbound_label_identify` +3，`inbound_package_barcode_batch_relabel` 也可收「辨识」  
  2. 「补贴.*包裹标签」正则命中 → `inbound_package_barcode_batch_relabel` 入候选、`inbound_label_identify` 可被 excludeScenes 降权  
  3. 去掉 `taggedF001` OMS 加分（本单 OMS 本就是 `inbound_package_barcode_batch_relabel`，assist 未必触发；主因仍是 strong:辨识）  
  → 预期 top1 应从【入库】尺重/标签辨识后换标上架翻转为【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架（或至少 gap 缩小到 ambiguous 可人工）
- 理想打分排序:

| sceneKey | OMS场景 | 理想分数范围 | 理由 |
|----------|---------|------------|------|
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | ≥7 | 辨识 + 补贴新单包裹标签 + 上架；14 个异常包裹；SOP §2.33 |
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | <7 | 无商品标签/换商品标主诉求；「包裹标签」是补贴对象不是尺重换商品标 |

- 理想 decision: supported（`inbound_package_barcode_batch_relabel`）
- 理想 reason: 包裹条码异常批量处理路径，非【入库】尺重/标签辨识后换标上架商品换标

### 差异分析
- 当前 vs 理想：【入库】尺重/标签辨识后换标上架=12 vs 应<7；【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架=1 vs 应≥7。
- 根因：
  1. 「辨识」strong 只进 `inbound_label_identify`（+3）+ structural identify+relabel+shelve
  2. `inbound_package_barcode_batch_relabel` strong「补贴包裹标签」因中间插入「新入库单WI50734175的」未命中
  3. `inbound_package_barcode_batch_relabel` 仅 weak:上架 → 1 分
  4. hasPackageException=false（正文无「包裹条码批量异常」字面）进一步削弱该场景

---

## ⑤ check-completeness（L3 附件校验）

### 当前实际输出
- complete: false
- provided: 1/2
- 缺附件: `[标签文件]`
- missing: `[标签文件]`
- outputPath: **needs_field_clarification**

### 理想输出
- 该场景（【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架）应该检查哪些附件？`VAS_ATTR_REL_LF`（标签文件）+ 上架 WI（已有）
- 群聊里审核员追问了: 主要是新单是否按 SKU/包裹正确下单、是否计划外、仓库如何对照；**本单审核时**吴秋生称已跟仓库说清，耿文文已审核——群聊未强调「必须先传标签 PDF」作为唯一卡点
- pipeline 当前查的: `[标签文件]`（在错误场景【入库】尺重/标签辨识后换标上架策略下）
- 差异: 「缺标签文件」对该场景仍合理（场景卡 LF 必填）；但若业务用「系统打包裹标」可不传文件，需样本轮确认。本 case 理想仍建议 missing=`[标签文件]` 或在有 WI+辨识方法时降为软提示

### 附件规则建议
- `inbound_package_barcode_batch_relabel` `requiredFieldKeys` 建议保留: `[VAS_ATTR_REL_LF]`
- 本 case 可并列建议校验: 批量包裹数量（14）是否在需求中写清（已写）

---

## ⑥ generate-text（L4 SOP 生成）（未到达）

### 当前实际
- 自然路径未到 L4（停在 L3）。无本单自然 SOP。

### 理想 SOP（若走到 L4；对齐群聊 + §2.33）
> 1. 定位异常单 EB0126060330032532 的 **14** 个异常包裹  
> 2. 根据外箱上 A+ 包裹标签确认/辨识各包裹 SKU  
> 3. 确认均为计划内产品  
> 4. 按辨识结果补贴新入库单 WI50734175 的包裹标签（标签文件，若有）  
> 5. 在新单 WI50734175 上架  
> 6. 关闭异常单

### Reflection / 差异
- N/A（未到 L4）。旁注：同异常链路的 VASC000000311505 L4 有完整 SOP+Reflection，可作构造样本参考，**不冒充本单自然实际**。

---

## 评测启示（供 Prompt 3 使用）

### 客观评测可检查的指标
- outputPath: expected=`needs_field_clarification`（若坚持 LF 必填）或 `sop_generated`（若业务确认可无 LF） actual=`needs_field_clarification`
- sceneKey: expected=`inbound_package_barcode_batch_relabel` actual=`inbound_label_identify`
- missingFields: expected=`["标签文件"]` actual=`["标签文件"]`
- 动作提取: expected=`["辨识","补贴包裹标签","上架"]` actual≈`["辨识"]`（match 层）

### LLM-as-Judge 应关注的维度
- SOP 事实性: 14 包裹、外箱 A+ 辨识、补贴 WI50734175 包裹标、新单上架、关 EB
- SOP 完整性: 须含批量数量与辨识方法（外箱 A+ 标签）
- 场景特有检查: 是否误写成换**商品**标签；是否漏写「补贴包裹标签」

### golden label 建议
```jsonl
{"vascNo":"VASC000000315774","expectedOutputPath":"needs_field_clarification","expectedScene":"inbound_package_barcode_batch_relabel","expectedActions":["辨识","补贴包裹标签","上架"],"expectedMissing":["标签文件"],"layer":"L3","notes":"actual scene wrongly inbound_label_identify; Prompt1 action-constraint expected to flip to inbound_package_barcode_batch_relabel"}
```
