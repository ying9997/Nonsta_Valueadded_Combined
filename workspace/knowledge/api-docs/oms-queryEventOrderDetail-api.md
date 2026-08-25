# oms.unusualEventOrder.queryEventOrderDetail — 查询异常事件单详情

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `oms.unusualEventOrder.queryEventOrderDetail` |
| 接口路径 | `POST /oms/unusualEventOrder/queryEventOrderDetail` |
| 接口描述 | 查询指定异常事件单的完整详情，包含事件信息、关联货物、费用及附件 |
| 系统 | openapi → oms（Dubbo RPC） |
| 权限控制 | 仅允许查询当前客户关联的异常事件单 |

---

## 公共请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| action | String | 是 | - | 固定值 `oms.unusualEventOrder.queryEventOrderDetail` |
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
| eventDetailId | Long | 是 | 异常事件单详情 ID |

### 请求示例

```json
{
  "action": "oms.unusualEventOrder.queryEventOrderDetail",
  "app_key": "your_app_key",
  "client_id": "your_client_id",
  "timestamp": "1624080000000",
  "version": "1.0",
  "sign": "md5_hash_value",
  "sign_method": "md5",
  "format": "json",
  "language": "zh_CN",
  "data": {
    "eventDetailId": 123456
  }
}
```

---

## 响应数据

返回 `UnusualEventOrderDetailVo` 对象。

### UnusualEventOrderDetailVo — 异常事件单详情

| 字段 | 类型 | 说明 |
|------|------|------|
| orderNo | String | Winit 订单号 |
| docNo | String | 增值单号 |
| sgCode | String | 关联 SG 编码 |
| sgName | String | 关联 SG 名称 |
| eventAttribute | String | 异常属性编码 |
| eventAttributeName | String | 异常属性名称 |
| status | String | 异常单状态 |
| eventName | String | 异常名称 |
| isCharge | String | 是否需要收费（Y/N） |
| chargingStatus | String | 收费状态 |
| estimateAffectedSLA | BigDecimal | 预计影响 SLA |
| actualAffectedSLA | BigDecimal | 实际影响 SLA |
| slaUnit | String | SLA 单位 |
| eventDefinition | String | 异常定义 |
| eventProcessFlow | String | 异常处理流程 |
| cabinetNo | String | 柜号 |
| reservationOrderNo | String | 预约单号 |
| packageQty | int | 包裹数量 |
| subPackageQty | int | 子包裹数量 |
| merchandiseQty | int | 商品数量 |
| itemQty | int | 单品数量 |
| warehouseCode | String | 所属仓库编码 |
| warehouseName | String | 所属仓库名称 |
| isNeedFeedback | String | 是否需要客户反馈（Y/N） |
| remark | String | 备注 |
| isVirtualPackage | String | 是否虚拟包裹（Y/N） |
| isBoxToSingle | String | 是否箱子转单一（Y/N） |
| isMerge | String | 是否合并（Y/N） |
| exceptionNode | String | 异常节点编码 |
| exceptionNodeName | String | 异常节点名称 |
| exceptionPlace | String | 异常地点编码 |
| exceptionPlaceName | String | 异常地点名称 |
| exceptionObject | String | 异常对象编码 |
| exceptionObjectName | String | 异常对象名称 |
| vascCode | String | VASC 编码 |
| expectedDestroyDate | String | 预计销毁日期 |
| vaOrderNos | List\<String\> | 关联增值单号列表 |
| attachmentList | List\<UnusualEventOrderAttachmentVo\> | 附件列表，见下 |
| unusualEventOrderVos | List\<UnusualEventOrderVo\> | 关联异常单列表，见下 |

### UnusualEventOrderAttachmentVo — 附件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| eventNo | String | 事件单号 |
| fileName | String | 文件名称 |
| fileUrl | String | 文件 URL |
| packageSernoList | List\<String\> | 包裹条码列表 |

