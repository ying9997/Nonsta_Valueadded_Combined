---
title: 入库-更换新商品条码
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, relabel, product-level, item-level, config-field]
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
  - source-references/kb-business-source-snapshots/product-barcode-third-party-putaway.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1559
service_item_name: 入库-更换新商品条码
service_item_aliases: [增值原子, 增值事件]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 贴商品标
charge_required: true
cost_generated: true
effective: true
field_evidence_status: partial
---

# 入库-更换新商品条码

## 摘要

`入库-更换新商品条码` 是入库异常处理中的商品级贴标/换标原子，用于异常商品需要更换或补贴新的商品/单品条码后继续上架的场景。它通常处理“实物商品条码缺失、错误、无法扫描，或实物与下单商品不一致，需要按新的商品条码承接”的问题。

AI 不能把本原子等同于第三方条码关联。若实物第三方商品条码正确，只是系统未维护第三方条码与 Winit SKU 的关联，应优先判断 `入库-第三方商品条码关联`；若需要补贴包裹级条码，应转到 `入库-补贴包裹条码`。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1559` |
| 服务项名称 | 入库-更换新商品条码 |
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

仓库动作为异常商品生成或补贴新的商品/单品标签，并覆盖或替代原有不可用标签。标签类型可以是 Winit 商品/单品条码，也可以是第三方商品/单品条码；但选择第三方商品/单品条码不代表系统自动完成第三方条码关联，仍需结合商品维护或关联原子判断。

完成后，商品实物通常继续按当前 VASC 的承接链路上架：可能是原单、新单、WINIT 创建新单或直接上架产品下的特定处理路径。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md) | `VASC202407012141008` | 2 | N | 贴商品标 | WINIT 新单承接且需要新商品条码时使用。 |
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 2 | N | 贴商品标 | 原单可承接且需要换/补新商品条码时使用。 |
| [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md) | `VASC202407161056217` | 4 | N | 未提供 | 客户新单承接且需要新商品条码时使用。 |
| 原单上架（直接上架） | `VASC202504251617529` | 2 | N | 未提供 | 该 VASC 产品页尚未生成；当前只作为编排索引。 |

## 适用范围

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 商品无条码或商品条码无法扫描 | 是 | 原子主数据定义和异常解决方案目录均有证据。 |
| 实物商品条码错误，客户要求换新商品条码后上架 | 是 | 商品条码异常、系统无法识别等场景中存在换新商品条码方案。 |
| 实物与下单商品不一致，需要用新商品条码承接 | 条件可选 | 需要结合客户选择原单/新单/WINIT 新单，以及异常对象是否为商品。 |
| 实物商品条码正确，但第三方条码未关联 Winit SKU | 不应默认选 | 该场景更接近第三方商品条码关联，不应直接推荐换新商品条码。 |
| 只需要补包裹条码或重建包裹承接关系 | 不应单独作为答案 | 应优先看 `入库-补贴包裹条码`。 |

## 配置字段

以下字段来自 `vas-event-attrs-slim.json` 中已由 `pms.BaseAttrRelService_findBaseAttrRelPage` 验证和扩充的普通属性字段，证据状态为 `covered_by_vas_event_attrs_slim`。当前知识库仍未覆盖完整模板、附件和页面校验规则。

| 字段键 | 字段名称 | 必填 | 展示类型 | 输入节点 | 可选值 |
|---|---|---|---|---|---|
| `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | N | `OPTIONAL_BOX` | `SUBMIT` | `GOOD_PRODUCT` = 良品；`DEFECTIVE_PRODUCT` = 不良品 |
| `LABEL_TYPE` | 标签类型 | Y | `OPTIONAL_BOX` | `SUBMIT` | `WINIT_SKU_SERNO_ITEM_SERNO` = Winit商品/单品条码；`THIRD_PARTY_SKU_SERNO_ITEM_SERNO` = 第三方商品/单品条码 |
| `LABEL_SIZE` | 尺寸规格 | Y | `OPTIONAL_BOX` | `SUBMIT` | `10X6` = 10cm*6cm；`5X2.5` = 5cm*2.5cm |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 上架商品等级 | 良品/不良品需要区分上架结果时 | 字段快照显示非必填；业务页多处提示支持良品/不良品上架。 |
| 标签类型 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 标签尺寸规格 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 新商品/单品条码或对应商品信息 | 需要更换为新商品/单品标签时 | 业务场景可证明需要新商品条码；当前字段快照未提供完整录入字段。 |
| 新入库单号、包裹条码等承接资料 | 新单上架场景 | 属于 VASC/业务承接资料，不是本原子 `attrSpec` 已确认字段。 |

## 上传文件要求

当前没有足够字段级证据确认本原子在所有场景下的附件类型、模板列和是否必传。

AI 可以说明：商品换标通常需要客户提供可用于生成标签的商品/单品条码信息；若系统提供下载模板或导入入口，应以系统模板为准。不能把截图中的模板列扩展为所有场景的确定字段清单。

## 校验规则

- 本原子是商品级动作，不处理包裹条码异常本身。
- `LABEL_TYPE` 和 `LABEL_SIZE` 在当前字段快照中为必填。
- `SHELVE_PRODUCT_GRADE` 在当前字段快照中非必填，但若业务场景涉及良品/不良品上架，应让客户明确选择或确认。
- 第三方商品条码正确但未系统关联时，应先判断第三方商品条码关联路径，不直接用换新商品条码替代。
- 与 `入库-补贴原商品条码` 同属“贴商品标”互斥组的 VASC 中，不能机械同时选择。

## 证据边界

- 本页字段表只覆盖 `vas-event-attrs-slim` 已提供的原子属性。
- 本页不定版费用金额、模板列、附件格式和国家差异。
- 原子主数据中的定义文本与业务命名存在容易混淆之处；AI 应以异常对象、客户处理意图和 VASC 产品页的动态可选性共同判断。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md)
