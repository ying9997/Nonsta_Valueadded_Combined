---
title: 入库-异常包裹开箱拍照
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, package-level, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/inbound-exception-photo-vas.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1674
service_item_name: 入库-异常包裹开箱拍照
service_item_aliases: [增值原子, 增值事件, 异常包裹开箱拍照]
service_item_object_level: package
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 入库-异常包裹开箱拍照
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 入库-异常包裹开箱拍照

## 摘要

`入库-异常包裹开箱拍照` 是入库非标拍照或提供视频 VASC 下的包裹级拍照原子，用于入库包裹类异常，客户需要仓库开箱后对指定位置拍照，以便确认包裹内商品、条码、包装或异常情况。

本原子是包裹级中间辨识动作，不是商品级普通开箱拍照，也不是最终上架、销毁或自提处理。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1674` |
| 服务项名称 | 入库-异常包裹开箱拍照 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 默认 SLA | 2 天 |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据异常信息定位包裹，对入库异常包裹执行开箱，并按客户或异常处理需要对指定位置拍照。拍照结果用于客户确认后续处理方向。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 入库非标拍照或提供视频 | `VASC202411271721537` | 2 | N | 入库-异常包裹开箱拍照 | 包裹级异常开箱拍照。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 入库包裹类异常，客户要求开箱拍照 | 是 | 主数据定义为针对入库包裹类异常，开箱后指定位置拍照。 |
| 包裹条码异常、入库单状态异常、串仓等包裹类异常，需要进一步确认实物 | 可考虑 | 异常解决方案目录将包裹类拍照方向指向入库非标拍照或提供视频。 |
| 商品级异常，需要拍商品裸货或单品 | 不应直接选 | 应查商品级开箱拍照或单品指定位置拍照。 |
| 客户需要监控视频而不是开箱照片 | 不应选 | 应查少包裹/少单品监控视频调查。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1674` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的拍照位置、照片数量、附件或需求描述字段。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交拍照需求 | 接口结构支持异常来源与增值单关联。 |
| 包裹识别信息 | 所有场景 | 需要定位异常包裹。 |
| 需要拍照的位置或问题点 | 指定位置拍照 | 主数据说明开箱后指定位置拍照；字段未定版。 |
| 后续处理意图 | 拍照完成后 | 拍照是中间辨识，后续仍需客户选择处理。 |

## 上传文件要求

当前没有字段级证据证明必须上传附件、SOP 或图片示例。客户如需指定拍照位置，应提供清晰说明，但本页不定版文件字段。

## 校验规则

- 必须确认操作对象为包裹。
- 必须确认客户要的是开箱照片，不是视频调查。
- 必须提示拍照完成后仍需客户决定后续处理。
- 字段证据缺失时不得生成字段清单。

## 相关链接

- [入库-商品开箱拍照](value-added-service-item-inbound-product-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)

