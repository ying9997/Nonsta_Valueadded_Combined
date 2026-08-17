---
title: 入库-补贴原商品条码（带示例图）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, relabel, product-level, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - value-added-service-items/labeling-items/value-added-service-item-inbound-original-product-barcode-labeling.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1825
service_item_name: 入库-补贴原商品条码（带示例图）
service_item_aliases: [增值原子, 增值事件, 补贴原商品条码带示例图]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 贴商品标
charge_required: true
cost_generated: true
effective: true
field_evidence_status: partial
---

# 入库-补贴原商品条码（带示例图）

## 摘要

`入库-补贴原商品条码（带示例图）` 是商品级贴标原子，用于客户货物入库时商品条码异常，但不属于“无条码”场景；仓库需要生成新商品标签并覆盖原商品标签，同时使用原入库单上架。

它与 `入库-补贴原商品条码` 的核心差异是：本原子要求客户提交商品条码贴标示例图，字段中存在必填附件 `VAS_ATTR_REL_SP`。AI 不应把两个原子完全合并回答。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1825` |
| 服务项名称 | 入库-补贴原商品条码（带示例图） |
| 别名 | 增值原子 / 增值事件 / 补贴原商品条码带示例图 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 0 天 |
| 是否通知客户 | N |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `partial_field_evidence`，当前有 4 个 `attrSpec` 字段 |

## 仓库动作

仓库动作是根据客户选择的标签类型、尺寸规格和示例图，生成或使用商品/单品条码标签，覆盖原商品标签，并让商品回到原入库单上架方向。

本原子主数据明确“不含无条码”。如果商品完全无条码，应优先查 `入库-更换新商品条码`、拍照辨识或其他商品条码异常处理路径，而不是直接套用本页。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 5 | N | 贴商品标 | 与其他商品贴标原子同组，按异常口径选择。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 商品条码异常，但商品不是无条码，客户要求使用原入库单上架 | 是 | 主数据定义明确“不含无条码”且使用原入库单上架。 |
| 需要生成新商品标签并覆盖原商品标签 | 是 | 主数据定义明确覆盖原商品标签。 |
| 客户需要提供贴标示例图指导仓库贴标 | 是 | `VAS_ATTR_REL_SP` 是必填附件字段。 |
| 商品完全无条码 | 不应直接选 | 主数据明确不含无条码。 |
| 商品实物与下单商品不一致，需要换新商品条码 | 不应默认选 | 应查 `入库-更换新商品条码`。 |
| 第三方条码正确但系统未关联 Winit SKU | 不应默认选 | 应查 `入库-第三方商品条码关联`。 |

## 配置字段

当前可定版的字段来自 normalized `attrSpec` / `vas-event-attrs-slim`，输入节点均为 `SUBMIT`。

| attributeKey | 字段名 | 是否必填 | 控件类型 | 可选值 | AI 配置说明 |
|---|---|---|---|---|---|
| `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | 否 | `OPTIONAL_BOX` | `GOOD_PRODUCT` = 良品；`DEFECTIVE_PRODUCT` = 不良品 | 需要客户明确良品/不良品时填写，不能由 AI 自行判断。 |
| `LABEL_SIZE` | 尺寸规格 | 是 | `OPTIONAL_BOX` | `10X6` = 10cm*6cm；`5X2.5` = 5cm*2.5cm | 用于确定商品/单品标签尺寸。 |
| `LABEL_TYPE` | 标签类型 | 是 | `OPTIONAL_BOX` | `WINIT_SKU_SERNO_ITEM_SERNO` = Winit商品/单品条码；`THIRD_PARTY_SKU_SERNO_ITEM_SERNO` = 第三方商品/单品条码 | 用于选择要覆盖的商品/单品条码类型。 |
| `VAS_ATTR_REL_SP` | 示例图片 | 是 | `ANNEX` | 无枚举 | 必填贴标示例图片。 |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交原单上架增值 | 接口结构支持异常来源与增值单关联。 |
| 商品对象 | 所有场景 | 主数据操作对象为商品。 |
| 商品不是无条码的确认 | 所有场景 | 主数据明确本原子不含无条码。 |
| 标签尺寸规格 | 所有场景 | `LABEL_SIZE` 为必填字段。 |
| 标签类型 | 所有场景 | `LABEL_TYPE` 为必填字段。 |
| 贴标示例图片 | 所有场景 | `VAS_ATTR_REL_SP` 为必填附件字段。 |
| 上架商品等级 | 需要区分良品/不良品时 | `SHELVE_PRODUCT_GRADE` 为可选字段。 |

## 上传文件要求

当前字段证据明确存在一个必填附件字段：

| 上传项 | 字段 | 必填 | 说明 |
|---|---|---|---|
| 商品条码贴标示例图片 | `VAS_ATTR_REL_SP` | 是 | 用于指导仓库如何生成或覆盖商品/单品条码标签。 |

本页不定版图片格式、文件大小、模板列和示例图片内容标准；这些当前未在数据中展开。

## 校验规则

- 必须确认操作对象是商品。
- 必须确认不是商品完全无条码场景。
- 必须填写标签尺寸和标签类型。
- 必须上传示例图片。
- 与 `入库-补贴原商品条码`、`入库-更换新商品条码`、`入库-第三方商品条码关联` 同属或接近“贴商品标”判断域，不能机械同时选择。
- 如果客户只是需要系统关联第三方条码，不需要覆盖标签，应查第三方商品条码关联。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-补贴原商品条码 | 不带示例图的原商品条码补贴页；本页明确要求示例图片。 |
| 入库-更换新商品条码 | 适用于需要更换新商品标签或无条码等场景；本页不含无条码。 |
| 入库-第三方商品条码关联 | 系统关系补齐，不一定需要覆盖实物标签；本页是贴标覆盖动作。 |
| 入库-补贴包裹条码 | 包裹级条码处理；本页是商品级。 |

## 证据边界

- 本页只定版 normalized 已展开的 4 个字段，不推断额外附件、模板或隐藏字段。
- 本页的业务场景主要来自原子主数据和原单上架编排；异常解决方案目录对“带示例图”未展开独立场景。
- 本页不定版费用金额、国家仓库差异、图片格式和贴标材料。

## 相关链接

- [入库-补贴原商品条码](value-added-service-item-inbound-original-product-barcode-labeling.md)
- [入库-更换新商品条码](value-added-service-item-inbound-new-product-barcode-labeling.md)
- [入库-第三方商品条码关联](value-added-service-item-inbound-third-party-product-barcode-association.md)
- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
