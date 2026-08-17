---
title: 入库-补贴原商品条码
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
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1558
service_item_name: 入库-补贴原商品条码
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

# 入库-补贴原商品条码

## 摘要

`入库-补贴原商品条码` 是入库异常处理中的商品级贴标原子，用于异常商品仍由原有商品关系或异常单登记商品信息承接，但实物需要补贴对应商品/单品条码后才能继续上架的场景。

AI 使用本页时，要把它和 `入库-更换新商品条码` 区分开：本原子更偏向“补贴原有或登记的商品条码”，不是把实物改成另一个商品关系；如果实物与下单商品不一致或客户要换新商品条码，应优先判断更换新商品条码。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1558` |
| 服务项名称 | 入库-补贴原商品条码 |
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

仓库动作是为异常商品补贴商品/单品标签，使商品能够按异常单登记或原承接信息继续上架。来源中对该原子的主数据描述存在“生成新商品标签并覆盖原商品标签”的措辞，但业务解决方案里也明确出现“异常商品实物与下单商品一致，需要补贴异常单登记的商品条码且使用异常单登记的入库单上架”的场景。

因此，本页采用更保守的 AI 判断口径：只有在客户需要补贴原商品关系下的标签时，才推荐本原子；如果需要变更商品归属或使用新的商品条码承接，应转到 `入库-更换新商品条码`。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md) | `VASC202407012141008` | 3 | N | 贴商品标 | normalized 存在编排；具体适用条件需业务确认。 |
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 3 | N | 贴商品标 | 原单承接且补贴登记商品条码时使用。 |
| [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md) | `VASC202407161056217` | 3 | N | 未提供 | normalized 存在编排；新单场景下不得机械推荐。 |

## 适用范围

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 商品实物与下单商品一致，但实物商品条码无法扫描 | 是 | 异常解决方案目录中存在补贴异常单登记商品条码并用登记入库单上架的场景。 |
| 商品仍应按原入库单/异常单登记商品承接 | 是 | 本原子用于补贴原商品关系下的商品/单品标签。 |
| 客户要求补贴原入库单内的商品条码上架 | 是 | 业务资料明确出现该客户需求描述。 |
| 实物与下单商品不一致，需要换成新商品条码 | 不应默认选 | 应优先判断 `入库-更换新商品条码`。 |
| 商品第三方条码正确但系统未关联 | 不应默认选 | 应优先判断第三方商品条码关联路径。 |
| 只需要重建包裹承接关系 | 不应单独作为答案 | 应优先判断 `入库-补贴包裹条码`。 |

## 配置字段

以下字段来自 `vas-event-attrs-slim.json` 中已由 `pms.BaseAttrRelService_findBaseAttrRelPage` 验证和扩充的普通属性字段，证据状态为 `covered_by_vas_event_attrs_slim`。当前知识库仍未覆盖完整模板、附件和页面校验规则。

| 字段键 | 字段名称 | 必填 | 展示类型 | 输入节点 | 可选值 |
|---|---|---|---|---|---|
| `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | N | `OPTIONAL_BOX` | `SUBMIT` | `GOOD_PRODUCT` = 良品；`DEFECTIVE_PRODUCT` = 不良品 |
| `LABEL_SIZE` | 尺寸规格 | Y | `OPTIONAL_BOX` | `SUBMIT` | `10X6` = 10cm*6cm；`5X2.5` = 5cm*2.5cm |
| `LABEL_TYPE` | 标签类型 | Y | `OPTIONAL_BOX` | `SUBMIT` | `WINIT_SKU_SERNO_ITEM_SERNO` = Winit商品/单品条码；`THIRD_PARTY_SKU_SERNO_ITEM_SERNO` = 第三方商品/单品条码 |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 上架商品等级 | 需要区分良品/不良品上架时 | 字段快照显示非必填；业务资料提示部分场景支持良品/不良品上架。 |
| 标签类型 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 标签尺寸规格 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 原商品/单品条码或异常单登记商品信息 | 补贴原商品条码时 | 业务资料可证明需要补贴登记商品条码；当前字段快照未提供完整商品信息字段。 |
| 原入库单或异常单关联信息 | 原单上架、异常单登记入库单上架场景 | 属于业务承接资料，不等同于本原子 `attrSpec` 字段。 |

## 上传文件要求

当前没有足够字段级证据确认本原子在所有场景下的附件类型、模板列和是否必传。

AI 回答时可以说：客户通常需要提供能让仓库生成或识别原商品/单品标签的信息；如果系统页面要求下载模板、导入表格或上传标签文件，应以系统模板为准。不能把当前业务截图扩展为完整字段清单。

## 校验规则

- 本原子是商品级动作，不处理包裹条码异常本身。
- `LABEL_TYPE` 和 `LABEL_SIZE` 在当前字段快照中为必填。
- `SHELVE_PRODUCT_GRADE` 在当前字段快照中非必填，但涉及良品/不良品时需要客户明确。
- 与 `入库-更换新商品条码` 同属“贴商品标”互斥组的 VASC 中，不能机械同时选择。
- 若客户描述为“实物与下单商品不一致”或“换新 SKU/新商品条码”，本原子不是首选。

## 证据边界

- 本页字段表只覆盖 `vas-event-attrs-slim` 已提供的原子属性。
- 本页不定版费用金额、模板列、附件格式和国家差异。
- 原子主数据和业务解决方案中的措辞存在容易混淆之处；AI 应以“是否补贴原商品关系下标签”作为主要判断口径。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md)
