---
title: 提供海外仓监控视频-少单品调查
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, order-level, config-field]
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
  - source-references/kb-business-source-snapshots/vas-monitoring.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1600
service_item_name: 提供海外仓监控视频-少单品调查
service_item_aliases: [增值原子, 增值事件, 少单品调查, 少 SKU 调查, 海外仓监控视频]
service_item_object_level: order
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 提供海外仓监控视频-少单品调查
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 提供海外仓监控视频-少单品调查

## 摘要

`提供海外仓监控视频-少单品调查` 是入库非标拍照或提供视频 VASC 下的订单级监控视频调查原子，用于客户认为上架异常中存在少单品，需要海外仓提供商品预分拣视频或调查结果佐证。

本原子不是包裹少件调查，也不是商品开箱拍照。它的关键判断点是包裹类型及上架数量与验货数量是否一致。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1600` |
| 服务项名称 | 提供海外仓监控视频-少单品调查 |
| 别名 | 增值原子 / 增值事件 / 少单品调查 / 海外仓监控视频 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 订单 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 2 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | Y |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据到仓订单和包裹类型判断是否提供商品预分拣视频及调查结果：

| 场景 | 仓库可提供内容 | 重要边界 |
|---|---|---|
| B/C 包裹少单品 | 商品预分拣视频和调查结果 | 客户需提供入库单号和包裹号。 |
| A 包上架数量与验货数量一致 | 不提供视频服务 | 客户需提交库内盘点增值，对 A 包上架商品做盘点；本增值应退回告知无法处理。 |
| A 包上架数量与验货数量不一致 | 商品预分拣视频和调查结果 | 客户需提供入库单号和包裹号。 |

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 入库非标拍照或提供视频 | `VASC202411271721537` | 4 | N | 提供海外仓监控视频-少单品调查 | 订单级少单品监控视频调查。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户怀疑少单品，需要仓库提供预分拣视频或调查结果 | 是 | 主数据定义为少单品调查。 |
| B/C 包裹少单品，客户能提供入库单号和包裹号 | 可考虑 | 主数据规定 B/C 包裹提供商品预分拣视频和调查结果。 |
| A 包上架数量与验货数量不一致 | 可考虑 | 主数据规定此场景可提供商品预分拣视频和调查结果。 |
| A 包上架数量与验货数量一致 | 不应选 | 主数据明确不提供视频服务，应提交库内盘点增值。 |
| 客户怀疑少包裹 | 不应选 | 应查少包裹调查原子。 |
| 客户需要确认商品外观、标签或包装细节 | 不应选 | 应查开箱拍照类原子。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1600` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的入库单号、包裹号、包裹类型、上架数量、验货数量、视频时间段或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 入库单号 | B/C 包裹和 A 包数量不一致场景 | 主数据要求客户提供入库单号。 |
| 包裹号 | B/C 包裹和 A 包数量不一致场景 | 主数据要求客户提供包裹号。 |
| 包裹类型 | 判断 B/C 包裹或 A 包 | 主数据分支依赖包裹类型。 |
| 上架数量与验货数量是否一致 | A 包场景 | 主数据以该条件判断是否提供视频服务。 |
| 客户关注的少单品范围 | 所有场景 | 业务上用于调查，但当前无字段级证据。 |

## 上传文件要求

当前没有字段级证据证明必须上传附件、模板或截图。客户应至少提供入库单号和包裹号，并说明少单品范围；具体字段、附件格式和是否必传应以当前下单页面为准。

## 校验规则

- 必须先确认客户问的是少单品，不是少包裹。
- 必须识别包裹类型：B/C 包裹或 A 包。
- A 包必须判断上架数量与验货数量是否一致。
- A 包数量一致时不得推荐本原子继续调视频，应提示提交库内盘点增值。
- 字段证据缺失时不得生成字段清单、附件模板或必填字段。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 提供海外仓监控视频-少包裹调查 | 调查少包裹，按整柜/散货/快递到仓分支处理；本页调查少单品。 |
| 入库-单品指定位置开箱拍照 | 商品级指定位置拍照；本页是订单级视频/预分拣调查。 |
| 入库-商品开箱拍照 | 商品开箱照片；本页是少单品调查和预分拣视频。 |

## 证据边界

- 本页不定版配置字段、附件格式、视频文件格式、可追溯时长、价格金额和国家仓库差异。
- 固定 SLA 2 个工作日来自主数据和监控服务快照；若系统页面另有非标审核输出，应以当前系统为准。
- 对 A 包上架数量与验货数量一致的场景，不能把本原子作为变通的视频服务入口。

## 相关链接

- [提供海外仓监控视频-少包裹调查](value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md)
- [入库-单品指定位置开箱拍照](value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md)
- [入库-商品开箱拍照](value-added-service-item-inbound-product-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)

