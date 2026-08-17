---
title: 提供海外仓监控视频-少包裹调查
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
service_item_code: OW01V1599
service_item_name: 提供海外仓监控视频-少包裹调查
service_item_aliases: [增值原子, 增值事件, 少包裹调查, 海外仓监控视频]
service_item_object_level: order
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 提供海外仓监控视频-少包裹调查
charge_required: true
cost_generated: true
effective: true
field_evidence_status: missing
---

# 提供海外仓监控视频-少包裹调查

## 摘要

`提供海外仓监控视频-少包裹调查` 是入库非标拍照或提供视频 VASC 下的订单级监控视频调查原子，用于客户认为到仓或上架链路存在少包裹，需要海外仓按到仓方式提供可查询的视频或扫描记录佐证。

本原子不是开箱拍照，也不是仓库承诺通过视频精确清点包裹数量。它的核心是按到仓方式调取可用监控或扫描记录，并反馈调查结果。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1599` |
| 服务项名称 | 提供海外仓监控视频-少包裹调查 |
| 别名 | 增值原子 / 增值事件 / 少包裹调查 / 海外仓监控视频 |
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

仓库根据到仓订单的具体情况提供对应视频或调查结果：

| 到仓方式 | 仓库可提供内容 | 重要边界 |
|---|---|---|
| 整柜到仓 | 开柜到关柜期间视频 | 客户无法仅通过视频清点具体数据。 |
| 散货到仓 | 卸货过程或包裹分堆过程视频 | 可能无法确定具体送仓包裹数量。 |
| 快递当面交付 | 供应商送货、卸货、扫描视频，并结合扫描记录反馈调查结果 | 客户需提供快递单号和快递供应商名称。 |
| 快递整柜投递 drop 到仓 | 通常无法提供包裹卸货视频 | 主数据要求退回告知无法处理。 |

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 入库非标拍照或提供视频 | `VASC202411271721537` | 3 | N | 提供海外仓监控视频-少包裹调查 | 订单级少包裹监控视频调查。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户怀疑少包裹，需要海外仓提供监控佐证 | 是 | 主数据定义为少包裹调查。 |
| 整柜到仓或散货到仓，客户能提供入库单号和 POD | 可考虑 | 主数据分别规定整柜、散货到仓的视频范围。 |
| 快递当面交付，客户能提供快递单号和供应商名称 | 可考虑 | 主数据规定可结合送货、卸货、扫描视频和扫描记录调查。 |
| 快递整柜 drop 到仓，客户要求包裹卸货视频 | 通常不可处理 | 主数据明确无法提供包裹卸货视频，应退回告知无法处理。 |
| 客户要确认包裹内商品、标签或包装 | 不应选 | 应查开箱拍照类原子。 |
| 客户怀疑少单品而不是少包裹 | 不应选 | 应查少单品调查原子。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1599` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的入库单号、POD、快递单号、供应商名称、视频时间段或附件字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 入库单号 | 整柜、散货和其他订单级调查 | 主数据要求整柜/散货场景提供入库单号。 |
| POD | 整柜或散货到仓 | 主数据要求客户提供 POD。 |
| 快递单号 | 快递当面交付少包裹调查 | 主数据要求客户提供包裹对应快递单号。 |
| 快递供应商名称 | 快递当面交付少包裹调查 | 主数据要求客户提供快递供应商名称。 |
| 到仓方式 | 所有场景 | 用于判断提供开柜视频、卸货/分堆视频、扫描视频，或退回无法处理。 |
| 客户关注的少包裹范围 | 所有场景 | 业务上用于调查，但当前无字段级证据。 |

## 上传文件要求

当前没有字段级证据证明必须上传 POD 附件、快递凭证或模板文件。主数据只证明整柜/散货场景需要 POD 信息，快递场景需要快递单号和供应商名称；具体字段、附件格式和是否必传应以当前下单页面为准。

## 校验规则

- 必须先确认客户问的是少包裹，不是少单品。
- 必须先确认到仓方式：整柜、散货、快递当面交付或快递 drop 到仓。
- 对整柜/散货视频，不得承诺可通过视频精确清点数量。
- 对快递 drop 到仓，不得承诺可提供包裹卸货视频。
- 字段证据缺失时不得生成字段清单、附件模板或必填字段。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 提供海外仓监控视频-少单品调查 | 调查少单品，关注商品预分拣视频和 A/B/C 包判断；本页调查少包裹。 |
| 入库-异常包裹开箱拍照 | 开箱后拍照片，关注包裹内或外箱细节；本页调取监控视频和扫描记录。 |
| 入库-单品指定位置开箱拍照 | 商品级指定位置拍照；本页是订单级少包裹调查。 |

## 证据边界

- 本页不定版配置字段、POD 附件格式、视频文件格式、可追溯时长、价格金额和国家仓库差异。
- 固定 SLA 2 个工作日来自主数据和监控服务快照；若系统页面另有非标审核输出，应以当前系统为准。
- 视频调查结果只能作为佐证，不能自动等同赔付、补发、上架或库存调整结论。

## 相关链接

- [提供海外仓监控视频-少单品调查](value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md)
- [入库-异常包裹开箱拍照](value-added-service-item-inbound-exception-package-unboxing-photo.md)
- [入库-单品指定位置开箱拍照](value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)

