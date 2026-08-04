---
title: 入库-第三方商品条码关联
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
  - source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md
  - source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/product-barcode-third-party-putaway.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1572
service_item_name: 入库-第三方商品条码关联
service_item_aliases: [增值原子, 增值事件]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 贴商品标
charge_required: false
cost_generated: true
effective: true
field_evidence_status: missing
---

# 入库-第三方商品条码关联

## 摘要

`入库-第三方商品条码关联` 是入库异常处理中的商品级关联原子，用于商品实物已经贴有第三方商品条码，但到仓前未完成第三方商品条码与 Winit SKU 的系统关联，导致仓库扫描后无法识别商品并登记异常的场景。

AI 必须把本原子和“补贴/更换商品条码”区分开：本原子的核心是补齐系统关联关系，并让商品继续上架；不是让仓库重新贴一个商品条码。若实物条码错误、条码破损无法扫描、实物与下单商品不一致，应转入换标、新单上架、补包裹条码、拍照、销毁或自提等分支。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1572` |
| 服务项名称 | 入库-第三方商品条码关联 |
| 别名 | 增值原子 / 增值事件 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | N |
| 默认 SLA | 2 天 |
| 是否收费 | N |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，BaseAttrRel 与 PlanEvent 当前均未返回可定版字段 |

## 仓库动作

仓库动作是基于客户已维护或补充的第三方商品条码关系，让异常商品完成第三方商品条码与 Winit SKU 的关联，并继续上架。

业务 SOP 中的关键前置动作不是仓库先换标，而是先核查客户是否已经在商品信息中补充第三方商品条码；补充完成后，再从异常单入口提交增值并让仓库处理。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md) | `VASC202407012141008` | 4 | N | 贴商品标 | normalized 存在编排；产品页已标注只能在第三方条码关联满足条件时考虑。 |
| [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md) | `VASC202407031503503` | 4 | N | 贴商品标 | 业务资料主要指向原单上架：第三方条码关系补齐后，原入库单继续承接。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 异常为 `B01E1316` 商品有条码但系统无法识别 | 是 | 业务资料明确该原子只支持此类异常口径。 |
| 实物贴有第三方商品条码，如 FNSKU，但系统未关联 Winit SKU | 是 | 原子定义和业务 SOP 均指向该场景。 |
| 客户已在商品信息中补充第三方商品条码关联 | 是 | SOP 要求先核查/补充关联，再提交异常增值。 |
| 实物第三方条码正确，且商品与原入库单下单商品一致 | 是 | 可走原单上架 + 第三方商品条码关联。 |
| 实物商品条码错误，或商品与下单商品不一致 | 不应默认选 | 应转入更换新商品条码、补包裹条码或新单承接等分支。 |
| 商品无条码、条码破损、条码无法扫描 | 不应默认选 | 更接近商品条码异常，应判断补/换商品条码或拍照。 |
| 客户要打印补贴自己指定的第三方条码附件 | 不推荐 | 异常解决方案目录中该方向标为不推荐，不能当作本原子默认能力。 |

## 配置字段

当前证据存在分层：

| 来源 | 结论 | AI 使用方式 |
|---|---|---|
| 字段覆盖映射 | `OW01V1572` 为 `missing_field_evidence` / `missing` | BaseAttrRel 去掉 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 为空；不能生成字段清单。 |
| normalized `atoms[].attrSpec` | 当前状态为 `missing` | 不得生成确定的 `attributeKey` 字段清单，也不得推断为无需配置字段。 |
| 接口文档 | `vaAtomAttrs`、`vaAtomFiles` 可承载原子属性和附件 | 只能说明系统结构支持属性/附件，不证明本原子具体字段。 |

因此，本页暂不列“必填字段/可选字段”的确定清单。AI 回答字段配置时，应说明：当前接口验证没有返回本原子的普通属性字段证据；这不等于本原子确定无需配置字段、附件或模板。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 第三方商品条码 | 所有使用本原子的场景 | 业务 SOP 明确客户需补充录入第三方商品条码。 |
| Winit 商品编码 / SKU No. | 下载表格填写关联商品信息时 | 业务截图说明模板中有商品编码 `SKU No.` 列；当前未获得完整模板字段。 |
| 条码类型 | 下载表格填写关联商品信息时 | 业务截图说明表格存在 `Barcode type`，示例为第三方商品条码；当前未获得完整模板字段。 |
| 异常单和原入库单关联信息 | 从异常单入口提交原单上架时 | 业务 SOP 指向异常单入口；字段级接口未完整定版。 |

## 上传文件要求

业务 SOP 说明，在异常单入口选择原单上架和 `入库-第三方商品条码关联` 后，需要下载表格、填写后导入提交增值。截图可证明表格包含 “product information / 关联商品信息” 区域，并出现 `Barcode type` 和 `SKU No.`。

当前不能定版：

- 模板完整列。
- 文件格式。
- 是否所有场景都必须上传。
- `vaAtomFiles` 中的具体 `fileType`、`attrId` 或字段映射。

## 校验规则

- 先确认异常编码或业务含义是否为 `B01E1316`。
- 先核查第三方商品条码是否已在商品信息中补充关联。
- 只有实物第三方条码正确、商品与原入库单商品一致时，才优先走原单上架 + 本原子。
- 与 `入库-更换新商品条码`、`入库-补贴原商品条码` 同属“贴商品标”互斥组的 VASC 中，不能机械同时选择。
- 若客户说“要补贴第三方商品条码标签”，需确认是系统关联问题还是重新贴标问题；业务资料中“打印补贴客户自己指定的第三方条码附件上架”被标为不推荐。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| [入库-更换新商品条码](value-added-service-item-inbound-new-product-barcode-labeling.md) | 用于商品条码错误、缺失、无法扫描或需要新商品条码承接；不等同第三方条码关联。 |
| [入库-补贴原商品条码](value-added-service-item-inbound-original-product-barcode-labeling.md) | 用于补贴原商品关系下的商品/单品标签；不负责补齐第三方条码与 SKU 的系统关联。 |
| [入库-补贴包裹条码](value-added-service-item-inbound-package-barcode-labeling.md) | 包裹级补标动作，不处理商品第三方条码关联。 |

## 证据边界

- 本页不生成确定版属性字段清单，因为 BaseAttrRel 与 PlanEvent 单查当前均未返回字段证据。
- 本页不定版模板完整列、附件格式、费用金额和国家仓库差异。
- 覆盖映射显示本原子当前缺少字段证据，不能据此推断本原子无需配置字段。
- 若后续补充 `vaAtomAttrs`、`vaAtomFiles` 或系统模板来源，应回填本页并考虑抽取独立 `config_field` 页面。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [商品有条码但系统无法识别](../../inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md)
- [原单上架](../../vasc-products/putaway-services/vasc-product-original-order-putaway.md)
- [新单上架（WINIT创建入库单）](../../vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md)
