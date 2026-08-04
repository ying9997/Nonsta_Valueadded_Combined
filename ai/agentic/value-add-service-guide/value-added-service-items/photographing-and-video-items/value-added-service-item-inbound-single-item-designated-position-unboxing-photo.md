---
title: 入库-单品指定位置开箱拍照
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, product-level, config-field]
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
service_item_code: OW01V1610
service_item_name: 入库-单品指定位置开箱拍照
service_item_aliases: [增值原子, 增值事件, 单品指定位置开箱拍照, 指定位置拍照]
service_item_object_level: product
service_item_type: non_standard
service_item_required_in_vasc: false
service_item_mutex_group: 入库-单品指定位置开箱拍照
charge_required: true
cost_generated: false
effective: true
field_evidence_status: missing
---

# 入库-单品指定位置开箱拍照

## 摘要

`入库-单品指定位置开箱拍照` 是入库非标拍照或提供视频 VASC 下的商品级拍照原子，用于客户指定异常单或入库单中的某个商品，要求仓库开箱后对指定位置进行拍照，并反馈辨识结果。

本原子是非标的中间调查/辨识动作，不是最终上架、换标、销毁或自提动作。拍照完成后，货物通常仍停留在异常/暂存处理链路中，等待客户根据照片决定下一步。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1610` |
| 服务项名称 | 入库-单品指定位置开箱拍照 |
| 别名 | 增值原子 / 增值事件 / 单品指定位置开箱拍照 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 商品 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 2 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | Y |
| 是否产生成本 | N |
| 是否有效 | Y |
| 字段证据状态 | `missing_field_evidence`，当前无可定版字段 |

## 仓库动作

仓库根据客户指定的异常单、入库单和商品对象定位货物，按客户指定位置开箱拍照，并反馈辨识结果。

与普通商品开箱拍照相比，本原子强调“指定位置”：客户关注的是某个部位、标签、包装细节、瑕疵点或其他需要仓库定向拍摄的位置。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 说明 |
|---|---|---:|---|---|---|
| 入库非标拍照或提供视频 | `VASC202411271721537` | 1 | N | 入库-单品指定位置开箱拍照 | 商品级、指定位置开箱拍照。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户已明确需要拍某个商品的指定位置 | 是 | 主数据定义为指定异常或入库单某个商品，开箱后指定位置拍照。 |
| 商品类异常需要进一步辨识标签、包装、外观或瑕疵 | 可考虑 | 异常解决方案目录将部分入库异常的拍照后暂存方向纳入拍照类增值。 |
| 客户只需要普通商品开箱拍照，没有指定位置 | 应优先核 `入库-商品开箱拍照` | 普通商品开箱拍照和指定位置拍照口径不同。 |
| 包裹级异常需要开箱拍包裹或外箱 | 不应直接选 | 应查 `入库-异常包裹开箱拍照`。 |
| 客户需要调取仓库监控视频 | 不应选 | 应查少包裹/少单品监控视频调查原子。 |
| 客户已经确定要上架、销毁或自提 | 不应作为最终处理 | 本原子只产出照片和辨识结果，不能替代最终处理动作。 |

## 配置字段

当前字段覆盖映射显示 `OW01V1610` 为 `missing_field_evidence`，normalized 和字段快照没有提供可定版的 `attrSpec` 字段。

AI 回答字段配置时，应说明：当前知识库没有足够字段级证据确认本原子的指定位置、照片数量、附件、需求描述或商品选择字段，不能生成确定字段清单。

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号或入库单号 | 定位来源单据 | 主数据说明可指定异常或入库单。 |
| 商品 SKU 或商品对象 | 定位需拍照商品 | 主数据说明指定某个商品。 |
| 指定拍照位置 | 本原子的核心输入 | 主数据明确为指定位置拍照；字段未定版。 |
| 拍照目的或关注问题 | 标签、包装、外观、瑕疵等 | 业务上用于仓库执行，但当前无字段级证据。 |
| 后续处理意图 | 拍照完成后 | 入库异常拍照 SOP 说明拍照后可继续在暂存待处理中申请后续处理。 |

## 上传文件要求

当前没有字段级证据证明必须上传图片示例、附件或模板。客户如需仓库拍摄特定部位，应提供清楚的文字说明；若系统要求上传示例图或附件，应以当前下单页面为准，本页不定版字段。

## 校验规则

- 必须确认操作对象为商品/单品。
- 必须确认客户需要“指定位置”拍照，而不是普通开箱拍照。
- 必须确认需求不是监控视频调查。
- 必须提示拍照完成后仍需客户决定后续处理方向。
- 字段证据缺失时不得生成字段清单、附件模板或必填字段。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-商品开箱拍照 | 商品级普通开箱拍照；本原子强调指定位置，非标属性更强。 |
| 入库-异常包裹开箱拍照 | 包裹级拍照；本原子是商品/单品级。 |
| 提供海外仓监控视频-少包裹调查 | 调取监控视频并调查少包裹，不是开箱拍照。 |
| 提供海外仓监控视频-少单品调查 | 调取预分拣视频或调查少单品，不是指定位置照片。 |

## 证据边界

- 本页不定版配置字段、照片数量、附件格式、价格金额和国家仓库差异。
- `入库非标拍照或提供视频` 是 active 的非标 VASC，但是否可提交仍需结合当前异常对象、订单状态和系统入口判断。
- 业务资料中“入库商品拍照/暂存”的普通入口不能直接等同于本非标原子；推荐时要区分普通商品拍照、指定位置拍照和包裹开箱拍照。

## 相关链接

- [入库-商品开箱拍照](value-added-service-item-inbound-product-unboxing-photo.md)
- [入库-异常包裹开箱拍照](value-added-service-item-inbound-exception-package-unboxing-photo.md)
- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)

