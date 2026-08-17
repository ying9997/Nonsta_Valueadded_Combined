---
title: KB 业务知识来源快照
type: reference
entity_type: source_reference
tags: [source-reference, kb-snapshot, inbound, exception, value-added-service]
source_refs:
  - source-references/data-source-registry.md
external_source_note: "?????? Feishu ?? id ?????? external_source_note ???????????????? source_refs"
updated: 2026-06-23
confidence: high
fidelity: snapshot
status: draft
---

# KB 业务知识来源快照

本目录保存从原有知识库复制到本项目内的业务文档快照，用于支撑“入库 -> 异常 -> 增值”流程、异常解释、VASC 产品、增值服务项和原子配置的后续沉淀。

## 使用口径

- 本目录是证据层，不直接作为适用性结论。
- 新增业务文档引用这些来源时，必须使用本目录下的项目内相对路径。
- 项目外资料和临时导出目录只能作为阅读参考；需要标记为来源时，必须先复制或沉淀到本目录或其他项目内目录。
- 如果原知识库文档更新，需要重新复制或差异审查本目录快照，并同步更新受影响的流程页、关系映射、实体页、目录 README、根 `index.md` 和 `log.md`。
- 当前仅复制本轮流程规划直接使用的 Markdown 文档；原文中的图片资源暂未复制，流程页优先引用文字事实。

## 当前快照概览

当前共沉淀 35 份业务 Markdown 快照，按用途分组如下。

### 入库产品、规则和异常总览

- `inbound-product-details.md`
- `inbound-faq.md`
- `inbound-rules.md`
- `inbound-exception-handling.md`
- `a-plus-parcel-no-barcode-inbound-solution.md`

### VASC、增值规则和非标

- `vas-product-details.md`
- `vas-exception-solution-catalog.md`
- `vas-exception-handling.md`
- `vas-monitoring.md`
- `nonstandard-vas-application-process.md`
- `nonstandard-vas-rejection-scenarios.md`

### 直发、串仓、无主货、卸货和少件调查

- `direct-ship-parcel-sop.md`
- `direct-ship-order-overseas-warehouse.md`
- `direct-ship-exception-parcel-vas.md`
- `direct-ship-parcel-winit.md`
- `putaway-unit-sop.md`
- `putaway-parcel-unit.md`
- `putaway-parcel-unit-sop.md`
- `overseas-warehouse-inbound-unloading-exception.md`
- `customer-direct-ship-inbound.md`

### 异常处理专项 SOP

- `customer-putaway-exception-sop.md`
- `parcel-barcode-exception-subsidy-putaway.md`
- `parcel-order-product-putaway.md`
- `product-barcode-third-party-putaway.md`
- `inbound-exception-putaway-destroy.md`
- `inbound-exception-putaway-self-pickup.md`
- `inbound-exception-photo-vas.md`
- `exception-inbound.md`
- `inbound-vas.md`
- `no-box-list-forecast-faq.md`

### 入库单作废、终止和查询

- `void-standard-inbound-order-sop.md`
- `void-inbound-sop.md`
- `inbound-void-sop.md`
- `query-inbound.md`
- `winit-unit-barcode.md`
