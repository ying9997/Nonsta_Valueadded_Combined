# wh.va.order.basicInfo

## 定位

查询已提交增值单的基本信息和主状态，是 `value-add-order-status` 的 P0 主路径接口。

## 关键入参

| 字段 | 说明 |
|---|---|
| `orderNo` | 增值订单号，通常以 `V` 开头 |

## 关键返回

| 字段 | 用途 |
|---|---|
| `orderNo` | 增值单号 |
| `status` / `statusDesc` | 增值单主状态 |
| `orderDate` / `estimateCompleteTime` / `estimateCompleteTimeStr` / `actualCompleteTime` | 下单、系统预计完成、页面当地预计完成、实际完成时间；`estimateCompleteTimeStr` 优先用于对客展示，不是 SLA 承诺 |
| `cancelReason` / `failReason` | 取消或失败原因 |
| `businessOrder.businessNo` | 关联业务单号 |
| `businessOrder.eventCode` / `unusualName` / `unusualObjectName` | 关联异常信息 |
| `vasc.productCode` / `productName` / `isAudit` / `isNeedConfirm` | VASC 产品和审核/确认信息 |
| `vaAtoms[]` | 原子概览，可作为 `getVasList` 前摘要 |
| `control.vasObjectType` | 增值对象类型 |

## 边界

本接口只解释已有增值单事实，不用于推荐新 VASC，也不用于事前字段配置。
