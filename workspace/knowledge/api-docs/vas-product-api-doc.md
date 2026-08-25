# 增值产品接口文档

> 生成时间：2026-07-20  
> 覆盖接口：pms.vasc 系列 + wh.va.order 产品信息系列

---

## 一、pms.vasc 系列（增值产品查询）

### 1. pms.vasc.listAttributeSelectByTypeList

**说明：** 查询属性选择列表（按类型）

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| typeList | Array\<String\> | 否 | 属性类型列表 |

**响应参数：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Map\<String, Map\<String, String\>\> | 属性类型 → (属性值 → 属性值描述) 的二级映射 |

---

### 2. pms.vasc.listAllVasc

**说明：** 查询所有可用 VASC，通用接口，支持属性过滤

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| inspectionMode | String | 否 | 验货类型 |
| exceptionEventCodeSet | Array\<String\> | 否 | 异常事件编码集合 |
| pscgCode | String | 否 | 产品组编码 |
| warehouseCode | String | 否 | 仓库编码 |
| orderNo | String | 否 | 增值单号 |
| addValueEntry | String | 否 | 增值入口 |
| pscCode | String | 否 | 产品编码 |
| attributeQueryList | Array\<Object\> | 否 | 属性过滤列表，每项包含 vascAttributeType（属性类型）和 vascAttributeValue（属性值） |

**响应参数：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array\<VascBaseInfoVo\> | VASC 基础信息列表 |
| data[].vascCode | String | VASC 编码 |
| data[].vascName | String | VASC 名称 |
| data[].vascAttributeMap | Map\<String, String\> | VASC 属性映射 |

**备注：** 内部支持并行查询（queryVascList / getVaOrderBasicInfo / getConfig），线程池拒绝或超时时自动降级为串行。

---

### 3. pms.vasc.listInboundVasc

**说明：** 查询入库增值的 VASC 列表

**请求参数：** 同 `pms.vasc.listAllVasc`，场景限定为入库。

**响应参数：** 同 `pms.vasc.listAllVasc`。

---

### 4. pms.vasc.listInboundVascWithDetail

**说明：** 查询入库 VASC 及详情（含覆盖标签规则）

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| inboundOrderNo | String | 否 | 入库单号 |
| pscCode | String | 否 | 产品编码 |
| （其余同 listAllVasc） | | | |

**响应参数：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array\<Object\> | VASC 列表，含详情和拆分规则 |

**备注：** 检测 VASC 是否包含覆盖标签原子（OW01V1736），如包含则按覆盖标签规则数量拆分 VASC 返回。

---

### 5. pms.vasc.getVascInfo

**说明：** 查询单个 VASC 详情（含原子列表）

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vascCode | String | 是 | 增值服务编码 |
| vaOrderNo | String | 否 | 增值单号 |
| shelveWay | String | 否 | 处理方式 |

**响应参数：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array\<Array\<VascItem\>\> | 按互斥组分组的原子列表 |
| data[][].mutexGroup | String | 互斥组 |
| data[][].eventCode | String | 事件编码 |
| data[][].required | String | 是否必填 |
| data[][].name | String | 名称 |
| data[][].vasEventDesc | String | 事件描述 |
| data[][].isDisable | String | 是否禁用 |
| data[][].disableReason | String | 禁用原因 |
| data[][].isShow | String | 是否显示 |
| data[][].attrs | Array\<BaseAttrRel\> | 属性列表 |

---

## 二、wh.va.order 产品信息系列

### 1. wh.va.order.getVasList

**说明：** 查询增值单的原子列表

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号 |
| businessNo | String | 否 | 业务单号 |
| orderEntry | String | 否 | 增值单下单入口 |
| pageVo.pageNum | Integer | 否 | 页码（默认 1） |
| pageVo.pageSize | Integer | 否 | 每页条数 |

