# TMS 运输单分页查询接口对接文档

> **Action**：`tms.transportorder.queryPage`  
> 关联：[Inbound API 矩阵](inbound-api-matrix.md) · [无依据接口汇总](inbound-api-unverified.md) · [入库轨迹 API](inbound-tracking-api.md)  
> **系统**：TMS 智运（卖家侧运输单，单号前缀通常 `TO`）  
> **与 OMS 关系**：标准头程（OW01011*）等链路中，运输单（TO）与入库单（WI）通过 `customerOrderNo` 或业务关联对应；**不能**用 WI 直接当 `content` 除非 `keywordType` 支持 WI 映射（需实测 `keywordType` 枚举）。

---

## 基本信息

| 项目 | 值 |
|------|------|
| Action | `tms.transportorder.queryPage` |
| Controller | `TransportOrderController` |
| 路径 | `/tms/transportorder/queryPage` |
| 方法 | POST |
| 说明 | 运输单分页查询（卖家侧） |

---

## 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| keywordType | String | 否 | 关键字类型（如按单号、客户订单号等搜索） |
| content | String | 否 | 搜索内容（配合 keywordType 使用） |
| startDate | Date | 否 | 提交日期起（yyyy-MM-dd HH:mm:ss） |
| endDate | Date | 否 | 提交日期止（yyyy-MM-dd HH:mm:ss） |
| endCountryCode | String | 否 | 目的国代码 |
| startPortCode | String | 否 | 起运港代码 |
| status | String | 否 | 运输单状态 |
| subPscgCode | String | 否 | 产品子分类代码 |
| isWaitDataFile | String | 否 | 是否待上传报关资料（Y/N） |
| isWaitPackageList | String | 否 | 是否待上传装箱单（Y/N） |
| pageNo | Integer | 是 | 页码，从1开始 |
| pageSize | Integer | 是 | 每页条数 |

### 请求示例

```json
{
  "action": "tms.transportorder.queryPage",
  "data": {
    "keywordType": "orderNo",
    "content": "TO202603",
    "startDate": "2026-03-01 00:00:00",
    "endDate": "2026-03-31 23:59:59",
    "endCountryCode": "US",
    "startPortCode": "CNSZX",
    "status": "OD",
    "subPscgCode": "",
    "isWaitDataFile": "",
    "isWaitPackageList": "",
    "pageNo": 1,
    "pageSize": 20
  }
}
```

---

## 响应参数

### 顶层结构

| 字段 | 类型 | 说明 |
|------|------|------|
| list | Array\<TransportOrderVo\> | 运输单列表 |
| pageParams | Object | 分页信息 |
| pageParams.pageNo | Integer | 当前页码 |
| pageParams.pageSize | Integer | 每页条数 |
| pageParams.totalCount | Long | 总记录数 |

### TransportOrderVo 字段

根据 Builder 和 Controller 代码推断的字段列表：

