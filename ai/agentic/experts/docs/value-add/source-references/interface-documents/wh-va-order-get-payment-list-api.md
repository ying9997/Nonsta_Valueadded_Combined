# wh.va.order.getPaymentList

## 定位

查询已提交且发生作业后的实际费用，是 `value-add-order-status` 的 P2 增强接口。

## 关键入参

| 字段 | 说明 |
|---|---|
| `orderNo` | 增值订单号 |
| `manualentryFlag` | 手工录入标记 |

## 关键返回

| 字段 | 用途 |
|---|---|
| `totalStandardAmount` | 标准费用汇总 |
| `atomFeeList` | 原子费用明细 |
| 成本明细字段 | 解释已发生作业后的成本事实 |

## 边界

这是事后实际费用，不是未下单前报价；不作为 v1 核心主路径。
