# 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 — 节点级理想 I/O：VASC000000311652

> 材料：`traces/VASC000000311652.trace.md`、`traces-l4/VASC000000311652.trace.md`、`l4-results.json`、场景卡 `inbound_package_barcode_batch_relabel` / `inbound_package_exception_relabel_shelving`、SOP §2.33 / §2.5  
> OMS 预期：【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架；自然 L4（LLM 因编造单号失败 → `transfer_human`）

## 业务摘要（一句话）

S 码重复异常；客户已切商品化管理，**不换商品标签**，只换箱唛/包裹标签上架到新单 WI50811725；OMS 标【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架，但 pipeline 误判为【入库】包裹类异常换商品标签上架。

---

## ② context-bind

### 当前实际输出（从 trace 抄）
- boundKeys: `[eventNo, businessOrderNo, warehouseCode, customerCode, VAS_ATTR_REL_NWEON, 标签文件]`
- 异常单: `[EB0126070130941754, EB0126070130941397]`
- 入库单: `[WI50444792, WI50811725]`

### 理想输出
- 与实际一致；上架目标应锚定 **WI50811725**（新单），原单 WI50444792 为异常来源语境。

### 差异分析
- bind 正确；后续问题在 match / SOP。

---

## ③ check-requirement（L1 需求完整度）

### 当前实际输出（从 trace 抄）
- normalizedRequirement: `"标准增值不换商品条码异常退回VASC000000310857 WI50444792商品条码异常 EB0126070130941754 EB0126070130941397 S码重复，已修改sku为商品化管理，客户要求不换商品标签，只换箱唛上架到新单WI50811725"`
- objectMatch: `"商品"`（OBJECT_RE）| context 兜底 Yes
- actionMatch: `"上架"`（ACTION_RE）
- purposeMatch: `"退回"`（PURPOSE_RE）| context 兜底 Yes
- complete: true

### 理想输出
- 应该提取的动作: `["换箱唛/补贴包裹标签", "上架"]`  
  - 「换箱唛」→ 候选场景 `[inbound_package_barcode_batch_relabel]`（排斥 `inbound_package_exception_relabel_shelving` / `inbound_label_identify` 的「换商品标签」路径）  
  - 「上架」→ 各入库上架场景共有，不单独定场景  
  - **不应**把「不换商品标签」抽成正向动作「换商品标签」
- complete 应该是: true
- 如果 false，应该追问什么？N/A（群聊追问的是「为何不换 S 码」——业务澄清，非 L1 缺对象/动作）

### 差异分析
- 判对：complete=true；命中「上架」。
- 判错/不足：主动作应是「只换箱唛/包裹标签」，实际只抽到「上架」；对象命中「商品」易把语义导向换商品标。
- 错误归类：动作提取不全 / 否定句未建模（「不换商品标签」）

---

## ④ match-template（L2 场景匹配）

### 当前实际输出（从 trace 抄）
- querySignals: hasRelabel=true, hasIdentify=false, interceptHold=false, hasPhoto=false, hasShelve=true, hasPackageException=true, hasPhotoHold=false, hasDirectScanShelve=false
- 打分表：

| sceneKey | OMS场景 | 分数 | 命中信号 | 排除信号 |
|----------|---------|------|----------|----------|
| inbound_package_exception_relabel_shelving | 【入库】包裹类异常换商品标签上架 | 12 | strong:商品条码异常, strong:换商品标签, weak:商品标签, weak:上架, structural:package_exception+relabel+shelve | - |
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 6 | strong:换商品标签, weak:商品标签, weak:上架, weak:新单 | - |
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 1 | weak:上架 | - |
| inbound_photo_hold | 【入库】指定商品拍照暂存 | 0 | - | relabel_then_shelve |
| inbound_third_party_merchandise_barcode | 【入库】关联第三方商品条码上架 | 0 | - | - |

> 分数/信号照抄 trace；原 trace 短标签 F-001/A/B 已改写为 OMS 全名。

- decision: supported
- decisionPath: `top1=【入库】包裹类异常换商品标签上架(12) ≥ HIGH(7) gap=6 ≥ CLEAR(3) status=supported → supported`（trace 原文 top1=A）

### 理想输出
- 理想动作约束: 动作 `["只换箱唛/补贴包裹标签", "上架"]` + 否定 `不换商品标签` → 候选场景优先 `[inbound_package_barcode_batch_relabel]`；应排除或强降权 `inbound_package_exception_relabel_shelving` / `inbound_label_identify`（二者 strong 含「换商品标签」）
- 若 Prompt 1 动作约束生效：正文含「换箱唛/包裹标签」且明确「不换商品标签」→ `inbound_package_exception_relabel_shelving` / `inbound_label_identify` 不应因 substring「换商品标签」拿 strong；`inbound_package_barcode_batch_relabel` 应收「补贴包裹标签/换箱唛」类信号
- 理想打分排序:

| sceneKey | OMS场景 | 理想分数范围 | 理由 |
|----------|---------|------------|------|
| inbound_package_barcode_batch_relabel | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | ≥7 | 只换箱唛/包裹标上新单；对齐 OMS 与 SOP §2.33 |
| inbound_package_exception_relabel_shelving | 【入库】包裹类异常换商品标签上架 | 0～低 | 客户明确**不换**商品标签；该场景定义是换商品标（§2.5） |
| inbound_label_identify | 【入库】尺重/标签辨识后换标上架 | 0～低 | 无尺重/绿标/混SKU 辨识换商品标主路径 |

