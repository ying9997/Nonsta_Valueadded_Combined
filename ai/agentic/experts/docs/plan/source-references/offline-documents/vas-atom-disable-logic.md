# 万邑联增值下单 — 原子不可选/隐藏/置灰逻辑全览

> 覆盖范围：入库增值、库内增值、出库增值  
> 来源：代码直接读取验证，非推测  
> 文件：seller 前端 + oms2/order-vas 后端

---

## 整体机制说明

```
前端渲染原子列表
  ↓
【前端层1】hiddenVasCodes 列表过滤（直接不渲染）
  ↓
【前端层2】条件置灰（上架方式、单据来源、SKU类型等）
  ↓
【后端层】AtomDisableCmdExe 五层校验 → 返回 isDisable/isShow/disableReason
  ├─ 非标VASC操作对象类型校验
  ├─ 标准VASC包裹支持度校验
  ├─ VaAtomDisableHandler（13个实现类）
  └─ 操作对象范围校验（商品维度 vs 包裹维度互斥）
  ↓
【前端层3】根据后端返回 isDisable=Y → disabled=true，显示 disableReason tooltip
```

---

## 一、入库增值原子限制

### OW01V1708 — 不贴标直接上架

**后端**：`InboundNoSkuLabelShelveDisableHandler`

| 条件 | 结果 |
|------|------|
| 非异常单入口（`!vaOrder.isEventVa()`） | 禁用 |
| shelveWay 不是 `USE_ORIGIN_INBOUND_ORDER` 且不是 `INBOUND_ORDER_OF_CUSTOMER` | 禁用 |
| shelveWay=`USE_ORIGIN_INBOUND_ORDER` 但业务类型非 INBOUND 或入库单号为空 | 禁用 |

**前端联动**（`ProductStep.tsx:718-722`）：上架方式选 `USE_ORIGIN_INBOUND_ORDER` 时，属性 `VAS_ATTR_REL_WRN` 自动填入入库单号并置灰

---

### OW01V1560 — 补贴包裹条码

**后端**：`InboundSupplementPkgLabelDisableHandler`

| 条件 | 结果 |
|------|------|
| shelveWay=`USE_NEW_INBOUND_ORDER` | 禁用 |

**前端**（`ProductStep.tsx:783-786`）：新单上架时前端也同步置灰，不能手动勾选

**自动勾选联动**（`vasCheckLogic()`）：新单上架时，若已选 OW01V1558 / OW01V1559 / OW01V1572 任一，系统自动勾选 OW01V1560，且其文件字段 `OTHER_LABEL` 改为非必填

---

### OW01V1558 — 补贴原 SKU 条码（入库）

**后端**：`InboundSupplementMerLabelDisableHandler`

| 条件 | 结果 |
|------|------|
| 无 MERCHANDISE 类型商品 | 禁用 |
| 任意商品条码为空 | 禁用 |
| 异常来源 + `USE_ORIGIN_INBOUND_ORDER` + 商品不在原入库单中 | 禁用 |

**前端文件字段联动**（`vasConfig.tsx`）：
- `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY≠CUSTOMER` → 显示"上传标签对应关系"（OTHER_LABEL）
- `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY=CUSTOMER` → 显示另一份"标签对应关系"（LABEL_FILE_MERCHANDISE_REL_FILE）
- `GEN_WAY=CUSTOMER` → 显示"上传第三方商品条码标签文件"

---

### OW01V1559 — 更换新 SKU 条码（入库）

无后端 DisableHandler，无置灰条件。

**前端文件字段联动**（`vasConfig.tsx`，逻辑与 OW01V1558 镜像）：
- `GEN_WAY≠CUSTOMER` → 显示"上传标签对应关系"（OTHER_LABEL）
- `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY=CUSTOMER` → 显示 LABEL_FILE_MERCHANDISE_REL_FILE
- `GEN_WAY=CUSTOMER` → 显示"上传第三方商品条码标签文件"

---

### OW01V1572 — 关联第三方条码

**后端**：`InboundAssociatedThirdPartySernoDisableHandler`

| 条件 | 结果 |
|------|------|
| 无 MERCHANDISE 类型商品 | 禁用 |
| 非异常单入口 OR 任意商品第三方条码为空 | 禁用 |

**前端 disabledTooltip**（`vasConfig.tsx:376-389`）：
- 异常单入口但商品未登记第三方条码 → "异常信息未登记第三方商品条码，无法选择该增值"
- 入库单入口 → "该原子仅支持异常单入口下发!"

---

### OW01V1736 — 补贴包裹覆盖标签

**后端**：`InboundPackageCoverLabelDisableHandler`

