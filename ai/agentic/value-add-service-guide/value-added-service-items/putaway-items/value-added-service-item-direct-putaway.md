---
title: 直接上架
type: reference
entity_type: value_added_service_item
tags: [value-added-service, value-added-service-item, inbound, direct-putaway, config-field]
source_refs:
  - relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md
  - relationship-mappings/service-item-config-field-evidence-coverage.md
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md
  - inbound-exception-value-added-process/customer-action-decision-flow.md
updated: 2026-06-23
confidence: medium
fidelity: summary
status: draft
service_item_code: OW01V1708
service_item_name: 直接上架
service_item_aliases: [增值原子, 增值事件, 原单上架直接上架, 新单上架直接上架]
service_item_object_level: package
service_item_type: standard
service_item_required_in_vasc: false
service_item_mutex_group: 直接上架
charge_required: false
cost_generated: false
effective: true
field_evidence_status: partial
---

# 直接上架

## 摘要

`直接上架` 是入库异常处理中的上架类原子，用于部分入库状态异常、包裹质量异常或商品质量异常的包裹，在不补贴标签、不更换包装、不做额外关联的情况下，直接进入上架处理。

本原子不是“任何异常都可以直接上架”。AI 必须先判断客户选择的是原入库单承接，还是客户提供的新入库单承接；同一个 `OW01V1708` 在 `原单上架（直接上架）` 和 `新单上架（直接上架）` 两个 VASC 产品下复用。

## 服务项标识

| 字段 | 值 |
|---|---|
| 服务项编码 | `OW01V1708` |
| 服务项名称 | 直接上架 |
| 别名 | 增值原子 / 增值事件 / 原单上架直接上架 / 新单上架直接上架 |
| PSCG | `OW01` 海外仓入库 |
| 操作对象 | 包裹 |
| 是否原子增值 | Y |
| 是否拦截入库列表 | Y |
| 默认 SLA | 1 天 |
| 是否通知客户 | Y |
| 是否需要客户确认 | N |
| 是否收费 | N |
| 是否产生成本 | N |
| 是否有效 | Y |
| 字段证据状态 | `partial_field_evidence`，当前有 2 个 `attrSpec` 字段 |

## 仓库动作

仓库动作是扫描可识别的包裹条码或货物条码后直接上架，不再执行补包裹条码、补/换商品条码、包装处理、第三方条码关联等额外动作。

使用本原子后，实物流从异常暂存或上架前拦截状态回到上架链路；信息流进入所选 VASC 对应的入库单承接关系：原单直接上架回原入库单，新单直接上架则进入客户提供的新入库单。

## 所属 VASC 产品

| VASC 产品 | 编码 | 顺序 | 产品级必选 | 互斥组 | 入库单号字段的业务含义 |
|---|---|---:|---|---|---|
| 原单上架（直接上架） | `VASC202504251617529` | 1 | N | 直接上架 | 使用原入库单上架。 |
| 新单上架（直接上架） | `VASC202505282347101` | 1 | N | 直接上架 | 使用客户提供的新入库单上架。 |

## 核心适用场景

| 场景 | 是否可考虑 | 判断依据 |
|---|---|---|
| 客户明确要求直接上架，且不需要贴标、换标、换包装或关联条码 | 是 | 主数据定义为不进行补贴且直接上架处理。 |
| 实际包裹或商品上已有清晰可扫描条码，客户已提交增值确认 | 是 | VASC 产品目录说明两个直接上架产品都以前述条件为前提。 |
| 入库单状态异常，更新状态后客户要求用原单或新单直接上架 | 是 | 解决方案目录将该场景指向原单/新单上架（直接上架）+ 直接上架。 |
| A+ 包裹质量异常、商品质量异常，客户要求用原单有箱单或无箱单预报单上架 | 可考虑 | 解决方案目录存在直接上架方向，并标注支持良品/不良品上架。 |
| 商品裸装，客户更改包装属性后要求直接上架 | 可考虑 | 解决方案目录存在新单上架（直接上架）方向。 |
| 包裹条码异常但仍需要补贴包裹条码 | 不应选本原子单独处理 | 应选补包裹条码等贴标原子；直接上架强调无需额外粘贴标签。 |
| 商品条码异常但仍需要补/换商品条码 | 不应选本原子单独处理 | 应选补原商品条码或更换新商品条码等原子。 |
| 需要更换包装、拍照确认、销毁、自提或非标处理 | 不应选 | 客户处理意图不属于直接上架。 |