**响应参数：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list | Array\<VaAtomVo\> | 增值原子列表 |
| data.total | Long | 总条数 |
| data.list[].id | Long | ID |
| data.list[].orderNo | String | 增值订单号 |
| data.list[].winitOrderNo | String | Winit 订单号 |
| data.list[].winitProductCode | String | Winit 产品编码 |
| data.list[].winitProductName | String | Winit 产品名称 |
| data.list[].serviceCode | String | 服务编码（原子编码） |
| data.list[].serviceName | String | 服务名称 |
| data.list[].serviceDesc | String | 服务描述 |
| data.list[].verdorCode | String | 供应商编码 |
| data.list[].verdorName | String | 供应商名称 |
| data.list[].vendorServiceCode | String | 供应商服务编码 |
| data.list[].vendorServiceName | String | 供应商服务名称 |
| data.list[].status | String | 状态 |
| data.list[].statusDesc | String | 状态描述 |
| data.list[].partCompleteReason | String | 部分完成/退回原因 |
| data.list[].serviceSequence | String | 原子序号 |
| data.list[].returnReason | String | 回退原因 |
| data.list[].completeTime | Date | 完成时间 |
| data.list[].timeZone | String | 时区 |
| data.list[].workOrderNo | String | 单据号 |
| data.list[].serviceNode | String | 服务节点 |
| data.list[].serviceType | String | 增值类型 |
| data.list[].serviceObject | String | 服务对象 |
| data.list[].executeOrder | Integer | 执行顺序 |
| data.list[].orderCount | Integer | 下单数量 |
| data.list[].handleCount | Integer | 实际完成数量 |
| data.list[].vasType | String | 增值类型（标准增值/非标增值） |
| data.list[].vasDes | String | 增值需求描述 |
| data.list[].sop | String | 仓库操作 SOP |
| data.list[].calculateType | String | 收入成本计算类型 |
| data.list[].sceneOverviewCode | String | 增值审核场景概述编码 |
| data.list[].sceneOverviewName | String | 增值审核场景概述名称 |
| data.list[].vasc | Object | 关联 VASC 信息 |
| data.list[].vaExecuteOrderGoods | Array | 增值执行单货物 |
| data.list[].vaAtomAttrs | Array | 增值执行属性 |
| data.list[].vaAtomFiles | Array | 增值执行附件 |
| data.list[].vaExecuteCommands | Array | 增值执行指令 |
| data.list[].vaAtomResults | Array | 增值执行结果 |
| data.list[].vaExecutionRequirement | Object | 增值执行要求（不同原子类型有不同实现） |

---

### 2. wh.va.order.getVaAtomDetails

**说明：** 查询增值原子详情

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号 |
| parentId | Long | 否 | 父级货物 ID |
| serviceCode | String | 否 | 增值原子编码 |
| serviceSequence | String | 否 | 增值原子序号 |
| eventNo | String | 否 | 异常单号 |

**响应参数（VaAtomDetailsVo，继承 CommonGoodsVo）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array\<VaAtomDetailsVo\> | 增值原子详情列表 |
| data[].id | Long | 货物 ID |
| data[].parentId | Long | 父级货物 ID |
| data[].goodsType | String | 货物类型（单品/包裹/箱套/柜/托/根节点） |
| data[].goodsBarcode | String | 货物条码 |
| data[].thirdGoodsBarcode | String | 第三方条码 |
| data[].goodsGrade | String | 商品等级 |
| data[].merchandise | Object | 货物商品信息 |
| data[].qty | Integer | 数量 |
| data[].usableQty | Integer | 可用库存数 |
| data[].sizeWeight | Object | 尺重信息 |
| data[].classificationInventory | Object | 分类库存 |
| data[].platform | Object | 平台信息 |
| data[].subGoodsList | Array | 子货物列表 |
| data[].hasChildren | Boolean | 是否存在子级 |
| data[].orderNo | String | 单号 |
| data[].orderNoType | String | 单号类型 |
| data[].idCode | String | 唯一标识码 |
| data[].idCodeType | String | 唯一标识码类型 |
| data[].status | String | 货物状态 |
| data[].orderCount | Integer | 下单数量 |
| data[].handleCount | Integer | 实际完成数量 |
| data[].orderLabelQty | Integer | 下单时的贴标数量 |
| data[].isVaObject | Boolean | 当前货物是否为增值对象 |
| data[].handleResult | Map\<String, Object\> | 处理结果 |
| data[].collectLabelExample | Array\<CollectLabelRequirementVo\> | 采集条码示例图 |

