# 历史增值单数据画像（探索报告）

- 生成时间：`2026-09-08T16:56:31+08:00`
- 源文件：`workspace/data/raw/全量_增值单接口口径事实补齐.xlsx`
- 本阶段只做探索与标注辅助，**不**生成场景规则 / Eval / SOP 库 / workflow 规则。
- 本轮抽样范围：用户指定 TOP3 场景（按 `sceneOverviewCode`）。

## 汇总表

| 指标 | 值 |
|---|---|
| sheet 数 | 10 |
| 增值单汇总行数（订单） | 968 |
| vaAtoms口径行数（原子/服务） | 966 |
| submitAttrs 行数 | 988 |
| auditTrace 行数 | 991 |
| 场景种类数（含空） | 97 |
| 审核-通过 | 610 |
| 审核-退回 | 119 |
| 审核-取消 | 174 |
| 审核-其他 | 65 |
| SOP 有填写 | 700（72.5%） |
| SOP 未填写 | 266（27.5%） |
| 附件上传率（可确认） | `cannot_verify`（源表无独立附件列） |
| 文本提及附件的订单数（启发式） | 378 |
| submitAttrs 疑似文件 URL/token 行 | 2 |

### TOP3 场景覆盖（抽样目标）

| 场景码 | 场景名 | 原子行数 | 有SOP | SOP率 | 需求描述有值 | 退回单数* |
|---|---|---:|---:|---:|---:|---:|
| `20250407004` | 【入库】尺重/标签辨识后换标上架 | 18 | 18 | 100.0% | 12 | 1 |
| `20250407008` | 【入库】包裹类异常换商品标签上架 | 5 | 5 | 100.0% | 3 | 0 |
| `20250522001` | 【入库】指定商品拍照暂存 | 25 | 25 | 100.0% | 17 | 1 |

\*退回单数按订单审核轨迹含「审核不通过」统计（同一单多原子可能重复计到不同场景行）。

## 1. 所有 sheet 与字段

| sheet | 行数 | 列数 | 字段 |
|---|---:|---:|---|
| 增值单汇总 | 968 | 30 | `orderNo`, `status`, `statusDesc`, `orderDate`, `warehouseCode`, `warehouseName`, `customerCode`, `customerName`, `productCode`, `productName`, `vasType`, `vaSource`, `isAuditThrough`, `estimateAuditTime`, `actualAuditTime`, `requirementDescription`, `requirementBackground`, `sceneOverviewName`, `sop`, `vasDes`, `serviceName`, `auditTraceEventCode`, `auditTraceSupplementDesc`, `discussionSeqs`, `discussionDates`, `chatNames`, `discussionServices`, `feishuUrls`, `factSource`, `apiDirectCallStatus` |
| 讨论-增值单映射 | 1016 | 13 | `discussionSeq`, `discussionDate`, `threadId`, `chatName`, `starter`, `discussionProduct`, `discussionService`, `discussionCustomerObject`, `discussionWarehouse`, `relatedNos`, `summary`, `feishuUrl`, `orderNo` |
| basicInfo口径 | 968 | 44 | `orderNo`, `status`, `statusDesc`, `orderDate`, `warehouseCode`, `warehouseName`, `countryCode`, `countryName`, `customerCode`, `customerName`, `customerGroupCode`, `customerGroupName`, `productCode`, `productName`, `vasType`, `vaSource`, `vasObjectType`, `submiterType`, `orderEntry`, `isAudit`, `auditDepartment`, `auditDepartmentCode`, `isChangeAtom`, `isNeedConfirm`, `isAuditThrough`, `estimateAuditTime`, `actualAuditTime`, `estimateCustomerConfirmTime`, `actualCustomerConfirmTime`, `newInboundOrderNo`, `merchandiseDimension`, `isSelectAllGoods`, `deliveryType`, `inquiryMode`, `vaSection`, `noActionRequired`, `sourceUpdated`, `reviewTraceEventCode`, `reviewTraceEventContent`, `reviewTraceSupplementDesc`, `reviewTraceTime`, `factSource`, `apiAction`, `apiDirectCallStatus` |
| vaAtoms口径 | 966 | 29 | `orderNo`, `requirementDescription`, `requirementDescriptionSource`, `requirementBackground`, `requirementDescriptionAttrName`, `requirementBackgroundAttrName`, `id`, `serviceSequence`, `serviceCode`, `serviceName`, `serviceDesc`, `serviceNode`, `serviceType`, `serviceObject`, `status`, `statusDesc`, `completeTime`, `vasType`, `vasDes`, `sop`, `calculateType`, `isShelfIntercept`, `sceneOverviewCode`, `sceneOverviewName`, `completeResult`, `sourceUpdated`, `factSource`, `apiAction`, `apiDirectCallStatus` |
| submitAttrs | 988 | 13 | `orderNo`, `serviceSequence`, `serviceCode`, `attributeName`, `attributeKey`, `attributeValue`, `inputNode`, `isShow`, `attrCreated`, `sourceUpdated`, `factSource`, `apiAction`, `apiDirectCallStatus` |
| auditTrace | 991 | 12 | `orderNo`, `traceType`, `oldStatus`, `newStatus`, `eventCode`, `eventContent`, `supplementDesc`, `traceTime`, `sourceUpdated`, `factSource`, `apiAction`, `apiDirectCallStatus` |
| 未命中或无单号 | 189 | 5 | `discussionSeq`, `discussionDate`, `threadId`, `relatedNos`, `issue` |
| 疑似异常单号 | 3 | 6 | `orderNo`, `discussionSeq`, `discussionDate`, `threadId`, `relatedNos`, `issue` |
| 字段映射 | 6 | 3 | `fieldGroup`, `apiField`, `factSource` |
| 统计 | 18 | 2 | `metric`, `value` |