### UnusualEventOrderVo — 关联异常单

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| eventNo | String | 事件单号 |
| eventCode | String | 事件编码 |
| eventName | String | 异常事件名称 |
| eventAttribute | String | 异常属性 |
| orderNo | String | 订单号 |
| winitProductCode | String | Winit 产品编码 |
| customerCode | String | 客户编码 |
| customerName | String | 客户名称 |
| estimateAffectedSla | BigDecimal | 预计受影响 SLA |
| actualAffectedSla | BigDecimal | 实际受影响 SLA |
| sgName | String | SG 名称 |
| sgCode | String | SG 编码 |
| responsiblePatry | String | 责任方 |
| status | String | 异常单状态 |
| chargingStatus | String | 计费状态 |
| eventDefinition | String | 事件定义 |
| eventProcessFlow | String | 事件处理流程 |
| isCharge | String | 是否收费（Y/N） |
| isCost | String | 是否需要成本（Y/N） |
| isInfrom | String | 是否已邮件通知客户（Y/N） |
| isNeedInform | String | 是否需要邮件通知客户（Y/N） |
| warehouseCode | String | 所属仓库编码 |
| warehouseName | String | 所属仓库名称 |
| supplierCode | String | 供应商编码 |
| supplierName | String | 供应商名称 |
| packageQty | Integer | 包裹数量 |
| merchandiseQty | Integer | 商品数量 |
| itemQty | Integer | 单品数量 |
| subPackageQty | Integer | 子包裹数量 |
| workOrderType | String | 工单类型 |
| workorderNo | String | 工单号 |
| relationId | Long | 异常关联表主键 |
| onwardVoyageType | String | 承运方式（Winit / Direct） |
| cabinetQty | Integer | 柜数 |
| cabinetNo | String | 柜号 |
| reservationNo | String | 预约单号 |
| reservationQty | Integer | 预约单数 |
| mergeType | String | 合并类型（INIT-未合并 / M-主单 / S-子单） |
| mainEventNo | String | 主异常单号 |
| externalAttributes | List\<UnusualEventExternalAttributeVo\> | 其他属性列表，见下 |
| packages | List\<UnusualEventPackageVo\> | 包裹列表，见下 |
| merchandises | List\<UnusualEventMerchandiseVo\> | 商品列表，见下 |
| items | List\<UnusualEventItemVo\> | 单品列表 |
| subPackages | List\<UnusualEventSubPackageVo\> | 子包裹列表 |
| receiveables | List\<UnusualEventReceiveablesVo\> | 应收费用列表 |
| payables | List\<UnusualEventPayablesVo\> | 应付成本列表 |
| attachments | List\<UnusualEventOrderAttachmentVo\> | 附件列表 |

### UnusualEventExternalAttributeVo — 外部属性

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| eventNo | String | 事件单号 |
| attributeName | String | 属性名称（编码） |
| attributeDesc | String | 属性描述 |
| attributeDimension | String | 属性维度 |
| attributeValue | String | 属性值 |

### UnusualEventPackageVo — 包裹信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| eventNo | String | 事件单号 |
| orderNo | String | 订单号 |
| packageSerno | String | 包裹条码 |
| status | String | 包裹状态 |
| packageLevel | String | 包裹等级 |
| thirdPartyCaseNo | String | 第三方包裹条码 |
| warehouseWeighWeight | BigDecimal | 仓库称重重量（kg） |
| packageWeight | BigDecimal | 包裹重量（kg） |
| packageDetailsCount | int | 包裹商品详情数量汇总 |
| packageDetailsList | List\<UnusualEventPackageDetailVo\> | 包裹商品详情列表 |

### UnusualEventMerchandiseVo — 商品信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| eventNo | String | 事件单号 |
| orderNo | String | 订单号 |
| merchandiseCode | String | 商品编码 |
| merchandiseSerno | String | 商品条码（M 码） |
| thirdPartyCode | String | 第三方商品条码 |
| nameCn | String | 商品中文名称 |
| nameEn | String | 商品英文名称 |
| skuType | String | SKU 类型 |
| specification | String | 商品规格 |
| standardPartsQty | Integer | 标准件数 |
| unusualCount | Integer | 异常商品数量 |
| status | String | 商品状态 |

---

## 公共响应结构

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 返回码，`0` 表示成功 |
| msg | String | 返回消息 |
| data | Object | 返回数据（UnusualEventOrderDetailVo） |