---

### 3. wh.va.order.getMerchandiseList

**说明：** 查询增值订单商品列表

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号 |
| serviceCode | String | 否 | 原子编码 |
| serviceSequence | String | 否 | 原子序号 |
| pageVo.pageNum | Integer | 否 | 页码 |
| pageVo.pageSize | Integer | 否 | 每页条数 |

**响应参数（VaOrderMerchandiseVo）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list | Array\<VaOrderMerchandiseVo\> | 商品列表 |
| data.list[].merchandiseCode | String | 商品编码 |
| data.list[].specification | String | 规格 |
| data.list[].skuType | String | 商品类型 |
| data.list[].skuStandardQuantity | Integer | 库存单元标准件数 |
| data.list[].productGrade | String | 商品等级 |
| data.list[].barcodeValue | String | 条码值 |
| data.list[].sizeWeight | Object | 尺重信息 |
| data.list[].quantity | Integer | 数量 |
| data.list[].usableQty | Integer | 可用库存数 |
| data.list[].batchList | Array\<ClassificationInventoryVo\> | 批次信息列表 |
| data.list[].itemList | Array\<VaItemVo\> | 单品信息列表 |
| data.list[].idCode | String | 唯一标识码 |
| data.list[].idCodeType | String | 唯一标识码类型 |
| data.list[].orderNo | String | 单号 |
| data.list[].orderNoType | String | 单号类型 |

---

### 4. wh.va.order.getSubGoods

**说明：** 查询增值订单子货物列表

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号 |
| parentId | Long | 否 | 父级货物 ID |
| pageVo.pageNum | Integer | 否 | 页码 |
| pageVo.pageSize | Integer | 否 | 每页条数 |

**响应参数（CommonGoodsVo）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list | Array\<CommonGoodsVo\> | 子货物列表 |
| data.list[].id | Long | 货物 ID |
| data.list[].parentId | Long | 父级货物 ID |
| data.list[].goodsType | String | 货物类型 |
| data.list[].goodsBarcode | String | 货物条码 |
| data.list[].thirdGoodsBarcode | String | 第三方条码 |
| data.list[].goodsGrade | String | 商品等级 |
| data.list[].merchandise | Object | 货物商品信息 |
| data.list[].qty | Integer | 数量 |
| data.list[].usableQty | Integer | 可用库存数 |
| data.list[].sizeWeight | Object | 尺重信息 |
| data.list[].classificationInventory | Object | 分类库存 |
| data.list[].platform | Object | 平台信息 |
| data.list[].subGoodsList | Array | 子货物列表 |
| data.list[].hasChildren | Boolean | 是否存在子级 |
| data.list[].orderNo | String | 单号 |
| data.list[].orderNoType | String | 单号类型 |
| data.list[].idCode | String | 唯一标识码 |
| data.list[].idCodeType | String | 唯一标识码类型 |
| data.list[].status | String | 货物状态 |
| data.list[].snapshotId | Long | 货物快照 ID |
| data.list[].isForecastOrder | String | 是否无箱单预报订单（Y/N） |

---

### 5. wh.va.order.getCombinationMerchandiseInfo