| 字段 | 类型 | 说明 |
|------|------|------|
| orderNo | String | 运输单号 |
| customerOrderNo | String | 客户订单号 |
| customerCode | String | 客户编码 |
| customerName | String | 客户名称 |
| status | String | 运输单状态 |
| winitProductCode | String | 产品编码 |
| winitProductCategory3 | String | 产品子分类代码(subPscgCode) |
| estimatePackageQty | Integer | 预估包裹数 |
| estimatePalletQty | Integer | 预估托盘数 |
| estimateWeight | BigDecimal | 预估总重量(kg) |
| estimateVolume | BigDecimal | 预估总体积(CBM) |
| orderSource | String | 订单来源 |
| sendPortInfoVo | Object | 送港信息 |
| sendPortInfoVo.cartonType | String | 柜型 |
| sendPortInfoVo.sendPortType | String | 送港方式 |
| sendPortInfoVo.cutoffCabinetDate | Date | 截重柜时间 |
| sendPortInfoVo.containerNo | String | 集装箱号 |
| sendPortInfoVo.sealNo | String | 铅封号 |
| sendPortInfoVo.pickupCartonDateFrom | Date | 提柜时间起 |
| sendPortInfoVo.pickupCartonDateTo | Date | 提柜时间止 |
| sendPortInfoVo.pickupCartonAddrCode | String | 提柜地址编码 |
| logisticsInfoVo | Object | 物流信息 |
| logisticsInfoVo.estimateLogisticsPlanId | Long | 物流计划ID |
| importedInfoVo | Object | 进口报关信息 |
| importedInfoVo.importDeclarationRuleCode | String | 进口报关规则编码 |
| importedInfoVo.importerCode | String | 进口商编码 |
| exportedInfoVo | Object | 出口报关信息 |
| exportedInfoVo.exportDeclarationType | String | 出口报关类型 |
| exportedInfoVo.exporterCode | String | 出口商编码 |
| dispatchInfoVo | Object | 派送信息 |
| dispatchInfoVo.dispatchType | String | 派送方式 |
| dispatchInfoVo.bookingNode | String | 预约节点 |
| dispatchInfoVo.bookingDay | String | 提前预约天数 |
| dispatchInfoVo.addressNo | String | 派送地址编码 |

> **注意**：`TransportOrderVo` 的完整定义在 TMS SPI 包（`com.winit.tms.spi.order.transport.vo.TransportOrderVo`）中，以上字段列表基于 openapi 层 Builder 代码推断，实际返回可能包含更多字段。建议以实际调用响应为准。

### 响应示例

```json
{
  "code": "0",
  "msg": "success",
  "data": {
    "list": [
      {
        "orderNo": "TO20260310001",
        "customerOrderNo": "CUST-ORD-001",
        "customerCode": "CUST001",
        "customerName": "示例客户",
        "status": "OD",
        "winitProductCode": "SP001",
        "estimatePackageQty": 50,
        "estimatePalletQty": 2,
        "estimateWeight": 500.00,
        "estimateVolume": 3.50,
        "sendPortInfoVo": {
          "cartonType": "40HQ",
          "sendPortType": "WINIT_PICKUP"
        },
        "logisticsInfoVo": {
          "estimateLogisticsPlanId": 12345
        },
        "importedInfoVo": {
          "importDeclarationRuleCode": "WINIT_DECLARATION",
          "importerCode": "IMP001"
        },
        "exportedInfoVo": {
          "exportDeclarationType": "GENERAL",
          "exporterCode": "EXP001"
        },
        "dispatchInfoVo": {
          "dispatchType": "WINIT_DISPATCH",
          "bookingNode": "ARRIVAL",
          "bookingDay": "3",
          "addressNo": "ADDR001"
        }
      }
    ],
    "pageParams": {
      "pageNo": 1,
      "pageSize": 20,
      "totalCount": 1
    }
  }
}
```

---

## 关联接口

| Action | 说明 | 典型组合 |
|--------|------|----------|
| `tms.transportorder.getDetail` | 查询运输单详情（入参: orderNo） | queryPage 定位 TO 后拉详情 |
| `tms.transportorder.queryTrackingList` | 查询运输单轨迹列表 | **头程里程碑**（离港/到港等）须用此接口，queryPage 仅表头 |
| `tms.transportorder.countWaitDataFiles` | 统计待上传报关资料的订单数 | customs-doc-manage 批量提示 |
| `tms.transportorder.cancel` | 取消运输单 | order-manage 写操作指引（不代调用） |
| `tms.transportorder.sendPortComplete` | 送港完成 | 头程操作类（一般不接入 Agent） |

---

## 注意事项

