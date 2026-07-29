# pms.RevenueEventChargeItemService_findChargeItemPage — 分页查询收入费用项

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `pms.RevenueEventChargeItemService_findChargeItemPage` |
| 系统 | PMS（价格管理系统）|
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.pms.spi.v2.revenue.RevenueEventChargeItemService#findChargeItemPage` |
| 接口描述 | 按实例编码分页查询异常事件的收入费用项（chargeItemType 固定为 ER） |

---

## 请求参数

入参类型：`RevenueChargeItemSearchCommand`

### 顶层结构

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| instanceCode | String | **是** | 产品/服务实例编码，为空会抛 PMSException |
| isActive | String | 否 | 是否激活过滤（Y/N） |
| chargeIds | Set\<Long\> | 否 | 费用 ID 集合，IN 过滤 |
| date | Date | 否 | 价格生效日期，用于筛选价格版本 |
| pageVo | PageVo | 否 | 分页参数 |
| ctx | CommandContext | 是 | 调用上下文（框架注入） |

> **注意**：`chargeItemType` 由接口内部固定设置为 `ER`（事件收入），调用方无需传入。

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码，从 1 开始 |
| pageSize | Integer | 否 | - | 每页条数 |
| fieldName | String | 否 | CREATED | 排序字段 |
| direction | String | 否 | DESC | 排序方向（ASC/DESC） |

### 请求示例

```java
RevenueChargeItemSearchCommand command = new RevenueChargeItemSearchCommand();
command.setCtx(CommandContext.getContext());
command.setInstanceCode("C04E03");
command.setIsActive("Y");

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(20);
command.setPageVo(pageVo);

Page<RevenueChargeItem> result = revenueEventChargeItemService.findChargeItemPage(command);
```

---

## 响应数据

返回 `Page<RevenueChargeItem>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content | List\<RevenueChargeItem\> | 数据列表 |
| totalElements | Long | 总记录数 |
| pageable | Pageable | 分页信息（当前页、每页条数） |

### RevenueChargeItem — 返回字段

继承自 `ChargeItem extends PmsBaseVo`。

#### RevenueChargeItem 自有字段

| 字段 | 类型 | 说明 |
|------|------|------|
| feeServiceCode | String | 计费服务编码 |
| feeServiceName | String | 计费服务名称 |
| priceVersionList | List\<RevenuePriceVersion\> | 价格版本列表 |

#### ChargeItem 字段（父类）

| 字段 | 类型 | 说明 |
|------|------|------|
| chargeItemId | Long | 费用项 ID |
| instanceCode | String | 产品/服务实例编码 |
| instanceName | String | 服务名称 |
| feeNode | String | 计费节点 |
| nodeName | String | 计费节点名称 |
| chargeId | Long | 费用 ID |
| chargeCode | String | 费用编码 |
| chargeName | String | 费用名称 |
| startDistType | String | 起始分区类型 |
| endDistType | String | 目的分区类型 |
| calculateRuleId | Long | 计费系数规则 ID |
| ratio | BigDecimal | 计费系数 |
| freezeNode | String | 冻结节点 |
| freezeNodeName | String | 冻结节点名称 |
| pricelistId | Long | 价格表 ID |
| priceList | PriceList | 价格表对象 |
| pricelistName | String | 价格表名称 |
| isApplicableRule | String | 是否有适用条件（Y/N） |
| chargeItemType | String | 费用项类型（固定为 ER） |
| supplierSuId | Long | 供应商服务 ID |
| supplierCode | String | 供应商编码 |
| taxPriceList | List\<TaxPrice\> | 税金价格列表 |
| packageSernoList | Set\<String\> | 收费包裹条码集合 |
| isFuel | String | 是否燃油附加费（Y/N） |
| isMust | String | 是否必须费用项（Y/N） |
| unit | String | 计费单位 |
| unitName | String | 计费单位名称 |
| identifier | String | 费用标识码 |
| currency | String | 币种 |
| priceListType | String | 价格表类型（Simple/Standard/TaxFreight） |
| chargeWeightRate | BigDecimal | 计费重转换率 |
| chargeWeightRate1 | BigDecimal | 计费重转换率1 |
| chargeWeightRate2 | BigDecimal | 计费重转换率2 |
| chargeVolumeRate | BigDecimal | 计费体积转换率 |
| billingDescription | String | 计费说明 |
| buyerId | Long | 买家分区 ID |

#### PmsBaseVo 字段（祖父类）

| 字段 | 类型 | 说明 |
|------|------|------|
| organizationId | Long | 组织 ID |
| createdby | String | 创建人 |
| created | Date | 创建时间 |
| updatedby | String | 修改人 |
| updated | Date | 修改时间 |
| isActive | String | 是否激活（Y/N） |
| isDelete | String | 是否删除（Y/N） |

---

## 枚举值说明

### priceListType — 价格表类型

| 枚举值 | 说明 |
|--------|------|
| Simple | 简易价格表 |
| Standard | 标准价格表 |
| TaxFreight | 税金运费价格表 |

---

## 注意事项

- 通过 **Dubbo RPC 直调**，不经过 OpenAPI 网关
- `instanceCode` 为必填，为空时抛 `PMSException`（错误码 `_01001201001`）
- `chargeItemType` 内部固定为 `ER`（事件收入类型），调用方无需设置
- SPI 依赖：`com.winit.pms.spi.v2`，版本见 pms2 的 pom.xml（`spi-pms.version`）
