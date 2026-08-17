---
title: 客户直发包裹串仓
type: reference
entity_type: inbound_exception
tags: [inbound, exception, package-level, warehouse-mismatch, customer-action, value-added-service]
source_refs:
  - source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/customer-direct-ship-inbound.md
  - source-references/kb-business-source-snapshots/direct-ship-parcel-sop.md
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B01E49
exception_name: 客户直发包裹串仓
exception_stage: inbound_receiving
exception_object_level: package
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 客户直发包裹串仓

## 摘要

`B01E49` 表示客户直发包裹实物已到仓，但到达仓库不是入库单提交的目的仓库，并且包裹头程非 Winit 承运。来源定义说明该包裹会上架至异常暂存区并产生暂存费用，需要客户更新入库单状态并联系客服提交增值服务单处理。

本异常的核心不是“仓库能不能找到货”，而是“实物所在仓库与入库单目的仓信息流不一致”。AI 需要先判断客户希望在实际到仓仓库上架、重新建单、调拨、销毁、自提，还是先拍照确认。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E49` |
| 异常名称 | 客户直发包裹串仓 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01` |
| 异常对象 | 包裹 |
| 责任方 | 客户 |
| 是否需要客户确认 | 是 |
| 是否收费 | 是 |
| 关闭方式 | 手动关闭 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流 | 包裹实物已到海外仓，但实际到仓仓库不是入库单目的仓。 | 货物不是未到仓，而是到了错误/非预期仓库。 |
| 信息流 | 入库单目的仓与实际收货仓不一致。 | 原入库单是否能继续承接，取决于仓库、权限、状态和处理方式。 |
| 当前卡点 | 包裹头程非 Winit 承运且串仓。 | 不能直接按 Winit 承运错仓处理，也不能默认仓库会内部调拨。 |
| 费用风险 | 异常暂存会产生暂存费用。 | AI 应提示客户及时确认处理方式，避免持续暂存。 |

## 客户处理选项

| 客户意图 | 判断条件 | 可关联 VASC 方向 |
|---|---|---|
| 实际仓上架 | 客户具备实际仓入库权限，且系统/业务允许用新单或直接上架承接。 | 新单上架（客户创建入库单）、新单上架（直接上架）、原单上架（直接上架）。 |
| 调拨或特殊处理 | 需要从实际仓调回目的仓，或标准路径无法承接。 | 入库非标增值（特批）。 |
| 先确认实物 | 客户需要图片、视频或实物确认后再决定。 | 入库非标拍照或提供视频。 |
| 销毁 | 客户不再上架该包裹。 | 上架前销毁。 |
| 自提 | 客户要求从实际仓提走。 | 上架前自提。 |

## 可关联 VASC 产品索引

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 实际仓或新承接关系需要客户创建入库单时判断。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁串仓包裹时判断。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时判断。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 调拨、特殊串仓处理或标准产品无法承接时判断。 |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 需要先确认包裹或实物时判断。 |
| `VASC202504251617529` | 原单上架（直接上架） | active | 仅在原单可承接且来源/系统支持时使用。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 仅在新单方向且无需复杂补标动作时使用。 |

## AI 判断要点

1. 确认这是客户直发包裹串仓，不是包裹条码异常、无主货或 Winit 承运错发。
2. 确认实际收货仓和入库单目的仓。
3. 判断客户是否有实际仓或目标仓的入库权限。
4. 若客户要调拨，必须查非标/串仓调拨边界，不能默认所有仓库之间都支持调拨。
5. 若客户要上架，优先判断新单承接还是直接上架；字段和费用不在本页定版。

## 证据边界

- normalized 只证明本异常与上述 VASC 存在候选关系，不证明每个串仓包裹都可调拨或直接上架。
- 具体国家、仓群、仓库间调拨支持范围、费用和权限需要回到对应业务规则或系统确认。
- 本页不展开包裹串仓异常调拨原子配置；原子信息在增值服务项页面维护。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