**说明：** 查询组套商品信息（组合后结果）

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vaOrderNo | String | 否 | 增值订单号 |
| serviceCode | String | 否 | 增值原子编码 |
| serviceSequence | String | 否 | 增值原子序号 |
| pageVo.pageNum | Integer | 否 | 页码 |
| pageVo.pageSize | Integer | 否 | 每页条数 |

**响应参数（CombinationMerchandiseVo）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data.list[].groupNo | String | 组合组号 |
| data.list[].groupQty | Integer | 组合数量 |
| data.list[].combinationalMerchandiseCode | String | 组合后商品编码 |
| data.list[].combinationalSpecification | String | 组合后商品规格 |
| data.list[].combinationalSkuType | String | 组合后 SKU 类型 |
| data.list[].combinationalSkuTypeDesc | String | 组合后 SKU 类型描述 |
| data.list[].combinationalSkuStandardQuantity | Integer | 组合后库存单元标准件数 |
| data.list[].combinationalGoodsBarcode | String | 组合后商品实物贴标条码 |
| data.list[].labelType | String | 组合后商品条码类型 |
| data.list[].combinationalOrderPackingWay | String | 下单的包装方式 |
| data.list[].combinationalOrderPackingWayDesc | String | 下单的包装方式描述 |
| data.list[].combinationalOrderPackingMaterialsType | String | 下单的包材类型 |
| data.list[].combinationalOrderPackingMaterialsTypeDesc | String | 下单的包材类型描述 |
| data.list[].combinationalOrderPackagingModel | String | 下单的包材规格 |
| data.list[].finishedGroupQty | Integer | 实际完成的增值数量 |
| data.list[].combinationalGoodsGrade | String | 商品等级 |
| data.list[].combinationalGoodsGradeDesc | String | 商品等级描述 |
| data.list[].combinationalBatchNo | String | 批次号 |
| data.list[].combinationalBatchDate | String | 批次日期 |
| data.list[].combinationWorkHours | BigDecimal | 组合操作工时（小时） |

---

### 6. wh.va.order.getCombinationOriginalInfo

**说明：** 查询组套原始信息（组合前的原始商品）

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vaOrderNo | String | 否 | 增值订单号 |
| serviceCode | String | 否 | 增值原子编码 |
| serviceSequence | String | 否 | 增值原子序号 |
| groupNo | String | 否 | 组合组号 |

**响应参数：** 组合前原始商品信息列表（字段结构同商品 VO）

---

### 7. wh.va.order.getSplitMerchandiseList

**说明：** 查询拆套商品列表

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| vaOrderNo | String | 否 | 增值订单号 |
| serviceCode | String | 否 | 增值原子编码 |
| serviceSequence | String | 否 | 增值原子序号 |
| groupNo | String | 否 | 拆分组号 |

**响应参数：** 拆分后商品明细列表（字段结构同商品 VO）

---

### 8. wh.va.order.queryVaDgMerchandise

**说明：** 查询增值危险品商品

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| orderNo | String | 否 | 增值订单号 |
| （其余参数参考 QueryVaOrderCommand） | | | |

**响应参数：** 危险品商品信息列表

---

### 9. wh.va.order.queryPackingMaterial

**说明：** 查询包装材料

**请求参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| warehouseCode | String | 否 | 仓库编码 |
| packagingType | String | 否 | 包装方式 |

**响应参数：**

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Array\<PackagingMethodVo\> | 包装材料列表 |
| data[].packagingMethod | String | 包材类型 |
| data[].packagingMethodName | String | 包材类型名称 |

---

## 三、通用说明

### 请求结构
所有接口通过 `RequestMsg` 传参，业务参数放在 `data` 字段（JSON 字符串或 JSON 对象）。

### 响应结构
```json
{
  "code": "0",
  "message": "success",
  "data": { ... }
}
```

### 分页参数（PageVo）

| 字段 | 类型 | 说明 |
|------|------|------|
| pageNum | Integer | 页码，从 1 开始 |
| pageSize | Integer | 每页条数 |

