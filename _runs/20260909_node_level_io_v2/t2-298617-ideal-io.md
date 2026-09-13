# 【入库】指定商品拍照暂存 — 节点级理想 I/O：VASC000000298617

> 材料：`traces/VASC000000298617.trace.md`；constructed 旁注：`traces-l4/VASC000000298617.constructed.trace.md`  
> OMS 预期：【入库】指定商品拍照暂存（场景卡 `inbound_photo_hold`）；自然出口 L3

## 业务摘要（一句话）

两异常单各随机抽 1 件拆包装，拍正/后/侧三张实物照，**返回照片后再辨识**；主路径是拍照核实后暂存等待，不是立刻换标上架。

---

## ② context-bind

### 当前实际输出（从 trace 抄）
- boundKeys: `[eventNo, warehouseCode, customerCode, 操作说明附件]`
- 异常单: `[EB0326061230366501, EB0326061230362709]`
- 入库单: `[]`
- 附件：操作说明=uploaded；标签文件=missing

### 理想输出
- EB 绑定正确；本阶段可不要求 WI（拍照暂存，尚未上架）。
- 操作说明附件已有，对齐「按照要求拍」。

### 差异分析
- bind 基本正确；无 WI 对【入库】指定商品拍照暂存场景合理。

---

## ③ check-requirement（L1 需求完整度）

### 当前实际输出（从 trace 抄）
- normalizedRequirement: （需求文本重复拼接两遍）含「随机抽1件…拍正，后，侧面 三张实物照片…返回照片后再进行辨识处理」
- objectMatch: `"EB0326061230366501"` | context 兜底 Yes
- actionMatch: `"辨识"`
- purposeMatch: `"EB0326061230366501"` | context 兜底 Yes
- complete: true

### 理想输出
- 应该提取的动作: `["拍照", "返回照片", "（后续）辨识"]`  
  - 「拍照/拍摄」→ 候选 `[inbound_photo_hold]`  
  - 「返回照片后再辨识」→ 去向是客户确认后再处理；**本单主动作是拍照**，辨识属后续，不应单独把场景锁死 `inbound_label_identify`  
  - Prompt 1：单独「辨识」excludeScenes 含 `inbound_photo_hold` —— 若本单同时有拍照+返回后再处理，应优先拍照暂存映射，避免「辨识」把【入库】指定商品拍照暂存排除
- complete 应该是: true
- 如果 false，应该追问什么？理想可追问：拍照后是否放入暂存区、回传命名规则（群聊对本 VASC 直接讨论较少；§2.7 模板要求数字标识/暂存区）

### 差异分析
- 判对：complete=true。
- 判错：ACTION 命中「辨识」而非「拍照」——主动作提取错位。
- 错误归类：动作提取错（拍照被忽略，辨识被当成主 ACTION）

---

## ④ match-template（L2 场景匹配）

### 当前实际输出（从 trace 抄）
- querySignals: hasRelabel=false, hasIdentify=true, interceptHold=false, hasPhoto=false, hasShelve=false, hasPackageException=false, hasPhotoHold=false, hasDirectScanShelve=false
- 打分表：

| sceneKey | OMS场景 | 分数 | 命中信号 | 排除信号 |
|----------|---------|------|----------|----------|
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 3 | strong:辨识 | - |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 0 | - | - |
| inbound_package_exception_relabel_shelving | 【入库】包裹类异常换商品标签上架 | 0 | - | identify_without_package_exception |
| inbound_photo_hold | 【入库】指定商品拍照暂存 | 0 | - | - |
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | 0 | - | - |

> 分数/信号照抄 trace；原 trace 短标签 F-001/A/B 已改写为 OMS 全名。

- decision: supported
- decisionPath: `top1=【入库】尺重/标签辨识后换标上架(3) single candidate, status=supported, hasIdentify=true → supported`（trace 原文 top1=F-001）

### 理想输出
- 理想动作约束: `["拍照","返回后再辨识"]` → 候选 `[inbound_photo_hold]`；不应因「辨识」二字把【入库】指定商品拍照暂存排除并独占 `inbound_label_identify`
- 理想信号: hasPhoto=true, hasPhotoHold≈true（「返回照片后再…」）, hasIdentify 可作为后续弱信号但 **hasRelabel/hasShelve=false**
- 理想打分排序:

| sceneKey | OMS场景 | 理想分数范围 | 理由 |
|----------|---------|------------|------|
| inbound_photo_hold | 【入库】指定商品拍照暂存 | ≥7 | 指定抽件拍照、回传后再处理；对齐 OMS 与 §2.7 |
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 0～低 | 本单未要求换标上架；「辨识」在拍照之后 |

