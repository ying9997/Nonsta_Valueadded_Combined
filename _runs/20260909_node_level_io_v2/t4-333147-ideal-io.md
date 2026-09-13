# 【入库】尺重/标签辨识后换标上架 — 节点级理想 I/O：VASC000000333147

> 材料：`traces/VASC000000333147.trace.md`、`traces-l4/VASC000000333147.trace.md`、`l4-results.json`、场景卡 `inbound_label_identify`、SOP §2.1  
> OMS 预期：【入库】尺重/标签辨识后换标上架；自然 L4 成功

## 业务摘要（一句话）

工厂覆盖第三方箱唛 → 按外箱装箱单**箱序**辨识 → 依附件对应关系补贴原单 **Winit 包裹条码** ×36 → 上架 WI51547628 → 关 EB；群聊确认贴的是 WINIT 包裹标（非第三方标）。

---

## ② context-bind

### 当前实际输出（从 trace 抄）
- boundKeys: `[eventNo, businessOrderNo, warehouseCode, customerCode, VAS_ATTR_REL_NWEON, 包裹和标签的对应关系, 标签文件]`
- 异常单: `[EB0126080632030982]`
- 入库单: `[WI51547628]`
- 附件：包裹和标签的对应关系=uploaded，标签文件=uploaded

### 理想输出
- 与实际一致；对应关系表 + 标签文件齐全，对齐群聊「第三方包裹标得提供包裹标签」催要后的终态。

---

## ③ check-requirement（L1 需求完整度）

### 当前实际输出（从 trace 抄）
- normalizedRequirement: 含「辨识外箱上的箱序…补贴原单的36个Winit包裹条码标签上架到WI51547628…关闭异常单EB…」
- objectMatch: `"箱唛"` | context 兜底 Yes
- actionMatch: `"扫描"`（来自背景「扫描上架」）
- purposeMatch: `"导致"` | context 兜底 Yes
- complete: true

### 理想输出
- 应该提取的动作: `["辨识(箱序)", "补贴Winit包裹条码标签", "上架", "关闭异常"]`  
  - 「辨识」→ `[inbound_label_identify, inbound_package_barcode_batch_relabel]`  
  - 「补贴…包裹条码标签」→ 偏 `inbound_package_barcode_batch_relabel` 映射，但本单是**按箱序对应表补贴原单 Winit 标**（辨识后换标上架），OMS/群聊锚定【入库】尺重/标签辨识后换标上架；与【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架不同源  
  - 理想：动作约束后仍允许 `inbound_label_identify`（有辨识+对应关系+换标上架），`inbound_package_barcode_batch_relabel` 为竞争候选但 boundary 上【入库】尺重/标签辨识后换标上架更贴「标签辨识后换标」
- complete 应该是: true
- 如果 false，应该追问什么？群聊实际追问：补贴第三方还是 WINIT 包裹标、是否提供标签文件；本单已补齐后审核通过

### 差异分析
- 判对：complete=true；文本含辨识/补贴/上架。
- 不足：ACTION_RE 命中「扫描」而非「辨识/补贴」——靠上下文过关，动作主词提取偏背景句。
- 错误归类：动作提取优先级不佳（次要，未阻断）

---

## ④ match-template（L2 场景匹配）

### 当前实际输出（从 trace 抄）
- querySignals: hasRelabel=true, hasIdentify=true, interceptHold=false, hasPhoto=false, hasShelve=true, hasPackageException=false, hasPhotoHold=false, hasDirectScanShelve=false
- 打分表：

| sceneKey | OMS场景 | 分数 | 命中信号 | 排除信号 |
|----------|---------|------|----------|----------|
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 11 | strong:辨识, weak:补贴, weak:上架, context:oms_scene_f001_assist, structural:identify+relabel+shelve | - |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 2 | weak:上架, weak:关闭异常 | - |
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | 2 | weak:扫描上架, weak:关闭异常 | - |
| inbound_package_exception_relabel_shelving | 【入库】包裹类异常换商品标签上架 | 0 | - | identify_without_package_exception |
| inbound_photo_hold | 【入库】指定商品拍照暂存 | 0 | - | relabel_then_shelve |

> 分数/信号照抄 trace；原 trace 短标签 F-001/A/B 已改写为 OMS 全名。

- decision: supported
- decisionPath: `top1=【入库】尺重/标签辨识后换标上架(11) ≥ HIGH(7) gap=11 ≥ CLEAR(3) status=supported → supported`（trace 原文 top1=F-001）

### 理想输出
- 理想动作约束: `["辨识","补贴包裹条码标签","上架"]` → `inbound_label_identify` 与 `inbound_package_barcode_batch_relabel` 均可能入选；本 case 有箱序对应表 + OMS【入库】尺重/标签辨识后换标上架，理想仍 **`inbound_label_identify` supported**
- **若 Prompt 1 去掉 `oms_scene_f001_assist`(+2)**：分数约 11→9，仍 ≥7，决策大概率不变（本单不依赖该加分才能赢）
- 理想打分排序:

