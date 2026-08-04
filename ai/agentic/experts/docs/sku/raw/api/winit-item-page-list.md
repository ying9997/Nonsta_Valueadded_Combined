# `winit.item.page.list` 接口文档

> **专家侧用法**（API 选型、`fetchProfile` 切片、响应剪枝）：[sku-data-fetch-strategy.md](../../../plan/sku-data-fetch-strategy.md)

**接口名称：** 商品分页列表查询  
**Action：** `winit.item.page.list`  
**HTTP 路径：** `POST /winit/item/page/list`  
**版本：** `2.0`

---

## 请求 Payload

```json
{
  "action": "winit.item.page.list",
  "version": "2.0",
  "data": {
    "queryType": "PUBLISHED",
    "itemCodes": ["M010000000001234001"],
    "skuCodes": ["SKU-001"],
    "name": "bluetooth headset",
    "importCountryCode": "DE",
    "status": "4",
    "isActive": "Y",
    "isReturn": "N",
    "firstLegType": "AIR",
    "isProhibitInbound": "N",
    "startDate": "2026-01-01",
    "endDate": "2026-07-14",
    "sort": "desc",
    "sortColumn": "created",
    "pageVo": {
      "pageNo": 1,
      "pageSize": 20
    }
  }
}
```

### 请求字段说明

#### 查询过滤字段

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `queryType` | String | 否 | 查询类型，见枚举。默认查全部 |
| `itemCodes` | List\<String\> | 否 | M码列表（系统内部商品编码） |
| `skuCodes` | List\<String\> | 否 | 客户定义 SKU 编码列表 |
| `thirdItemCodes` | List\<String\> | 否 | 第三方商品编码列表 |
| `conditionQueryType` | String | 否 | 编码匹配方式：`equals`（精确）/ `begin`（前缀） |
| `name` | String | 否 | 商品名称（英文或中文），模糊搜索 |
| `importCountryCode` | String | 否 | 进口国编码，如 `DE`、`US`、`GB` |
| `status` | String | 否 | 状态码（数字字符串），见枚举；queryType 指定时此字段作为子筛选 |
| `isActive` | String | 否 | 是否有效，`Y` / `N`，默认 `Y` |
| `isReturn` | String | 否 | 是否退货商品，`Y` / `N` |
| `firstLegType` | String | 否 | 头程类型，`AIR`（空运）/ `SEA`（海运）/ `EXPRESS`（快递）等 |
| `isProhibitInbound` | String | 否 | 是否禁止入库，`Y` / `N` |
| `supervisorMode` | String | 否 | 监管模式 |
| `isPackingMaterials` | String | 否 | 是否有包材配置，`Y` / `N` |
| `parcelType` | String | 否 | 包裹类型，见枚举 |
| `categoryId` | Long | 否 | 商品分类 ID |
| `startDate` | String | 否 | 创建时间开始，格式 `yyyy-MM-dd` |
| `endDate` | String | 否 | 创建时间结束，格式 `yyyy-MM-dd` |
| `querySupplementType` | String | 否 | 补充查询类型，固定值 `SUPPLEMENT_THRID_SKU`（查需补三方SKU商品） |
| `customExtensionField1` | String | 否 | 自定义扩展字段1 |
| `customExtensionField2` | String | 否 | 自定义扩展字段2 |
| `customExtensionField3` | String | 否 | 自定义扩展字段3 |
| `translateCodes` | List\<String\> | 否 | 需要翻译的配置父键列表，返回 `translates` 翻译表 |