| 入口 | 条件 | 结果 |
|------|------|------|
| 下单列表入口 | 无 PACKAGE 类型商品 | 禁用 |
| 下单列表入口 | 任意包裹等级不是 A 且不是 A+ | 禁用 |
| 下单入口 | PSC 偏好匹配规则不匹配 | 禁用 |

---

### OW01V1745 — 采集 A+ 包裹序列号

**后端**：`InboundPackageCollectionSnDisableHandler`

**无 vaOrder 场景（仅有入库单号）**：

| 条件 | 结果 |
|------|------|
| 入库单号为空 | 禁用 + 隐藏 |
| 入库单下无 A+ 包裹 | 禁用 + 隐藏 |
| 入库单下无 SI 管理的 BOX 产品 | 禁用 + 隐藏 |

**下单列表入口 / 下单入口**：

| 条件 | 结果 |
|------|------|
| 入库单为空 | 禁用 + 隐藏 |
| 非 Direct 验货 或 非 OI 检查模式 或 无包裹订单 | 禁用 + 隐藏 |
| 无 A+ 包裹 | 禁用 + 隐藏 |
| A+ 包裹下商品不满足（SI管理 AND BOX AND 采集SN）全部条件 | 禁用 + 隐藏 |

---

### OW01V1593 — 采集 A+ 包裹条码

**后端**：`InboundCollectAPlusPackageBarcodeDisableHandler`，`isShow()=false` → **无条件完全隐藏**

---

### OW01V1794 — LPN 直接上架

**后端**：`InboundLpnCodeShelveDirectlyDisableHandler`，`isShow()=false` → **无条件完全隐藏**

---

### OW01V1561 — 更换商品包装（入库）

无后端 DisableHandler，无置灰。

**前端勾选提示**（`ProductStep.tsx:261-267`）：勾选时若未同时选 OW01V1558 或 OW01V1559，弹 Modal.info 提示（仅提示，不阻止勾选）

**后端提交强校验**（`validateAtomRelation`）：入库单/异常单选了 OW01V1561 但没有 OW01V1558 或 OW01V1559 → 报错 `_02040501458`

---

### OW01V1573 — 补贴其他商品类标签或文件

无后端 DisableHandler，无置灰。

**前端文件字段互斥**（`vasConfig.tsx`）：
- `ALL_GOODS_SAME_LABEL=Y` → 仅显示统一标签文件
- `ALL_GOODS_SAME_LABEL=N` → 仅显示逐条标签文件 + 对应关系文件
- 两组完全互斥，切换时有二次确认弹框

---

### 入库增值 — 国内仓验货类型过滤（WI 模式）

**前端**（`ProductStep.tsx:482-489`）：入库单验货类型 = `WI`（国内仓验货）时，请求追加过滤参数：

```typescript
{
    vascAttributeType: 'VASC_PRODUCT_TYPE',
    vascAttributeValue: 'NON_STANDARD_VASC',
}
```

效果：WI 验货模式下只能选非标准增值，所有标准增值产品被过滤掉（原子级别同步不可选）

---

## 二、库内增值原子限制

### OSF6V1591 — 清货拍照标签

**后端**：`InWarehouseClearGoodsPhotoLabelDisableHandler`

| 条件 | 结果 |
|------|------|
| `isInHouseReVaOrder()`（再次创建增值） | 可选（setIsDisable("N")） |
| 其他所有情况 | 禁用（setIsDisable("Y")） |

> **只有再次创建增值时可选**，初次创建库内增值时全部禁用

---

### OSF6V1681 — 库内异常商品上架

**后端**：`InWarehouseMissLoadingMerchandiseShelveDisableHandler`

| 条件 | 结果 |
|------|------|
| 无 MERCHANDISE 类型商品 | 禁用 |
| 非异常单入口 | 禁用 |

---

### OSF6V1704 — 库内商品销毁

**后端**：`InWarehouseMerDestroyDisableHandler`

满足以下**任一**条件才可选，否则禁用：
- 异常单入口（`isEventVa`）
- 再次创建增值（`isInHouseReVaOrder`）
- 库内增值 + 操作对象为单品（`isInhouseVa AND VaObjectType.ITEM`）

---

### OSF6V1564 — 补贴原 SKU 条码（库内）

**后端**：`InWarehouseSupplementMerLabelDisableHandler`

| 条件 | 结果 |
|------|------|
| 无 MERCHANDISE 类型商品 | 禁用 |
| （异常单入口 OR 再次创建增值）AND 商品中有 BOX 箱类 | 禁用 |

