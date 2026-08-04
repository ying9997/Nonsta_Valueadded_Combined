# 增值单下单 - 系统写死的原子不可选逻辑汇总（完整版）

> 整理时间：2026-06-25
> 说明：以下规则均为代码中硬编码，非 TOM 配置可控，修改需发版
> 范围：入库增值、库内增值、出库增值三个业务域，前端 + 后端

---

## 一、完全隐藏（前端直接过滤，用户看不到）

| 原子编码 | 名称 | 隐藏条件 | 业务域 |
|---------|------|---------|--------|
| OSF6V1576 | 库内商品拆分 | 始终隐藏 | 库内 |
| OSF6V1804 | 库内商品组合 | 始终隐藏 | 库内 |
| OSF8V1534 | 指定商品数量装箱 | ①单据类型=标准 且 前置拣货(isPostOrder=N)；②有打包策略时；③单据类型=自提(带面单) | 出库 |
| OSF8V1552 | 线下增值（非标增值） | isNeedOfflineVas 非 F 时 | 出库 |
| OSF8V1726 | 新指定装箱 | 无打包策略时 | 出库 |
| OSFV0003 | 打托 | 已配置打托策略时 | 出库 |
| OSF8V1727 | 指定打托（新） | 非打托类型订单 | 出库 |
| OSF8V1308 | 补贴第三方快递面单 | 单据类型=自提(不带面单) 且 无打包策略 且 非新单 | 出库 |
| OSF8V1310 | 贴商业发票 | 单据类型=自提(带面单) | 出库 |
| OSF8V1705 | 托盘转包裹 | 非新单时 | 出库 |
| OSF8V1303 | 贴包裹标签 | ①选了OSF8V1534时隐藏；②已配置OSF8V1534的服务列表中有OSF8V1303时隐藏 | 出库 |

---

## 二、按入口/来源限制（入库域）

| 原子编码 | 名称 | 规则 | 提示信息 |
|---------|------|------|---------|
| OW01V1572 | 第三方商品条码关联 | **仅异常单入口可选**，入库单入口置灰 | "该原子仅支持异常单入口下发!" |
| OW01V1572 | 第三方商品条码关联 | 异常单入口但未登记第三方条码时也置灰 | "异常信息未登记第三方商品条码，无法选择该增值" |
| OW01V1560 | 补贴包裹条码 | 上架方式=使用新入库单时**置灰不可手动选**，由系统自动勾选 | "当VASC的上架方式是新单上架，默认置灰补贴包裹条码，不能单独选择该原子" |
| OW01V1708 | 不贴标直接上架 | 上架方式=使用原入库单时，属性字段(VAS_ATTR_REL_WRN)冻结不可编辑，自动填充入库单号 | — |

---

## 三、互斥规则（选了A就不能选B）

| 原子A | 原子B | 互斥关系 | 业务域 |
|--------|--------|---------|--------|
| OSF8V1534（指定装箱） | OSF24WW008、OSF8V1711、OSF8V1726 | 四选一互斥（assocServiceCode 组），选一个其余三个置灰 | 出库 |
| OSF8V1618（贴透明标签） | OSF8V1294（贴商品标签） | 选了透明标签→商品标签置灰；反向：选了商品标签→透明标签文件类型只剩TRANSPARENT_LABEL | 出库 |
| OSF8V1303（贴包裹标签） | OSF8V1308（第三方面单） | 复合模式下文件互相覆盖删除；OSF8V1303取消勾选→OSF8V1308置灰 | 出库 |

---

## 四、联动依赖（选了A自动触发B）

