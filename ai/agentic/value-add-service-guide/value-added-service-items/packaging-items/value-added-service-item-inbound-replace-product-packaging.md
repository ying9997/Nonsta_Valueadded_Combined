---
title: 入库-更换商品包装
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, repack, product-level, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json
  - source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/parcel-order-product-putaway.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1561
service_item_name: 入库-更换商品包装
service_item_aliases: [增值原子, 增值事件]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 入库-更换商品包装
charge_required: true
cost_generated: true
effective: true
field_evidence_status: partial
---

# 入库-更换商品包装

## 摘要

`入库-更换商品包装` 是入库异常处理中的商品级包装处理原子，用于客户要求仓库为异常商品增加、更换或加固包装后继续上架的场景。它常见于商品裸装、商品质量/包装异常、A+ 包裹质量异常或客户要求更换包装后原单/新单上架的分支。

AI 判断本原子时，要先确认客户处理意图是“包装处理后上架”，而不是销毁、自提、拍照暂存或单纯贴标。若客户要求客制包材、特殊包装能力或当前标准包材不覆盖的动作，应标记为需业务确认或非标判断。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1561` |
| 服务项名称 | 入库-更换商品包装 |
| 别名 | 增值原子 / 增值事件 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `partial_field_evidence` |

## 仓库动作

仓库动作是按客户选择的包装方式和包材类型，对异常商品增加、更换或加固包装。完成后，实物继续按所属 VASC 的承接链路上架：可以回原单、转客户新单或转 WINIT 创建新单。

本原子不负责改变商品条码、包裹条码或入库单承接关系；如果包装处理后还需要换标或补包裹条码，应由所属 VASC 下的其他原子组合承接。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md) | `VASC202407012141008` | 1 | N | 入库-更换商品包装 | WINIT 新单承接且需要包装处理时使用。 |
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 1 | N | 入库-更换商品包装 | 原单承接且需要包装处理时使用。 |
| [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md) | `VASC202407161056217` | 1 | N | 入库-更换商品包装 | 客户新单承接且需要包装处理时使用。 |

## 适用范围

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 商品裸装，客户要求更换包装后上架 | 是 | 异常解决方案目录中明确存在更换包装后原单/新单上架路径。 |
| 商品质量异常或 A+ 包裹质量异常，客户要求更换包装后上架 | 是 | 业务资料中存在原单上架和客户新单上架对应本原子的场景。 |
| 单品包装不符合要求，客户要求更换包装后上架 | 是 | 业务资料中存在原单上架 + 入库-更换商品包装。 |
| 客户只要求直接上架，不需要包装处理 | 不应默认选 | 应判断直接上架类 VASC/原子。 |
| 客户要求客制包材或标准包材外的特殊包装 | 条件可选 | 当前字段只覆盖 Winit 标准包装/包装加固和部分包材类型；复杂需求需非标或业务确认。 |
| 包装注册信息与实物不符但货物已正常上架、库存解禁类处理 | 不应直接套用 | 该类场景可能属于商品信息维护或库内处理，不一定是入库异常上架前包装原子。 |

## 配置字段

以下字段来自 `vas-event-attrs-slim.json` 中已由 `pms.BaseAttrRelService_findBaseAttrRelPage` 验证和扩充的普通属性字段，证据状态为 `covered_by_vas_event_attrs_slim`。当前知识库仍未覆盖完整页面规则、附件和包材可用性限制。

| 字段键 | 字段名称 | 必填 | 展示类型 | 输入节点 | 可选值 |
|---|---|---|---|---|---|
| `PACKAGING_MODE` | 包装方式 | Y | `OPTIONAL_BOX` | `SUBMIT` | `PACKAGING_WINIT` = Winit标准包装；`REINFORCED_PACKAGING` = 包装加固 |
| `PACKAGING_MATERAIL_TYPE` | 包材类型 | Y | `OPTIONAL_BOX` | `SUBMIT` | `PADDED_ENVELOPE` = 气泡袋；`COURIER_SATCHEL` = 快递袋；`CARTON_BOX` = 纸箱；`PAPER_SEALING` = 纸皮封口；`FILM_WRAPPING_REINFORCE` = 缠膜加固 |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 包装方式 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 包材类型 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 需要处理的商品范围 | 指定异常商品、异常包裹内商品或 VASC 关联货物时 | 接口可承载货物列表；当前字段快照未定版货物选择规则。 |
| 包装处理后的上架承接方式 | 原单、新单或 WINIT 新单上架场景 | 属于 VASC 产品和业务承接资料，不是本原子的 `attrSpec` 字段。 |
| 客制包材、特殊包装 SOP 或图片说明 | 标准包材不能满足客户需求时 | 当前字段快照未覆盖；需非标或业务确认。 |

## 上传文件要求

当前没有足够字段级证据确认本原子在所有场景下是否需要附件、图片或 SOP。

AI 回答时可以说明：标准包装处理通常至少需要客户选择包装方式和包材类型；如果客户要求客制包材、指定包装步骤或特殊防护方式，应要求客户提供说明、图片或 SOP，并标注当前知识库无法确认是否由标准原子承接。

## 校验规则

- `PACKAGING_MODE` 和 `PACKAGING_MATERAIL_TYPE` 在当前字段快照中均为必填。
- 本原子是包装动作，不处理商品条码、包裹条码或第三方条码关联。
- 客制包材或特殊包装不能直接视为标准 `入库-更换商品包装` 已支持。
- 若包装处理后还要换标、补包裹标或新单承接，应回到所属 VASC 的原子编排动态判断。

## 证据边界

- 本页字段表只覆盖 `vas-event-attrs-slim` 已提供的原子属性。
- 本页不定版费用金额、包材库存、国家仓库差异、附件格式和特殊包装 SOP。
- 当前字段键 `PACKAGING_MATERAIL_TYPE` 保留来源拼写，不自行更正为 `MATERIAL`，避免破坏系统字段追溯。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md)
