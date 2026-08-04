# Interface Documents

本目录保存 value-add 相关接口文档摘要。接口用于确认字段、状态和查询链路；不能单独反推异常是否适用某个 VASC。

| 文件 | action / 来源 | 主要用途 |
|---|---|---|
| `wh-va-order-basic-info-api.md` | `wh.va.order.basicInfo` | 增值单基本信息、主状态、业务单、VASC、时间和原子概览 |
| `wh-va-order-get-vas-list-api.md` | `wh.va.order.getVasList` | 原子执行状态、完成数量、退回/部分完成原因、已提交属性/附件事实 |
| `wh-va-order-get-payment-list-api.md` | `wh.va.order.getPaymentList` | 已提交增值单的事后实际费用 |
| `wh-va-order-get-prepayment-list-api.md` | `wh.va.order.getPrepaymentList` | 已有增值单的预估费用，不等于未下单前报价 |
| `wh-va-order-get-sub-goods-api.md` | `wh.va.order.getSubGoods` | 已提交增值单的子货物/商品/附件明细 |
| `pms-base-attr-rel-service-find-base-attr-rel-page-api.md` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 普通属性字段配置来源参考，已沉淀为字段覆盖状态 |
