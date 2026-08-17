---
title: 商品有条码但系统无法识别
type: reference
entity_type: inbound_exception
tags: [inbound, exception, product-level, customer-action, value-added-service]
source_refs:
  - source-references/kb-business-source-snapshots/inbound-exception-handling.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/vas-exception-handling.md
  - source-references/kb-business-source-snapshots/product-barcode-third-party-putaway.md
  - source-references/kb-business-source-snapshots/no-box-list-forecast-faq.md
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
exception_code: B01E1316
exception_name: 商品有条码但系统无法识别
exception_stage: inbound_inspection
exception_object_level: product
exception_node: IN_BOUND
exception_requires_customer_action: true
---

# 商品有条码但系统无法识别

## 摘要

`B01E1316` 表示商品实物上有条码，常见为第三方商品编码或 FNSKU 等，但 Winit 系统扫描后无法识别到对应的 Winit SKU 关系，导致仓库不能直接完成上架。该异常的核心不是“没有条码”，而是“条码存在，但系统关联关系不成立或未生效”。

本异常是“入库-第三方商品条码关联”的核心适用场景。AI 回答时必须先确认客户是否已补充第三方商品条码与 Winit SKU 的关联；如果实物条码错误、条码无法扫描、实物与下单商品不一致，则不能简单推荐第三方条码关联，应转入换标、新单上架、补包裹条码、拍照、销毁或自提等分支。

## 异常标识

| 字段 | 值 |
|---|---|
| 异常编码 | `B01E1316` |
| 异常名称 | 商品有条码但系统无法识别 |
| 异常环节 | 入库 |
| 异常节点 | `IN_BOUND` |
| 来源 SG | `B01,B04` |
| 异常对象 | 商品 |
| 是否需要客户处理 | 是 |

## 异常发生时的实物流与信息流状态

| 维度 | 状态 | 说明 |
|---|---|---|
| 实物流对象 | 商品/单品 | 实物商品上存在条码，通常是第三方商品编码或 FNSKU 等。 |
| 实物流状态 | 商品已到仓并进入扫描识别环节，因系统无法识别而暂存等待处理 | 仓库能看到条码，但不能据此完成商品与 Winit SKU 的系统匹配。 |
| 信息流状态 | 第三方商品条码与 Winit SKU 的关联关系缺失、不一致或未生效 | 客户需要先确认/维护关联关系，再判断是否可回原单上架。 |
| 当前卡点 | “有条码”不等于“系统可识别” | 若条码与原入库单商品一致且客户已维护关联，可进入原单上架 + 第三方条码关联；若不一致，则转新单、换标或其他处理。 |
| 后续处理方向索引 | 原单上架、新单上架、预报单承接、拍照确认、销毁、自提或非标 | 本异常是第三方商品条码关联的核心适用场景，但仍需满足实物与原单一致等条件。 |
| 流程参考 | [实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)、[信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md) | 本页只记录本异常的发生时状态，不重复总流程。 |

## 异常含义

该异常通常发生在商品已贴第三方商品条码，但客户未在到仓前维护第三方条码与 Winit SKU 的关联，或维护关系与异常商品不匹配。仓库能看到条码，却不能通过系统识别商品信息，因此异常商品会暂存等待客户处理。

AI 需要区分三类情况：

| 情况 | 判断 | 处理方向 |
|---|---|---|
| 条码正确，只是系统未关联 | 实物第三方条码与客户要上架的 SKU 一致，客户可补充关联 | 原单上架 + 入库-第三方商品条码关联。 |
| 条码错误或实物与下单商品不一致 | 条码指向错误商品，或实物不是异常单登记入库单中的商品 | 新单上架、换新商品条码、补包裹条码或其他处理。 |
| 条码本身无法扫描 | 条码破损、模糊、扫描枪扫不出信息 | 更接近商品条码异常 `B01E1315`，按补/换商品条码或拍照确认处理。 |

## 客户处理选项