1. 接口自动注入当前登录客户的 `customerCode`，只能查询自己的运输单
2. `TransportOrderVo` 完整字段定义在 TMS 系统 SPI 中，openapi 不持有源码，上表字段为从 Builder 推断的已知字段
3. 如需完整字段列表，建议实际调用接口查看响应或参考 TMS 系统文档
4. **分页列表 ≠ 轨迹**：清关节点、离港/到港时间须结合 `queryTrackingList` 或 `getDetail`，勿从 queryPage 臆造里程碑
5. Coze 代理 action 注册名待确认（可能与 `tms.transportorder.queryPage` 一致）

---

## Inbound 专家消费映射

图例：**主用** = 建议接入或作为 TMS 主数据源 · **辅助** = 可与 OMS 并行，增强回答 · **—** = 本期不适用

| Expert ID | 评级 | 可用场景 / 关键字段 | 说明 |
|-----------|------|---------------------|------|
| `inbound-transit-tracking` | **主用** | `status`、`logisticsInfoVo`、`sendPortInfoVo`（柜号/截重柜） | 头程在途主接口；须再调 `queryTrackingList` 得离港/到港；可解除「TMS 无规格」阻塞 |
| `inbound-customs-clearance` | **主用** | `importedInfoVo`、`status`、`sendPortInfoVo.containerNo` | 清关规则/进口商编码；细粒度清关节点仍依赖 `queryTrackingList` |
| `inbound-customs-doc-manage` | **主用** | `isWaitDataFile`、`isWaitPackageList`、`importedInfoVo`、`exportedInfoVo` | 待上传资料筛选 + 报关类型上下文；可配合 `countWaitDataFiles` |
| `inbound-order-status` | 辅助 | `status`、`winitProductCode`、`customerOrderNo` ↔ WI | 标准头程 OW01011：OMS 状态 + TO 状态对照解读 |
| `inbound-order-manage` | 辅助 | `isWaitPackageList`、`status=OD` | 指引客户补传装箱单；创建/修改 SOP 前置检查 |
| `inbound-arrival-status` | 辅助 | `sendPortInfoVo.containerNo`、`dispatchInfoVo` | 整柜到仓核对柜号/派送地址；主数据仍用 OMS `queryOrderTracking` |
| `inbound-appointment-manage` | 弱 | `dispatchInfoVo.bookingNode`、`bookingDay` | 仅 **Winit 头程派送** 场景；卖家直发预约仍走 OMS `booking.*` |
| `inbound-putaway-expedite` | 弱 | `estimateVolume`、目的国筛选 | SLA 估算参考，非必需 |
| `inbound-warehouse-info` | — | — | 纯 KB |
| `inbound-process-guide` | — | — | 纯 KB / 规则 |
| `inbound-psc-eligibility` | — | — | OMS `availableProduct` |
| `inbound-capacity-availability` | — | — | MKS 额度 |
| `inbound-self-inspection` | — | — | 验货系统 |
| `inbound-overseas-inspection` | — | — | WMS 验货 |
| `inbound-putaway-status` | — | — | OMS 上架状态 |
| `inbound-exception-check` | — | — | OMS 异常单 |
| `inbound-permission-apply` | — | — | 飞书多维表格 |
| `value-add/*` | — | — | 跨域增值链路，TMS 运输单不作为主数据源 |

### 推荐接入优先级

1. **P0**：`inbound-transit-tracking`、`inbound-customs-clearance`、`inbound-customs-doc-manage`（TMS 域 Gap 最大）
2. **P1**：`inbound-order-status`、`inbound-order-manage`（头程链路与 WI↔TO 关联待实测 `keywordType`）
3. **暂缓**：其余专家保持 OMS/KB 路径

### WI 与 TO 关联（待实测）

| 查法 | 假设 | 风险 |
|------|------|------|
| `keywordType=orderNo` + `content=TO...` | 客户持有运输单号 | 低 |
| `keywordType` + `customerOrderNo` | 客户参考号与 TO 绑定 | 中 |
| 用 WI 直接搜 | 除非 keywordType 支持 inboundOrderNo | **高**，需联调确认 |