#### 排序与分页

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sortColumn` | String | 否 | 排序字段，如 `created` |
| `sort` | String | 否 | 排序方向：`asc` / `desc` |
| `pageVo.pageNo` | Integer | 否 | 页码，从 1 开始，默认 1 |
| `pageVo.pageSize` | Integer | 否 | 每页条数，默认 20，建议不超过 100 |

---

## 响应 Response

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "pageNo": 1,
    "pageSize": 20,
    "totalCount": 158,
    "list": [
      {
        "id": 100012345,
        "code": "M010000000001234001",
        "customerCode": "18815847",
        "skuCode": "SKU-HEADSET-BT-BK",
        "skuType": "SINGLE",
        "specification": "001",
        "name": "Bluetooth Headset Black",
        "cnName": "蓝牙耳机黑色",
        "description": "Over-ear noise cancelling",
        "categoryId": 1023,
        "status": 4,
        "isActive": "Y",
        "isReturn": "N",
        "sourceType": "Normal",
        "created": "2026-03-15 10:23:45",
        "isExistBox": false,
        "declarations": [
          {
            "type": "I",
            "countryCode": "DE",
            "exportCountryCode": "CN",
            "declarePrice": 25.00,
            "recommendDeclarePrice": 26.50,
            "importExportPrice": 18.00,
            "exportDeclarePrice": 18.00,
            "hsCode": "85183000",
            "exportHsCode": "85183000",
            "firstLegType": "AIR",
            "isProhibitWarehousing": "N",
            "supervisionCondition": null,
            "importRate": 0.035,
            "status": 4,
            "changeStatus": null,
            "declareName": "Bluetooth Headset",
            "declareElement": null,
            "registerTime": "2026-03-16 09:00:00",
            "returnReason": null,
            "supplementReason": null,
            "standardScript": null
          }
        ],
        "sizeWeight": {
          "length": 20.5,
          "width": 15.0,
          "height": 8.0,
          "weight": 0.35,
          "volume": 2460.0,
          "registerLength": 21.0,
          "registerWidth": 15.0,
          "registerHeight": 8.0,
          "registerWeight": 0.38,
          "registerVolume": 2520.0,
          "cargoTypeSpec": "T50",
          "cargoTypeSpec2": "T50-",
          "pieceTypeSpec": "小件",
          "sizeType": "NORMAL"
        },
        "outPackaging": [
          {
            "orderType": 1,
            "countryCode": "DE",
            "outPackagingType": "POLY_BAG",
            "outPackagingMethod": "SEAL",
            "outPackagingSku": null,
            "hierarchy": 1
          }
        ],
        "skuCodeThirds": ["ASIN-B09XYZ"],
        "attributes": [
          {
            "attributeName": "BATTERY",
            "attributeValue": "Y",
            "areaCode": null,
            "category": "FEATURE"
          },
          {
            "attributeName": "dg",
            "attributeValue": "Y",
            "areaCode": "DE",
            "category": null
          },
          {
            "attributeName": "batchManagement",
            "attributeValue": "Y",
            "areaCode": null,
            "category": null
          }
        ]
      }
    ],
    "translates": [
      {
        "type": "outPackagingType",
        "code": "POLY_BAG",
        "name": "PE袋"
      }
    ]
  }
}
```

### 响应字段说明

#### 顶层分页结构

| 字段 | 类型 | 说明 |
|------|------|------|
| `pageNo` | Integer | 当前页码（Spring Data Pageable 的 pageNumber，从 0 开始，但业务含义对应入参 pageNo） |
| `pageSize` | Integer | 每页条数 |
| `totalCount` | Long | 总记录数（字段名为 `totalCount`，非 `total`） |
| `list` | List | 商品列表，见下文 |
| `translates` | List | 翻译表，用于将枚举 code 转为可读名称 |

> **注意**：分页字段名是 `totalCount` 而非 `total`，这是 `BaseController.getPageParams()` 的实现决定的。前端（seller 页面）响应结构不同（`iTotalRecords`/`aoData`），那是页面专用格式，非 OpenAPI 格式。

#### list 商品主体字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Long | 数据库主键 |
| `code` | String | M码，系统内部唯一商品编码 |
| `customerCode` | String | 客户编码 |
| `skuCode` | String | 客户定义 SKU 编码 |
| `skuType` | String | 商品类型，如 `SINGLE`（单品） |
| `specification` | String | 规格 |
| `name` | String | 商品英文名 |
| `cnName` | String | 商品中文名 |
| `description` | String | 商品描述/备注 |
| `categoryId` | Long | 商品分类 ID |
| `status` | Integer | 商品状态，见枚举 |
| `isActive` | String | 是否有效：`Y` / `N` |
| `isReturn` | String | 是否退货商品：`Y` / `N` |
| `sourceType` | String | 商品来源，见枚举 |
| `created` | String | 创建时间 |
| `isExistBox` | Boolean | 是否关联箱产品 |
| `declarations` | List | 申报信息，见下文 |
| `sizeWeight` | Object | 尺寸重量，见下文 |
| `outPackaging` | List | 出库包装配置，见下文 |
| `skuCodeThirds` | List\<String\> | 第三方 SKU 编码列表 |
| `attributes` | List | 商品特性属性，见下文 |

