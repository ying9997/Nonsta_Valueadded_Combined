---
title: 入库非标拍照或提供视频
type: reference
entity_type: vasc_product
tags: [value-added-service, vasc-product, inbound, photograph, non-standard-vasc, active-vasc]
source_refs:
  - relationship-mappings/inbound-exception-to-vasc-product-mapping.md
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/kb-business-source-snapshots/vas-product-details.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - source-references/kb-business-source-snapshots/inbound-exception-photo-vas.md
  - source-references/kb-business-source-snapshots/vas-monitoring.md
  - inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md
  - inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
vasc_product_code: VASC202411271721537
vasc_product_name: 入库非标拍照或提供视频
vasc_product_type: non_standard
vasc_submission_entry: exception_order
vasc_handling_method: photograph_then_hold
vasc_active_status: active
related_pscg: OW01 海外仓入库
---

# 入库非标拍照或提供视频

## 摘要

`入库非标拍照或提供视频` 是入库异常链路中用于“先获取证据、再等待客户下一步处理”的 active 非标 VASC 产品。normalized 数据显示，本产品编排 4 个候选原子：两个开箱拍照原子、两个监控视频调查原子。

AI 使用本页时要先区分客户到底要“照片”还是“视频调查”：照片用于确认异常包裹或指定单品位置，视频调查用于少包裹或少单品佐证。本产品通常不是最终上架、销毁、自提、换标或包装处理动作。

## 产品标识

| 字段 | 值 |
|---|---|
| VASC 产品编码 | `VASC202411271721537` |
| VASC 产品名称 | 入库非标拍照或提供视频 |
| PSCG | `OW01` 海外仓入库 |
| 启用状态 | active |
| 产品类型 | 非标增值 |
| 提交主体 | 客户 / 客服 |
| 执行主体 | 仓库 |
| 处理方式 | 拍照/视频调查后反馈，通常继续暂存等待下一步指令 |
| 是否支持无业务单据 | 否 |
| 来源状态线索 | `PS`、`PEWC`、`STOP`、`SHD`、`DR`、`SB`、`EWC`、`RE`、`OD`、`VO`、`IC`、`SHO`、`TS` |
| 来源列表线索 | `STORAGE` |

## 适用判断

选择本产品前，AI 需要确认：

1. 需求发生在入库异常链路，客户需要照片、视频或调查结果佐证。
2. 如果客户要照片，要进一步判断是“单品指定位置开箱拍照”还是“异常包裹开箱拍照”。
3. 如果客户要视频，要进一步判断是“少包裹调查”还是“少单品调查”。
4. 本产品下 4 个原子都是候选项，产品级均非必选，不能机械全选。
5. 字段证据缺失，不能在产品页生成字段清单、附件模板、照片数量或视频文件格式。

## 使用本 VASC 后的实物流与信息流去向

| 场景 | 原子/动作 | 实物流去向 | 信息流去向 | 是否闭环 |
|---|---|---|---|---|
| 单品指定位置拍照 | 入库-单品指定位置开箱拍照 | 异常商品或指定单品开箱拍照后继续停留在异常/暂存链路 | 增值单反馈指定位置照片和辨识结果，客户再决定后续处理 | 通常非终态。 |
| 异常包裹开箱拍照 | 入库-异常包裹开箱拍照 | 异常包裹开箱拍照后继续暂存，等待客户确认实物和下一步动作 | 增值单反馈包裹开箱照片；后续可能转上架、销毁、自提、换标或其他处理 | 通常非终态。 |
| 少包裹视频调查 | 提供海外仓监控视频-少包裹调查 | 实物位置不因调取视频而改变；仓库按到仓方式查可用视频或扫描记录 | 增值单反馈视频/调查结果；不能自动等同赔付、补发或库存调整 | 通常非终态。 |
| 少单品视频调查 | 提供海外仓监控视频-少单品调查 | 实物位置不因视频调查而改变；仓库按包裹类型和数量差异判断可处理性 | 增值单反馈预分拣视频或调查结果；A 包数量一致时应转库内盘点方向 | 通常非终态。 |

## 可处理异常索引

以下异常来自 normalized 数据，表示存在 `exception -> 入库非标拍照或提供视频` 的关联。