| 客户处理意图 | 判断条件 | 可能的 VASC 方向 | 服务项线索 |
|---|---|---|---|
| 补充第三方条码关联后原单上架 | 实物第三方条码正确，客户已在商品信息中维护关联 | 原单上架 | 入库-第三方商品条码关联。 |
| 新单上架 | 实物不应继续使用原入库单，或客户需要用新入库单承接 | 新单上架（客户创建入库单）、新单上架（WINIT创建入库单） | 入库-补贴包裹条码、入库-更换新商品条码。 |
| 使用预报单承接 | 无箱单预报场景，且系统/业务入口支持 | 新单上架（客户提供预报单） | 入库-提供无箱单预报单上架。 |
| 实物识别不清 | 客户需要先看商品、条码或包装情况 | 入库商品拍照 | normalized 中该 VASC 为 inactive，回答时不得作为当前可下单结论。 |
| 销毁或自提 | 客户不再上架 | 上架前销毁、上架前自提 | 需按异常对象和货物形态选择商品/包裹、托盘/非托盘。 |
| 特殊处理 | 标准路径无法承接 | 入库非标增值（特批） | 需符合非标规则，不作为默认兜底。 |

## 可关联 VASC 产品索引

以下索引来自 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`。同一个 VASC 下可能有多个服务项，具体服务项必须再查 VASC 到服务项编排映射。

| VASC 产品编码 | VASC 产品名称 | 状态 | 使用口径 |
|---|---|---|---|
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 新单承接方向，需系统入口和业务条件支持。 |
| `VASC202407031503503` | 原单上架 | active | 第三方条码正确且补充关联后，优先判断此方向。 |
| `VASC202407031507376` | 入库商品拍照 | inactive | 只能作为历史/映射证据，不直接推荐为当前可下单方案。 |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 客户创建新单承接时使用。 |
| `VASC202409121753076` | 上架前销毁 | active | 客户要求销毁时使用。 |
| `VASC202411192240522` | 上架前自提 | active | 客户要求自提时使用。 |
| `VASC202411192246131` | 入库非标增值（特批） | active | 特殊需求使用，需符合非标规则。 |
| `VASC202412111831129` | 新单上架（客户提供预报单） | active | 仅限预报单承接场景。 |

## 第三方商品条码关联规则

“入库-第三方商品条码关联”仅支持处理“商品有条码但系统无法识别”这类异常。来源资料说明，如果客户把该服务项提交到不匹配场景，系统会强制校验退回。

使用该方向前，AI 必须确认：

1. 异常编码或异常含义确实对应 `B01E1316`。
2. 实物条码能被识别为第三方商品条码，而不是无条码、破损条码或错误商品条码。
3. 客户已补充第三方商品条码与 Winit SKU 的关联。
4. 异常商品实物与原入库单下单商品一致，且可以继续使用原单承接。
5. 异常状态已允许仓库继续处理；若状态未更新，需先核查客户是否真的完成关联操作。

## 无箱单预报场景补充

无箱单预报场景中，如果货物到仓后才发现第三方条码未关联，客户可先补充第三方条码关联；异常状态更新到仓库可处理后，仓库才可继续扫描上架。若无法通过关联解决，则需要转为换标、新单或预报单承接方向。

## 与 B01E1315 的区别

- `B01E1316`：条码存在，系统无法识别关联关系。
- `B01E1315`：商品条码缺失、破损、无法扫描、错误或未录入等更广义商品条码异常。

如果用户只说“商品条码扫不了”，AI 不能直接判断为 `B01E1316`；必须确认扫描后是“有条码但系统不识别”，还是“条码本身不可扫描”。

## 回答用户时的检查清单

1. 确认异常编码是否为 `B01E1316`。
2. 确认客户是否已经维护第三方商品条码与 Winit SKU 的关联。
3. 确认实物第三方条码是否与原入库单商品一致。
4. 若一致，优先判断原单上架 + 入库-第三方商品条码关联。
5. 若不一致或条码无法扫描，转入 `B01E1315` 或新单/换标/补包裹条码分支。
6. 查映射确认 VASC 是否有关联，不凭服务项名称泛化。
7. 字段、模板、附件要求未在本页定版；不得编造。

## 证据边界

- normalized 映射证明 `B01E1316` 与上述 VASC 产品存在关联，不证明每个 VASC 在所有场景下都可推荐。
- 业务快照证明“入库-第三方商品条码关联”只支持该异常场景，但具体字段模板仍需后续服务项页或接口证据补齐。
- 本页不生成字段配置结论。

## 相关链接

- [商品条码异常（需客户处理）](exception-b01e1315-product-barcode-abnormal-customer-action-required.md)
- [入库异常到 VASC 产品映射](../../relationship-mappings/inbound-exception-to-vasc-product-mapping.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
