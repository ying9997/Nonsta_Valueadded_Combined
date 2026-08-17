---
title: 入库-覆盖包裹标签
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, package-level, config-field]
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
  - inbound-exception-value-added-process/customer-action-decision-flow.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1736
service_item_name: 入库-覆盖包裹标签
service_item_aliases: [增值原子, 增值事件, 覆盖包裹标签]
service_item_object_level: package
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: null
charge_required: true
cost_generated: true
effective: true
field_evidence_status: partial
---

# 入库-覆盖包裹标签

## 摘要

`入库-覆盖包裹标签` 是包裹级标签处理原子，用于入库场景下覆盖 A+/A 包上的包裹标签，包括 DG 标签、UN 标签、Cargo Aircraft ONLY 标签以及自定义标签等。

本原子解决的是“覆盖/遮盖某类包裹标签”，不是补贴或更换包裹条码。若客户需求是生成可上架的新包裹条码，应优先查 `入库-补贴包裹条码`。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1736` |
| 服务项名称 | 入库-覆盖包裹标签 |
| 别名 | 增值原子 / 增值事件 / 覆盖包裹标签 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 2 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `partial_field_evidence`，当前有 5 个 `attrSpec` 字段 |

## 仓库动作

仓库动作是在入库上架前对包裹外部指定标签进行识别、清除或覆盖，并按客户或系统要求贴上覆盖标签。执行完成后，包裹仍按所属 VASC 的上架方向继续处理。

本原子当前编排在 `原单上架（直接上架）` 下，说明它可作为直接上架前的标签覆盖动作之一；但是否能和其他原子组合，需要以系统实际可选项和异常解决方案为准。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 原单上架（直接上架） | `VASC202504251617529` | 3 | N | 空 | 覆盖标签后仍按原单直接上架方向承接。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| A+/A 包上存在需要覆盖的 DG、UN 或 Cargo Aircraft ONLY 标签 | 是 | 主数据定义明确覆盖 A+/A 包标签，并列举这些标签类型。 |
| 客户提供覆盖标签，并要求仓库覆盖原有标签 | 是 | 字段中存在覆盖标签类型、覆盖标签图片和标签尺寸配置。 |
| 客户需要覆盖自定义标签 | 可考虑 | `CLEAR_LABEL_TYPE` 支持 `CUSTOM_LABEL`。 |
| 客户需要补贴新包裹条码后上架 | 不应直接选 | 应查 `入库-补贴包裹条码`，覆盖标签不等同生成包裹条码。 |
| 客户需要清除商品标签或商品条码 | 不应直接选 | 本原子操作对象为包裹，不是商品级标签处理。 |
| 客户要求特殊合规判断或危险品处理结论 | 不能默认承接 | 本页只证明标签覆盖字段，不证明 DG 合规处理能力。 |

## 配置字段

当前可定版的字段来自 normalized `attrSpec` / `vas-event-attrs-slim`，输入节点均为 `SUBMIT`。

| attributeKey | 字段名 | 是否必填 | 控件类型 | 可选值 | AI 配置说明 |
|---|---|---|---|---|---|
| `CLEAR_LABEL_TYPE` | 清除的标签类型 | 是 | `OPTIONAL_BOX_WITH_IMAGE` | `DG_LABEL` = DG标签；`UN_LABEL` = UN标签；`CARGO_AIRCRAFT_ONLY_LABEL` = Cargo Aircraft ONLY标签；`CUSTOM_LABEL` = 自定义标签 | 用于说明要清除/覆盖的原标签类型。 |
| `COVER_LABEL_TYPE` | 覆盖的标签类型 | 是 | `OPTIONAL_BOX_WITH_IMAGE` | `WINIT_LABEL` = Winit标签-白标；`WINIT_LABEL_GRAPHIC` = Winit标签-带图文；`CUSTOMER_PROVIDED_OVERRIDING_LABEL` = 客户自提供覆盖标签 | 用于说明覆盖后贴什么类型的标签。 |
| `CLEAR_LABEL_SAMPLE_IMAGE` | 上传清除标签示例图 | 是 | `ANNEX` | 无枚举 | 客户需提供要清除或覆盖标签的示例图。 |
| `COVER_LABEL_IMAGE` | 上传覆盖标签图片 | 是 | `ANNEX` | 无枚举 | 客户需提供覆盖标签图片，尤其选择客户自提供覆盖标签时。 |
| `COVER_LABEL_SIZE` | 覆盖的标签尺寸规格 | 是 | `OPTIONAL_BOX` | `10X15` = 10cm*15cm；`10X10` = 10cm*10cm | 用于选择覆盖标签尺寸。 |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交标签覆盖 | 接口结构支持异常来源与增值单关联。 |
| 包裹对象 | 所有场景 | 主数据操作对象为包裹。 |
| 清除/覆盖的标签类型 | 所有场景 | `CLEAR_LABEL_TYPE` 为必填字段。 |
| 覆盖标签类型 | 所有场景 | `COVER_LABEL_TYPE` 为必填字段。 |
| 清除标签示例图 | 所有场景 | `CLEAR_LABEL_SAMPLE_IMAGE` 为必填附件字段。 |
| 覆盖标签图片 | 所有场景 | `COVER_LABEL_IMAGE` 为必填附件字段。 |
| 覆盖标签尺寸 | 所有场景 | `COVER_LABEL_SIZE` 为必填字段。 |

## 上传文件要求

当前字段证据明确存在两个必填附件字段：

| 上传项 | 字段 | 必填 | 说明 |
|---|---|---|---|
| 清除标签示例图 | `CLEAR_LABEL_SAMPLE_IMAGE` | 是 | 用于让仓库识别需要清除或覆盖的原标签。 |
| 覆盖标签图片 | `COVER_LABEL_IMAGE` | 是 | 用于提供覆盖后应贴的标签图片。 |

本页不定版图片格式、尺寸像素、文件大小或模板列；这些当前未在证据中展开。

## 校验规则

- 必须确认操作对象是包裹。
- 必须区分覆盖包裹标签和补贴包裹条码。
- 必须同时提供要清除的标签类型、覆盖标签类型、两类图片和标签尺寸。
- 如果客户选择自定义标签或客户自提供覆盖标签，应确保覆盖标签图片已提供。
- 本页不用于判断 DG/UN 等标签的合规责任，只描述标签覆盖动作和配置字段。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-补贴包裹条码 | 生成或补贴可承接入库单的包裹条码；本页是覆盖包裹标签。 |
| 入库-商品其他标签（非商品条码） | 商品级非商品条码标签；本页对象是包裹。 |
| 入库-清除商品标签 | 商品级清除标签，且当前多为非标或其他产品口径；本页是包裹标签覆盖。 |
| 直接上架 | 仓库直接上架动作；本页是直接上架链路中可能出现的标签覆盖动作。 |

## 证据边界

- 本页只定版 normalized 已展开的 5 个字段，不推断额外附件、模板或隐藏字段。
- 当前证据只显示其编排在 `原单上架（直接上架）` 下，不代表所有上架产品都可选。
- 本页不定版具体价格金额、国家仓库差异、图片格式或标签材质。
- 标签类型出现 DG/UN 等词，不等于本原子可承接危险品合规判断。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [直接上架](../putaway-items/value-added-service-item-direct-putaway.md)
- [入库-补贴包裹条码](value-added-service-item-inbound-package-barcode-labeling.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)