### 核心字段对照

| 业务含义 | 字段 | 状态 |
|---|---|---|
| VASC 单号 | `orderNo` | available |
| 场景 | `sceneOverviewName` / `sceneOverviewCode` | available |
| 服务 | `serviceName` / `serviceCode` | available |
| 客户需求原文 | `requirementDescription` / `VAS_ATTR_REL_RD` | available（约半数有值） |
| SOP | `sop` | available |
| 审核结果 | `isAuditThrough` + `auditTrace` | available |
| 退回原因 | `auditTrace.eventContent` | available |
| 原子属性 | `submitAttrs`（仅 RD/BEOR） | partial |
| 上传附件 | 独立附件列 | `not_available_in_source` / `cannot_verify` |
| vasDes | `vasDes` | `not_available_in_source`（全空） |

## 2. 场景分布（sceneOverviewName × 数量）

| sceneOverviewName | 数量 |
|---|---:|
| (空/未知) | 303 |
| 【出库】补贴/更换商品标签 | 36 |
| 【库内】商品外观辨识+贴标上架 | 35 |
| 【入库】指定商品拍照暂存 ← TOP3 | 25 |
| 【库内】指定单品/库位商品更换标签上架 | 24 |
| 【出库】指定位置贴商品/包裹标签/快递面单 | 24 |
| 【入库】覆盖/清除标签 | 21 |
| 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 20 |
| 【库内】商品组合 | 19 |
| 【入库】尺重/标签辨识后换标上架 ← TOP3 | 18 |
| 【库内】拍摄照片/视频 | 16 |
| 【库内】拆分SKU | 16 |
| 【库内】货权转移 | 15 |
| 【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架 | 15 |
| 【库内】审计盘点 | 15 |
| 【入库】批量辨识商品后补贴商品条码及包裹条码上架 | 15 |
| 【出库】覆盖指定包裹标签 | 13 |
| 【入库】上架前拆包装 | 13 |
| 【入库】关联第三方商品条码上架 | 12 |
| 【出库】交货时拍照 | 12 |
| 【库内】关联第三方条码上架 | 12 |
| 【入库】补贴透明计划标签 | 11 |
| 【库内】辨识后贴标上架+销毁 | 11 |
| 【入库】指定包裹拍照 | 11 |
| 【库内】良品/不良品检测 | 11 |
| 【入库】	商品异常更换包裹标签商品标签新单上架 | 10 |
| 【尾程】winit线下尾程询价 | 10 |
| 【入库】100%A+/A包裹包裹条码批量异常（需客户处理） | 9 |
| 【库内】指定库位开箱拍照 | 9 |
| 【出库】补增值后补包裹/托盘级标签 | 8 |
| 【入库】上架前拦截 | 8 |
| 【库内】IT改数收费 | 8 |
| 仓库已完成 需补收费用 | 7 |
| 【库内】异常商品转不良品上架 | 6 |
| 【出库】补贴包裹/托盘标签 | 6 |
| 【入库】包裹级异常更换包装 | 5 |
| 【库内】商品更换包装（WINIT标准包材） | 5 |
| 【入库】组合后上架 | 5 |
| 【库内】商品指定位置贴标 | 5 |
| 【入库】包裹类异常换商品标签上架 ← TOP3 | 5 |
| 【入库】包裹类异常关联第三方包裹条码直接上架 | 5 |
| 【库内】商品拆箱加/减配件 | 5 |
| 【库内】更换客制包装 | 5 |
| 清除标签 | 4 |
| 【入库】同异常多种处理方式（直接上架+换包装上架+换标上架+部分销毁） | 4 |
| 【出库】采集SN码 | 4 |
| 【出库】特殊打托需求 | 4 |
| 【入库】入库少单品/少包裹视频调查 | 4 |
| 【库内】库存冻结/解冻 | 4 |
| 【出库】暂存单重新装箱 | 4 |
| 【入库】加固包装（含透明胶带封口、木箱加固等） | 4 |
| 【入库】商品条码异常换包装+重新贴标后上架 | 4 |
| 【出库】重新打托（塑料托盘） | 4 |
| 【库内】商品尺重测量辨识 | 4 |
| 【库内】商品包装加固 | 4 |
| 【入库】新单上架到预报单，无需更换包裹条码 | 3 |
| 【入库】无主货找回暂存 | 3 |
| 【入库】包裹串仓异常调拨 | 3 |
| 【出库】仓库自主交货 | 3 |
| 【入库】更换客制包材 | 3 |
| 【库内】不良品转良品上架 | 3 |
| 【库内】退货商品拍照辨识 | 3 |
| 【入库】上架到不良品 | 3 |
| 【库内】补贴第三方商品条码上架 | 3 |
| 【库内】清除包装绑带 | 3 |
| 【出库】补增值后补订单级标签 | 2 |
| 【库内】良品转不良品上架 | 2 |
| 【出库】出库清除包装 | 2 |
| 【入库】包裹/商品条码异常重新扫描包裹/商品条码上架 | 2 |
| 【入库】上架前销毁 | 2 |
| 【出库】加急出库 | 2 |
| 【库内】商品贴指令性标签（警示标语/使用说明/清洁维护等）+拍照 | 2 |
| 【入库】异常商品/包裹数量与实际不符，按照实际贴标上架 | 2 |
| 【库内】异常重新拍照 | 2 |
| 【库内】清除商品属性标签+更换包装 | 2 |
| 【库内】库间调拨 | 2 |
| 【库内】指定SKU个性化装箱 | 2 |
| 【入库】上架前盘点 | 1 |
| 【出库】部分贴商品级标签 | 1 |
| 【出库】指定装箱 | 1 |
| 【库内】订单作废后重新上架 | 1 |
| 【库内】开箱取卡片 | 1 |
| 入库少单品/少包裹视频调查 | 1 |
| 【出库】清除配件 | 1 |
| 【库内】指定包裹盘点上架数量 | 1 |
| 【入库】A+包质量异常需开箱辨识 | 1 |
| 【库内】指定单品销毁 | 1 |
| 【出库】更换出库包材（winit标准包材） | 1 |
| 【库内】包裹错装换标上架 | 1 |
| 【入库】	ABC类/子包裹内商品错装暂存（需客户处理），云仓不支持原单补贴包裹条码上架 | 1 |
| 【入库】补贴包裹标签上架到原入库单“已终止的”包裹中 | 1 |
| 【库内】特殊商品销毁（DG、带电、药物） | 1 |
| 【出库】暂存完成订单补拍包裹内商品标签照片 | 1 |
| 【库内】单一产品开箱补贴商品标签 | 1 |
| 【入库】上架前自提 | 1 |
| 【入库】上架前采集条码（含SN码、A+包第三方包裹码等） | 1 |
| 【库内】代采购包材物料 | 1 |