| 触发原子 | 被联动原子 | 逻辑 | 业务域 |
|---------|-----------|------|--------|
| OW01V1559/OW01V1558/OW01V1572 | OW01V1560（补贴包裹条码） | 上架方式=新入库单时，选了任一触发原子→自动勾选OW01V1560，并自动设置LABEL_SIZE=10X6、LABEL_TYPE=PACKGE_SERNO | 入库 |
| OSF8V1303 文件类型选"复合面单" | OSF8V1308 | 要求OSF8V1308同时存在，否则"一份文件上传快递面单和包裹标签"选项不可用 | 出库 |
| OSF8V1618 文件类型变更 | OSF8V1294 | 联动更新OSF8V1294选中状态 | 出库 |
| OSF8V1534 取消勾选 | OSF8V1303 | 恢复OSF8V1303显示 | 出库 |
| OSF8V1303+OSF8V1308 复合模式 | 双向同步 | SUBMISSION_MODE 和 ADDITIONAL_SESSION 属性双向同步 | 出库 |

---

## 五、前置选择校验（选择时弹窗拦截）

| 原子编码 | 名称 | 前置条件 | 拦截提示 | 业务域 |
|---------|------|---------|---------|--------|
| OSF6V1561 | 更换商品包装（入库） | 必须先选OW01V1558或OW01V1559 | "增值选项选择更换商品包装时，必须选择商品级-补贴原SKU条码或者商品级-更换新SKU条码" | 入库 |
| OSF6V1566 | 更换商品包装（库内） | 必须先选OSF6V1564 | "增值选项选择更换商品包装时，必须选择商品级-补贴原SKU条码" | 库内 |
| OSF6V1576 | 库内商品拆分 | 所有商品必须是单品SKU(skuType=SINGLE) | "增值服务：{serviceName} 只支持单一产品，您下单第一步选择的商品存在非单一产品SKU，请修改" | 库内 |

---

## 六、属性选项限制（原子可选但内部选项被限制）

| 原子编码 | 名称 | 限制规则 | 业务域 |
|---------|------|---------|--------|
| OSF6V1564 | 库内补贴原SKU条码 | 商品已有条码值→标签类型(LABEL_TYPE)只剩"第三方SKU序列号(THIRD_PARTY_SKU_SERNO_ITEM_SERNO)" | 库内 |
| OSF6V1564 | 库内补贴原SKU条码 | 含箱SKU(isIncludeBoxSku)→排除"第三方SKU序列号"选项 | 库内 |
| OSF8V1743 | 补贴运输标签(UN) | 未选指定装箱(1534/1726)且非智能/指定打包策略时，文件类型只能选"统一(PACKAGE_LABEL_ALL_SAME)" | 出库 |
| OSF8V1549 | 其他包裹类标签文件 | 未选指定装箱(1534/1726)且非智能/指定打包策略时（或新单+RPL），只能选"统一标签(OTHER_LABEL_ALL_SAME)" | 出库 |
| OSF8V1303 | 贴包裹标签 | ①非新单+标准/PTL/无OSF8V1308→排除"复合面单"选项；②新单模式→只能选"上传文件并提供对应关系(PACKAGE_LABEL_NOTVC_TEMPLATE)" | 出库 |
| OSF8V1618 | 贴透明标签 | 选了OSF8V1294后文件类型只剩 TRANSPARENT_LABEL（排除TRANSPARENT_AND_FNSKU_MIX_LABEL） | 出库 |
| OW01V1573/OSF6V1574 | 补贴其他商品类标签 | ALL_GOODS_SAME_LABEL属性：商品只有1个时排除"N"选项（只能选"Y-统一"） | 入库/库内 |
| — | PACKAGING_MODE属性 | 非(全单品SKU + 异常单入口)时排除"PACKAGING_CUSTOMER(客户提供包材)"选项 | 入库 |
| — | DEAL_WITH_WAY属性 | vaSource=REVA(再验)时排除"STORAGE(入库)"选项 | 入库 |

---

## 七、条件性置灰/不可操作

