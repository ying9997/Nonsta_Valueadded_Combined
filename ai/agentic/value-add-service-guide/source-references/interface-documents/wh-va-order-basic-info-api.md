---
title: wh.va.order.basicInfo — 增值单基本信息查询接口
type: reference
entity_type: interface_reference
tags: [interface-reference, value-added-service, reference]
source_refs: ["source-references/interface-documents/wh-va-order-basic-info-api.md"]
updated: 2026-06-22
confidence: medium
fidelity: preserve
status: active
---
# wh.va.order.basicInfo — 增值单基本信息查询接口

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口路径 | `POST /wh/va/order/basicInfo` |
| 接口描述 | 查询指定增值订单的完整基本信息 |
| 系统 | openapi → oms2（Dubbo RPC） |
| 权限控制 | 仅允许查询当前客户下的增值单 |

---

## 公共请求参数

所有接口的请求体均为 JSON，包含以下公共字段：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| action | String | 是 | - | 接口名称，固定值 `wh.va.order.basicInfo` |
| app_key | String | 是 | - | 用户名 / 应用密钥 |
| client_id | String | 是 | - | 客户端 ID，由注册时系统分配 |
| timestamp | String | 是 | - | 请求时间戳（毫秒） |
| sign | String | 是 | - | 签名值，见签名说明 |
| sign_method | String | 否 | `md5` | 签名方式 |
| version | String | 否 | `1.0` | API 版本号 |
| format | String | 否 | `json` | 返回格式 |
| platform | String | 否 | - | 平台标识 |
| language | String | 否 | `zh_CN` | 语言 |
| data | Object | 是 | - | 业务参数，见下方业务参数说明 |

### 签名说明

按以下顺序拼接字符串后进行 MD5 加密：

```
token + "action" + action + "app_key" + app_key + "data" + data
     + "format" + format + "platform" + platform + "sign_method" + sign_method
     + "timestamp" + timestamp + "version" + version + token
```

> `token` 为与 `app_key` 对应的用户密钥，不参与传输。

---

## 业务请求参数（data 字段）

`data` 为 JSON 对象，字段如下：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 是 | 增值订单号（前缀 `V`，如 `V106075100`） |

### 完整请求示例