## 3. 审核结果分布

分类口径：退回 = 轨迹含审核不通过；通过 = isAuditThrough=Y 或审核通过；取消 = status=CD 且未判退回/通过；其余=其他。

| 审核结果 | 数量 |
|---|---:|
| 通过 | 610 |
| 退回 | 119 |
| 取消 | 174 |
| 其他 | 65 |

| status | 数量 |
|---|---:|
| PD | 505 |
| CD | 392 |
| ES | 69 |
| OD | 2 |

### 退回原因 Top 10（auditTrace 行）

| 退回原因 | 数量 |
|---|---:|
| 需求描述不清晰，请线下与客服沟通 | 41 |
| 仓库暂时无法提供该服务 | 38 |
| 标准增值支持此场景，请提交标准增值 | 23 |
| 非标增值场景不符，请按照指示提交正确的非标增值 | 17 |

## 4. SOP 填写率 / 附件上传率

| 指标 | 数量 | 比例 |
|---|---:|---:|
| 有 SOP | 700 | 72.5% |
| 无 SOP | 266 | 27.5% |
| 附件可确认上传 | cannot_verify | — |
| 文本提及附件（启发式） | 378 | 39.0% of orders |

### TOP3 场景 SOP 覆盖

| 场景 | n | 有SOP | 无SOP | 覆盖率 |
|---|---:|---:|---:|---:|
| 【入库】尺重/标签辨识后换标上架 | 18 | 18 | 0 | 100.0% |
| 【入库】包裹类异常换商品标签上架 | 5 | 5 | 0 | 100.0% |
| 【入库】指定商品拍照暂存 | 25 | 25 | 0 | 100.0% |

## 5. 数据缺口与人工核准

1. 附件清单无法从本 Excel 确认（`cannot_verify`）。
2. `submitAttrs` 仅需求描述/背景，其他原子属性未展开。
3. `vasDes` 全空。
4. 本轮仅对 TOP3 场景抽 9 条样本供人工标注。
