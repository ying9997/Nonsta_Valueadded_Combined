# pms.BaseAttrRelService_findBaseAttrRelPage

## 定位

普通属性字段配置来源参考。当前字段证据已沉淀为 `relationship-mappings/service-item-config-field-evidence-coverage.md`，实现期不直接把该内部接口作为 v1 OpenAPI 调用。

## 已确认口径

- 可按 `instanceCode=<eventCode>` 重建普通属性字段快照。
- normalized 编排引用的 52 个服务项中，普通属性字段覆盖 42 个。
- 剩余 10 个服务项仍标记 `missing_field_evidence`，不能解释为“无需字段”。

## 边界

该来源只能支撑普通属性字段，不能完整覆盖附件、模板和上传关系。
