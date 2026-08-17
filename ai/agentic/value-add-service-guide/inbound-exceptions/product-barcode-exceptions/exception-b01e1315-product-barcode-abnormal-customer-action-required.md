---
title: 商品条码异常（需客户处理）
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, customer-action, value-added-service]
source_refs:
  - source-references/kb-business-source-snapshots/inbound-exception-handling.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/vas-exception-handling.md
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B01E1315
exception_name: 商品条码异常(需客户处理)
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 商品条码异常（需客户处理）

## 摘要

`B01E1315` 表示货物已到仓，仓库在入库验货/上架前发现包裹内商品条码存在异常，当前信息流下无法直接完成商品识别和上架。该异常属于入库操作增值类异常，通常会进入异常暂存，需要客户判断实物与入库单关系，并选择原单上架、新单上架、拍照确认、销毁、自提或特殊处理。

本页只解释异常和可关联 VASC 索引；VASC 产品和增值服务项的详细说明放到 `vasc-products/` 和 `value-added-service-items/`。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1315` |
| 异常名称 | 商品条码异常(需客户处理) |
| 异常环节 | 入库 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01,B04` |
| 异常对象 | 商品 |
| 是否需要客户处理 | 是 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流对象 | 商品/单品 | 异常发生在包裹内商品层级，不应直接按包裹异常处理。 |
| 实物流状态 | 已到仓并进入验货/上架前识别环节，异常商品通常进入异常暂存 | 来源描述为“以下包裹实物已到仓，但包裹内商品存在问题”；仓库无法通过当前商品条码完成正常上架。 |
| 信息流状态 | 商品条码与入库单商品信息不能稳定匹配，异常单待客户处理 | 当前信息流无法确认应使用原入库单、新入库单、预报单还是退出上架链路。 |
| 当前卡点 | 商品条码缺失、破损、无法扫描、贴错或未录入系统等 | 卡点在商品条码与 SKU/入库单关系，不是包裹条码本身。 |
| 后续处理方向索引 | 原单上架、新单上架、预报单承接、拍照确认、销毁、自提或非标 | 这里只做方向索引；VASC 产品和原子流向见对应产品页。 |
| 流程参考 | [实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)、[信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md) | 本页只记录本异常的发生时状态，不重复总流程。 |

## 异常含义

该异常覆盖商品条码缺失、条码不完整、无法扫描、条码错误、商品条码未录入 Winit 系统等场景。仓库无法仅凭当前条码完成商品与入库单信息的匹配，因此会将异常商品移入异常暂存，并等待客户处理意见或增值服务。

AI 不能只看到“商品条码异常”就直接推荐一个固定增值。必须先判断：

- 实物商品与异常单登记入库单中的下单商品是否一致。
- 商品条码是缺失/破损/无法扫描，还是贴错、贴成其他商品条码。
- 客户希望使用原入库单、新入库单、Winit 创建入库单，还是无箱单预报单承接上架。
- 客户是否需要先拍照识别实物。
- 客户是否不再上架，而是销毁或自提。

## 客户处理选项

| 客户处理意图 | 判断条件 | 可能的 VASC 方向 | 服务项线索 |
|---|---|---|---|
| 原单上架 | 实物与原入库单下单商品一致，原单状态允许继续上架 | 原单上架 | 入库-补贴原商品条码、入库-更换新商品条码；特定场景也可能涉及补贴包裹条码。 |
| 新单上架（客户创建入库单） | 实物不应继续使用原单，或商品未在异常单登记入库单中下单 | 新单上架（客户创建入库单） | 入库-更换新商品条码、入库-补贴包裹条码。 |
| 新单上架（WINIT 创建入库单） | normalized 映射显示支持，但具体场景需回到系统可选项和业务确认 | 新单上架（WINIT创建入库单） | 入库-更换新商品条码、入库-补贴原商品条码、入库-补贴包裹条码。 |
| 新单上架（客户提供预报单） | 使用无箱单预报单承接，且业务资料和系统入口支持 | 新单上架（客户提供预报单） | 入库-提供无箱单预报单上架。 |
| 拍照后再判断 | 客户需要先确认实物、条码或商品状态 | 入库商品拍照 | normalized 中该 VASC 为 inactive，回答时不得作为当前可下单结论。 |
| 销毁 | 客户不再上架，要求销毁异常商品或包裹 | 上架前销毁 | 需区分上架前商品销毁和上架前包裹销毁。 |
| 自提 | 客户要求取回异常货物 | 上架前自提 | 需区分是否需要 Winit 打托。 |
| 特殊处理 | 标准 VASC 不足以承接，且需求符合非标规则 | 入库非标增值（特批） | 需走非标限制和审批；不能作为默认兜底。 |

## 可关联 VASC 产品索引

以下索引来自 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`。是否推荐给用户，还要结合客户处理意图、异常对象、系统可选项和业务备注。

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 仅在业务场景和系统入口支持时作为新单承接方向。 |
| `VASC202407031503503` | 原单上架 | active | 实物与原单可匹配时优先判断。 |
| `VASC202407031507376` | 入库商品拍照 | inactive | 只能作为历史/映射证据，不直接推荐为当前可下单方案。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 常用于客户创建新入库单承接异常商品。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁时判断对象后使用。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时判断包裹/托盘和打托要求。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊需求使用，需符合非标规则。 |
| `VASC202412111831129` | 新单上架（客户提供预报单） | active | 仅限预报单承接场景。 |

## 与 B01E1316 的区别

`B01E1315` 是商品条码本身异常或商品条码与商品/入库单关系异常；`B01E1316` 是商品有条码，但系统无法识别该条码与 Winit SKU 的关联关系。

“入库-第三方商品条码关联”不能被泛化为所有商品条码异常的处理方式。来源资料明确该服务项只支持“商品有条码但系统无法识别”类异常；在 `B01E1315` 场景下，如果只是客户希望打印补贴自己指定的第三方条码，异常解决方案目录中存在“不推荐使用”和入口关闭类备注，AI 不得将其作为标准推荐。

## 回答用户时的检查清单

1. 先确认异常编码是否确为 `B01E1315`。
2. 确认异常对象是商品，而不是包裹或订单。
3. 确认实物与原入库单商品是否一致。
4. 确认客户要原单上架、新单上架、预报单上架、拍照、销毁、自提还是非标。
5. 查 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md` 确认 VASC 是否有关联。
6. 查 `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md` 确认 VASC 下可选服务项。
7. 字段、模板、附件要求未在本页定版；不得编造。

## 证据边界

- normalized 映射证明 `B01E1315` 与上述 VASC 产品存在关联，不证明每个 VASC 在所有商品条码异常场景下都可推荐。
- `vas-exception-solution-catalog.md` 提供了客户需求描述和服务项线索，但其中存在入口关闭、不推荐等备注，AI 必须保留限制。
- 本页不生成字段配置结论；字段级证据需等待增值服务项页面或字段映射补齐。

## 相关链接

- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