| 原子编码 | 名称 | 条件 | 业务域 |
|---------|------|------|--------|
| OSF8V1774 | 出库采集SN码 | 全部是单品(merchandiseIsAllSingle)时置灰 | 出库 |
| OSF8V1294 | 贴商品标签 | 选了OSF8V1618（透明标签）时置灰 | 出库 |
| OSF8V1308 | 补贴第三方快递面单 | OSF8V1303取消勾选时置灰 | 出库 |
| OSF8V1482-1485 | DG/UN标签(4个) | 需controlledServiceList配置中存在才显示，否则隐藏 | 出库 |
| OSF8V1295 | 补贴超重标签 | 收件人类型为FBA_NONVC或FBA_VC时隐藏 | 出库 |
| OSF8V1303 | 贴包裹标签 | 收件人类型为FBA_NONVC或FBA_VC且有打包策略时隐藏 | 出库 |

---

## 八、提货加工(PickupProcessing)场景置灰

提货加工流程中 submitLink='SUBMIT' 时，以下原子**全部置灰且文件非必填**：

```
OSF8V1310（贴商业发票）、OSF8V1303（贴包裹标签）、OSF8V1301（贴发货标签）、
OSF8V1549（其他包裹类标签）、OSF8V1309（交接BOL/CMR）、OSF8V1312（提供发票给司机）、
OSF8V1308（第三方面单）、OSF8V1550（其他托盘类标签）、OSF8V1311（贴托盘标签）、
OSF8V1295（补贴超重标签）、OSF8V1743（补贴运输标签UN）
```

另外：预约成功后(bookingStatus=SUCCESS)，所有操作对象为「托盘」或「包裹」的原子置灰，提示"已预约成功，请先取消预约后再操作"。

---

## 九、批量导入不支持的原子

以下原子在批量导入场景下被过滤隐藏（不支持通过Excel批量导入选择）：

```
OSF24WW008（出库加包装）、OSF8V1284（出库商品组套）、
OSF8V1482（检查DG标签）、OSF8V1483（补贴DG标签）、
OSF8V1484（检查UN标签）、OSF8V1485（补贴UN标签）、
OSF8V1534（指定装箱）、OSF8V1550（其他托盘类标签）、
OSFV0003（打托）、OSF8V1621（DG商品出库检查）、
OSF8V1670（加引流卡片）、OSF8V1711（指定包材规格加包装）、
OSF8V1726（新指定装箱）、OSF8V1727（指定打托新）、
OSF8V1748（出库补贴子包裹条码）、OSF8V1705（托盘转包裹）、
OSF8V1308（第三方面单）、OSF8V1309（交接BOL/CMR）
```

---

## 十、新单模式(isNewOrder)额外过滤

新单模式下：
1. 操作对象为「商品(GOODS)」或「单品(SINGLE)」的原子被过滤
2. assocServiceCode 组内原子被过滤
3. 商品形式为「托盘(PALLET)」时额外过滤 OSFV0003 和 OSF8V1727

---

## 十一、后端硬编码校验规则

### 11.1 白名单绕过（跳过正常校验流程）

| 原子编码 | 名称 | 绕过的校验 |
|---------|------|-----------|
| OSF8V1453 | 暂存增值 | 跳过业务白名单校验 + 跳过增值配置校验 |
| OSF8V1552 | 非标增值（线下） | 跳过业务白名单校验 + 跳过增值配置校验 |

### 11.2 状态强制覆盖

| 原子编码 | 名称 | 强制状态 | 触发条件 |
|---------|------|---------|---------|
| OSF8V1748 | 出库补贴子包裹条码 | 强制 UnHandle | 始终（硬编码） |
| NO_NEED_DEAL_FILE_VAS_CODE_CONFIG 列表中的原子 | 动态配置 | 强制 UnHandle | 原子编码命中配置列表 |
| OSF8V1303 | 贴包裹标签 | 强制 UnHandle | LABEL_SOURCE 属性值=GENERATE（系统生成标签） |
| OSF8V1294 | 贴商品标签 | 强制 UnHandle | MERCHANDISE_LABEL_LIST 中有 BARCODE 且值非空 |
| 所有原子 | — | 强制 DR(草稿) | 父订单状态为 DR/PRE/TSC 时 |

### 11.3 辅材白名单限制

