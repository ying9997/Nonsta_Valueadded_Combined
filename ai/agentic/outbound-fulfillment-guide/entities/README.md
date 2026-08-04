# 业务实体视图

## 目录定位

本目录按稳定实体类型组织海外仓出库仓内履约知识，回答“订单创建至仓库出库交接之间，对象是什么、有哪些受证据支持的属性和规则”。实体页面由 Canonical 数据生成，不是独立事实源。

Phase 0 仅建立目录说明，不包含正式实体或业务事实。

## 收录口径

- 每个实体使用稳定 ID，并保留事实级条件、例外、适用范围、有效期和来源。
- 同名但属于不同系统、状态域、对象层级或时间范围的对象不得静默合并。
- 页面可组合多个事实，但发布资格按事实和关系分别判断。
- 具体订单、包裹、客户和线上系统的当前值不作为静态实体收录。

## 子目录

- [场景](scenarios/)
- [订单类型](order-types/)
- [生命周期阶段](lifecycle-stages/)
- [仓内任务](warehouse-tasks/)
- [履约状态](statuses/)
- [异常](exceptions/)
- [处理动作](resolution-actions/)
- [包装模式](packaging-modes/)
- [派送产品](delivery-products/)
- [承运商](carriers/)
- [SLA 规则](sla-rules/)
- [费用规则](fee-rules/)
- [VASC 产品](vasc-products/)
- [增值服务项](value-added-service-items/)
- [配置字段](config-fields/)
- [API 参考](api-references/)

以下实体目录仅为延期占位，本次不创建业务实体：

- [轨迹事件（延期）](tracking-events/)
- [查件规则（延期）](inquiry-rules/)
- [POD 规则（延期）](pod-rules/)
- [索赔规则（延期）](claim-rules/)
- [派送失败处置规则（延期）](failed-delivery-disposition-rules/)

## 生成与维护

- 权威输入位于 [Canonical 实体目录](../data/canonical/entities/) 和 [Canonical 关系目录](../data/canonical/relationships/)。
- 除各级 README 外，不得手工创建或修改实体业务页。
- 新实体类型必须先在 [SCHEMA.md](../SCHEMA.md) 中定义，再扩展 Canonical、生成器和测试。
- Canonical 变化后必须重建实体页、关系映射、术语表和根索引。
- 生成页必须通过来源、适用范围、披露级别和运行时资格校验。