| 异常编码 | 异常名称 | 异常节点 |
|---|---|---|
| `B0102E21` | 包裹条码异常(需客户处理) | `IN_BOUND` |
| `B01E01` | 入库单状态异常 | `IN_BOUND` |
| `B01E1514` | 订单状态已上架需拦截 | `IN_BOUND` |
| `B01E1615` | 包裹条码批量异常（需客户处理） | `IN_BOUND` |
| `B01E49` | 客户直发包裹串仓 | `IN_BOUND` |

## 原子编排

| 顺序 | 服务项/原子编码 | 服务项/原子名称 | 产品级必选 | 互斥组 | 字段证据状态 |
|---:|---|---|---|---|---|
| 1 | `OW01V1610` | 入库-单品指定位置开箱拍照 | N | 入库-单品指定位置开箱拍照 | missing_field_evidence |
| 2 | `OW01V1674` | 入库-异常包裹开箱拍照 | N | 入库-异常包裹开箱拍照 | missing_field_evidence |
| 3 | `OW01V1599` | 提供海外仓监控视频-少包裹调查 | N | 提供海外仓监控视频-少包裹调查 | missing_field_evidence |
| 4 | `OW01V1600` | 提供海外仓监控视频-少单品调查 | N | 提供海外仓监控视频-少单品调查 | missing_field_evidence |

## 原子动态可选性

| 原子 | 可考虑的场景 | 不应选择的场景 | 证据状态 |
|---|---|---|---|
| 入库-单品指定位置开箱拍照 | 客户指定异常单或入库单中的某个商品，需要开箱后拍某个位置、标签、瑕疵或包装细节。 | 包裹级开箱拍照；少包裹/少单品视频调查；客户已确定最终上架/销毁/自提。 | normalized 和原子页有证据；字段配置缺失。 |
| 入库-异常包裹开箱拍照 | 入库包裹类异常，客户需要开箱确认包裹内商品、条码、外箱箱唛、实物标签等。 | 商品级指定位置拍照；监控视频调查。 | normalized 和原子页有证据；字段配置缺失。 |
| 提供海外仓监控视频-少包裹调查 | 客户怀疑少包裹，需要按整柜、散货或快递到仓方式查视频/扫描记录。 | 客户要确认包裹内商品；客户实际问少单品；快递整柜 drop 到仓却要求包裹卸货视频。 | normalized、原子页和监控快照有证据；字段配置缺失。 |
| 提供海外仓监控视频-少单品调查 | 客户怀疑少单品，需要按 B/C 包或 A 包数量差异判断是否提供预分拣视频。 | 客户实际问少包裹；A 包上架数量与验货数量一致。 | normalized、原子页和监控快照有证据；字段配置缺失。 |

## 视频调查分支限制

| 调查类型 | 可处理分支 | 明确边界 |
|---|---|---|
| 少包裹调查 | 整柜到仓、散货到仓、快递当面交付 | 整柜/散货视频不保证可精确清点数量；快递整柜 drop 到仓通常无法提供包裹卸货视频。 |
| 少单品调查 | B/C 包裹少单品；A 包上架数量与验货数量不一致 | A 包上架数量与验货数量一致时不提供视频服务，应引导库内盘点增值方向。 |

## 证据边界

- 本页只说明 VASC 产品定位、异常索引、原子候选和动态选择逻辑，不定版原子字段、附件、模板、费用、照片数量或视频文件格式。
- `vasc_submission_entry` 根据入库异常拍照 SOP 标为 `exception_order`；但 normalized 产品属性还出现 `STORAGE` 列表线索，AI 回答具体下单入口时应以当前系统页面为准。
- 本产品是证据获取和调查类产品，不能替代最终处理动作；拍照或视频反馈后，客户通常还需要继续选择上架、销毁、自提、换标、包装、盘点或其他增值。
- 业务快照中的普通 `入库商品拍照` 历史口径不能直接等同于本产品；当前推荐时要优先使用本页的 active 非标 VASC 口径。

## 相关链接

- [入库-单品指定位置开箱拍照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md)
- [入库-异常包裹开箱拍照](../../value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-exception-package-unboxing-photo.md)
- [提供海外仓监控视频-少包裹调查](../../value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md)
- [提供海外仓监控视频-少单品调查](../../value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)
