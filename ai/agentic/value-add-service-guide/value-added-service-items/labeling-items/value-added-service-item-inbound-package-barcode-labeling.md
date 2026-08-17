---
title: 入库-补贴包裹条码
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, relabel, package-level, config-field]
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
  - source-references/kb-business-source-snapshots/parcel-barcode-exception-subsidy-putaway.md
  - source-references/kb-business-source-snapshots/parcel-order-product-putaway.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1560
service_item_name: 入库-补贴包裹条码
service_item_aliases: [增值原子, 增值事件]
service_item_object_level: package
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 入库-补贴包裹条码
charge_required: true
cost_generated: true
effective: true
field_evidence_status: partial
---

# 入库-补贴包裹条码

## 摘要

`入库-补贴包裹条码` 是入库异常处理中的包裹级增值服务项，用于仓库为异常暂存包裹补贴 Winit 包裹条码或第三方包裹条码，使包裹能够被原入库单、新入库单或特定上架链路继续承接。

AI 判断本原子时，必须先确认处理对象是包裹或包裹关系，而不是商品条码本身。若客户要处理商品条码，应转到商品条码类原子；若客户只需要直接上架且无需补包裹标，应转到直接上架类原子。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1560` |
| 服务项名称 | 入库-补贴包裹条码 |
| 别名 | 增值原子 / 增值事件 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `partial_field_evidence` |

## 仓库动作

仓库动作是为异常包裹补贴包裹级标签。来源定义说明包裹标签包括 Winit 包裹条码和第三方包裹条码，例如客户需要关联的第三方箱唛。

本原子处理完成后，实物通常从异常暂存状态转入后续上架处理：如果原入库单可承接，则回原单；如果客户或 WINIT 新建入库单承接，则转新单；如果属于直接上架产品下的候选原子，则仍需按该 VASC 的场景判断是否真的需要补包裹标。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md) | `VASC202407012141008` | 5 | N | 入库-补贴包裹条码 | normalized 存在编排，但业务页已标注不能机械推荐。 |
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 7 | N | 入库-补贴包裹条码 | 原单可承接且需要补包裹标时使用。 |
| [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md) | `VASC202407161056217` | 2 | N | 入库-补贴包裹条码 | 客户新单承接包裹时的高频原子。 |
| 原单上架（直接上架） | `VASC202504251617529` | 4 | N | 未提供 | 该 VASC 产品页尚未生成；当前只作为编排索引。 |

## 适用范围

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 包裹条码缺失、破损、无法扫描、冲突或未录入系统 | 是 | 包裹条码异常 SOP 明确需要客户确认入库单信息并补贴包裹条码。 |
| 异常单关联入库单，客户能确认原单 | 是 | 可走原单上架，并选择补贴包裹条码。 |
| 异常单未关联入库单，或客户无法定位原单 | 是 | 通常需要新单承接，再补贴新包裹条码。 |
| 订单终止、已上架后后到包裹、错装、多货等需要新单承接 | 条件可选 | 只有需要包裹级新承接关系时才选；不能替代商品换标。 |
| 商品条码错误或商品无法扫描 | 不应单独作为答案 | 应优先判断商品条码原子；只有同时需要重建包裹承接关系时才组合使用。 |
| WINIT 创建新单场景 | 条件可选 | 产品编排中存在本原子，但业务资料有场景说明显示部分 WINIT 新单不需要补包裹条码。 |

## 配置字段

以下字段来自 `vas-event-attrs-slim.json` 中已由 `pms.BaseAttrRelService_findBaseAttrRelPage` 验证和扩充的普通属性字段，证据状态为 `covered_by_vas_event_attrs_slim`。当前知识库仍未覆盖完整下单页面字段和模板文件结构。

| 字段键 | 字段名称 | 必填 | 展示类型 | 输入节点 | 可选值 |
|---|---|---|---|---|---|
| `LABEL_TYPE` | 标签类型 | Y | `OPTIONAL_BOX` | `SUBMIT` | `PACKGE_SERNO` = Winit包裹条码；`THIRD_PARTY_PACKGE_SERNO` = 第三方包裹条码 |
| `LABEL_SIZE` | 尺寸规格 | Y | `OPTIONAL_BOX` | `SUBMIT` | `10X6` = 10cm*6cm；`10X15` = 10cm*15cm |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 标签类型 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 标签尺寸规格 | 所有使用本原子的场景 | 字段快照确认必填。 |
| 原入库单号、异常单号、原包裹条码、第三方包裹条码 | 异常单关联入库单、原单上架或对照原包裹信息时 | 业务快照有表格截图描述；字段级接口未完整定版。 |
| 新入库单号、新包裹条码 | 新单上架场景 | 业务快照明确需填写新入库单号和包裹号上传；字段级接口未完整定版。 |
| 标签文件或包裹信息表 | 需要下载模板、填写并导入的场景 | 业务快照有“下载表格/点击下载标签文件”证据；当前未获得 `vaAtomFiles` 的原子级完整模板字段。 |

## 上传文件要求

当前只能确认“部分场景需要下载表格或标签文件后填写/导入”，不能定版文件类型、模板列和是否所有场景必传。

AI 回答客户“要上传什么”时，应按场景说明：

- 原单上架补包裹标：通常需要能证明原包裹与原入库单关系的信息。
- 新单上架补包裹标：通常需要新入库单号和新包裹条码。
- 若客户问具体模板列，应说明当前知识库只有业务截图级证据，需以系统下载模板为准。

## 校验规则

- 本原子是包裹级动作，不能用来处理纯商品条码问题。
- `LABEL_TYPE` 和 `LABEL_SIZE` 在当前字段快照中为必填。
- 第三方包裹条码场景需要客户确认第三方条码与包裹承接关系；当前知识库没有足够证据生成更细的校验规则。
- 新单上架时，新入库单号和新包裹条码属于业务承接资料，不等同于本原子的 `attrSpec` 字段。

## 证据边界

- 本页字段表只覆盖 `vas-event-attrs-slim` 已提供的原子属性。
- 本页不定版费用金额、最低收费、模板列、附件格式和国家差异。
- 业务快照中的图片说明可证明存在下载/上传动作，但不能替代完整 `vaAtomFiles` 映射。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [新单上架（客户创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md)
- [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md)