| 原子编码 | 名称 | 限制规则 |
|---------|------|---------|
| OSF24WW008 | 出库加包装 | PACKAGING_AUXILIARY_MATERIAL 属性只允许 AIR_BUBBLE_FILM，提交其他辅材直接报错(PACKAGING_AUXILIARY_MATERIAL_INVALID) |

### 11.4 文件级联处理

| 原子编码 | 名称 | 级联规则 |
|---------|------|---------|
| OSF8V1303+OSF8V1308 | 贴包裹标签+第三方面单 | 文件类型=PACKAGE_LABEL_AND_EXPRESS_LABEL_COMPOSITE时，后端删除两者原有文件再重新写入复合文件 |
| OSF8V1303 | 贴包裹标签 | 文件合并：只取PACKAGE_LABEL_AND_EXPRESS_LABEL_COMPOSITE类型文件合并到其他原子 |

### 11.5 属性白名单过滤

后端对以下原子的属性做了白名单过滤（只返回指定属性给前端，其余属性不展示）：

| 原子编码 | 允许的属性 |
|---------|-----------|
| OSFV0003（打托） | PALLET_STANDARD_CONFIG, PALLET_TYPE_VALUE, PALLET_LIMIT_ID, PALLET_STANDARD_GRADE_ID, IS_ALLOW_OVER_PALLET, PALLET_STANDARD_GRADE_NAME, PALLET_STACK_NAME, PALLET_LIMIT_NAME |
| OSF24WW008（出库加包装） | PACKAGE_MODE, PACKAGE_TYPE_MATERIAL, PACKAGE_MERCHANDISE_CODE/SERNO（含一级/二级包装） |
| OSF8V1301（贴发货标签） | ASN_LABEL_CODE, FILE_COLOR, FILE_COPIES, FILE_LOCATION, OTHER_REQUIREMENTS, FILE_SIZE |
| OSF8V1555（代理出口清关） | TRADE_METHOD, SHIPPING_METHOD, SENDER_VAT_NO, RECEIVER_VAT_NO, HSCODE_QTY, IS_RELEASE |
| OSF8V1295/OSF8V1300等 | SUBMISSION_MODE, ADDITIONAL_SESSION |

### 11.6 客户白名单（空格处理差异）

| 原子编码 | 白名单配置键 | 作用 |
|---------|------------|------|
| OSF8V1303 | OSF8V1303_NOT_REMOVE_BLANK_CUSTOMER_WHITELIST | 白名单内客户：文件名中的空格不做删除处理 |
| OSF8V1548 | OSF8V1548_NOT_REMOVE_BLANK_CUSTOMER_WHITELIST | 同上 |
| OSF8V1549 | OSF8V1549_NOT_REMOVE_BLANK_CUSTOMER_WHITELIST | 同上 |

### 11.7 特殊业务校验

| 原子编码 | 名称 | 校验规则 |
|---------|------|---------|
| OSF8V1618 | 贴FBA透明计划标签 | 需通过 dgVasRecognitionWhiteList 业务白名单校验 |
| OSF8V1548/1549 | 其他商品/包裹标签 | CHECK_OTHER_LABEL_VAS_ALL_HANDLE 配置=N时，所有商品/包裹必须都有标签文件，否则拒绝提交 |

---

## 十二、文件字段显隐逻辑（入库域 vasConfig）

| 原子编码 | 名称 | 文件字段显隐条件 |
|---------|------|----------------|
| OW01V1559 | 更换新SKU条码 | ①OTHER_LABEL文件：THIRD_PARTY_SKU_SERNO_GEN_WAY≠CUSTOMER时显示；②MERCHANDISE_LABEL_FILE：GEN_WAY=CUSTOMER时显示；③LABEL_FILE_MERCHANDISE_REL_FILE：LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO 且 GEN_WAY=CUSTOMER时显示 |
| OW01V1558 | 补贴原SKU条码 | OTHER_LABEL文件：LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO 且 GEN_WAY≠CUSTOMER时显示 |
| OW01V1573 | 补贴其他商品类标签 | ①ALL_GOODS_SAME_LABEL=Y时显示统一标签上传；②=N时显示按商品分别上传 |
| OW01V1560 | 补贴包裹条码 | 新入库单上架时：OTHER_LABEL文件 required=false（非必填） |

