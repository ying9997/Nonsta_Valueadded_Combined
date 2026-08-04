---
title: 上架前包裹销毁
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, destroy, package-level, config-field]
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
service_item_code: OW01V1703
service_item_name: 上架前包裹销毁
service_item_aliases: [增值原子, 增值事件, 上架前异常包裹销毁, 上架前销毁按包裹]
service_item_object_level: package
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 上架前销毁
charge_required: true
cost_generated: false
effective: true
field_evidence_status: missing
---

# 上架前包裹销毁

## 摘要

`上架前包裹销毁` 是入库异常处理中的包裹级销毁原子，用于异常包裹到仓后、正式上架前，客户明确要求由 Winit 将包裹销毁的场景。

本原子的核心判断是异常对象是否为包裹。若异常对象是商品，应选择 `上架前商品销毁`；对象选错会导致增值单退回或需要重新提交。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1703` |
| 服务项名称 | 上架前包裹销毁 |
| 别名 | 增值原子 / 增值事件 / 上架前异常包裹销毁 / 上架前销毁按包裹 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 1 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | Y |
| 是否收费 | Y |
| 是否产生成本 | N |
| 是否有效 | Y |
| 计费类型 | PRICE_LIST |
| 字段证据状态 | `missing_field_evidence`，BaseAttrRel 与 PlanEvent 当前均未返回可定版字段 |

## 仓库动作

仓库动作是对异常暂存或上架前的包裹执行整包销毁，使该包裹实物退出入库、换单上架、原单上架和异常暂存链路，不再继续形成上架库存。

主数据对本原子有明确限制：此销毁服务无法提供销毁证明。若客户要求销毁证明、合规证明、DG 商品销毁或其他特殊处理，不能直接用本标准原子承诺。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| [上架前销毁](../../vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md) | `VASC202409121753076` | 1 | N | 上架前销毁 | 与 `上架前商品销毁` 同组，需按异常对象二选一。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 异常对象为包裹，客户要求销毁 | 是 | 销毁 SOP 明确包裹异常选择上架前包裹销毁。 |
| 入库单状态异常，客户不再上架并要求销毁 | 是 | 解决方案目录将包裹类入库单状态异常的销毁方向指向上架前包裹销毁。 |
| 客户直发包裹串仓，客户要求销毁 | 是 | 解决方案目录将包裹串仓的销毁方向指向上架前包裹销毁。 |
| 包裹条码异常或包裹条码批量异常，客户要求销毁 | 是 | 解决方案目录将包裹条码类异常的销毁方向指向上架前包裹销毁。 |
| 订单状态被终止无法上架或已上架后需拦截，客户要求销毁 | 是 | 解决方案目录中包裹状态类异常存在上架前异常包裹销毁方向。 |
| 异常对象为商品，客户要求销毁 | 不应选 | 应选择 `上架前商品销毁`。 |
| 客户需要销毁证明 | 不支持 | 主数据明确本销毁服务无法提供销毁证明。 |
| 货物已经成为普通在库库存 | 不应直接套用 | 本页范围是入库异常、上架前或异常暂存包裹；已在库销毁应查库内销毁。 |

## 配置字段

当前证据存在分层：

| 来源 | 结论 | AI 使用方式 |
|---|---|---|
| 字段覆盖映射 | `OW01V1703` 为 `missing_field_evidence` / `missing` | BaseAttrRel 去掉 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 为空；不能生成字段清单。 |
| `vas-event-attrs-slim` | 当前未覆盖可用普通属性字段 | 不得生成确定的 `attributeKey` 字段清单。 |
| normalized `atoms[].attrSpec` | 当前状态为 `missing` | 不得生成确定的 `attrSpec` 字段清单，也不得推断为无需配置字段。 |
| 接口文档 | `vaAtomAttrs`、`vaAtomFiles` 可承载原子属性和附件 | 只能说明系统结构支持属性/附件，不证明本原子具体字段。 |

因此，本页暂不列“必填字段/可选字段”的确定清单。AI 回答字段配置时，应说明：当前接口验证没有返回本原子的普通属性字段证据；这不等于本原子确定无需配置字段、附件或模板。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交上架前销毁 | SOP 证明入口来自海外仓异常单。 |
| 异常对象是否为包裹 | 所有使用本原子的场景 | SOP 明确客服需检查异常对象是商品还是包裹。 |
| 客户销毁意图确认 | 所有使用本原子的场景 | 业务资料明确客户反馈安排仓库直接销毁时提交本类增值。 |
| 包裹级处理范围 | 一个异常单关联多个包裹或部分包裹处理时 | 当前知识库未定版字段；需以异常单明细或系统选择货物为准。 |
| 是否要求销毁证明 | 客户提出证明诉求时 | 本标准原子不支持提供销毁证明，应转业务确认其他处理方式。 |

## 上传文件要求

当前没有足够字段级证据确认本原子在提交或执行阶段是否要求附件、模板或文件上传。

AI 回答时应区分两个层次：标准上架前包裹销毁的关键是异常对象为包裹、客户确认销毁；如果客户要求销毁证明或特殊合规材料，本原子主数据已经明确不能提供销毁证明，不能把证明材料当作本原子的可配置附件承诺。

## 费用与计费边界

主数据显示本原子需要收费，计费类型为 `PRICE_LIST`。业务 SOP 说明收费标准为按包裹乘以单价收取，无最低收费。

本页不沉淀具体金额、币种差异、国家仓库差异或价格表版本。AI 不能根据截图或单一案例泛化报价，应引导以系统价格表或正式报价为准。

## 校验规则

- 必须先确认异常对象为包裹。
- 若异常对象为商品，应改选 `上架前商品销毁`。
- 与 `上架前商品销毁` 同属“上架前销毁”互斥组，不能机械同时选择。
- 本原子无法提供销毁证明；客户要求销毁证明时不得直接承诺支持。
- 若包裹已经上架成为普通库存，不应直接套用上架前包裹销毁。
- 若涉及 DG 商品、专业供应商处理或特殊合规要求，应转非标或业务确认。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 上架前商品销毁 | 商品级销毁，适用于异常对象为商品；本页是包裹级销毁。 |
| 库内-异常商品销毁 | 库内或已在库异常商品销毁；本页范围是入库异常、上架前或异常暂存包裹。 |
| DG商品销毁 | 可能涉及特殊合规和供应商能力；不能默认等同标准上架前包裹销毁。 |

## 证据边界

- 本页不生成确定版属性字段清单，因为 BaseAttrRel 与 PlanEvent 单查当前均未返回字段证据。
- 本页不定版具体价格金额、国家仓库差异、附件格式和特殊品类规则。
- 本页可以明确写入“无法提供销毁证明”，因为该限制来自本原子主数据定义。
- 对象匹配规则来自业务 SOP，优先级高于仅凭异常名称或客户口头描述的泛化判断。

## 相关链接

- [上架前销毁](../../vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md)
- [上架前商品销毁](value-added-service-item-pre-putaway-product-destruction.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
