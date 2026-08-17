---
title: SN码缺失无法采集
type: reference
entity_type: inbound_exception
tags: [inbound, exception, outbound-related, product-level, sn, value-added-service]
source_refs:
  - source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B12E1784
exception_name: SN码缺失无法采集
exception_stage: outbound_related_in_warehouse
exception_object_level: product
exception_node: OUT_BOUND
exception_requires_customer_action: true
---

# SN码缺失无法采集

## 摘要

`B12E1784` 表示商品实际无 SN，或 SN 条码异常导致无法采集。该异常节点为 `OUT_BOUND`，但被本入库异常与增值链路引用。

normalized 当前将该异常关联到 `库内轻加工` 和 `库内销毁`。AI 应说明它是出库关联/库内处理场景，不是普通入库批次信息缺失。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 商品实际缺少 SN 或 SN 条码异常。 | 商品仍需在仓内被识别/处理。 |
| 信息流 | SN 采集无法完成。 | 出库或相关操作信息流被阻断。 |
| 当前卡点 | SN 缺失或不可采集。 | 需判断库内处理还是销毁。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 可通过库内标签/处理动作承接时判断。 |
| `VASC202504171850278` 库内销毁 | active | 客户要求销毁或无法处理时判断。 |

## AI 判断要点

- 必须标注异常节点为 `OUT_BOUND`，不是普通入库收货异常。
- 先确认 SN 是缺失还是条码异常无法采集。
- 不要自行生成 SN、模板或字段要求。
- 若客户问配置字段，应转到对应 VASC/原子页，当前异常页不定版。

## 证据边界

- normalized 只证明两个候选 VASC 关系。
- 本页不定义 SN 采集规则、标签模板、字段和费用。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
