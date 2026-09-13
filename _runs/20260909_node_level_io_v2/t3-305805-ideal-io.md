# 【入库】关联第三方商品条码上架 — 节点级理想 I/O：VASC000000305805（自然停在 L2）

> 材料：`traces/VASC000000305805.trace.md`；constructed 旁注：`traces-l4/VASC000000305805.constructed.trace.md`  
> OMS 预期：【入库】关联第三方商品条码上架；自然 `unsupported` @ match-template

## 业务摘要（一句话）

外箱无箱唛登无主货异常，实物有第三方单品码但仓扫描关联失败；客服诉求是**补贴包裹/箱唛后上架到 WI49632155**，审核按无主货找回 + 第三方码语境处理。

---

## ② context-bind

### 当前实际输出（从 trace 抄）
- boundKeys: `[eventNo, businessOrderNo, warehouseCode, customerCode, VAS_ATTR_REL_NWEON, 标签文件]`
- 异常单: `[EB0126060830209943]`
- 入库单: `[WI49632155]`
- 标签文件: uploaded

### 理想输出
- 与实际一致；群聊多次确认 WI49632155、EB0126060830209943。

---

## ③ check-requirement（L1 需求完整度）

### 当前实际输出（从 trace 抄）
- normalizedRequirement: `"暂无标准增值 EB0126060830209943因外箱无箱唛被登记了无主货异常，但是实物有贴单品码，仓库无法扫描识别到，请帮忙补贴包裹上架到WI49632155"`
- objectMatch: `"EB0126060830209943"` | context 兜底 Yes
- actionMatch: `"扫描"`
- purposeMatch: `"EB0126060830209943"` | context 兜底 Yes
- complete: true

### 理想输出
- 应该提取的动作: `["补贴包裹/箱唛", "（关联）第三方单品码", "上架"]`  
  - 「补贴包裹」→ 与 `inbound_package_barcode_batch_relabel` 弱相关，但本单根因是无箱唛 + 第三方单品码识别，主场景仍偏【入库】关联第三方商品条码上架 / 无主货找回  
  - 「单品码 / 第三方」→ 候选 `[inbound_third_party_merchandise_barcode]`（Prompt 1：`关联第三方条码`）  
  - 「上架」→ 共有  
  - 实际 ACTION 抽到「扫描」来自「无法扫描识别」——是否定语境，理想不应当主动作
- complete 应该是: true（对象/去向 WI 齐全）
- 如果 false，应该追问什么？群聊真实追问：为何扫描识别不了、是否操作/系统问题、找货工时、条码是否已绑定仓库——属审核澄清，不是 L1 缺字段

### 差异分析
- 判对：complete=true。
- 判错：主动作抽成「扫描」（来自「无法扫描」），漏「补贴包裹」「第三方单品码」。
- 错误归类：动作提取错（否定/失败描述当正向动作）

---

## ④ match-template（L2 场景匹配）

### 当前实际输出（从 trace 抄）
- querySignals: hasRelabel=true, hasIdentify=false, interceptHold=false, hasPhoto=false, hasShelve=true, hasPackageException=false, hasPhotoHold=false, hasDirectScanShelve=false
- 打分表：

| sceneKey | OMS场景 | 分数 | 命中信号 | 排除信号 |
|----------|---------|------|----------|----------|
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 2 | weak:补贴, weak:上架 | - |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 1 | weak:上架 | - |
| inbound_package_exception_relabel_shelving | 【入库】包裹类异常换商品标签上架 | 1 | weak:上架 | - |
| inbound_photo_hold | 【入库】指定商品拍照暂存 | 0 | - | relabel_then_shelve |
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | 0 | - | - |

> 分数/信号照抄 trace；原 trace 短标签 F-001/A/B 已改写为 OMS 全名。

- decision: unsupported
- decisionPath: `no viable candidates → unsupported`
- outputPath: **transfer_human**（failureGate: match-template）

### 理想输出
- 理想动作约束: `["补贴包裹/箱唛", "第三方单品码", "上架"]` → 候选优先 `[inbound_third_party_merchandise_barcode]`；群聊亦出现「已关联三方条码要补贴包裹码上架」
- 边界备注：正文「补贴包裹」也像【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架，但异常类型是无主货+第三方单品码未识别，OMS/群聊锚定【入库】关联第三方商品条码上架；若只补贴 B 码而不强调第三方关联，可标 ambiguous（`inbound_third_party_merchandise_barcode` vs 无主货找回 §2.9）
- 理想打分排序:

