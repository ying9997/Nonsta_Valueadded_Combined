# 费用与货物边界层

本文件定义增值单费用和子货物明细的解释边界。

---

## P2 增强接口

| Action | 用途 | 边界 |
|---|---|---|
| `wh.va.order.getPaymentList` | 查询已提交增值单的事后实际费用 | 以接口返回为准；失败不影响主状态 |
| `wh.va.order.getPrepaymentList` | 查询已有增值单的预估费用记录 | 不是未下单前报价 |
| `wh.va.order.getSubGoods` | 查询子货物、商品、条码、批次、尺重、附件 | 只解释订单事实，不作为 VASC/原子适用性依据 |

## P2 请求字段

| 外部输入 | API 字段 | 说明 |
|---|---|---|
| `vasOrderNo` | `orderNo` | 已提交增值单号 |
| `parentGoodsId` | `parentId` | 子货物查询的父货物 ID |
| `includeGoods=true` 且缺少 `parentGoodsId` | - | 写入 `missingEvidence`，不调用或不承诺子货物完整明细 |

---

## 费用解释规则

- `paymentSummary` 表示事后实际费用摘要。
- `prepaymentSummary` 表示已有增值单上的预估费用记录。
- 用户问未下单前报价时，输出 `not_supported_pre_order_quote`。
- 费用争议或接口返回不一致时，建议转人工核实。
- `includePayment=true` 或 `includePrepayment=true` 失败时，写入 `optionalFetchFailures`；主状态仍可输出。
- 不把 `getPrepaymentList` 解释成“创建增值单前可报价”；该接口依赖已存在的 `orderNo`。

---

## 子货物解释规则

- 子货物明细只说明已提交增值单关联的货物事实。
- `vaAtomAttrs`、`vaAtomFiles` 或附件信息只能解释“这张单提交了什么”，不能反推事前完整字段、附件或模板要求。
- 缺 `parentGoodsId` 或必要查询条件时，写入 `missingEvidence`；不能用主单 `vaOrderGoods` 替代完整子货物分页结果。
- `getSubGoods` 返回的商品、条码、批次、尺重、附件只用于解释已提交订单的货物明细，不作为 VASC 或原子适用性依据。
- 用户问“我现在还没下单，应该上传什么附件/模板”时，应转服务配置边界说明；本专家不得用已提交订单字段反推完整配置。

---

## 不支持场景

| 场景 | outputPath / nextAction | 对客口径 |
|---|---|---|
| 未下单前报价 | `not_supported` / `not_supported_pre_order_quote` | 本专家只查询已提交或已有增值单事实，无法回答未下单前报价 |
| 事前服务项配置 | `not_supported` / `contact_support` 或转服务配置 | 已提交订单属性不能反推完整页面字段、附件、模板 |
| VASC 推荐 | `not_supported` / `contact_support` 或转推荐链 | 状态接口只证明这张单的历史事实，不推荐新的 VASC |