## 配置字段

当前可定版的字段来自 normalized `attrSpec` / `vas-event-attrs-slim`，输入节点均为 `SUBMIT`。

| attributeKey | 字段名 | 是否必填 | 控件类型 | 可选值 | AI 配置说明 |
|---|---|---|---|---|---|
| `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | 否 | `OPTIONAL_BOX` | `GOOD_PRODUCT` = 良品；`DEFECTIVE_PRODUCT` = 不良品 | 只有客户或异常处理需要区分良品/不良品上架时才使用；不能默认替客户判断等级。 |
| `VAS_ATTR_REL_WRN` | 入库单号 | 是 | `INPUT_BOX` | 无枚举 | 必须结合所属 VASC 判断：原单直接上架填可承接的原入库单号；新单直接上架填客户提供的新入库单号。 |

## 客户需提供的信息

| 信息 | 适用场景 | 证据状态 |
|---|---|---|
| 异常单号 | 从异常单入口提交直接上架 | 流程和接口结构支持异常单来源与增值单关联。 |
| 所属直接上架 VASC | 所有场景 | `OW01V1708` 同时属于原单直接上架和新单直接上架，必须先选承接方向。 |
| 入库单号 | 所有场景 | `VAS_ATTR_REL_WRN` 为必填字段。 |
| 上架商品等级 | 需要区分良品/不良品时 | `SHELVE_PRODUCT_GRADE` 为可选字段，枚举为良品/不良品。 |
| 条码清晰可扫描的确认 | 直接上架判断前置 | 业务目录说明直接上架要求实际包裹或商品已具备清晰可扫描条码。 |
| 客户直接上架意图确认 | 所有场景 | 业务目录说明客户已提交增值确认后仓库可直接上架。 |

## 上传文件要求

当前字段证据只覆盖两个提交属性，没有证据表明本原子必须上传附件、模板或图片。

如果客户提出图片证明、条码截图、包装图片或其他附件，AI 可以说明这些可能用于业务确认，但不得写成 `OW01V1708` 的定版上传文件要求。

## 校验规则

- 必须先判断是原单直接上架还是新单直接上架。
- `入库单号` 是必填字段，但其业务含义随所属 VASC 改变。
- 直接上架的前提是无需额外贴标、换标、换包装或条码关联。
- 若需要补包裹条码、补/换商品条码或更换包装，应进入对应原子，而不是只选直接上架。
- `上架的商品等级` 是可选字段；若客户没有提供良品/不良品判断，AI 不得自行指定。
- 本原子主数据对象为包裹，涉及商品异常时仍需确认最终被上架承接的包裹/货物关系。

## 与相近原子的区别

| 原子 | 区别 |
|---|---|
| 入库-补贴包裹条码 | 需要重新补贴包裹条码后上架；直接上架不做补贴。 |
| 入库-更换新商品条码 | 需要更换商品条码后上架；直接上架不换商品条码。 |
| 入库-补贴原商品条码 | 需要补贴原商品条码后上架；直接上架不补商品条码。 |
| 入库-更换商品包装 | 需要处理包装后上架；直接上架不处理包装。 |
| 上架前商品/包裹销毁 | 客户不再上架并要求销毁；直接上架是继续上架。 |

## 证据边界

- 本页只定版 normalized 已展开的两个字段，不推断附件、模板、图片或其他隐藏字段。
- `入库单号` 字段的业务含义来自 VASC 产品差异和业务目录说明；AI 回答时必须带上“原单/新单”的前置判断。
- 业务资料多处写到“支持良品/不良品上架”，但 `SHELVE_PRODUCT_GRADE` 是可选字段；是否填写需由客户处理意见或系统要求决定。
- 本页不定版无箱单预报单、客户提供预报单、Winit 创建入库单等其他上架模式；这些应查对应 VASC 或非标页。

## 相关链接

- [VASC 产品到增值服务项编排映射](../../relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md)
- [增值服务项字段证据覆盖映射](../../relationship-mappings/service-item-config-field-evidence-coverage.md)
- [客户处理意图到增值选择决策流程](../../inbound-exception-value-added-process/customer-action-decision-flow.md)
- [入库异常与增值实物流](../../inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md)
- [入库异常与增值信息流](../../inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md)