#### declarations 申报信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | String | 申报方向：`I`=进口，`E`=出口 |
| `countryCode` | String | type=I 时为进口国，type=E 时为出口国 |
| `exportCountryCode` | String | type=I 时：关联的出口国 |
| `declarePrice` | BigDecimal | 申报单价（进口国货币） |
| `recommendDeclarePrice` | BigDecimal | 系统建议申报价格 |
| `importExportPrice` | BigDecimal | 对应出口价格（进口申报专用） |
| `exportDeclarePrice` | BigDecimal | 出口国申报价格 |
| `hsCode` | String | HS 编码（当前申报方向） |
| `exportHsCode` | String | 出口 HS 编码 |
| `firstLegType` | String | 头程类型（空运/海运/快递） |
| `isProhibitWarehousing` | String | 是否禁止入库：`Y` / `N` |
| `supervisionCondition` | String | 海关监管条件 |
| `importRate` | Double | 进口关税税率 |
| `status` | Integer | 申报状态，同商品 status 枚举 |
| `changeStatus` | Integer | 变更中的申报状态 |
| `declareName` | String | 申报品名 |
| `declareElement` | String | 申报要素 |
| `registerTime` | String | 审核通过/注册时间 |
| `returnReason` | String | 审核退回原因，如"链接无效"；**仅 status=5 或 changeStatus=5 时有效** |
| `supplementReason` | String | 补充原因；同上，仅退回状态下有效 |
| `standardScript` | String | 标准话术（对客完整提示语）；**仅 status=5 或 changeStatus=5 时有效** |

> **⚠️ returnReason / standardScript 字段使用注意（SoT 加工规则）**
>
> 这三个字段在数据库里**只写入不清空**。客户修改后重新提交时，`status` 会从 5 变回 3（审核中），但 `returnReason` / `standardScript` 不会被清空，仍保留上一轮退回时的值。因此：
>
> | 申报状态 | 如何处理 returnReason / standardScript |
> |---------|--------------------------------------|
> | `status=5`（已退回） | ✅ 有效，展示给用户，引导修改 |
> | `changeStatus=5`（变更被退回，status=4） | ✅ 有效，展示给用户 |
> | `status=3`（审核中） | ❌ 历史残留，忽略，不展示 |
> | `changeStatus=3`（变更审核中，status=4） | ❌ 历史残留，忽略，不展示 |
> | `status=4`，`changeStatus=null` | ❌ 无变更，忽略 |
> | `status=1/2`（草稿/待提交） | ❌ 忽略 |
>
> **简单判断逻辑**：`(status === 5) || (status === 4 && changeStatus === 5)` 为 true 时才展示这三个字段。

#### sizeWeight 尺寸重量

| 字段 | 类型 | 说明 |
|------|------|------|
| `length` / `width` / `height` | BigDecimal | 实测长宽高（cm） |
| `weight` | BigDecimal | 实测重量（kg） |
| `volume` | BigDecimal | 实测体积（cm³） |
| `registerLength` / `registerWidth` / `registerHeight` | BigDecimal | 注册长宽高（cm） |
| `registerWeight` | BigDecimal | 注册重量（kg） |
| `registerVolume` | BigDecimal | 注册体积（cm³） |
| `cargoTypeSpec` | String | 一级货型，如 `T50` |
| `cargoTypeSpec2` | String | 二级货型，如 `T50-` |
| `pieceTypeSpec` | String | 件型，如 `小件` |
| `sizeType` | String | 固定值 `NORMAL` |

#### outPackaging 出库包装

| 字段 | 类型 | 说明 |
|------|------|------|
| `orderType` | Integer | 订单类型：`1`=单一，`2`=复合 |
| `countryCode` | String | 适用国家 |
| `outPackagingType` | String | 包装类别（配置项 code） |
| `outPackagingMethod` | String | 包材类型（配置项 code） |
| `outPackagingSku` | String | 指定包材 SKU 编码 |
| `hierarchy` | Integer | 包装层级 |

#### attributes 商品特性

| 字段 | 类型 | 说明 |
|------|------|------|
| `attributeName` | String | 特性名称，见常见枚举 |
| `attributeValue` | String | 特性值 |
| `areaCode` | String | 适用国家/区域，无则为 null；`ALL` 表示全部国家 |
| `category` | String | 属性分类 |

---

## 枚举值汇总

### `queryType` — 查询类型

| 值 | 说明 |
|----|------|
| `ALL` | 全部状态 |
| `INIT` | 草稿（含待提交） |
| `REGISTERING` | 注册中（审核中 + 已退回） |
| `PUBLISHED` | 已发布 |
| `CHANGING` | 变更中（已发布但有待审核变更） |
| `INACTIVE` | 已失效（isActive=N） |

### `status` — 商品状态

| 值 | 说明 |
|----|------|
| `1` | 草稿 DRAFT |
| `2` | 待提交 WAIT_COMMIT |
| `3` | 待审核 AUDITING |
| `4` | 已发布 PUBLISHED |
| `5` | 已退回 RETURNED |
| `6` | 已删除 DEL |

### `skuType` — 商品类型

