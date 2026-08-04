---
title: 自提单取消出库（需要客户下入库单）
type: reference
entity_type: inbound_exception
tags: [inbound, exception, outbound-related, self-pickup, order-level, customer-action, value-added-service]
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
exception_code: B07E1339
exception_name: 自提单取消出库（需要客户下入库单）
exception_stage: outbound_related_in_warehouse
exception_object_level: order
exception_node: IN_WAREHOUSE
exception_requires_customer_action: true
---

# 自提单取消出库（需要客户下入库单）

## 摘要

`B07E1339` 表示自提出库单暂存完成后，客户要求取消出库。来源定义说明因商品已更换商品标签，需要客户按指定方式重新建立入库承接关系；自提单处理费及增值费用等系统会正常收取。

normalized 仅将该异常关联到 `库内非标增值（特批）`。AI 应把它视为自提/出库关联异常，不应按普通入库上架异常直接推荐标准上架产品。

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 自提出库单暂存完成，商品已更换商品标签。 | 货物不是普通到仓待上架状态。 |
| 信息流 | 自提出库取消，原出库信息流需要重新承接。 | 来源要求客户下入库单建立新信息流。 |
| 当前卡点 | 已换标商品取消出库后的回流处理。 | 需要特批非标和新入库承接判断。 |

## 可关联 VASC 产品索引

| VASC 产品 | 状态 | 使用口径 |
|---|---|---|
| `VASC202411192250069` 库内非标增值（特批） | active | 唯一 normalized 候选，需审核、报价和客户确认后执行。 |

## AI 判断要点

- 先确认是否为自提出库单取消，且商品已换标。
- 来源提到两种客户侧承接思路：关联更换后的第三方商品编码并提交直发海外验入库单，或注册新 SKU 并提交直发海外验入库单。
- 不要把这些思路直接写成已配置字段；具体入库单、编码、标签和费用需业务确认。

## 证据边界

- normalized 只证明库内非标特批候选关系。
- 本页不定版重新入库字段、第三方商品编码关联方式、费用和 SOP。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [库内非标增值（特批）](../../vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-special-approval.md)
