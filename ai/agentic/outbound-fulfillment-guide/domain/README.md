# 履约主题视图

## 目录定位

本目录按海外仓出库仓内履约主题组织面向 AI Agent 的流程与规则视图，回答“订单创建至仓库出库交接之间，业务在什么阶段如何运转”。本目录及子目录中的业务页面由 Canonical 数据生成，不是独立事实源。

Phase 0 仅建立目录说明，不包含可用于回答具体业务问题的事实。

## 收录口径

- 按履约阶段组合相关实体、事实、关系、条件、例外和证据状态。
- 展示订单创建、校验、库存分配、波次、拣货、复核、增值、包装、出库与交接的衔接和终点。
- 需要实时查询的订单、库存、仓内任务或费用状态只说明查询边界，不保存具体值。
- 不收录交接后的轨迹、派送、妥投、POD、查件、索赔、派送失败处置，以及独立退货与 RMA 流程。

## 子目录

- [下单与资格](order-entry/)
- [仓内履约](warehouse-fulfillment/)
- [包装与交接](packing-and-handover/)
- [出库与承运商交接](carrier-fulfillment/)
- [仓内异常](exceptions-and-inquiry/)
- [SLA 与费用](sla-and-fees/)

以下目录仅为延期占位，本次不生成业务内容：

- [轨迹与妥投（延期）](tracking-and-delivery/)
- [POD（延期）](proof-of-delivery/)
- [索赔与派送失败处置（延期）](claims-and-dispositions/)

## 生成与维护

- 业务输入来自 [Canonical 数据](../data/canonical/)，页面不得手工补写业务事实。
- 来源必须先进入 [来源证据目录](../source-references/)，再由 Canonical 记录引用。
- 除各级 README 外，生成页必须带生成元数据并通过 generated-view 校验。
- Canonical 变化后必须重建本目录、关系映射、术语表和根索引。
- 新增主题目录时同步更新本页、[项目 Schema](../SCHEMA.md) 和项目维护闭环。
