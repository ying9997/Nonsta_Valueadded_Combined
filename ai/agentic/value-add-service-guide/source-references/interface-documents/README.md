# 接口来源参考

> 本目录保存入库异常、VASC 产品、增值服务项、增值单和配置规则相关的接口文档。
> 这些文档用于补充系统字段、编码、查询链路和可校验数据来源，不直接作为业务适用性结论。

## 使用规则

- 查询“接口字段、接口返回、系统如何查某类数据”时，可以优先读取本目录。
- 判断“某异常是否支持某 VASC 产品”时，必须回到关系映射表或实体详情页确认。
- TOM 内部接口、Dubbo 直调接口、OpenAPI 接口的调用边界不同，回答时不得混用为对外开放能力。
- 后续可从这些接口文档中抽取字段，反哺 `config_field`、`vasc_product`、`value_added_service_item` 和 `relationship_mapping`。

## 文档列表

- [oms-outbound-sla-config-service-find-outbound-sla-config-page-api.md](oms-outbound-sla-config-service-find-outbound-sla-config-page-api.md)
- [oms-unusual-event-order-query-event-list-api.md](oms-unusual-event-order-query-event-list-api.md)
- [oms-unusual-event-order-query-event-order-detail-api.md](oms-unusual-event-order-query-event-order-detail-api.md)
- [pms-base-attr-rel-service-find-base-attr-rel-page-api.md](pms-base-attr-rel-service-find-base-attr-rel-page-api.md)
- [pms-plan-event-service-query-plan-event-page-api.md](pms-plan-event-service-query-plan-event-page-api.md)
- [pms-revenue-event-charge-item-service-find-charge-item-page-api.md](pms-revenue-event-charge-item-service-find-charge-item-page-api.md)
- [pms-vasc-rule-service-query-vasc-rule-page-api.md](pms-vasc-rule-service-query-vasc-rule-page-api.md)
- [pms-vasc-tom-service-query-vasc-page-api.md](pms-vasc-tom-service-query-vasc-page-api.md)
- [wh-va-order-basic-info-api.md](wh-va-order-basic-info-api.md)
- [wh-va-order-get-payment-list-api.md](wh-va-order-get-payment-list-api.md)
- [wh-va-order-get-prepayment-list-api.md](wh-va-order-get-prepayment-list-api.md)
- [wh-va-order-get-sub-goods-api.md](wh-va-order-get-sub-goods-api.md)
- [wh-va-order-get-vas-list-api.md](wh-va-order-get-vas-list-api.md)
