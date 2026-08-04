---
title: 入库-商品开箱拍照
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
  - source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md
  - source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/inbound-exception-photo-vas.md
updated: 2026-06-25
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1562
service_item_name: 入库-商品开箱拍照
service_item_aliases: [增值原子, 增值事件, 入库商品拍照, 商品开箱拍照]
service_item_object_level: product
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 商品拍照辨识
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 入库-商品开箱拍照

## 摘要

`入库-商品开箱拍照` 是入库异常链路中的商品级拍照原子，用于客户需要仓库拆开商品外包装及销售包装，对商品裸货、单品、商品条码和外包装信息拍照，以辅助客户判断后续上架、换标、销毁、自提或其他处理方向。

本原子偏向“中间调查/辨识”，不是最终处理动作。拍照完成后，货物通常仍需客户再决定继续上架、销毁、自提或其他增值处理。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1562` |
| 服务项名称 | 入库-商品开箱拍照 |
| 别名 | 增值原子 / 增值事件 / 入库商品拍照 / 商品开箱拍照 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | N |
| 默认 SLA | 1 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，BaseAttrRel 与 PlanEvent 当前均未返回可定版字段 |

## 仓库动作

仓库动作是按客户指定商品 SKU 进行开箱或拆包拍照。主数据描述的拍照输出包括：

| 阶段 | 输出照片 | 说明 |
|---|---|---|
| 拆包前 | 外箱条码 1 张、外包装全览图 | 用于确认外箱和外包装状态。 |
| 拆包后 | 商品条码照片 1 张、商品实物照 3~4 张 | 商品实物照包括商品全览图、商品细节图等。 |

拍照完成后，信息流通常回到客户确认环节；客户根据照片再选择上架、换标、销毁、自提或其他处理方向。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 状态边界 |
|---|---|---:|---|---|---|
| 入库商品拍照 | `VASC202407031507376` | 1 | N | 商品拍照辨识 | 关系映射标记为 `inactive`，业务资料也提示部分标准拍照入口已失效，应优先核当前系统入口。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 商品类异常，客户需要更多照片后再决定处理方式 | 是 | 异常解决方案目录多处将“拍照后暂存，等待客户下一步指令”指向入库商品拍照/商品开箱拍照。 |
| 商品条码异常、商品有条码但系统无法识别，需要确认实物条码和商品状态 | 可考虑 | 业务目录将商品类异常的拍照方向指向入库商品拍照。 |
| 包裹内出现订单外商品，需要确认商品实物 | 可考虑 | 业务目录将该类商品异常纳入入库商品拍照方向。 |
| 包裹级异常需要开箱拍照 | 不应直接选 | 应查 `入库-异常包裹开箱拍照` 等包裹级拍照原子。 |
| 客户已经明确要上架、销毁或自提 | 不应作为最终处理 | 拍照是中间辨识动作，不能替代最终处理 VASC。 |
| 当前系统标准入口不可用 | 不能直接承诺 | 关系映射和业务资料均提示需核当前入口，可能转入非标拍照或提供视频。 |

## 配置字段

当前证据存在分层：

| 来源 | 结论 | AI 使用方式 |
|---|---|---|
| 字段覆盖映射 | `OW01V1562` 为 `missing_field_evidence` / `missing` | BaseAttrRel 去掉 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 为空；不能生成字段清单。 |
| `vas-event-attrs-slim` | 当前未覆盖可用普通属性字段 | 不得生成确定的 `attributeKey` 字段清单。 |
| normalized `atoms[].attrSpec` | 当前状态为 `missing` | 不得生成必填/可选字段清单，也不得推断为无需配置字段。 |
| 主数据描述 | 展开了拍照输出内容 | 可用于回答仓库会拍哪些照片。 |

因此，本页暂不列定版配置字段。AI 回答字段配置时，应说明：当前接口验证没有返回本原子的普通属性字段证据；这不等于本原子确定无需配置字段、附件或模板。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交拍照需求 | 接口结构支持异常来源与增值单关联。 |
| 商品 SKU 或商品对象 | 所有场景 | 主数据要求客户指定商品 SKU。 |
| 拍照目的 | 所有场景 | 拍照用于辨识和后续决策，不是最终处理动作。 |
| 需要关注的部位或问题 | 商品条码、外观、细节等 | 当前标准字段未展开；业务上可作为需求描述，但不能定版为字段。 |
| 后续处理意图 | 拍照完成后 | 需要客户根据照片再决定上架、销毁、自提或其他处理。 |

## 上传文件要求

当前没有字段级证据证明本原子提交时必须上传附件、模板或图片。

AI 回答时可以说明：本原子的主要产出是仓库拍摄并返回照片；客户如果有指定拍摄位置、角度或问题点，应在需求描述中说明，但当前知识库不能定版具体字段或附件格式。

## 校验规则

- 必须确认操作对象是商品。
- 必须确认客户需求是拍照/辨识，而不是已经确定的上架、销毁或自提。
- 必须提示当前标准入库商品拍照入口可能不是 active，应核当前系统入口或转非标拍照。
- 不得把包裹级开箱拍照场景直接套到本商品级原子。
- 不得生成字段清单；BaseAttrRel 与 PlanEvent 单查当前均未返回字段证据。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-异常包裹开箱拍照 | 包裹级拍照，用于包裹类异常；本页是商品级。 |
| 入库-单品指定位置开箱拍照 | 指定位置拍照，非标口径更强；本页按主数据描述为普通商品开箱拍照。 |
| 提供海外仓监控视频-少包裹调查 | 视频/监控调查，不是商品开箱拍照。 |
| 直接上架 | 最终上架动作；拍照只是中间辨识。 |

## 证据边界

- 本页不定版配置字段、附件格式、上传模板、价格金额和国家仓库差异。
- 关系映射中 `入库商品拍照` 产品状态为 `inactive`，AI 推荐时必须提醒核当前系统入口。
- 主数据中的拍照张数和内容可作为仓库动作描述，但不代表所有异常、仓库和系统入口都固定返回完全相同数量照片。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)