| sceneKey | OMS场景 | 理想分数范围 | 理由 |
|----------|---------|------------|------|
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | ≥7 | 辨识箱序 + 按表换/补贴标签上架；§2.1 |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | <7 或次席 | 有补贴包裹标，但非「包裹条码批量异常需客户处理」典型批量异常叙事 |
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | 低 | 明确贴 WINIT 标，不是已关联第三方后直接扫 |

- 理想 decision: supported（`inbound_label_identify`）
- 理想 reason: 标签辨识后按对应关系补贴 Winit 包裹标上架

### 差异分析
- 当前 vs 理想：场景决策**正确**；分数含 `context:oms_scene_f001_assist` 属 Prompt 1 问题 A，对本单非致命。
- `inbound_package_barcode_batch_relabel` 仅 2 分合理偏低（缺批量异常强信号）。

---

## ⑤ check-completeness（L3 附件校验）

### 当前实际输出
- complete: true
- provided: 2/2
- 缺附件: []

### 理想输出
- 该场景（【入库】尺重/标签辨识后换标上架）应检查: `VAS_ATTR_REL_LF` + 建议 WI；本单另有「包裹和标签的对应关系」uploaded——群聊刚需
- 群聊里审核员追问了: 「第三方包裹标签还没有」→ 催客户提供后才审
- pipeline 当前查的: LF（+WI）2/2
- 差异: pipeline **未强制**「包裹和标签的对应关系」，但本单客户已传；理想可将对应关系表升为 `inbound_label_identify` 在「按箱序/表补贴」子类的建议必填

### 附件规则建议
- `inbound_label_identify` 基线: `[VAS_ATTR_REL_LF]`
- 本 case 子类建议: 若正文含「对应关系/箱序/表格」→ 建议校验包裹-标签对应关系附件（`VAS_ATTR_REL_TCRBCAL` 或实际键名以 OMS 白名单为准）

---

## ⑥ generate-text（L4 SOP 生成）

### 当前 SOP（从 L4 trace / l4-results 抄）
> 【需求背景】  
> 工厂端将第三方箱唛标签覆盖，导致仓库无法正常扫描上架，需按箱序与包裹条码对应关系补贴原单Winit包裹条码标签后上架。  
>  
> 【操作要求】  
> 1. 根据异常单 EB0126080632030982 定位待处理的36个外箱货物；  
> 2. 辨识每个外箱上粘贴的装箱单标签（参考附件 lQLPJxau-Mx4Rg_NAo3NAhCwFU6hfX26oYAKSFU9MGhdAA_528_653.png），识别箱序信息（如1/36、2/36等）；  
> 3. 按附件 WI51547628非标.xlsx 中的对应关系，为每个箱序补贴对应的Winit包裹条码标签（如箱序1补贴条码 B0400000001441165842，标签文件见 WYT包裹条码.pdf）；  
> 4. 补贴完成后，扫描包裹条码上架到入库单 WI51547628；  
> 5. 全部处理完成后，关闭异常单 EB0126080632030982。  
>  
> 【注意事项】  
> - 严格按照箱序与包裹条码对应关系补贴，避免贴错；  
> - 共36个外箱需逐一处理；  
> - 补贴标签需确保条码清晰可扫描。

### 理想 SOP（从群聊 + §2.1）
> 与当前 SOP 高度对齐。群聊额外点：关闭异常可能需另提不收费非标（VASC000000333663）——若系统限制本单无法关 EB，SOP 可注「关异常按仓内流程/或另单」，但**不应编造**未提供的第三方箱唛号。

### Reflection 评估
- 当前: reflectionPass=true, issues=(无)
- 哪些合理？通过合理——SOP 未明显越权。
- 理想 Reflection 还可选检: 是否误写成补贴**第三方**箱唛（前序单 332778 曾混淆）；本单正文已明确 Winit，当前稿正确。

### SOP 差异分析
- 编造: 未见凭空单号；附件名/示例条码来自输入对应关系，可接受
- 遗漏: 群聊「另提关异常增值」属流程旁路，非必须写入本单 SOP
- 多写: 无明显多余

---

## 评测启示（供 Prompt 3 使用）

### 客观评测可检查的指标
- outputPath: expected=`sop_generated` actual=`sop_generated`
- sceneKey: expected=`inbound_label_identify` actual=`inbound_label_identify`
- missingFields: expected=`[]` actual=`[]`
- 动作提取: expected=`["辨识","补贴包裹条码标签","上架","关闭异常"]` actual 信号层 hasIdentify/hasRelabel/hasShelve=true

### LLM-as-Judge 应关注的维度
- SOP 事实性: EB、WI51547628、36 箱、箱序、Winit 包裹标（非第三方）、对应关系表
- SOP 完整性: 辨识箱序→按表补贴→上架→关异常
- 场景特有检查: 禁止写成「直接关联第三方后扫描」；须强调按表补贴 Winit 标

### golden label 建议
```jsonl
{"vascNo":"VASC000000333147","expectedOutputPath":"sop_generated","expectedScene":"inbound_label_identify","expectedActions":["辨识","补贴包裹条码标签","上架","关闭异常"],"expectedMissing":[],"layer":"L4","notes":"good natural L4; oms_scene_f001_assist present but non-decisive"}
```