| 值 | 说明 |
|----|------|
| `SINGLE` | 单品 |

### `sourceType` — 商品来源

| 值 | 说明 |
|----|------|
| `Normal` | 正常注册 |
| `Inbound` | 入库时创建 |
| `Return` | 退货商品复制 |
| `Box` | 箱产品复制 |

### `parcelType` — 包裹类型

| 值 | 说明 |
|----|------|
| `A_PLUS_PARCEL` | A+ 包裹 |
| `A_PARCEL` | A 包裹 |
| `UNLIMITED_PARCEL_TYPE` | 不限包裹类型 |

### `firstLegType` 头程限制（CheckOrderInboundLimit）

| 值 | 说明 |
|----|------|
| `NL` | 不限 |
| `NS` | 直发（仅直发入库可用） |
| `PI` | 禁止入库 |

### `declarations.type`

| 值 | 说明 |
|----|------|
| `I` | 进口申报 |
| `E` | 出口申报 |

### `attributes.attributeName` — 商品特性名称完整枚举

> - `areaCode=ALL`：适用全部国家
> - `areaCode=具体国家码`（如 `US`、`DE`）：仅针对该国
> - `areaCode=null`：全局，无国家维度

#### 危险品 / 物品属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `dg` | 危险品（按目的国维度） | `Y` / `N` | 具体国家码 |
| `dangerousLabel` | 9类危险品标签（需贴标） | `Y` / `N` | `ALL` |
| `fireSafetyLabel` | 锂电池 UN 安全标签 | `Y` / `N` | `ALL` |
| `FIRST_LEG_DG` | 头程危险品 | `Y` / `N` | `ALL` |
| `WAREHOUSING_DG` | 库内危险品 | `Y` / `N` | `ALL` |
| `LAST_LEG_AIR_TRANSPORT_DG` | 尾程空运危险品 | `Y` / `N` | `ALL` |
| `magnetism` | 是否磁性 | `Y` / `N` | `ALL` |
| `powder` | 是否粉末 | `Y` / `N` | `ALL` |
| `liquid` | 是否液体 | `Y` / `N` | `ALL` |
| `withBlades` | 是否含刀片 | `Y` / `N` | `ALL` |
| `exportLimit` | 是否出口限制 | `Y` / `N` | `ALL` |
| `surfaceMailOnly` | 是否仅限平邮（陆运） | `Y` / `N` | `ALL` |

#### 电池属性（`battery=Y` 时附带子属性）

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `battery` | 是否含电池 | `Y` / `N` | `ALL` |
| `battery`.extAttr1 | 电池类型 | 配置 code（如锂电池） | — |
| `battery`.extAttr2 | 电池包装方式 | 配置 code（如独立包装） | — |
| `battery`.extAttr3 | 电池容量（Wh） | 数值字符串 | — |
| `battery`.extAttr4 | 电池重量（g） | 数值字符串 | — |
| `battery`.extAttr5 | 电池芯/电池组数量 | 数值字符串 | — |

> `extAttr` 子属性通过 `attributes[].subAttributes[]` 或拆分为独立 attribute 条目返回，attributeName 如 `batteryType`、`batteryPack` 等。

#### 品牌属性（`brand=Y` 时附带子属性）

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `brand` | 是否品牌商品 | `Y` / `N` | `ALL` |
| `brandName` | 品牌名称 | 自由文本 | `ALL` |
| `model` | 商品型号 | 自由文本 | `ALL` |
| `ownerCode` | 货主编码 | 自由文本 | `ALL` |

#### 食品属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `food` | 是否食品 | `Y` / `N` | `ALL` |

#### 贴标属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `fragileLabel` | 易碎品标签 | `Y` / `N` | `ALL` |
| `frontUpLabel` | 此面向上标签 | `Y` / `N` | `ALL` |
| `caoLabel` | CAO 航空货物标识 | `Y` / `N` | `ALL` |

#### 包装与形态属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `packaging` | 商品包装方式 | 见下方枚举 | `ALL` |
| `itemPackagingMaterial` | 包材材质 | 见下方枚举 | `ALL` |
| `itemShape` | 商品形状 | 见下方枚举 | `ALL` |
| `parcelType` | 包裹类型 | 同 parcelType 枚举 | `ALL` |
| `hasSuitBoxItem` | 是否有套装箱产品 | `Y` / `N` | `ALL` |
| `hasInboundOrderAPlusPackage` | 是否有 A+ 入库包装 | `Y` / `N` | `ALL` |

#### 批次管理属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `batchManagement` | 是否启用批次管理 | `Y` / `N` | `ALL` |
| `batchManagementType` | 批次管理类型 | 见下方枚举 | `ALL` |

