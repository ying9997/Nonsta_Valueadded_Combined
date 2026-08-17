# 出库单 JSON 字段解读

基于 [queryOutboundOrderList（id/54）](https://developer.winit.com.cn/document/detail/id/54.html) 定位订单，并按需使用 [queryOutboundOrder（id/55）](https://developer.winit.com.cn/document/detail/id/55.html) 补充实际承运商，供 LLM **仅做字段与状态的事实归纳**。

### 列表接口字段形态（必读）

本专家先调用 id/54；当客户询问渠道商/派送商/承运商，或 id/54 结果缺少承运商时，再调用 id/55。合并后常见特点：

| 维度 | 说明 |
|------|------|
| 出库单号 | 官方响应中常为 **`documentNo`**；合并节点会在仅有 `documentNo` 时补上 **`outboundOrderNum`**（与之相同），便于统一解读 |
| 商品结构 | 顶层可能有扁平 **`sku` / `itemqty`**；子单仍在 **`packageList[]`**，明细可能在 **`packageList[].merchandiseList[]`** |
| 承运商详情 | id/55 可补充 `carrier`、`carrierServiceCode`、`carrierServiceName`、`carrierHasChange` |

### 根级附加字段（非万邑通原始字段）

| 字段 | 说明 |
|------|------|
| `_fetchMeta` | 包含 id/54 定位摘要，以及 `carrierDetailRequestedCount`、`carrierDetailResolvedCount`、`carrierDetailFailedCount` 等 id/55 补查信息 |
| `_pruneMeta` | 剪枝节点写入的包裹/商品截断信息（见第四节） |
| `effectiveProductCode` / `effectiveProductName` | 剪枝节点写入的**订单实际生效产品**编码与名称（优先 `orderWinitProductCode` / `orderWinitProductName`，回退 `winitProductCode` / `winitProductName`）。**每个 `list[]` 项上都有该字段**，是分析产品渠道时应使用的确定性来源 |

**说明**：当前工作流**不**追加 id/145 费用明细、id/56 轨迹摘要等扩展；根级一般**不会**出现历史设计中的 `_enrichment`。

### 发货/出库时效事实（仅时效意图）

当客户明确询问“什么时候发货/出库、应出库时间、是否超时”时，工作流按子单调用 `wh.outbound.getPackageDetail`，结果不并入原始订单大 JSON，而是单独形成 `outboundTimingFacts[]`：

| 字段 | 说明 |
|------|------|
| `outboundOrderNum` / `shippingNo` | 主出库单号 / 子订单号 |
| `trackingNos` | 用于将客户跟踪号确定性映射到子单 |
| `estimateOutWhTime` | 系统应出库时间；实测与 Seller 页面“应出库时间”一致 |
| `estimateOutWhTimeLocal` | 仓库当地应出库时间；保留用于时区解释，不自行换算 |
| `expectedOutboundTime` / `expectedOutboundTimeBasis` | 代码确定的对客展示值及口径；优先 system，缺失才回退 warehouse_local |
| `outWhTime` | 实际出库时间；非空时优先说明已实际出库 |
| `fetchStatus` | `success` / `no_data` / `service_error`，禁止把空数据当成功事实 |

不要将 `estimateCompleteDate`（预计送达）或产品名称中的时效当作应出库时间。

### 包裹实际尺寸重量事实（仅测量意图）

当客户询问实际尺寸、重量、体积、称重或长宽高时，同一详情接口单独形成 `packageMeasurementFacts[]`：

| 字段 | 说明 |
|------|------|
| `outboundOrderNum` / `shippingNo` / `trackingNos` | 主单、子单与客户 trackingNo 的确定性映射 |
| `actualWeightKg` | 子单实际总重量，单位 kg；来自详情 `actualWeight` |
| `actualVolumeM3` | 子单实际总体积，单位 m³；来自详情 `actualVolume` |
| `actualContainers[].lengthCm/widthCm/heightCm` | 逐箱实际长宽高，单位 cm；来自 `actualContainerList[].packageLength/packageWidth/packageHeight` |
| `actualContainers[].weightKg/volumeM3` | 逐箱实际重量和体积；来自 `actualContainerList[].packageWeight/packageVolume` |
| `fetchStatus` | `success` / `no_data` / `service_error` |

`estimateWeight`、`estimateVolume`、`estimateContainerList` 和普通 `containerList` 都不是本能力的实际测量来源。实际字段缺失时必须报告无数据，不能回退预估值。

---

## 一、常见问题类型 → 对应字段（仅作数据对照）

| 客户问题 | 字段位置 | 说明 |
|----------|----------|------|
| **订单到哪一步了？** | `status`、`statusName` | 见状态词典（CF/DLI/TSC 等） |
| **物流/跟踪号在哪查？** | `trackingNum`、`packageList[].trackingNos` | 多包裹时看各子单 trackingNos |
| **实际尺寸和重量？** | `packageMeasurementFacts[].actualContainers`、`actualWeightKg` | 逐箱回答；实际值缺失时不回退预估值 |
| **谁在派送？** | `carrier`、`carrierServiceName`、`packageList[].carrier` | 实际派送商与承运服务，可能与下单产品不同 |
| **为什么查不到轨迹？** | 非跟踪渠道（HPO 移交邮局） | 无 trackingNum 或 trackingNos 为空 |
| **作废/失败原因？** | `reasonForVoid`、`packageList[].reasonForVoid` | 作废单、异常子单时才有 |
| **实际从哪发货？** | `actualWarehouseInfoList` | 与下单仓可能不同 |
| **实际用哪条渠道？** | `actualProductInfoList` | 与下单产品可能不同 |
| **费用多少？** | `totalCost`、`deliveryCosts`、`handlingFee` | 总费用、派送费、处理费 |

---

## 二、必读规则

### 1. 产品编码（winitProductCode vs orderWinitProductCode）

| 字段 | 含义 | 说明 |
|------|------|------|
| **winitProductCode** | 产品模板编码 | 产品族/模板的编码（父级），如 `OSF811007991` → "Winit Fulfillment-7日达(2-7 Business Days)-US" |
| **winitProductName** | 产品模板名称 | 对应 `winitProductCode` 的中文名 |
| **orderWinitProductCode** | **订单实际绑定的产品编码** | 订单真实生效的产品变体，如 `OSF811008452` → "Winit Fulfillment-7日达(2-7 Business Days)-Zonal-US" |
| **orderWinitProductName** | **订单实际绑定的产品名称** | 对应 `orderWinitProductCode` 的中文名 |

**铁律**：`orderWinitProductCode` / `orderWinitProductName` 是订单实际绑定的产品变体（如 Zonal 版本），`winitProductCode` / `winitProductName` 只是产品模板。两者可能不同（如 US 通用版 vs US Zonal 版），**产品变体决定渠道的实际能力（如是否支持代客索赔）**。分析时必须优先使用 `orderWinitProductCode` / `orderWinitProductName`。

### 2. 产品 vs 承运商

| 字段 | 含义 | 举例 |
|------|------|------|
| **deliveryWayName** | 下单时选择的万邑通产品名 | 如 "USPS - Priority Mail" |
| **carrier** | 实际派送公司名称 | 如 USPS、UPS、FedEx |
| **carrierServiceName** | 实际承运服务名称 | 如 US YANWEN Ground |

组合产品（如 Winit Fulfillment 5 days）可能包含多种承运商，**carrier** 才是实际派送方。

### 3. carrierHasChange

- **Y**：实际派送商与下单时不同
- **N**：未变更
- **O**：组合服务，不判断

当为 Y 时，`carrier` 为变更后的派送商。

### 4. 一单多包裹

- `packageList[]` 各子单有独立的 `status`、`trackingNos`、`carrier`
- 部分子单作废/派送失败时，出库单 `status` 可能为 **EX（异常）**
- 分析时按子单分别归纳字段，不输出查件/索赔等指引

### 5. 实际 vs 下单

- **actualWarehouseInfoList**、**actualProductInfoList**：实际发生的仓/渠道
- 与下单不一致时，以 JSON 中实际字段为准进行归纳

### 6. 平台面单（3PL / OSF822，`list[].isPlatformWaybill`）

- 剪枝节点写入：产品码 **OSF822*** 或下单产品名含 **3PL**（大小写不敏感）时为 true。
- **分析时仅陈述字段含义与业务事实**：此类订单尾程轨迹**通常不会同步到万邑通系统**。若存在 **trackingNum / trackingNos**，可列出其值；**不**指导客户去何处查询，**不**承诺可获取/下载/打印面单。

---

## 三、API 返回结构速查（data.list[]）

### 顶层

| 字段 | 说明 |
|------|------|
| outboundOrderNum | 出库单号 |
| status, statusName | 状态码、中文名 |
| sellerOrderNo | 卖家订单号 |
| deliveryWayName | 下单派送方式 |
| carrier, carrierHasChange | 实际派送商、是否变更 |
| carrierServiceCode, carrierServiceName | 实际承运服务编码、名称 |
| trackingNum | 主跟踪号（单包裹时） |
| orderedTime, outboundDate, actualFinishTime | 下单/出库/完成时间 |
| deliveryCompletionStatus | OT=准时 DL=迟到 |
| reasonForVoid | 作废原因 |
| totalCost, deliveryCosts, handlingFee | 费用 |

### packageList[]（子单）

| 字段 | 说明 |
|------|------|
| packageNum | 子单编号（如 WO0000003291A） |
| status | 子单状态（可能与出库单不一致） |
| trackingNos | 该包裹跟踪号列表 |
| carrier | 该包裹派送商 |
| weight | 重量(kg) |
| reasonForVoid, isOperateByWinit | 作废原因、是否万邑通作废 |
| ontimeStatus | 准时派送状态 |
| merchandiseList | 商品列表（productCode, productNum） |

---

## 四、剪枝元信息 _pruneMeta

- originalPackageCount / retainedPackageCount / truncatedPackages
- 分析时可说明：当前 JSON 为剪枝后的部分数据（见 `_pruneMeta`），**不**要求客户执行任何操作