---

## 十三、属性字段显隐逻辑

| 属性编码 | 显示条件 | 影响原子 |
|---------|---------|---------|
| THIRD_PARTY_SKU_SERNO_GEN_WAY | LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO时才显示 | OW01V1559/1558 |
| CLEAR_LABEL_SAMPLE_IMAGE | CLEAR_LABEL_TYPE包含CUSTOM_LABEL时才显示 | 清除标签类原子 |
| COVER_LABEL_IMAGE | COVER_LABEL_TYPE=CUSTOMER_PROVIDED_OVERRIDING_LABEL时才显示 | 覆盖标签类原子 |
| COVER_LABEL_SIZE | COVER_LABEL_TYPE=CUSTOMER_PROVIDED_OVERRIDING_LABEL时才显示 | 覆盖标签类原子 |
| SUBMISSION_MODE | 非首个分组(groupSeqIndex≠1)时置灰；或只有1个选项时置灰 | 出库所有支持分组的原子 |
| ADDITIONAL_SESSION | 同SUBMISSION_MODE规则 | 出库所有支持分组的原子 |

---

## 十四、后端 DisableHandler 置灰规则（OMS2 原子级置灰处理器）

OMS2 通过 `VaAtomDisableFactory` 为每个原子注册独立的 DisableHandler，以下是各处理器的硬编码规则：

| 原子编码 | 名称 | 置灰条件 | 业务域 |
|---------|------|---------|--------|
| OW01V1745 | 箱产品入库采集SN码 | ①仅A+等级包裹可用；②仅箱(BOX)类型商品可用；③底层商品管理方式必须为SI(单品管理)；④非直航、非OI验货模式、或无包裹的入库单不可用 | 入库 |
| OW01V1558 | 补贴原SKU条码（入库） | ①商品序列号(merchandiseSerno)为空时置灰；②异常单来源时需校验原入库单上架方式 | 入库 |
| OSF6V1704 | 库内异常商品销毁 | 仅异常单来源(UNUSUAL)、再验单(REVA)、或库内单品级增值单可用，正常入库/出库不可用 | 库内 |
| OSF5V1746 | 退货-更换商品包装 | ①SKU类型为BOX或SUITE时，客户提供包材模式(PACKAGING_CUSTOMER)不可选；②更换包材后尺寸/重量超限时拒绝 | 退货 |

### 14.1 通用置灰校验（AtomDisableCmdExe）

以下规则对所有原子生效：

| 校验项 | 规则 | 影响 |
|--------|------|------|
| 标准VASC包裹校验 | 订单含不支持标准增值的包裹时，该VASC下所有原子置灰 | 全局 |
| 非标VASC操作对象校验 | 原子的操作对象(operateObject)与增值单对象类型(vasObjectType)不匹配时置灰 | 全局 |
| 操作对象层级校验 | 低层级操作对象(如单品)在高层级增值单(如包裹级)中不可选 | 全局 |

---

## 十五、退货域(RMA)特有规则

| 原子编码 | 名称 | 规则 | 来源 |
|---------|------|------|------|
| OSF5V1746 | 退货-更换商品包装 | 按仓库国家查询商品信息，校验SKU类型和包材尺寸 | 后端 RmaChangeMerPackingStrategy |
| OSF5V1747 | 退货-补贴商品条码 | 代码中有预留逻辑但当前未启用（注释状态） | 后端 RmaChangeMerPackingStrategy |
| OSF5V1764 | 退货-更换商品吊牌 | 枚举定义存在，具体置灰规则由通用校验覆盖 | 后端 VaServiceCode |
| OSF5V1803 | 退货-追踪守护 | 枚举定义存在，具体置灰规则由通用校验覆盖 | 后端 VaServiceCode |

退货域前端 vasConfig 为空（无前端硬编码规则），原子可选性完全由后端 API 返回的 disabled 状态控制。

