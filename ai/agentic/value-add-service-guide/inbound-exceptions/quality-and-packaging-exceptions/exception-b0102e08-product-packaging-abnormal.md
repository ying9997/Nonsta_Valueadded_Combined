---
title: 商品包装异常
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, packaging, in-warehouse, customer-action, value-added-service]
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
exception_code: B0102E08
exception_name: 商品包装异常
exception_stage: in_warehouse_operation
exception_object_level: product
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 商品包装异常

## 摘要

`B0102E08` 表示库内商品存在包装异常。来源定义列举了物流包装破损、外包装受潮、包装未封口、信封材质非牛皮纸、外包装透明或彩盒包装、组合/连体包装、同 SKU 不同单品外包装差异等情况，并要求客户在 1 个工作日内提供处理意见并提交增值服务。

本异常发生在库内商品层级，AI 应先判断客户是要修复/更换包装、拍照确认、库内非标处理、审核类处理还是销毁。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 商品在库内被发现包装异常。 | 商品仍在仓内，但当前包装状态可能影响存储、上架或后续出库。 |
| 信息流 | 异常单等待客户提供处理意见。 | 当前系统只证明异常已登记，不证明某个 VASC 必选。 |
| 当前卡点 | 包装形态或质量不符合处理要求。 | 需结合客户意图选择轻加工、拍照、非标或销毁。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202407031456553` 库内轻加工 | active | 更换包装、贴标、轻加工等标准库内处理方向。 |
| `VASC202407031511413` 库内商品拍照 | active | 需客户先确认包装状态时使用。 |
| `VASC202411192229072` 库内非标增值（免审核） | active | 已归纳免审核库内非标原子可承接时判断。 |
| `VASC202411192250069` 库内非标增值（特批） | active | 特殊包装处理或标准路径不足时判断。 |
| `VASC202412111836315` 库内非标增值（需审核） | active | 需审核场景按产品边界判断。 |
| `VASC202504171850278` 库内销毁 | active | 客户决定销毁异常商品时判断。 |

## AI 判断要点

- 先确认异常是包装问题，不是商品数量、条码或批次问题。
- 若客户要继续销售/出库，优先判断是否可通过库内轻加工修复。
- 若客户无法判断实物状态，可先走拍照确认。
- 字段、附件、费用和包装材料要求不在本页定版。

## 证据边界

- normalized 只证明候选 VASC 关系，不证明所有包装异常都能选择所有库内非标原子。
- 本页不展开库内轻加工、非标原子的字段配置。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
