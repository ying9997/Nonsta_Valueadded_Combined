# oms.SystemOrderService_queryPackageInfos — 系统订单【箱单/包裹信息】分页查询

## 接口概览

| 项目 | 说明 |
|------|------|
| 接口名称 | `oms.SystemOrderService_queryPackageInfos` |
| 系统 | OMS（系统订单 / 入库单） |
| 调用方式 | Dubbo RPC 直调 |
| SPI 接口 | `com.winit.oms.spi.systemorder.SystemOrderService#queryPackageInfos` |
| 入参 | `QuerySystemOrderPackageCommand` |
| 出参 | `Page<PackageInfo>` |
| 异常 | `SystemOrderException` |
| 接口描述 | 按系统订单号分页查询该订单下的**箱单（包裹）信息**，返回每个包裹的条码、长宽高重体、包裹等级、容器条码、是否异常等 |

---

## 请求参数

入参类型：`QuerySystemOrderPackageCommand`（继承 `SPICommand`）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| systemOrderNo | String | 是 | 系统订单号，**精确匹配**（如 `WI530769351`） |
| pageVo | PageVo | 否 | 分页参数，不传时默认第 1 页、每页 10 条 |
| ctx | CommandContext | 是 | 调用上下文，由框架注入 |

### PageVo — 分页参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| pageNo | Integer | 否 | 1 | 页码，从 1 开始；传 null 或 ≤0 时按 1 处理 |
| pageSize | Integer | 否 | 10 | 每页条数 |
| fieldName | String | 否 | - | 排序字段（数据库列名） |
| direction | String | 否 | ASC | 排序方向，`DESC` 为降序，其余值均为升序 |
| totalCount | Long | 否 | - | 总条数（仅出参使用，入参无需传） |

> **注意**：`systemOrderNo` 为空时不会拼接任何过滤条件，会分页返回**全部**入库包裹数据，生产环境务必传入。

### 请求示例（Dubbo 调用）

```java
QuerySystemOrderPackageCommand command = new QuerySystemOrderPackageCommand();
command.setCtx(CommandContext.getContext());
command.setSystemOrderNo("WI530769351");   // 系统订单号，精确匹配

PageVo pageVo = new PageVo();
pageVo.setPageNo(1);
pageVo.setPageSize(100);
pageVo.setFieldName("PACKAGE_SERNO");
pageVo.setDirection("ASC");
command.setPageVo(pageVo);

Page<PackageInfo> page = systemOrderService.queryPackageInfos(command);
```

> 在查询工具/控制台中以条件表达式调用时，等价写法为 `where[systemOrderNo] = WI530769351`。

---

## 响应数据

返回 `Page<PackageInfo>` 分页结果。

### 分页外层字段

| 字段 | 类型 | 说明 |
|------|------|------|
| content | List\<PackageInfo\> | 当前页包裹数据列表 |
| totalElements | Long | 总记录数（即该订单的**包裹数**） |
| pageable | Pageable | 分页信息（当前页码、每页条数） |

### PackageInfo — 包裹信息

**包裹标识**

| 字段 | 类型 | 说明 |
|------|------|------|
| packageSerNo | String | 包裹条码（入库单包裹号，如 `B0400000001467085697`） |
| containerSerno | String | 容器条码（托盘/虚拟托盘），未组托时为空 |
| thirdPartyCaseNo | String | 第三方箱号（如 FBA 箱号），无则为空 |
| packageLevel | String | 包裹等级（如 `A+`） |
| skuQty | Integer | 包裹内商品数量（SKU 数） |
| isAbnormal | String | 是否异常：`Y`-是；`N`-否 |

**卖家预估尺寸/重量**（下单时卖家申报值）

| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| sellerLength | BigDecimal | cm | 卖家输入长 |
| sellerWidth | BigDecimal | cm | 卖家输入宽 |
| sellerHeight | BigDecimal | cm | 卖家输入高 |
| sellerWeight | BigDecimal | kg | 卖家输入重量 |
| sellerVolume | BigDecimal | m³ | 卖家输入体积 |

**确认（实测）尺寸/重量**（仓库收货称重测量值）

| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| length | BigDecimal | cm | 确认长 |
| width | BigDecimal | cm | 确认宽 |
| height | BigDecimal | cm | 确认高 |
| weight | BigDecimal | kg | 确认重量 |
| volume | BigDecimal | m³ | 确认体积 |

> 实测值在仓库完成收货/验货前可能为 `null`，此时应回退使用 `seller*` 预估字段。

### 响应示例

```json
{
  "content": [
    {
      "packageSerNo": "B0400000001467085697",
      "sellerLength": 40.00,
      "sellerWidth": 27.00,
      "sellerHeight": 24.00,
      "sellerWeight": 5.0000,
      "sellerVolume": 0.025920000,
      "length": null,
      "width": null,
      "height": null,
      "weight": 5.0000,
      "volume": null,
      "packageLevel": "A+",
      "skuQty": 1,
      "containerSerno": null,
      "isAbnormal": "N",
      "thirdPartyCaseNo": null
    }
  ],
  "totalElements": 241,
  "pageable": { "pageNo": 1, "pageSize": 100 }
}
```

---

## 数据口径与取数说明

