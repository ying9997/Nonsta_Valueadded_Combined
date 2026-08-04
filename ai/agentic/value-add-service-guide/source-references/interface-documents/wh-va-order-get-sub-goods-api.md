---
title: wh.va.order.getSubGoods — 查询增值订单子货物列表
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/wh-va-order-get-sub-goods-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# wh.va.order.getSubGoods — 查询增值订单子货物列表

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `wh.va.order.getSubGoods` |
| 接口路径 | `POST /wh/va/order/getSubGoods` |
| 接口描述 | 分页查询指定增值订单下指定父货物的子货物列表 |
| 系统 | openapi → oms2（Dubbo RPC） |
| 权限控制 | 仅允许查询当前客户下的增值单 |

---

## 公共请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| action | String | 是 | - | 固定值 `wh.va.order.getSubGoods` |
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
| parentId | Long | 否 | 父级货物 ID |
| pageVo | PageVo | 否 | 分页参数，见下 |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | - | 排序字段 |
| direction | String | 否 | - | 排序方向（ASC/DESC） |

### 请求示例

```json
{
  "action": "wh.va.order.getSubGoods",
  "app_key": "your_app_key",
  "client_id": "your_client_id",
  "timestamp": "1624080000000",
  "version": "1.0",
  "sign": "md5_hash_value",
  "sign_method": "md5",
  "format": "json",
  "language": "zh_CN",
  "data": {
    "orderNo": "V106075100",
    "parentId": 123456,
    "pageVo": {
      "pageNo": 1,
      "pageSize": 20
    }
  }
}
```

---

## 响应数据

返回 `Page<CommonGoodsVo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| pageNo | Integer | 当前页码 |
| pageSize | Integer | 每页条数 |
| totalCount | Long | 总条数 |
| list | List\<CommonGoodsVo\> | 子货物列表 |

### CommonGoodsVo — 货物信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 货物 id |
| parentId | Long | 父级货物 id |
| goodsType | String | 货物类型（单品 / 根节点包裹 / 箱套子包裹 / 柜 / 托 / 根节点） |
| goodsBarcode | String | 货物条码 |
| thirdGoodsBarcode | String | 第三方条码 |
| goodsGrade | String | 商品等级 |
| goodsKey | String | 货物唯一标识符 |
| originGoodsKey | String | 原始货物 key |
| idCode | String | 唯一标识码 |
| idCodeType | String | 唯一标识码类型 |
| orderNo | String | 单号 |
| orderNoType | String | 单号类型 |
| status | String | 货物状态 |
| qty | Integer | 数量 |
| usableQty | Integer | 可用库存数 |
| isFullData | String | 是否全量数据（Y/N） |
| isBox | boolean | 是否是箱产品 |
| hasChildren | boolean | 是否存在子级 |
| snapshotId | Long | 货物快照 ID |
| isForecastOrder | String | 是否无箱单预报订单（Y/N） |
| merchandise | CommonMerchandiseVo | 货物商品信息，见下 |
| sizeWeight | SizeWeightVo | 尺重信息，见下 |
| classificationInventory | ClassificationInventoryVo | 分类库存信息，见下 |
| platform | PlatformVo | 平台信息，见下 |
| businessOrder | GoodsSnapshotBusinessOrder | 快照业务单信息，见下 |
| attachmentUrlList | List\<CommonFileVo\> | 附件列表，见下 |
| subGoodsList | List\<CommonGoodsVo\> | 子货物列表（递归） |
| parentGoods | CommonGoodsVo | 父级货物数据（递归） |

### CommonMerchandiseVo — 商品信息

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| merchandiseId | Long | 商品 id |
| merchandiseCode | String | 商品编码 |
| managementType | String | 管理类型 |
| merchandiseSerno | String | 商品条码（M 码） |
| merchandiseName | String | 商品名称 |
| skuType | String | SKU 类型 |
| specification | String | 规格 |
| skuStandardQuantity | Integer | 库存单元标准件数 |
| commonMerchandiseFeatures | List\<CommonMerchandiseFeatureVo\> | 商品特性（featureCode / featureType / featureValue） |
| customerInvAttrs | List\<CustomerInvAttrVo\> | 自定义分类库存属性枚举值 |

### SizeWeightVo — 尺重信息

| 字段 | 类型 | 说明 |
|------|------|------|
| length | BigDecimal | 长（cm） |
| width | BigDecimal | 宽（cm） |
| height | BigDecimal | 高（cm） |
| weight | BigDecimal | 重量（kg） |
| volume | BigDecimal | 体积（cm³） |

### ClassificationInventoryVo — 分类库存

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| barcodeValue | String | 条码值 |
| batchAttribute | String | 批次属性 |
| batchManagementType | String | 批次管理类型 |
| productGrade | String | 商品等级 |
| batchDate | Date | 批次日期（格式 yyyy-MM-dd，时区 GMT+8） |
| batchNo | String | 批次号 |
| winitBatchNo | String | Winit 批次号 |
| qty | Integer | 数量 |
| customerInvAttr | String | 自定义库存属性编码 |
| customerInvAttrName | String | 自定义库存属性名称（仅展示） |
| isCustomerBatch | String | 是否自定义分类库存属性管理（Y/N） |

### PlatformVo — 平台信息

| 字段 | 类型 | 说明 |
|------|------|------|
| platformSellerId | String | 平台卖家编码 |
| platformBuyerId | String | 平台买家编码 |

### GoodsSnapshotBusinessOrder — 快照业务单

| 字段 | 类型 | 说明 |
|------|------|------|
| businessId | Long | 业务单 id |
| businessNo | String | 业务单号 |
| businessNode | String | 业务单节点 |
| businessType | String | 业务单类型（入库 / 出库） |
| parentBusinessOrder | GoodsSnapshotBusinessOrder | 父级业务单（递归） |

### CommonFileVo — 附件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| fileName | String | 文件名称 |
| url | String | 文件地址 |
| type | String | 文件类型（IMAGE / EXCEL） |
| fileType | String | 文件业务类型 |
| direction | String | 方向 |
| attrId | Long | 属性 ID |

---

## 公共响应结构

| 字段 | 类型 | 说明 |
|------|------|------|
| code | String | 返回码，`0` 表示成功 |
| msg | String | 返回消息 |
| data | Object | 返回数据（分页结果） |


