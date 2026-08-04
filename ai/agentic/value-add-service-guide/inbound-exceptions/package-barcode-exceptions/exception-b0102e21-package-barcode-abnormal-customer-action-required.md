---
title: 包裹条码异常（需客户处理）
type: reference
entity_type: inbound_exception
tags: [inbound, exception, package-level, customer-action, value-added-service]
source_refs:
  - source-references/kb-business-source-snapshots/inbound-exception-handling.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/parcel-barcode-exception-subsidy-putaway.md
  - source-references/kb-business-source-snapshots/direct-ship-parcel-sop.md
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B0102E21
exception_name: 包裹条码异常(需客户处理)
exception_stage: inbound_receiving
exception_object_level: package
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 包裹条码异常（需客户处理）

## 摘要

`B0102E21` 表示包裹实物已到仓，但包裹条码存在问题，仓库无法定位包裹号或无法把实物包裹稳定关联到正确入库单信息流。该异常对象是包裹，通常会将包裹移入异常暂存区，等待客户确认原入库单、新入库单、销毁、自提、拍照/视频或特殊处理。

本异常的主判断不是“商品是什么”，而是“这个包裹应该关联哪张入库单、使用哪个包裹条码上架”。AI 不能把包裹条码异常直接回答成商品换标。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B0102E21` |
| 异常名称 | 包裹条码异常(需客户处理) |
| 异常环节 | 入库 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01` |
| 异常对象 | 包裹 |
| 是否需要客户处理 | 是 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流对象 | 包裹 | 异常对象是包裹，不是包裹内商品。 |
| 实物流状态 | 包裹实物已到仓或已进入收货/识别环节，因包裹条码问题进入异常暂存 | 包裹可能无有效条码、条码破损、重复、冲突或未录入系统。 |
| 信息流状态 | 包裹号、入库单或包裹轨迹无法稳定关联 | 仓库无法确认该包裹应挂到原入库单、客户新建入库单还是其他承接关系。 |
| 当前卡点 | 包裹条码与入库单/包裹信息流的关系不成立 | 需要客户确认能否找到原入库单；不能确认时通常转新单、拍照/识别、销毁、自提或非标。 |
| 后续处理方向索引 | 原单上架、新单上架、拍照/视频确认、销毁、自提或非标 | 若走上架，常见服务项线索是补贴包裹条码；是否原单或新单取决于承接关系。 |
| 流程参考 | [实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)、[信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md) | 本页只记录本异常的发生时状态，不重复总流程。 |

## 异常含义

该异常覆盖以下包裹条码问题：

- 无有效包裹条码，例如无条码、条码破损无法辨识、条码状态异常。
- 包裹条码未录入 Winit 系统。
- 包裹上存在多个冲突的有效包裹条码。
- A+ 包裹重复条码等导致仓库无法确认包裹号的情况。

仓库可能能判断该包裹属于客户，但无法确认包裹应该挂在哪个入库单或包裹号下，因此会暂存并要求客户提交处理方案。

## 关键判断

| 判断问题 | 若答案为是 | 若答案为否 |
|---|---|---|
| 异常单是否已关联入库单 | 通常先判断是否可用原单上架并补贴包裹条码 | 需要客户确认入库单；无法确认时倾向新单承接或先调查/识别。 |
| 客户能否找到原入库单 | 可选择原单上架 + 入库-补贴包裹条码 | 走新单/仓内上架单，并补贴新包裹条码。 |
| 包裹是否需要换新信息流 | 选择新单上架（客户创建入库单）等方向 | 可继续原单上架。 |
| 客户是否只是想确认实物 | 走拍照、视频或异常包裹开箱拍照 | 直接进入上架、销毁、自提等最终处理。 |
| 客户是否不再上架 | 销毁或自提 | 继续判断原单/新单/非标。 |

## 客户处理选项

| 客户处理意图 | 判断条件 | 可能的 VASC 方向 | 服务项线索 |
|---|---|---|---|
| 原单上架 | 客户能确认原入库单，且原单状态/业务条件允许继续上架 | 原单上架 | 入库-补贴包裹条码。 |
| 新单上架（客户创建入库单） | 无法使用原单，或客户需要创建新入库单承接 | 新单上架（客户创建入库单） | 入库-补贴包裹条码；必要时再结合商品条码服务项。 |
| 新单直接上架 | 映射显示有关联，但必须由具体场景和系统可选项支撑 | 新单上架（直接上架） | 直接上架。 |
| 拍照/视频确认 | 客户需要先确认包裹、箱内商品或责任 | 入库非标拍照或提供视频 | 入库-异常包裹开箱拍照、少包裹/少单品视频调查等。 |
| 销毁 | 客户要求销毁异常包裹 | 上架前销毁 | 异常对象是包裹时，应选择包裹销毁方向。 |
| 自提 | 客户要求取回异常包裹 | 上架前自提 | 区分是否需要 Winit 打托。 |
| 特殊处理 | 标准路径不能承接 | 入库非标增值（特批） | 需符合非标规则，不能作为默认兜底。 |

## 可关联 VASC 产品索引

以下索引来自 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`。是否推荐给用户，还要结合客户是否能确认原单、异常单是否关联入库单、包裹状态和系统可选项。

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407031503503` | 原单上架 | active | 能确认原入库单并使用原单上架时判断。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 无法定位原单或需换新单承接时判断。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁异常包裹时判断。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时判断。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊需求使用，需符合非标规则。 |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 客户需要先识别包裹、箱内商品或调查责任时判断。 |
| `VASC202505282347101` | 新单上架（直接上架） | active | 只能在来源和系统入口明确支持时使用，不能仅凭名称推荐。 |

## 原单上架与新单上架判断

来源 SOP 对包裹条码异常给出明确分支：

- 异常单关联入库单时，通常是条码损坏、重复或冲突。若客户能找到原单，可选择原单上架并补贴包裹条码。
- 异常单未关联入库单时，通常需要客户确认入库单；若客户无法确认原单，应使用新单/仓内上架单方向，并补贴包裹条码。
- 异常解决方案目录中对部分 A+、A 包、BC 包有子包裹场景，建议使用新单上架（客户创建入库单）并补贴包裹条码。

AI 回答时必须说明“原单/新单”的选择取决于客户能否确认原入库单，以及原信息流是否还能承接该包裹。

## 与无主货的边界

包裹条码异常通常仍有一定线索能判断客户或入库方向；无主货则是包裹缺少可识别的 Winit 信息，无法明确归属。若外箱和内部商品都没有可识别信息，或只能通过快递单/POD/图片找回，可能需要先走无主货找回或拍照识别，再决定是否新单上架、销毁或自提。

## 回答用户时的检查清单

1. 确认异常编码是否为 `B0102E21`。
2. 确认异常对象是包裹，而不是商品。
3. 确认异常单是否关联入库单。
4. 让客户确认是否能找到原入库单。
5. 若能确认原单，查原单上架 + 入库-补贴包裹条码方向。
6. 若不能确认原单，查新单上架 + 入库-补贴包裹条码方向。
7. 若客户需要先确认实物，查拍照/视频方向。
8. 若客户选择销毁或自提，先匹配包裹对象。
9. 字段、模板、附件要求未在本页定版；不得编造。

## 证据边界

- normalized 映射证明 `B0102E21` 与上述 VASC 产品存在关联，不证明每个 VASC 在所有包裹条码异常场景下都可推荐。
- `parcel-barcode-exception-subsidy-putaway.md` 提供原单/新单上架选择的 SOP 证据，但字段模板细节仍需后续服务项页或字段映射补齐。
- 本页不生成费用、价卡或字段配置结论。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
