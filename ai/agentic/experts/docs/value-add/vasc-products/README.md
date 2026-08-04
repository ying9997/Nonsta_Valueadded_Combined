# VASC 产品摘要

本目录承接 `value-add-product-recommendation` 和 `value-add-service-config` 所需的 VASC 产品知识。

## v1 必备字段

| 字段 | 说明 |
|---|---|
| `vascCode` | VASC 产品编码 |
| `vascName` | VASC 产品名称 |
| `activeStatus` | 启用态或可推荐状态 |
| `businessDescription` | 业务描述 |
| `applicableIntent` | 适用客户处理意图 |
| `limitations` | 仓库、对象、阶段或流程限制 |

## 使用规则

- VASC 启用态来自知识库同步结果，不在 v1 运行时调用内部 PMS 接口刷新。
- inactive 或证据不足的 VASC 不能直接作为可下单推荐。
- VASC 产品知识用于解释和过滤候选，不替代异常到 VASC 映射。

## 当前状态

全量 VASC 产品实体页待补；当前由 `relationship-mappings/` 和运行时 KB 摘要承接。
