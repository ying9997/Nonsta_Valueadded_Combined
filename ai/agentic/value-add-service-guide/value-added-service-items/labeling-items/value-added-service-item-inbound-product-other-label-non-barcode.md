---
title: 入库-商品其他标签（非商品条码）
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, product-level, config-field]
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
  - vasc-products/putaway-services/vasc-product-original-order-putaway.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1573
service_item_name: 入库-商品其他标签（非商品条码）
service_item_aliases: [增值原子, 增值事件, 商品其他标签, 非商品条码标签]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 入库-商品附加标签
charge_required: true
cost_generated: true
effective: true
field_evidence_status: partial
---

# 入库-商品其他标签（非商品条码）

## 摘要

`入库-商品其他标签（非商品条码）` 是商品级附加标签原子，用于卖家商品入库时，要求仓库针对商品粘贴不含商品条码的标签。这类标签通常用于商品描述、用途或合规信息，例如英代标签、欧代标签、尺寸标签、环保标签、产地标签、使用说明标签等。

本原子不处理商品条码、单品条码、第三方商品条码或包裹条码问题。若客户要补贴或更换可扫描条码，应进入商品条码或包裹条码原子。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1573` |
| 服务项名称 | 入库-商品其他标签（非商品条码） |
| 别名 | 增值原子 / 增值事件 / 商品其他标签 / 非商品条码标签 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | N |
| 默认 SLA | 2 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `partial_field_evidence`，当前有 3 个 `attrSpec` 字段 |

## 仓库动作

仓库动作是在商品上粘贴客户要求的非商品条码类标签，使商品在完成附加标签处理后继续按原单上架方向承接。

本原子当前只在 `原单上架` VASC 产品下有编排记录，不能据此推断所有新单上架或非标入库场景都支持。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 6 | N | 入库-商品附加标签 | 商品非条码标签处理后原单上架。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 商品需要补贴英代、欧代、尺寸、环保、产地或使用说明等标签 | 是 | 主数据定义明确列举这些非商品条码标签。 |
| 客户需要上架前补充商品其他类标签 | 是 | 业务目录说明该原子用于商品其他类标签缺失、上架前需要补充标签。 |
| 商品条码缺失、错误、无法扫描 | 不应选 | 本原子不含商品条码，应查补原商品条码或更换新商品条码。 |
| 第三方商品条码需要关联 | 不应选 | 应查第三方商品条码关联。 |
| 包裹标签或包裹条码处理 | 不应选 | 本原子操作对象为商品，不是包裹。 |

## 配置字段

当前可定版的字段来自 normalized `attrSpec` / `vas-event-attrs-slim`，输入节点均为 `SUBMIT`。

| attributeKey | 字段名 | 是否必填 | 控件类型 | 可选值 | AI 配置说明 |
|---|---|---|---|---|---|
| `LABEL_SIZE` | 尺寸规格 | 是 | `OPTIONAL_BOX` | `10X6` = 10cm*6cm；`5X2.5` = 5cm*2.5cm | 用于选择非商品条码标签尺寸。 |
| `ALL_GOODS_SAME_LABEL` | 标签文件是否全部相同 | 是 | `OPTIONAL_BOX` | `Y` = 是 | 当前证据只展开了“是”，不得补充“否”等枚举。 |
| `FILE_OPERATION_POSITION` | 文件操作位置 | 是 | `OPTIONAL_BOX` | `LABELING` = 贴标 | 当前证据只展开了贴标位置。 |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交原单上架增值 | 接口结构支持异常来源与增值单关联。 |
| 商品对象 | 所有场景 | 主数据操作对象为商品。 |
| 标签尺寸规格 | 所有场景 | `LABEL_SIZE` 为必填字段。 |
| 标签文件是否全部相同 | 所有场景 | `ALL_GOODS_SAME_LABEL` 为必填字段，但当前仅有 `Y` 枚举。 |
| 文件操作位置 | 所有场景 | `FILE_OPERATION_POSITION` 为必填字段，当前仅有贴标枚举。 |
| 标签内容或标签文件 | 实际贴标执行时 | 主数据可证明是标签类需求，但当前 `attrSpec` 未展开文件上传字段。 |

## 上传文件要求

当前字段证据没有展开附件字段，因此本页不能定版“必须上传标签文件”的系统字段。

AI 回答时可以说明：业务上通常需要客户提供要粘贴的非商品条码标签内容或文件，但当前知识库未从 `attrSpec` 定版上传字段、文件格式、模板列或附件数量，应以系统页面要求为准。

## 校验规则

- 必须确认标签不含商品条码。
- 必须确认操作对象是商品。
- 必须填写标签尺寸、标签文件是否全部相同和文件操作位置。
- 当前 `ALL_GOODS_SAME_LABEL` 只展开 `Y`，不能自行补充其他枚举。
- 若客户要求补商品条码、第三方商品条码或包裹条码，应转到对应条码原子。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-补贴原商品条码 | 商品条码/单品条码贴标；本页是不含商品条码的其他标签。 |
| 入库-更换新商品条码 | 更换商品条码；本页不改变商品条码。 |
| 入库-第三方商品条码关联 | 系统关系补齐；本页是商品附加标签贴标。 |
| 入库-覆盖包裹标签 | 包裹级标签覆盖；本页是商品级。 |

## 证据边界

- 本页只定版 normalized 已展开的 3 个字段，不推断附件、模板或隐藏字段。
- 主数据说明包含英代、欧代等标签示例，但不等于所有国家、仓库和标签材质都支持。
- 当前仅有原单上架编排，不代表新单上架和非标入口必然可选。
- 本页不定版费用金额、文件格式、标签内容审核责任和国家仓库差异。

## 相关链接

- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [入库-补贴原商品条码](value-added-service-item-inbound-original-product-barcode-labeling.md)
- [入库-更换新商品条码](value-added-service-item-inbound-new-product-barcode-labeling.md)
- [入库-覆盖包裹标签](value-added-service-item-inbound-cover-package-label.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