---

## 十六、服务偏好设置中的过滤

| 原子编码 | 名称 | 规则 | 位置 |
|---------|------|------|------|
| OSF8V1621 | DG商品出库检查 | 服务偏好配置页面不展示（不支持客户自行开关） | ServiceOpenConfig.tsx / ServiceConfig.tsx |

---

## 十七、需计费原子列表（影响下单时费用预估展示）

以下原子在 outboundStore 中被标记为需要计费(needBillingVas)，选中后触发费用预估：

```
OSF8V1284（出库商品组套）、OSF24WW008（出库加包装）、OSFV0003（打托）、
OSF8V1439（Last Mile Sign）、OSF8V1464（物流保险）、
OSF8V1440（Last Mile VCA）、OSF8V1700（WF排除USPS）
```

---

## 代码位置索引

| 文件路径 | 主要规则类型 |
|---------|------------|
| **前端 - 出库** | |
| seller/src/pages/WHOutbound/components/CreateOrderStep/ProductStep.tsx | 出库隐藏、互斥、新单过滤、FBA限制 |
| seller/src/pages/WHOutbound/components/VAS/outboundVasConfig.tsx | 出库属性选项限制、联动、文件类型过滤 |
| seller/src/pages/WHOutbound/components/VAS/processVasConfig.tsx | 暂存场景置灰列表、属性字段显隐 |
| seller/src/pages/WHOutbound/components/VAS/index.tsx | 批量导入不支持列表 |
| seller/src/pages/WHOutbound/components/PickupProcessing/.../VasInfo.tsx | 提货加工置灰、预约成功置灰、SN码置灰 |
| **前端 - 入库/库内** | |
| seller/src/pages/VasOrder/components/VAS/vasConfig.tsx | 入库原子配置、入口限制、disabledTooltip |
| seller/src/pages/VasOrder/components/VAS/index.ts | 属性动态过滤（ALL_GOODS_SAME_LABEL/PACKAGING_MODE/DEAL_WITH_WAY） |
| seller/src/pages/VasOrder/components/CreateOrderStep/ProductStep.tsx | 入库联动、上架方式过滤、隐藏码、前置校验 |
| seller/src/stores/inboundStore.tsx | vaCodesSupportSupplementPkgLabel配置（VA_CODES_SUPPORT_SUPPLEMENT_PKG_LABEL） |
| **后端** | |
| order-vas/.../VasPlaceOrderProcessor.java | 白名单绕过、状态强制、级联删除 |
| order-vas/.../OSF24WW008PlaceOrderProcessor.java | 辅材白名单校验 |
| order-vas/.../OSF8V1303PlaceOrderProcessor.java | 标签来源判断→状态覆盖 |
| order-vas/.../OSF8V1294PlaceOrderProcessor.java | 条码存在→状态覆盖 |
| order-vas/.../TomOutboundOrderVasServiceImpl.java | 属性白名单过滤（只返回指定属性） |
| order-vas/.../OSF8V1618VasProcessor.java | FBA透明标签业务白名单校验 |
| order-vas/.../OSF8V1548MISourcePreProcessor.java | 标签完整性校验(全有或全无) |
| **后端 - OMS2 原子置灰** | |
| oms2/component-vas/.../InboundPackageCollectionSnDisableHandler.java | OW01V1745 A+包裹/BOX类型/SI管理校验 |
| oms2/component-vas/.../InboundSupplementMerLabelDisableHandler.java | OW01V1558 序列号为空校验 |
| oms2/component-vas/.../InWarehouseMerDestroyDisableHandler.java | OSF6V1704 仅异常/再验/库内单品可用 |
| oms2/component-vas/.../RmaChangeMerPackingStrategy.java | OSF5V1746 退货包材SKU类型/尺寸校验 |
| oms2/component-vas/.../AtomDisableCmdExe.java | 通用置灰：标准VASC/操作对象/层级校验 |
| oms2/component-vas/.../VaAtomDisableFactory.java | 原子置灰处理器工厂（按原子码路由） |
