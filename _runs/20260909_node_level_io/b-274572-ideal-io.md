# B 节点级理想 I/O：VASC000000274572（构造 L4）

> 草稿供用户修改。  
> 材料：`traces-l4/VASC000000274572.constructed.trace.md`、`l4-results.json[2]`、场景卡 `inbound-photo-hold.json`  
> 注意：本条为 Round 2.1 **constructed_from_l3**（对原文追加了「请对指定商品拍照暂存…」信号补强），ideal 需区分「原始客户句」与「构造增强句」。

## 业务摘要（一句话）

大批量退货需按客户要求**逐件拍正反面、分文件夹打包反馈**，拍照后**暂存等客户确认**再处理；审核员追问 SKU/数字标记后，客服指引参考历史同场景单（VASC000000244686）按客户要求拍照反馈，系统侧最终「已处理」。

---

## ② context-bind

### 输入
- customerIntent（构造后）:
  > 大批量退货，需要每个产品补拍正反两面的照片，并分开文件夹打包合并反馈照片  
  > （重复一段 BEOR）  
  > 请对指定商品拍照暂存，等客户确认后再处理，不要直接上架。
- OMS: sceneCode=20250522001；eventNo=EB0126042929137338；businessOrderNo=**空**
- 附件: 操作说明附件=uploaded, 标签文件=uploaded（构造提升）

### 理想输出
- boundKeys: `[eventNo, 操作说明附件, 标签文件]`（有 WI 时应再绑 businessOrderNo；本单群聊/转换无 WI）
- allEventNos: `[EB0126042929137338]`
- allBusinessOrderNos: `[]`（业务上拍照暂存可不绑上架 WI —— 与场景卡「无必填附件/不强制 WI」一致）
- 没绑上但应该有的: 仓库 UKGF、客户 13415367（群聊有，转换缺失）

### 当前实际 vs 理想
- 实际与理想一致：有 EB、无 WI、附件已绑。

---

## ③ check-requirement

### 输入
- customerIntent: 同上（无场景概述名污染）✓

### 理想输出
- 应该提取的动作: `["拍照", "打包/反馈", "暂存"]`
- OBJECT_RE 应命中: `"商品"` / `"产品"`
- ACTION_RE 应命中: `"拍照"` 或 `"打包"`（实际命中「打包」；理想「拍照」更贴切）
- PURPOSE_RE 应命中: `"暂存"` / `"客户确认后再处理"` / `"不要直接上架"`
- complete: **true**
- 群聊额外追问（细则，非 L1 必填）：「每个单品是否同一 SKU？」「要不要数字标记？拆包能否复原？」—— 理想可在澄清槽追问，但本单客服用历史单惯例带过，审核未因缺答退回

### 当前实际 vs 理想
- 实际：OBJECT=商品✓，ACTION=打包✓，PURPOSE=暂存✓，complete=true  
- 差异：ACTION 未点名「拍照」，但 PURPOSE/对象足够；可接受。

---

## ④ match-template

### 输入
- normalizedRequirement: 含「指定商品」「拍照暂存」「客户确认后再处理」「不要直接上架」
- sceneCode=20250522001

### 理想输出
- 信号: hasPhoto=true, hasPhotoHold=true, hasShelve=true（「不要直接上架」语境）, hasRelabel=false, hasIdentify=false
- 理想排序:

| 场景 | 理想分数 | 理由 |
|------|---------|------|
| B | ≥ HIGH(7)，本例实际 18 | strong:指定商品/拍照暂存/客户确认后再处理 + structural |
| A | 低 | 无换商品标签/包裹类异常定义 |
| F-001 | 0 | 排除 weigh_or_photo_without_relabel |

- 理想 decision: **supported** / reason: **supported_clear_top1**

### 当前实际 vs 理想
- 实际 B=18, gap=18, supported_clear_top1 → **与理想一致**  
- 注意：若去掉构造增强句，历史自然句可能只剩「补拍正反面+分文件夹」，是否仍达 B 阈值需另测（本条 ideal 基于**已增强**输入）。

---

## ⑤ check-completeness

### 输入
- sceneKey=`inbound_photo_hold`, supported=true
- requiredFieldKeys=[]（场景卡数据驱动）

### 理想输出
- complete: **true**（无必填附件；群聊也未因缺 LF 退回，而是问拍照细则）
- 群聊追问 ≠ 附件三必填；与 pipeline「0/0 放行」一致

### 当前实际 vs 理想
- 实际 provided 0/0 complete=true → 一致。  
- 构造上传的 LF/操作说明对 B **非必要**；ideal 标注可写 optional。

---

## ⑥ generate-text（SOP 生成）

### 理想 SOP 应包含（群聊 + 场景卡 hints + 客户句）
1. 按异常单 EB0126042929137338 定位退货商品  
2. 按操作说明/拍摄要求，对**每个产品**拍**正反两面**  
3. **分文件夹**整理并打包合并反馈照片  
4. 拍照后**暂存**，**不得直接上架**；等客户确认后再处理  
5. （若审核追问落地）说明是否需**数字标记**、拆包后包装复原注意 —— 群聊未得到客户书面答复，SOP 可写「按客户附件要求；若无数字标记要求则按产品分夹命名」

### 理想 SOP 不应包含
- 编造 WI / SKU 清单  
- 「换标后上架」完整 F-001/A 流程  
- 「审核通过」结论  
- 把构造用的 `VAS_ATTR_REL_LF.constructed.pdf` 写成真实客户标签对应关系（易误导）

### 理想 Reflection
- 若 SOP 把构造附件当成必换标依据 → 应检出  
- 若步骤完整覆盖拍照/分夹/暂存/等确认 → 可 pass

### 当前实际 vs 理想
- 终稿 SOP：定位 → 正反面拍照 → 分夹打包反馈 → 提及标签文件「如需要」→ 暂存等确认 → 推进异常单  
- reflectionPass=**true**, issues=[] → 与理想接近  
- 差异：步骤 4「参考 LF.constructed.pdf 辨识」偏构造痕迹；理想应弱化或删除，避免把 B 写成辨识换标

---

## 标注备注

| 节点 | 建议 gold |
|------|-----------|
| L1 | complete=true |
| L2 | B supported_clear |
| L3 | complete=true（空必填） |
| L4 | 拍照暂存 SOP；禁直接上架；数字标记为可选澄清项 |
| 元数据 | source=constructed；原始句 vs 增强句分开存档 |
