---
title: wh.va.order.getPaymentList — 查询增值实际费用列表
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/wh-va-order-get-payment-list-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# wh.va.order.getPaymentList — 查询增值实际费用列表

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `wh.va.order.getPaymentList` |
| 接口路径 | `POST /wh/va/order/getPaymentList` |
| 接口描述 | 查询指定增值订单的实际费用信息，包含各增值原子的应收及成本明细 |
| 系统 | openapi → oms2（Dubbo RPC） |
| 权限控制 | 仅允许查询当前客户下的增值单 |

> 与 `getPrepaymentList`（预估费用）的区别：本接口返回实际发生的费用，由仓库作业完成后计算得出。

---

## 公共请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| action | String | 是 | - | 固定值 `wh.va.order.getPaymentList` |
| app_key | String | 是 | - | 用户名 / 应用密钥 |
| client_id | String | 是 | - | 客户端 ID，注册时系统分配 |
| timestamp | String | 是 | - | 请求时间戳（毫秒） |
| sign | String | 是 | - | 签名值，见签名说明 |
| sign_method | String | 否 | `md5` | 签名方式 |
| version | String | 否 | `1.0` | API 版本号 |
| format | String | 否 | `json` | 返回格式 |
| platform | String | 否 | - | 平台标识 |
| language | String | 否 | `zh_CN` | 语言 |
| data | Object | 是 | - | 业务参数，见下方说明 |

### 签名说明

按以下顺序拼接后 MD5 加密：

```
token + "action" + action + "app_key" + app_key + "data" + data
     + "format" + format + "platform" + platform + "sign_method" + sign_method
     + "timestamp" + timestamp + "version" + version + token
```

---

## 业务请求参数（data 字段）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号（前缀 `V`） |
| manualentryFlag | String | 否 | 是否是非标增值（Y/N） |

### 请求示例

```json
{
  "action": "wh.va.order.getPaymentList",
  "app_key": "your_app_key",
  "client_id": "your_client_id",
  "timestamp": "1624080000000",
  "version": "1.0",
  "sign": "md5_hash_value",
  "sign_method": "md5",
  "format": "json",
  "language": "zh_CN",
  "data": {
    "orderNo": "V106075100"
  }
}
```

---

## 响应数据

返回 `VaOrderRevenueVo` 对象，结构与 `getPrepaymentList` 完全一致，字段含义相同，区别在于数据来源为实际计费结果。

### VaOrderRevenueVo — 费用汇总

| 字段 | 类型 | 说明 |
|------|------|------|
| orderNo | String | 增值订单号 |
| totalStandardCurrencyCode | String | 应收合计本位币币种 |
| totalStandardAmount | BigDecimal | 应收合计本位币金额 |
| costTotalStandardCurrencyCode | String | 成本本位币币种 |
| costTotalStandardAmount | BigDecimal | 成本本位币金额 |
| atomFeeList | List\<VaAtomFeeEstimateVo\> | 各增值原子费用列表，见下 |
| feeList | List\<InHouseOrderRevenueVo\> | 入库相关费用列表，见下 |

### VaAtomFeeEstimateVo — 原子费用

| 字段 | 类型 | 说明 |
|------|------|------|
| vaAtom | VaAtomVo | 增值原子信息（详见 getVasList 接口文档） |
| totalStandardAmount | BigDecimal | 该原子应收合计本位币金额 |
| standardCurrencyCode | String | 本位币币种 |
| calRevenueErrorMsg | String | 计算应收时的报错信息 |
| calCostErrorMsg | String | 计算成本时的报错信息 |
| actionFeeDetails | List\<VaActionFeeDetailVo\> | 动作费用明细列表，见下 |
| feeDetails | List\<VaAtomFeeDetailVo\> | 应收费用明细列表，见下 |
| costDetails | List\<VaOrderCostVo\> | 成本费用明细列表，见下 |

