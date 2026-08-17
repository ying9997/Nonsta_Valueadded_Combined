---
title: 上架前商品销毁
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, destroy, product-level, config-field]
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
  - source-references/kb-business-source-snapshots/inbound-exception-putaway-destroy.md
  - vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1563
service_item_name: 上架前商品销毁
service_item_aliases: [增值原子, 增值事件]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 上架前销毁
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 上架前商品销毁

## 摘要

`上架前商品销毁` 是入库异常处理中的商品级销毁原子，用于异常货物到海外仓后、已卸货未上架或处于异常暂存阶段，客户明确要求将商品销毁且不再上架的场景。

本原子的核心判断不是“客户说销毁”四个字，而是异常对象是否为商品。若异常对象是包裹，应选择 `上架前包裹销毁`；对象选错会导致增值单退回或需要重新提交。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1563` |
| 服务项名称 | 上架前商品销毁 |
| 别名 | 增值原子 / 增值事件 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | N |
| 默认 SLA | 1 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，BaseAttrRel 与 PlanEvent 当前均未返回可定版字段 |

## 仓库动作

仓库动作是对上架前或异常暂存中的商品级货物执行销毁，使该部分实物退出原单、新单、预报单等上架链路，不再形成可销售库存。

执行完成后，信息流通常通过异常单入口提交的增值单闭环：异常单处理方式为销毁，增值状态完成后，异常以销毁处理结束。若对象选择错误，仓库不应按错误对象执行，增值单可能被退回。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [上架前销毁](../../vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md) | `VASC202409121753076` | 2 | N | 上架前销毁 | 与 `上架前包裹销毁` 同组，需按异常对象二选一。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 异常对象为商品，客户要求销毁 | 是 | 销毁 SOP 明确商品异常选择上架前商品销毁。 |
| 商品条码异常、商品质量异常、商品裸装，客户不再上架 | 是 | 异常解决方案目录中商品类异常的销毁方向对应上架前商品销毁。 |
| 订单外商品、错装商品、多出的商品，客户选择销毁 | 是 | VASC 产品页和解决方案目录均将此类商品级异常指向商品销毁。 |
| 批次信息不全、商品实物无批次信息，客户选择销毁 | 是 | 解决方案目录中批次类商品异常存在上架前销毁方向。 |
| 异常对象为包裹，客户要求整包销毁 | 不应选 | 应选择 `上架前包裹销毁`。 |
| 客户要求销毁证明、DG 商品或特殊合规处理 | 不能默认承接 | 需查非标、专业供应商或业务确认，不能直接用本标准原子承诺。 |
| 货物已经上架成为在库库存 | 不应直接套用 | 本页范围是上架前/入库异常暂存；已在库销毁应查库内销毁。 |

## 配置字段

当前证据存在分层：

| 来源 | 结论 | AI 使用方式 |
|---|---|---|
| 字段覆盖映射 | `OW01V1563` 为 `missing_field_evidence` / `missing` | BaseAttrRel 去掉 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 为空；不能生成字段清单。 |
| normalized `atoms[].attrSpec` | 当前状态为 `missing` | 不得生成确定的 `attributeKey` 字段清单，也不得推断为无需配置字段。 |
| 接口文档 | `vaAtomAttrs`、`vaAtomFiles` 可承载原子属性和附件 | 只能说明系统结构支持属性/附件，不证明本原子具体字段。 |

因此，本页暂不列“必填字段/可选字段”的确定清单。AI 回答字段配置时，应说明：当前接口验证没有返回本原子的普通属性字段证据；这不等于本原子确定无需配置字段、附件或模板。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交上架前销毁 | SOP 证明入口来自海外仓异常单。 |
| 异常对象是否为商品 | 所有使用本原子的场景 | SOP 明确客服需检查异常对象是商品还是包裹。 |
| 客户销毁意图确认 | 所有使用本原子的场景 | 业务资料明确客户反馈安排仓库直接销毁时提交本类增值。 |
| 商品级货物范围 | 异常单关联多个商品或部分商品处理时 | 当前知识库未定版字段；需以系统选择货物或异常明细为准。 |
| 特殊品类、DG、销毁证明需求 | 特殊销毁需求 | 当前标准原子证据不足，需业务确认。 |

## 上传文件要求

当前没有足够字段级证据确认本原子在所有场景下是否需要附件、证明文件、SOP 或模板。

AI 回答时可以说明：标准商品销毁的关键是从异常单入口确认商品对象和销毁意图；若客户需要销毁证明、特殊处理或合规材料，应标记为当前知识库证据不足，并引导业务确认。

## 校验规则

- 必须先确认异常对象为商品。
- 若异常对象为包裹，应改选 `上架前包裹销毁`。
- 与 `上架前包裹销毁` 同属“上架前销毁”互斥组，不能机械同时选择。
- 若商品已经上架，不应直接套用上架前商品销毁。
- 若涉及 DG 商品、销毁证明、专业供应商处理或特殊合规要求，不能直接承诺标准原子支持。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 上架前包裹销毁 | 包裹级销毁，适用于异常对象为包裹或整包处理；本页是商品级销毁。 |
| 库内-异常商品销毁 | 库内或已在库异常商品销毁；本页范围是入库异常、上架前或异常暂存商品。 |
| DG商品销毁 | 可能涉及特殊合规和供应商能力；不能默认等同标准上架前商品销毁。 |

## 证据边界

- 本页不生成确定版属性字段清单，因为 BaseAttrRel 与 PlanEvent 单查当前均未返回字段证据。
- 本页不定版费用金额、销毁证明、附件格式、国家仓库差异和特殊品类规则。
- 覆盖映射显示本原子当前缺少字段证据，不能据此推断本原子无需配置字段。
- 对象匹配规则来自业务 SOP，优先级高于仅凭异常名称或客户口头描述的泛化判断。

## 相关链接

- [上架前销毁](../../vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