| sceneKey | OMS场景 | 理想分数范围 | 理由 |
|----------|---------|------------|------|
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | ≥7 | 第三方单品码 + 上架 WI；OMS 202506120001；§2.12 |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 低～中 | 仅有「补贴包裹」口语，无批量包裹条码异常 |
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 低 | 无辨识换商品标 |

- 理想 decision: supported（`inbound_third_party_merchandise_barcode`）或 ambiguous（该场景 vs 无主货找回）后人工确认
- 理想 reason: 无箱唛无主货 + 第三方单品码语境下补贴箱唛/关联后上架

### 差异分析
- 当前所有场景 < HIGH，【入库】关联第三方商品条码上架=0。
- 根因：`inbound_third_party_merchandise_barcode` strong（关联第三方商品条码/已关联第三方/直接扫描上架）字面缺失；「单品码」「无主货」「补贴包裹」未进该场景信号表；仅 weak 补贴/上架散落 `inbound_label_identify` / `inbound_package_barcode_batch_relabel` / `inbound_package_exception_relabel_shelving`。

---

## ⑤ check-completeness（L3 附件校验）（未到达）

### 当前实际输出
- **未到达**（match-template 未通过）

### 理想输出（若走到 L3）
- 该场景（【入库】关联第三方商品条码上架）应该检查哪些附件？场景卡 `requiredFieldKeys: []`（pending）；本单已有 LF + WI
- 群聊里审核员追问了: 识别失败原因、找货工时、条码绑定；**通过后**徐丽红提 VASC000000305805 请审核——未因缺 LF 退回（LF 已传 Order (35).pdf）
- pipeline 当前查的: 未到达
- 差异: 理想若 required 为空 → complete=true；若升 LF 为必填，本单已满足

### 附件规则建议
- `inbound_third_party_merchandise_barcode`：样本轮前保持 `requiredFieldKeys=[]` 或软校验 WI；本 case 支持「有 WI +（可选）LF」即可放行
- 可增加业务向校验提示：第三方单品码是否已在系统可查（群聊核心争议），但不一定是 OMS 附件槽

---

## ⑥ generate-text（L4 SOP 生成）（未到达）

### 当前实际
- **未到达** L3/L4。

### constructed 旁注（不冒充自然实际）
- 构造句「请关联第三方商品条码后扫描上架。」插入后：【入库】关联第三方商品条码上架=8 supported → complete → SOP 生成。
- Reflection issues（合理方向）：关联操作不明确、核对标准不清、是否要打印补贴与「补贴包裹」表述冲突、定位无主货方法不清。
- 旁注结论：【入库】关联第三方商品条码上架 **缺的是可命中信号字**；补强后可出 SOP，但 SOP 仍须对齐群聊「只需补贴箱唛」vs「系统关联」两种话术。

### 理想 SOP（从群聊 + §2.12）
> 1. 按 EB0126060830209943 定位无主货暂存区该箱  
> 2. 核对实物第三方单品码（群聊出现 8810B50285994227 等，以实物为准）  
> 3. 补贴包裹/箱唛（标签见附件 Order (35).pdf），使可关联到 WI49632155  
> 4. 扫描上架到 WI49632155  
> 5. 关闭异常单 EB0126060830209943  
> 计费侧：按无主货找回标准审（群聊耿文文口径）；找货工时另估

### Reflection 理想应关注
- 是否写清「补贴箱唛」还是「仅系统关联不贴标」
- 是否编造未在输入中的操作路径占位符
- 是否遗漏关异常 / 目标 WI

---

## 评测启示（供 Prompt 3 使用）

### 客观评测可检查的指标
- outputPath: expected=`sop_generated`（或 `transfer_human` 若坚持 ambiguous） actual=`transfer_human`
- sceneKey: expected=`inbound_third_party_merchandise_barcode` actual=`(none/unsupported)`
- missingFields: expected=`[]` actual=`N/A`
- 动作提取: expected=`["补贴包裹","第三方单品码","上架"]` actual≈`["扫描"]`

### LLM-as-Judge 应关注的维度
- SOP 事实性: EB、WI49632155、无箱唛/无主货、补贴箱唛或关联后上架
- SOP 完整性: 定位无主货 → 处理条码 → 上架 → 关异常
- 场景特有检查: 勿写成库内第三方场景；勿忽略「补贴包裹」与「已关联直接扫」的分歧，应二选一写清

### golden label 建议
```jsonl
{"vascNo":"VASC000000305805","expectedOutputPath":"sop_generated","expectedScene":"inbound_third_party_merchandise_barcode","expectedActions":["补贴包裹","关联第三方单品码","上架"],"expectedMissing":[],"layer":"L2","notes":"natural unsupported at match; constructed L4旁注 only; chat long-form ideal path"}
```