以系统订单号 `WI530769351` 实测（该单为增值单提供的上架入库单，Winit 订单号 `WI53076935`，共 241 个包裹）：

| 业务指标 | 获取方式 | 实测值 |
|---------|---------|--------|
| 包裹数 | 本接口 `totalElements`（或 `content` 条数） | 241 |
| 每包商品数（SKU 数） | 本接口 `PackageInfo.skuQty` | 每包 1，合计 241 |
| 单品数（总量） | 系统订单主表 `oms_wh_system_order.ACTUAL_ITEM_QTY` / `ESTIMATE_ITEM_QTY`；或按包裹逐包调用 `queryItemInfos` 汇总 | ESTIMATE_ITEM_QTY = 241 |
| 商品数（总量） | 系统订单主表 `ACTUAL_MERCHANDISE_QTY` / `ESTIMATE_MERCHANDISE_QTY` | ESTIMATE_MERCHANDISE_QTY = 11 |

> **说明**：`PackageInfo.skuQty` 为包裹维度的商品数量（代码注释口径为「商品数量(SKU数)」）。订单维度的「商品数 / 单品数」总量建议直接读取系统订单主表字段，避免因拆包/合包导致汇总口径偏差。
>
> 上例中该单状态为 `OD`（已下单），仓库尚未收货验货，因此 `oms_wh_inbound_item` 无明细、实测长宽高体为空，仅 `weight` 有值。

---

## 底层查询逻辑

- 实现链路：`SystemOrderServiceImpl#queryPackageInfos` → `SystemOrderManagerImpl#queryPackageInfos` → `InboundPackageDao#query`
- 查询主表：`oms_wh_inbound_package`，关联 `oms_wh_system_order`
- 固定过滤条件：
  - `p.order_no = pl.winit_order_no`
  - `p.IS_ACTIVE = 'Y' AND p.IS_DELETE = 'N'`
  - `pl.IS_ACTIVE = 'Y' AND pl.IS_DELETE = 'N'`
- 动态过滤条件：`systemOrderNo` 非空时追加 `SYSTEM_ORDER_NO = ?`（命中 `oms_wh_system_order`）
- 字段映射：`sellerLength/Width/Height/Weight/Volume` ← `SELLER_*` 列；`length/width/height/weight/volume` ← `LENGTH/WIDTH/HEIGHT/WEIGHT/VOLUME` 列

---

## 相关接口（同一 SPI 服务 SystemOrderService）

| 接口方法名 | 说明 | 入参 | 出参 |
|-----------|------|------|------|
| `querySystemOrderPage` | 分页查询系统订单列表 | QuerySystemOrderPageCommand | `Page<SystemOrder>` |
| `querySystemOrderDetails` | 查询系统订单【基本信息】 | QuerySystemOrderCommand | SystemOrder |
| `queryLogisticsInfos` | 查询系统订单【物流信息】 | QueryByWinitOrderNoCommand | LogisticsInfo |
| `queryInspectionInfos` | 查询系统订单【验货信息】 | QuerySystemOrderCommand | InspectionInfo |
| **`queryPackageInfos`** | **查询系统订单【箱单/包裹信息】** | **QuerySystemOrderPackageCommand** | **`Page<PackageInfo>`** |
| `queryItemInfos` | 按包裹条码查询【单品信息】 | QuerySystemOrderItemCommand（packageSerno） | `List<ItemInfo>` |
| `queryMerchandiseInfos` | 查询系统订单【商品信息】 | QuerySystemOrderCommand | `List<MerchandiseInfo>` |
| `queryRevenueInfos` | 查询系统订单【费用信息】 | QuerySystemOrderCommand | `List<RevenueInfo>` |
| `queryServiceInfos` | 查询系统订单【服务信息】 | QuerySystemOrderCommand | `List<SystemServiceInfo>` |

### ItemInfo — 单品信息（`queryItemInfos` 出参）

| 字段 | 类型 | 说明 |
|------|------|------|
| itemSerno | String | 单品条码 |
| packageSerno | String | 入库单包裹号 |
| merchandiseSerno | String | 商品条码 |
| length / width / height | BigDecimal | 长/宽/高（cm） |
| weight | BigDecimal | 重量（kg） |
| volume | BigDecimal | 体积（m³） |

---

## 注意事项

- 本接口为 **Dubbo RPC 直调**，不经过 OpenAPI 网关，无需签名参数。
- SPI 依赖：`com.winit.oms.spi.systemorder.SystemOrderService`（模块 `spi-oms`）。
- 实现类位于 oms：`com.winit.oms.systemorder.service.impl.SystemOrderServiceImpl`。
- Dubbo 服务暴露：`oms/src/main/resources/dubbo_provider.xml` 中 `com.winit.oms.spi.systemorder.SystemOrderService`。
- `systemOrderNo` 为**精确匹配**，不支持模糊查询；传入的应是系统订单号（`SYSTEM_ORDER_NO`，如 `WI530769351`），而非 Winit 订单号（`WINIT_ORDER_NO`，如 `WI53076935`），两者长度不同易混淆。
- 包裹数据量可能较大（大货单常见上百个包裹），建议按需设置 `pageSize` 分页遍历，避免一次性拉全量。