**前端属性选项过滤**（`ProductStep.tsx:760-776`）：
- 商品存在指定条码值（`existSkuBarcodeValue`）→ LABEL_TYPE 只保留 `THIRD_PARTY_SKU_SERNO_ITEM_SERNO`
- 商品包含 BOX（`isIncludeBoxSku`）→ LABEL_TYPE 过滤掉 `THIRD_PARTY_SKU_SERNO_ITEM_SERNO`
- 注意：两个条件同时满足时，isIncludeBoxSku 过滤后执行，会覆盖前者

**前端文件字段联动**（`vasConfig.tsx`）：`LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` → 显示"上传标签编码"文件

---

### OSF6V1566 — 更换商品包装（库内）

无后端 DisableHandler，无置灰。

**前端勾选提示**（`ProductStep.tsx:268-270`）：勾选时若未选 OSF6V1564，弹 Modal.info 提示（仅提示，不阻止）

**后端提交强校验**（`validateAtomRelation`）：库内单选了 OSF6V1566 但没有 OSF6V1564 或 OSF6V1565 → 报错 `_02040501458`

---

### OSF6V1576 — 库内商品拆分

**前端**：`hiddenVasCodes=['OSF6V1576','OSF6V1804']`，**完全不渲染**，用户不可见

额外：若出现在列表中，勾选时若商品非全部单一产品（`!isAllSkuSingle`）→ Modal.info + `reject()` 阻止勾选

---

### OSF6V1804 — 库内商品组合

**前端**：同 OSF6V1576，在 `hiddenVasCodes` 中，**完全不渲染**

**后端**：`InWarehouseMerchandiseCombinationDisableHandler`，无任何禁用条件（后端允许，前端隐藏）

---

## 三、出库增值原子限制

### 暂存后补充环节（submitLink=SUBMIT）— 11 个原子字段全部置灰

**位置**：`processVasConfig.tsx:694` + `VasInfo.tsx:171-257`

```typescript
export const disabledVasCodes = [
    'OSF8V1310', // 贴商业发票
    'OSF8V1303', // 贴包裹标签
    'OSF8V1301', // 贴发货标签（ASN标签）
    'OSF8V1549', // 其他包裹类标签文件
    'OSF8V1309', // 交接BOL
    'OSF8V1312', // 提供商业发票给司机
    'OSF8V1308', // 补贴第三方快递面单
    'OSF8V1550', // 其他托盘类标签文件
    'OSF8V1311', // 贴托盘标签
    'OSF8V1295', // 贴超重标签
    'OSF8V1743', // 带电补贴标签
];
```

这 11 个原子在暂存后补充页面仍**显示**，但所有文件字段和属性字段均 `disabled=true` 且 `required=false`

---

### OSF8V1303 — 贴包裹标签

**前端选项过滤**（`processVasConfig.tsx:139-141`）：以下情况过滤掉"快递面单+包裹标签合一"选项：
- docType=STANDARD（标准单据）
- exportType=PTL（PTL出库）
- 增值列表中未选 OSF8V1308

**联动字段** `changeEditTreeCode:'OSF8V1308'`：修改 FILE_TYPE 时触发 OSF8V1308 字段可见性重算

---

### OSF8V1308 — 补贴第三方快递面单

**前端字段隐藏**（`processVasConfig.tsx:239-270`）：当 OSF8V1303 的 FILE_TYPE=`PACKAGE_LABEL_AND_EXPRESS_LABEL_COMPOSITE` 时，OSF8V1308 的跟踪号输入框、上传面单、上传匹配关系全部 `isShow=false`（面单已合并到 OSF8V1303 文件中）

---

### OSF8V1549 — 其他包裹类标签文件

**前端选项过滤**（`outboundVasConfig.tsx:73-76`）：

未选 OSF8V1534/OSF8V1726 且打包策略非智能推荐/客户指定 → FILE_TYPE 只保留"所有包裹相同标签"，过滤掉"不同包裹不同标签"

---

### OSF8V1311 — 贴托盘标签

**前端字段联动**（`processVasConfig.tsx:308`）：`FILE_SOURCE` 属性在 `supportsTagsVas` 不包含 `OSF8V1311` 时不显示；所有文件上传字段仅在 `FILE_SOURCE=DIRECT_UPLOAD` 时显示，选定制标签时文件字段全部隐藏

---

### OSF8V1774 — 出库采集 SN 码

**前端**（`VasInfo.tsx:265`）：

```typescript
disabled: (this.merchandiseIsAllSingle && d.vasCode == 'OSF8V1774')
```

商品全部是单品化管理时禁用（单品化管理系统默认追踪 SN，无需客户额外提交）

