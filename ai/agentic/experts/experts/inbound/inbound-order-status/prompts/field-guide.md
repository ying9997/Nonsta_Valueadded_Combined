# 入库 JSON 字段指南（prompts 副本）

## 数据来源

- 基础详情：`winit.wh.inbound.getOrderDetail`，提供订单状态与基础表头。
- 补充详情：`wh.inboundOrder.getOrderDetail`，经客户归属校验和字段白名单后挂在 `supplementalOrderDetail`。
- 轨迹：`wh.tracking.queryOrderTracking`，写入 `trackingList`；详情接口不提供轨迹。

## 时间字段

| 字段 | 业务语义 | 证据类型 |
|---|---|---|
| `expectedSendwarehouseTime` | 预计送仓时间 | 预计，非实际 |
| `forecastWarehouseTime` | 预计到仓时间 | 预计，非实际 |
| `targetWarehouseArrivalTime` | 目标到仓时间 | 目标，非实际 |
| `awhDate` / `actualWarehouseArrivalTime` | 实际到仓时间 | 实际 |
| `goalShelveDate` / `estimateShelveTime` | 预计上架时间 | 预计，非承诺 |
| `estimateShelveCompletedDate` / `targetShelveTime` | 目标上架时间 | 目标，非承诺 |
| `estimateShelveTimeLocal` | 当地预计上架时间 | 当地预计，非承诺 |
| `targetShelveTimeLocal` | 当地目标上架时间 | 当地目标，非承诺 |
| `actualShelveTime` / `shelveCompletedDate` | 实际上架时间 | 实际 |
| `actualShelveTimeLocal` | 当地实际上架时间 | 当地实际 |
| `unloadStartDate` / `unloadDate` | 卸货开始 / 完成时间 | 实际 |
| `estimateUnloadDate` | 预计卸货时间 | 预计，非实际 |
| `orderDate` / `voidDate` / `mergeDate` | 下单 / 作废 / 合单时间 | 系统记录 |
| `dicDate` / `dioDate` / `receiptCompletionDate` | 国内入库 / 国内出库 / 国内收货完成时间 | 实际 |
| `estimateDeliveryDate` | 预计出库时间 | 预计，不是送仓时间 |
| `pickupDate` / `pickupCompletedDate` | 提货 / 提货完成时间 | 系统记录或实际 |
| `expectFromDate` / `expectToDate` | 期望提货时间窗 | 预计时间窗 |

`timeZone=unknown` 表示接口文档未说明普通 Date 字段时区。仅字段名带 `Local` 时才可称为当地时间。所有空值均表示本次未返回，禁止跨字段推算或补位。

## 其他状态字段

主要字段包括 `orderNo`、`status`、`winitProductCode`、`destWhCode`、`inspectionType`、`entryWhType`、`processFlags`、`booking`、`serviceTiming`、`quantitySummary`。金额、申报、客户资料、地址和商品明细不进入模型上下文。