#### 监管与模式属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `supervisorMode` | 监管模式 | 见下方枚举 | `ALL` |
| `firstLegType` | 头程限制类型 | `NL` / `NS` / `PI` | `ALL` |
| `isSupportThirdSku` | 是否支持三方 SKU 条码 | `Y` / `N` | `ALL` |
| `isPreSaleItem` | 是否预售商品 | `Y` / `N` | `ALL` |
| `isReturn` | 是否退货商品（attributes 冗余字段） | `Y` / `N` | `ALL` |

#### 链接审核属性

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `itemLink` | 商品详情页链接 | URL 字符串 | `ALL` |
| `linkAuditStatus` | 链接审核状态（空字符串=未审核） | 状态码或空串 | `ALL` |

#### 动态注入属性（代码运行时填充，非数据库存储）

> 仅当商品处于注册中（有未发布 MT 维护任务）时出现，每个进口申报国对应一条。

| attributeName | 含义 | attributeValue | areaCode |
|---|---|---|---|
| `mtTaskNo` | 维护任务号 | 任务编号字符串 | 具体国家码 |
| `isUrgent` | 是否加急维护 | `Y` / `N` | 具体国家码 |
| `estimateAuditDate` | 预计审核完成时间 | `yyyy-MM-dd HH:mm:ss` | 具体国家码 |

---

### `supervisorMode` — 监管模式枚举

| 值 | 含义 |
|---|---|
| `SI` | 自验货（Self Inspection），卖家自行验货后申报 |
| `QSI` | 新版自验货（Quick SI） |
| `SKU` | 普通 SKU 模式（万邑通验货） |

### `packaging` — 包装方式枚举

| 值 | 含义 |
|---|---|
| `LOGISTICS` | 物流包装（裸装，仓库提供物流外包装） |
| `SALES` | 销售包装（商品自带包装盒/零售包装） |

### `itemPackagingMaterial` — 包材材质枚举

| 值 | 含义 |
|---|---|
| `PLASTIC` | 塑料/PE 袋 |
| `CARTON` | 纸箱 |
| `PAPER` | 纸质 |
| `WOOD` | 木质 |
| `FOAM` | 泡沫 |

### `itemShape` — 商品形状枚举

| 值 | 含义 |
|---|---|
| `SQUARE` | 规则方形 |
| `ROUND` | 规则圆形 |
| `STRIP` | 规则长条形 |
| `CYLINDER` | 圆柱形 |
| `IRREGULAR` | 不规则形状 |

### `batchManagementType` — 批次管理类型枚举

| 值 | 含义 |
|---|---|
| `SHELF_LIFE_MANAGEMENT` | 保质期管理 |
| `PRODUCTION_BATCH_MANAGEMENT` | 生产批次管理 |
| `INBOUND_BATCH_MANAGEMENT` | 入库批次管理 |
| `BATCH_CODE_MANAGEMENT` | 产品批号管理 |

---

## 数据验证说明

枚举值均通过以下源码文件验证（MMS 独立库，db-prod 不含 mms_item 表）：

| 枚举 | 来源文件 |
|------|---------|
| ItemStatus | `mms-common/.../client/item/ItemStatus.java` |
| ItemListQueryType | `mms-common/.../client/item/ItemListQueryType.java` |
| ItemSourceType | `mms-common/.../client/item/ItemSourceType.java` |
| ItemParcelType | `mms-common/.../common/ItemParcelType.java` |
| CheckOrderInboundLimit | `mms-common/.../common/CheckOrderInboundLimit.java` |
| BatchManagerType | `mms-common/.../client/item/BatchManagerType.java` |
| ItemFeaturesId | `mms-v3/.../MmsConstant.java:557` |

分页字段名 `totalCount` 来自 `BaseController.getPageParams(Page)` 实现（`openapi/src/main/java/com/winit/openapi/controller/BaseController.java:290`）。

`declarations` 的 `returnReason`、`supplementReason`、`standardScript`、`registerTime` 字段来自 `ItemDeclareVo`（第54/58/62行）和 `ItemDeclarationEntity`（第99/103/107行），通过 `BeanUtils.copyProperties` 透传。

`attributes` 的扩展 attributeName（`dg`、`itemLink`、`magnetism`、`powder`、`liquid`、`packaging`、`itemPackagingMaterial`、`supervisorMode`、`itemShape` 等）来自真实生产 response 数据观察。

日志中确认 M码格式为 `M010000000xxxxxxxxx`，字段结构与 `ItemVo` / `ItemDeclareVo` / `ItemSizeWeightVo` 定义一致。