### VaAtomFeeDetailVo — 应收费用明细

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| warehouseCode | String | 仓库编码 |
| warehouseName | String | 仓库名称 |
| winitProductCode | String | 产品编码 |
| winitProductName | String | 产品名称 |
| serviceCode | String | 服务编码 |
| serviceName | String | 服务名称 |
| serviceSequence | String | 原子序号 |
| customerCode | String | 客户编码 |
| customerName | String | 客户名称 |
| chargeId | Long | 计费 ID |
| chargeItemId | Long | 计费项 ID |
| chargeCode | String | 计费编码 |
| chargeName | String | 计费名称 |
| chargeType | String | 费用类型（PC / AC） |
| unitPrice | BigDecimal | 单价 |
| qty | BigDecimal | 数量 |
| chargeWeight | BigDecimal | 计费重量 |
| amount | BigDecimal | 原币金额 |
| currency | String | 原币币种 |
| standardCurrencyAmount | BigDecimal | 本位币金额 |
| standardCurrencyCode | String | 本位币币种 |
| standardCurrencyRate | BigDecimal | 本位币汇率 |
| chargeDate | Date | 计费日期 |
| deductionDate | Date | 扣费时间 |
| revenueNo | String | 费用流水号 |
| priceVersion | String | 费用版本 |
| priceRate | BigDecimal | 价格调整率 |
| countRate | BigDecimal | 计费重转换率 |
| unit | String | 计价单位 |
| startZone | String | 起始分区 |
| endZone | String | 结束分区 |
| startGrade | String | 等级起点 |
| endGrade | String | 等级终点 |
| orderNo | String | 订单号 |
| billingDescription | String | 计费描述 |
| calculateType | String | 计算类型（PCC / WAC / MEA） |
| calculateTypeName | String | 计算类型名称 |
| vaActionId | Long | 仓库作业动作 id |
| supplierCode | String | 供应商编码 |
| actionCode | String | 动作编码 |
| billingResultId | Long | 计费明细 ID |
| vaOrderBillingResult | VaOrderBillingResultVo | 计费明细对象 |

### VaOrderCostVo — 成本费用明细

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 增值单号 |
| warehouseCode | String | 仓库编码 |
| supplierCode | String | 供应商编码 |
| supplierName | String | 供应商名称 |
| serviceCode | String | 增值原子服务编码 |
| serviceName | String | 增值原子服务名称 |
| serviceSequence | String | 原子序号 |
| chargeType | String | 费用类型（PC / AC） |
| chargeCode | String | 费用编码 |
| chargeName | String | 费用名称 |
| chargeDesc | String | 费用描述 |
| amount | BigDecimal | 原币金额 |
| currency | String | 原币币种 |
| standardCurrencyAmount | BigDecimal | 本位币金额 |
| standardCurrencyCode | String | 本位币币种 |
| standardCurrencyRate | BigDecimal | 本位币汇率 |
| costNo | String | 成本单号 |
| deductionDate | Date | 计费日期 |
| winitProductId | Long | Winit 产品 ID |
| winitProductCode | String | Winit 产品编码 |
| winitProductName | String | Winit 产品名称 |
| priceVersion | String | 费用版本 |
| priceRate | BigDecimal | 价格调整率 |
| startZone | String | 起始分区 |
| endZone | String | 结束分区 |
| startGrade | String | 等级起点 |
| endGrade | String | 等级终点 |
| countRate | BigDecimal | 计费重转换率 |
| unit | String | 计价单位 |
| way | String | 计费方式 |
| unitPrice | BigDecimal | 单价 |
| chargeWeight | BigDecimal | 计费重量 |
| qty | BigDecimal | 数量 |
| chargeItemId | Long | PMS2 配置的费用项 ID |
| chargeId | Long | CHARGE_ID |
| chargeDate | Date | CHARGE_DATE |
| status | String | 状态 |
| calculateType | String | 计算方式（PCC / WAC / MEA） |
| calculateTypeName | String | 计算方式名称 |
| vaActionId | Long | 仓库作业动作 ID |
| actionCode | String | 动作编码 |

