# wh.va.order.getPrepaymentList

## 定位

查询已有增值单 `orderNo` 下的预估费用，是 `value-add-order-status` 的 P2 增强接口。

## 关键入参

| 字段 | 说明 |
|---|---|
| `orderNo` | 增值订单号 |
| `manualentryFlag` | 手工录入标记 |

## 关键返回

| 字段 | 用途 |
|---|---|
| 预估应收 | 已有增值单的预计收费 |
| 预估成本 | 已有增值单的预计成本 |
| 原子费用预估 | 原子级预估费用 |

## 边界

虽然接口名包含 prepayment，但依赖 `orderNo`，不等于未提交增值单前的报价能力。