- 理想 decision: supported（`inbound_photo_hold`）
- 理想 reason: 拍照核实后等待客户，非辨识换标上架

### 差异分析
- 当前 vs 理想：【入库】尺重/标签辨识后换标上架=3 独苗 supported；【入库】指定商品拍照暂存=0。
- 根因：
  1. `hasPhoto=false` —— 「拍正/侧面/实物照片」未进 photo 信号
  2. `hasPhotoHold=false` —— 「返回照片后再」未映射暂存/客户确认
  3. 【入库】指定商品拍照暂存的 strong（指定商品/拍照暂存/暂存区）字面未出现，weak「拍照」也未命中（可能正则要「拍照」连续字，正文是「拍正」）
  4. 「辨识」给 `inbound_label_identify` +3 后走 single-candidate supported 短路

---

## ⑤ check-completeness（L3 附件校验）

### 当前实际输出
- complete: false
- provided: 0/2
- 缺附件: `[标签文件]`
- 缺字段: `[标签文件, 上架入库单号]`
- outputPath: **needs_field_clarification**

### 理想输出
- 该场景（【入库】指定商品拍照暂存）应该检查哪些附件？场景卡 `requiredFieldKeys: []` → 命中后应直接 complete
- 群聊里审核员追问了: 同线程多在谈关联单 298119/298125；对本拍照需求，许晓妍问「客户要干啥」——郭锦萍称 298125 备注错让重提。对**拍照类**，审核侧更关心拍照费与是否真的返回照片，而非标签文件/上架 WI
- pipeline 当前查的: 标签文件 + 上架入库单号（**因为误判【入库】尺重/标签辨识后换标上架**）
- 差异: pipeline **多查了** `inbound_label_identify` 必填（LF + WI）；【入库】指定商品拍照暂存理想不应因缺 WI/LF 卡 L3

### 附件规则建议
- `inbound_photo_hold` `requiredFieldKeys` 维持 `[]`；可选软校验「操作说明附件」（本单已 uploaded）
- 禁止把 `inbound_label_identify` 的 LF/WI 套到【入库】指定商品拍照暂存

---

## ⑥ generate-text（L4 SOP 生成）（未到达）

### 当前实际
- 自然路径未到 L4。

### constructed 旁注（不冒充自然实际）
- 构造输入追加了「请对指定商品拍照暂存…」后，constructed trace：【入库】指定商品拍照暂存=18，complete，SOP 生成成功。
- constructed SOP 要点：定位两 EB → 各抽 1 件拆包 → 正/后/侧三张 → 返回确认、暂存不上架 → 确认后再辨识。
- 说明：**只要【入库】指定商品拍照暂存信号字面补齐，pipeline 可走通**；自然文本缺的是信号词命中，不是业务不可审。

### 理想 SOP（从需求 + §2.7）
> 1. 定位 EB0326061230366501、EB0326061230362709  
> 2. 每单随机抽 1 件，拆除外包装  
> 3. 按操作说明拍正面、后面、侧面共三张实物照片  
> 4. 回传照片；货物放入暂存区，**不得上架**  
> 5. 等客户确认照片后再进行后续辨识（后续另单/另指令）

### Reflection
- 自然：N/A  
- constructed：reflectionPass=true；与理想方向一致（旁注）

---

## 评测启示（供 Prompt 3 使用）

### 客观评测可检查的指标
- outputPath: expected=`sop_generated`（【入库】指定商品拍照暂存无必填附件） actual=`needs_field_clarification`
- sceneKey: expected=`inbound_photo_hold` actual=`inbound_label_identify`
- missingFields: expected=`[]` actual=`["标签文件","上架入库单号"]`
- 动作提取: expected=`["拍照","回传","暂存等待"]` actual≈`["辨识"]`

### LLM-as-Judge 应关注的维度
- SOP 事实性: 两 EB、各抽 1 件、三张角度、回传后再辨识、禁止直接上架
- SOP 完整性: §2.7 建议含暂存区；数字标识本单未要求则可标 optional
- 场景特有检查: 是否误写换标上架；是否写了暂存/等待客户

### golden label 建议
```jsonl
{"vascNo":"VASC000000298617","expectedOutputPath":"sop_generated","expectedScene":"inbound_photo_hold","expectedActions":["拍照","回传照片","暂存"],"expectedMissing":[],"layer":"L3","notes":"natural stuck L3 via wrong inbound_label_identify completeness; constructed L4 is旁注 only"}
```