### VaActionFeeDetailVo — 动作费用明细

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 增值单号 |
| serviceCode | String | 增值原子服务编码 |
| serviceName | String | 增值原子服务名称 |
| warehouseActionCode | String | 仓库动作编码 |
| warehouseActionName | String | 仓库动作名称 |
| timeUnitCalculationCode | String | 耗时计算单位编码 |
| timeUnitCalculationName | String | 耗时计算单位名称 |
| qty | BigDecimal | 数量 |
| unitTimeConsumption | BigDecimal | 单位耗时 |
| timeUnit | String | 时间单位 |
| totalTimeConsumption | BigDecimal | 总耗时 |
| unitCost | BigDecimal | 单位成本 |
| currencyType | String | 币种 |
| totalCost | BigDecimal | 总成本 |
| grossMarginRate | BigDecimal | 毛利率 |
| totalIncome | BigDecimal | 总收入 |
| chargeCode | String | 费用编码 |
| chargeName | String | 费用名称 |
| chargeId | Long | 费用 id |
| chargeType | String | 费用类型（PC / AC） |
| excludeRevenue | String | 不计算收入标识（Y/N） |
| excludeRevenueReason | String | 不计算收入原因编码 |
| excludeRevenueReasonName | String | 不计算收入原因名称 |
| vaAtomFeeDetailVos | List\<VaAtomFeeDetailVo\> | 收入费用明细列表 |
| vaOrderCostVoList | List\<VaOrderCostVo\> | 成本费用明细列表 |

### InHouseOrderRevenueVo — 入库费用明细

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 订单号 |
| revenueType | String | 收入类型（预计收入 / 实际收入） |
| status | String | 状态（UnHandled / Failed / SUCCESS / Handling） |
| winitProductCode | String | Winit 产品编码 |
| winitProductName | String | Winit 产品名称 |
| warehouseCode | String | 仓库编码 |
| countryCode | String | 国家编码 |
| chargeId | Long | 计费 ID |
| billingDesc | String | 计费描述 |
| feeNode | String | 费用节点 |
| feeNodeName | String | 费用节点名称 |
| serviceCode | String | 服务编码 |
| serviceName | String | 服务名称 |
| customerCode | String | 客户编码 |
| customerName | String | 客户名称 |
| chargeItemId | Long | 计费项 ID |
| chargeCode | String | 计费编码 |
| chargeName | String | 计费名称 |
| unitPrice | BigDecimal | 单价 |
| qty | Integer | 数量 |
| chargeWeight | BigDecimal | 计费重量 |
| amount | BigDecimal | 原币金额 |
| currency | String | 原币币种 |
| standardCurrencyAmount | BigDecimal | 本位币金额 |
| standardCurrencyCode | String | 本位币币种 |
| standardCurrencyRate | BigDecimal | 本位币汇率 |
| revenueNo | String | 费用流水号 |
| chargeDate | Date | 计费日期 |
| syncTime | Date | 同步时间 |
| deductionDate | Date | 扣费时间 |
| priceVersion | String | 价格版本 |
| startZone | String | 起始分区 |
| endZone | String | 目的分区 |
| startGrade | String | 等级起点 |
| endGrade | String | 等级终点 |
| countRate | BigDecimal | 计费重转换率 |
| priceRate | BigDecimal | 价格调整率 |
| chargeUnit | String | 计费单位名称 |
| chargeUnitCode | String | 计费单位编码 |
| priceType | String | 价卡类型 |
| way | String | 计费方式 |
| modKey | String | 取模值 |
| isNeedSyncSMS | String | 是否需要同步财务 |
| startDistrict | String | 起始分区 |
| endDistrict | String | 结束分区 |
| source | String | 费用来源 |
| sourceDocNo | String | 来源单据号 |
| sourceTransactionNo | String | 来源交易号 |
| billingResultId | Long | 账单详情 ID |

---

## 公共响应结构

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 返回码，`0` 表示成功 |
| msg | String | 返回消息 |
| data | Object | 返回数据（VaOrderRevenueVo） |