---

### OSF8V1618 — 贴 FBA 透明计划标签

**前端选项过滤**（`outboundVasConfig.tsx:470-472`）：

已选 OSF8V1294 时，OSF8V1618 的文件类型只保留 `TRANSPARENT_LABEL`，过滤掉混合标签选项

---

### 预约成功后置灰（所有包裹/托盘级增值）

**前端**（`VasInfo.tsx:355-363`）：

预约状态=SUCCESS 且操作对象为 PALLET 或 PACKAGE → `disabled=true`，提示："您已预约成功，请先取消预约后再操作添加增值"

---

## 四、原子间互斥与联动

### 互斥组（Radio 形式）

前端通过 `groupKey=group@{groupIndex}` 标记，同一 group 内只能选一个。切换时若已有填写内容，弹确认框清空。

---

### 强制联动关系

| 触发动作 | 联动效果 |
|---------|---------|
| 选 OW01V1558/OW01V1559/OW01V1572 + 新单上架 | 自动勾选 OW01V1560，文件字段改非必填 |
| OW01V1708 + `USE_ORIGIN_INBOUND_ORDER` | 属性 VAS_ATTR_REL_WRN 自动填入库单号并置灰 |
| OSF8V1303 FILE_TYPE 变化 | 触发 OSF8V1308 字段可见性重算 |
| OSF8V1303 选"合并文件" | OSF8V1308 的跟踪号/面单/匹配关系全部隐藏 |

---

### 提交时后端强校验（报错）

| 场景 | 规则 | 错误码 |
|------|------|--------|
| 入库/异常单选了 OW01V1561 | 必须同时选 OW01V1558 或 OW01V1559 | `_02040501458` |
| 库内单选了 OSF6V1566 | 必须同时选 OSF6V1564 或 OSF6V1565 | `_02040501458` |
| 新单上架选了 OW01V1558/OW01V1559/OW01V1572 | 必须同时选 OW01V1560 | `_02040901605` |
| 包裹关联了异常单，从入库单列表入口提交 | — | `_02040901684` |
| 原子不在 VASC 配置中 | — | `_02040501409` |
| 含 emoji 表情字符 | — | `_02040901697` |

---

## 五、通用规则（所有业务域）

**必选原子自动置灰**（`ProductStep.tsx:779-781`）：`required=Y` 且非互斥组的原子，自动勾选且 `disabled=true` 不可取消

**后端禁用标记透传**（`ProductStep.tsx:787-789`）：后端返回 `isDisable=Y` → 前端 `disabled=true`

**SUBMISSION_MODE 只有一个选项时自动置灰**（`VAS/index.tsx:802`）：提交方式只有一种时下拉框不可操作

---

## 六、快速索引

| 原子代码 | 名称 | 效果 | 核心触发条件 |
|---------|------|------|------------|
| OW01V1593 | 采集A+包裹条码 | 完全隐藏 | 后端 isShow=false |
| OW01V1794 | LPN直接上架 | 完全隐藏 | 后端 isShow=false |
| OSF6V1576 | 库内商品拆分 | 完全隐藏 | 前端 hiddenVasCodes |
| OSF6V1804 | 库内商品组合 | 完全隐藏 | 前端 hiddenVasCodes（后端无限制） |
| OW01V1708 | 不贴标直接上架 | 置灰 | 非异常单入口 |
| OW01V1572 | 关联第三方条码 | 置灰 | 非异常单 OR 无第三方条码 |
| OSF6V1681 | 库内异常商品上架 | 置灰 | 非异常单入口 |
| OSF6V1591 | 清货拍照标签 | 置灰 | 非再次创建增值 |
| OSF6V1704 | 库内商品销毁 | 置灰 | 非异常单且非ReVa且非库内单品 |
| OW01V1560 | 补贴包裹条码 | 置灰+可自动勾选 | 新单上架时不可手选 |
| OW01V1558 | 补贴原SKU（入库） | 置灰 | 无商品/条码空/不在原入库单 |
| OSF6V1564 | 补贴原SKU（库内） | 置灰 | 无商品；异常/ReVa时含BOX |
| OW01V1736 | 补贴包裹覆盖标签 | 置灰 | 非A/A+包裹；PSC规则不匹配 |
| OW01V1745 | 采集A+包裹序列号 | 置灰+隐藏 | 无A+包裹或无SI管理BOX商品 |
| OSF8V1774 | 出库采集SN码 | 置灰 | 商品全部单品化管理 |
| OSF8V1303等11个 | 出库标签/发票类 | 字段置灰（原子仍显示） | submitLink=SUBMIT |