```json
{
  "action": "wh.va.order.basicInfo",
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

`data` 字段为 `VaOrderVo` 对象。

### 顶层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 增值单 id |
| orderNo | String | 增值单号 |
| status | String | 状态编码 |
| statusDesc | String | 状态描述（已翻译） |
| processCode | String | 流程编码 |
| businessType | String | 订单类型编码 |
| businessTypeDesc | String | 订单类型描述 |
| orderSource | String | 订单来源编码 |
| orderSourceDesc | String | 订单来源描述 |
| orderDate | Date | 下单时间 |
| cancelDate | Date | 取消时间 |
| cancelReason | String | 取消原因 |
| failReason | String | 取消失败原因 |
| estimateCompleteTime | Date | 预计完成时间 |
| estimateCompleteTimeStr | String | 预计完成时间（格式化） |
| actualCompleteTime | Date | 实际完成时间 |
| actualCompleteTimeStr | String | 实际完成时间（格式化） |
| estimateAuditTime | Date | 预计审核时间 |
| estimateAuditTimeStr | String | 预计审核时间（格式化） |
| actualAuditTime | Date | 实际审核时间 |
| actualAuditTimeStr | String | 实际审核时间（格式化） |
| estimateCustomerConfirmTime | Date | 预计客户确认时间 |
| estimateCustomerConfirmTimeStr | String | 预计客户确认时间（格式化） |
| actualCustomerConfirmTime | Date | 实际客户确认时间 |
| actualCustomerConfirmTimeStr | String | 实际客户确认时间（格式化） |
| orderMerchandiseQty | Integer | 订单商品数量 |
| isSelectAllGoods | String | 是否选择所有货物（Y/N） |
| merchandiseDimension | String | 商品维度 |
| vaOrderGoodsListUrl | String | 货物导入 URL |
| vaSource | String | 增值来源（入库单 / 出库单 / 库内单 / 异常单） |
| goodsOperationType | String | 货物操作类型：NEW / COVER / EDIT |
| whetherSpecifiedSi | String | 是否指定单品（Y/N） |
| newInboundOrderNo | String | 新单上架生成的新入库单号 |
| pscgCode | String | PSCG 编码 |
| isStoreTemporarily | String | 商品是否暂存（Y/N） |
| supportReVa | String | 是否支持再次增值（Y/N） |
| isInHouseReVaOrder | boolean | 是否再次创建增值 |
| isInHouseUnusualEventVa | boolean | 是否库内异常增值 |
| supportCancel | String | 是否支持取消（Y/N） |
| submiterType | String | 提交人类型：CUSTOMER / WINIT |
| submitter | String | 订单提交人 |
| orderEntry | String | 增值单下单入口 |
| isArrangeVasc | String | 是否需要重新编排 VASC（Y/N） |
| isAuditThrough | String | 是否审核通过（Y/N） |
| deliveryType | String | 增值下发类型：CUSTOMER / WINIT |
| inquiryMode | String | 询价模式编码 |
| inquiryModeName | String | 询价模式名称 |
| fbaShipmentId | String | FBA Shipment ID |
| fbaReferenceNo | String | FBA Reference No. |
| noActionRequired | String | 无需录入动作（Y/N） |
| isForecastOrder | String | 是否无箱单预报订单（Y/N） |
| needNotifyWarehouseOutboundMark | String | 是否通知仓库出库标记，默认 Y |
| voidSource | String | 作废来源 |
| voidOperationType | String | 作废操作类型 |
| forceVoid | String | 是否强制作废（Y/N），默认 N |
| warehouse | WarehouseVo | 仓库信息，见下 |
| customer | CustomerVo | 客户信息，见下 |
| vasc | VascVo | 增值产品信息，见下 |
| businessOrder | BusinessOrderVo | 业务单据信息，见下 |
| control | ControlVo | 控制信息，见下 |
| vaAtoms | List\<VaAtomVo\> | 增值原子列表，见下 |
| vaOrderGoods | List\<CommonGoodsVo\> | 增值单货物列表，见下 |

---

### WarehouseVo — 仓库信息

| 字段 | 类型 | 说明 |
|------|------|------|
| warehouseCode | String | 仓库编码 |
| warehouseName | String | 仓库名称 |
| countryCode | String | 仓库国家编码 |
| countryName | String | 仓库国家名称 |

---

### CustomerVo — 客户信息

| 字段 | 类型 | 说明 |
|------|------|------|
| customerCode | String | 客户编码 |
| customerName | String | 客户名称 |
| customerGroupCode | String | 客户群体编码 |
| customerGroupName | String | 客户群体名称 |
| sale | String | 销售代表 |
| customerService | String | 客服代表 |

---

### VascVo — 增值产品信息

| 字段 | 类型 | 说明 |
|------|------|------|
| productCode | String | 增值产品编码 |
| productName | String | 增值产品名称 |
| vascDesc | String | 增值产品说明 |
| vasType | String | 增值类型（标准增值 / 非标增值） |
| vasTypeName | String | 增值类型名称 |
| vasExecutor | String | 增值执行人（PD / 海外仓 / 运营 / 尾程询价负责人） |
| vaSection | String | 增值环节 |
| pscCode | String | PSC 编码 |
| sla | Integer | SLA 天数 |
| slaUnit | String | SLA 单位 |
| slaUnitCode | String | SLA 单位编码 |
| shelveWay | String | 上架方式 |
| shelveWayCode | String | 上架方式编码 |
| isAudit | String | 是否需要审核（是/否） |
| auditDepartment | String | 审核负责部门（PD / 商品组 / 仓库） |
| auditDepartmentCode | String | 审核负责部门编码 |
| isChangeAtom | String | 审核时是否可变更原子编排（是/否） |
| isNeedConfirm | String | 是否需要客户确认（Y/N） |
| isSupportNoBusinessOrder | String | 是否支持无业务单据（Y/N） |
| relatedPsc | PscVo | 关联 PSC 信息（productCode / productName） |

---

### BusinessOrderVo — 业务单据信息

| 字段 | 类型 | 说明 |
|------|------|------|
| businessId | Long | 业务单 id |
| parentId | Long | 父级 id |
| businessNo | String | 业务单号 |
| businessNode | String | 业务单节点 |
| businessType | String | 业务单类型编码（入库 / 出库） |
| businessTypeDesc | String | 业务单类型描述 |
| status | String | 业务单状态 |
| pscgCode | String | 四级产品分类编码 |
| threePscgCode | String | 三级产品分类编码 |
| productCode | String | 业务单产品编码 |
| winitProductCode | String | 业务单 PSC 编码 |
| unusualName | String | 异常名称 |
| eventCode | String | 异常编码 |
| unusualObject | String | 异常对象 |
| unusualObjectName | String | 异常对象名称 |
| unusualFiles | List\<String\> | 异常图片 URL 列表 |
| inspectionMode | String | 入库单验货类型 |
| originalBusinessNo | String | 原业务单据号 |
| isForecastOrder | String | 入库单是否为无箱单订单（Y/N） |
| childBusinessOrders | List\<BusinessOrderVo\> | 关联的子业务单列表（递归） |

---

### ControlVo — 控制信息

| 字段 | 类型 | 说明 |
|------|------|------|
| vasObjectType | String | 增值对象类型（订单 / 包裹 / 商品 / 单品） |

---

### VaAtomVo — 增值原子

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 增值订单号 |
| winitOrderNo | String | Winit 订单号 |
| winitProductCode | String | Winit 产品编码 |
| winitProductName | String | Winit 产品名称 |
| serviceCode | String | 原子服务编码 |
| serviceName | String | 原子服务名称 |
| serviceDesc | String | 原子服务描述 |
| serviceSequence | String | 原子序号 |
| serviceNode | String | 服务节点 |
| serviceType | String | 增值类型 |
| serviceObject | String | 服务对象 |
| executeOrder | Integer | 执行顺序 |
| status | String | 状态编码 |
| statusDesc | String | 状态描述 |
| partCompleteReason | String | 部分完成 / 退回原因 |
| returnReason | String | 回退原因 |
| completeTime | Date | 完成时间 |
| timeZone | String | 时区 |
| workOrderNo | String | 单据号 |
| orderCount | int | 下单数量 |
| handleCount | int | 实际完成数量 |
| vasType | String | 增值类型（标准增值 / 非标增值） |
| vasDes | String | 增值需求描述 |
| sop | String | 仓库操作 SOP |
| calculateType | String | 收入成本计算类型（基于价格表定义 / 基于仓库作业动作） |
| sceneOverviewCode | String | 增值审核场景概述编码 |
| sceneOverviewName | String | 增值审核场景概述名称 |
| supportExportAtta | String | 是否支持导出附件（Y/N） |
| verdorCode | String | 供应商编码 |
| verdorName | String | 供应商名称 |
| vendorServiceCode | String | 供应商服务编码 |
| vendorServiceName | String | 供应商服务名称 |
| vasc | VascVo | 关联的 VASC 信息 |
| vaAtomAttrs | List\<VaAtomAttrVo\> | 增值执行属性列表，见下 |
| vaAtomFiles | List\<VaAtomFileVo\> | 增值执行附件列表，见下 |
| vaExecuteCommands | List\<VaExecuteCommandVo\> | 增值执行指令列表，见下 |
| vaAtomResults | List\<VaAtomResultVo\> | 增值执行结果列表，见下 |
| vaExecuteOrderGoods | List\<CommonGoodsVo\> | 增值执行单货物列表 |
| vaExecutionRequirement | VaExecutionRequirement | 增值执行要求（接口，见下） |

#### VaAtomAttrVo — 增值执行属性

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 订单号 |
| serviceCode | String | 服务编码 |
| attributeName | String | 属性名 |
| attributeKey | String | 属性键 |
| attributeValue | String | 属性值 |
| attributeValueName | String | 属性值名称 |
| attributeKeyOriginal | String | 原属性键 |
| attributeValueOriginal | String | 原属性值 |
| unit | String | 单位 |
| showType | String | 展示类型 |
| pulldownValue | String | 下拉选项值 |
| inputNode | String | 输入节点 |
| isRequired | String | 是否必填（Y/N） |
| defaultValue | String | 默认值 |
| minValue | BigDecimal | 最小值 |
| maxValue | BigDecimal | 最大值 |
| timeFormat | String | 时间格式 |
| fileFormat | String | 文件格式 |
| isCalculate | String | 是否作为计费单位字段（Y/N） |
| isPriceCard | String | 是否作为价卡适用条件（Y/N） |
| isShow | String | 是否展示给客户（Y/N） |

#### VaAtomFileVo — 增值执行附件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| orderNo | String | 订单号 |
| fileType | String | 文件类型 |
| fileName | String | 文件名称 |
| url | String | 文件地址 |
| containerNo | String | 容器号 |
| merchandiseSerno | String | M 码 |
| inputNode | String | 输入节点 |
| attrId | Long | 属性 ID |

#### VaExecuteCommandVo — 增值执行指令

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| inboundOrderNo | String | 目标入库单号 |
| vaAtomId | Long | 原子 id |
| commandType | String | 指令类型（换标指令 / 拍照指令） |
| goodsKey | String | 货物 id |
| serviceCode | String | 原子编码 |
| serviceSequence | String | 原子序号 |
| orderNo | String | 增值订单号 |

#### VaAtomResultVo — 增值执行结果

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| goodsKey | String | 货物标识 |
| vaAtomId | Long | 原子 id |
| serviceCode | String | 原子编码 |
| orderNo | String | 增值订单号 |
| resultJson | String | 实际结果 JSON |
| resultGoodsIds | String | 货物 id 列表 |
| serviceSequence | String | 增值原子序号 |

#### VaExecutionRequirement — 增值执行要求

接口类型，`serviceCode` 对应原子编码，已知实现：

| 实现类 | 说明 |
|--------|------|
| EmptyVaExecutionRequirement | 无执行要求 |
| LabelingVaExecutionRequirement | 贴标映射执行要求 |
| CombinationVaExecutionRequirement | 组套执行要求 |
| SplitVaExecutionRequirement | 拆套执行要求 |

---

### CommonGoodsVo — 货物

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
| sizeWeight | SizeWeightVo | 尺重信息（length/width/height/weight/volume） |
| classificationInventory | ClassificationInventoryVo | 分类库存信息，见下 |
| platform | PlatformVo | 平台信息（platformSellerId/platformBuyerId） |
| businessOrder | GoodsSnapshotBusinessOrder | 快照业务单（businessId/businessNo/businessNode/businessType） |
| attachmentUrlList | List\<CommonFileVo\> | 附件列表，见下 |
| subGoodsList | List\<CommonGoodsVo\> | 子货物列表（递归） |
| parentGoods | CommonGoodsVo | 父级货物数据 |

#### CommonMerchandiseVo — 商品信息

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
| commonMerchandiseFeatures | List\<CommonMerchandiseFeatureVo\> | 商品特性（featureCode/featureType/featureValue） |
| customerInvAttrs | List\<CustomerInvAttrVo\> | 自定义分类库存属性枚举值 |

#### ClassificationInventoryVo — 分类库存

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
| customerInvAttrName | String | 自定义库存属性名称 |
| isCustomerBatch | String | 是否自定义分类库存属性管理（Y/N） |

#### CommonFileVo — 附件

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Long | 主键 |
| fileName | String | 文件名称 |
| url | String | 文件地址 |
| type | String | 文件类型（IMAGE / EXCEL） |
| fileType | String | 文件业务类型（参考 VaCommonFileTypeEnum） |
| direction | String | 方向 |
| attrId | Long | 属性 ID |

---

## 错误说明

| 场景 | 说明 |
|------|------|
| orderNo 不属于当前客户 | 权限校验失败，返回错误 |
| orderNo 不存在 | 返回空或异常 |