- 理想 decision: supported（`inbound_package_barcode_batch_relabel`）
- 理想 reason: 包裹标签置换上架，非商品标签异常换标

### 差异分析
- 当前 vs 理想：【入库】包裹类异常换商品标签上架=12 vs 应低分；【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架=1 vs 应≥7。
- 根因：
  1. **否定未处理**：`不换商品标签` 仍命中 strong `换商品标签`
  2. `商品条码异常` 字面命中【入库】包裹类异常换商品标签上架 strong，但本单实质是 S 码重复后改商品化、改走换包裹标
  3. `inbound_package_barcode_batch_relabel` 缺「换箱唛 / 换包裹标签」命中（正文写「箱唛」非「补贴包裹标签」连续字面）
  4. hasPackageException=true 触发【入库】包裹类异常换商品标签上架的 structural bonus

---

## ⑤ check-completeness（L3 附件校验）

### 当前实际输出
- complete: true
- provided: 2/2
- 缺附件: []（按命中场景【入库】包裹类异常换商品标签上架的策略放行）

### 理想输出
- 该场景（【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架）应该检查哪些附件？场景卡 `requiredFieldKeys: [VAS_ATTR_REL_LF]`；本单标签文件=uploaded，且有 WI → 理想 complete=true
- 群聊里审核员追问了: 为何不换 S 码 / 异常单未关联导致关不掉（流程问题），**未**追问缺标签文件
- pipeline 当前查的: 按【入库】包裹类异常换商品标签上架的 LF+WI 口径，2/2 全齐
- 差异: 附件结论碰巧正确，但建立在错误场景【入库】包裹类异常换商品标签上架上；若纠到 `inbound_package_barcode_batch_relabel`，本单仍应 complete

### 附件规则建议
- `inbound_package_barcode_batch_relabel` `requiredFieldKeys` 建议: `[VAS_ATTR_REL_LF]`，并校验上架 WI（`VAS_ATTR_REL_NWEON`）
- 本 case 额外启示：审核侧应校验**异常单是否关联到增值单**（群聊核心痛点），当前不在 completeness 槽位

---

## ⑥ generate-text（L4 SOP 生成）

### 当前 SOP（从 l4-results / L4 trace）
> （空）  
> llmError / looksInvented: `SOP 编造了输入中没有的单号：VASC000000310857`  
> outputPath: **transfer_human**（failureGate: llm-generate-sop）

> 注：`VASC000000310857` 实际出现在 **customerIntent 原文**（「标准增值…退回VASC000000310857」），安全闸把「背景提及的历史单号」当成编造误杀。

### 理想 SOP（从群聊 + SOP §2.33 提炼）
> 1. 按异常单 EB0126070130941754、EB0126070130941397 定位待处理包裹  
> 2. **不要更换商品标签/S 码**（客户已改商品化管理）  
> 3. 仅更换箱唛/包裹标签，按标签文件贴至可扫描  
> 4. 扫描上架到新入库单 WI50811725  
> 5. 关闭上述异常单（须保证增值单已关联异常单；未关联则无法关单——群聊后续另提 VASC000000316395 仅关异常）

### Reflection 评估
- 当前 Reflection: n/a（SOP 空文本，未进入 Reflection）
- 理想 Reflection 应检出什么？若初稿写成「换商品标签/换 S 码」→ 与「不换商品标签」冲突；若把历史退回单 VASC000000310857 写成**本单操作对象**→ 应提示勿执行该历史单，但不宜仅因原文出现该号就整单判编造失败

### SOP 差异分析
- 编造误报：安全闸误报「编造」历史单号（该号在输入中）
- 遗漏：因空 SOP，未覆盖「只换箱唛、不换商品标、上 WI50811725、关 EB」
- 多写：N/A（无正文）

---

## 评测启示（供 Prompt 3 使用）

### 客观评测可检查的指标
- outputPath: expected=`sop_generated`（场景走通且安全闸不误杀） actual=`transfer_human`
- sceneKey: expected=`inbound_package_barcode_batch_relabel` actual=`inbound_package_exception_relabel_shelving`
- missingFields: expected=`[]` actual=`[]`
- 动作提取: expected=`["换箱唛/补贴包裹标签","上架"]`（且否定「不换商品标签」） actual≈`["上架"]` + 误触发换商品标签信号

### LLM-as-Judge 应关注的维度
- SOP 事实性: 必须含 EB×2、WI50811725、只换箱唛/包裹标、不上换商品标
- SOP 完整性: 至少覆盖定位→换包裹标→上新单→关异常
- 场景特有检查: `inbound_package_barcode_batch_relabel` 应检查是否写了**不换商品标签**约束；是否误写成【入库】包裹类异常换商品标签上架的换商品标步骤

### golden label 建议
```jsonl
{"vascNo":"VASC000000311652","expectedOutputPath":"sop_generated","expectedScene":"inbound_package_barcode_batch_relabel","expectedActions":["补贴包裹标签","上架"],"expectedMissing":[],"layer":"L4","notes":"negation:不换商品标签; safety-gate false positive on VASC000000310857 in intent"}
```
