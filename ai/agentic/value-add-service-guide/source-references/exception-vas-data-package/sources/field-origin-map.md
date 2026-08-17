---
title: 字段来源映射
type: reference
entity_type: source_reference
tags: [exception, vas, vasc, atom, source-map, field-config, interface]
updated: 2026-06-25
confidence: high
fidelity: synthesize
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/source-snapshots/vasc-master.json
  - source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json
  - source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
---

# 字段来源映射

## 异常字段

| 字段 | 来源 | 使用方式 |
|---|---|---|
| `eventCode` | `plan-event-standard_exception.json` | 标准异常编码 |
| `eventName` | `plan-event-standard_exception.json` | 标准异常名称 |
| `sgCode` | `plan-event-standard_exception.json` | 异常所属 SG |
| `pscgCode` | `plan-event-standard_exception.json` | 异常所属 PSCG |
| `vascCode` | `plan-event-standard_exception.json` | 异常可选 VASC，需按逗号拆分 |
| `exceptionNode` | `plan-event-standard_exception.json` | 异常节点 |
| `operationObject` | `plan-event-standard_exception.json` | 操作对象 |

## VASC 字段

| 字段 | 来源 | 使用方式 |
|---|---|---|
| `vascCode` | `vasc-master.json`、TOM VASC 详情页 | VASC 编码 |
| `vascName` | `vasc-master.json` | VASC 名称 |
| `pscgCode` | `vasc-master.json` | 关联 PSCG |
| `isActive` | `vasc-master.json` | 是否启用 |
| `defaultVascAttribute` | TOM VASC 详情页快照 | VASC 配置属性 |
| `VAS_ORDER_STATUS_INBOUND` | `defaultVascAttribute` 或 `vascAttributeMap` | 入库增值单适用状态 |
| `VASC_EXECUTOR` | `defaultVascAttribute` 或 `vascAttributeMap` | 执行方 |
| `VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS` | `defaultVascAttribute` 或 `vascAttributeMap` | 是否支持无业务单据 |
| `VASC_LISTING` | `defaultVascAttribute` 或 `vascAttributeMap` | 上架方式 |
| `VASC_PRODUCT_TYPE` | `defaultVascAttribute` 或 `vascAttributeMap` | 产品类型 |
| `VASC_ISSUANCE_TYPE` | `defaultVascAttribute` 或 `vascAttributeMap` | 发起方式 |
| `VASC_SUBMITTER` | `defaultVascAttribute` 或 `vascAttributeMap` | 提交方 |

## VASC 到原子编排字段

| 字段 | 来源 | 使用方式 |
|---|---|---|
| `detail_items[].sequence` | TOM VASC 详情页快照 | 原子展示和执行顺序 |
| `detail_items[].vasEventCode` | TOM VASC 详情页快照 | 原子编码 |
| `detail_items[].vasEventName` | TOM VASC 详情页快照 | 原子名称 |
| `detail_items[].vasEventDesc` | TOM VASC 详情页快照 | 原子描述 |
| `detail_items[].required` | TOM VASC 详情页快照 | 是否必选 |
| `detail_items[].mutexGroupCn` | TOM VASC 详情页快照 | 互斥组中文名 |
| `detail_items[].mutexGroupEn` | TOM VASC 详情页快照 | 互斥组英文名 |
| `detail_items[].attrs` | TOM VASC 详情页快照 | 当前均为空，不能作为字段来源 |

## 原子主数据字段

| 字段 | 来源 | 使用方式 |
|---|---|---|
| `eventCode` | `plan-event-vas.json` | 原子编码 |
| `eventName` | `plan-event-vas.json` | 原子名称 |
| `eventDefine` | `plan-event-vas.json` | 原子定义 |
| `pscgCode` | `plan-event-vas.json` | 原子所属 PSCG |
| `vasType` | `plan-event-vas.json` | 增值类型 |
| `isAtomicVas` | `plan-event-vas.json` | 是否原子增值 |
| `isStandardVas` | `plan-event-vas.json` | 是否标准增值 |
| `isInterceptInboundList` | `plan-event-vas.json` | 是否拦截入库列表 |

## 原子执行字段

| 字段 | 来源 | 当前状态 |
|---|---|---|
| `vaAtomAttrs[].attributeName` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |
| `vaAtomAttrs[].attributeKey` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |
| `vaAtomAttrs[].attributeValue` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |
| `vaAtomAttrs[].attributeValueName` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |
| `vaAtomAttrs[].inputNode` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |
| `vaAtomAttrs[].isRequired` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |
| `vaAtomFiles[]` | `wh.va.order.basicInfo` / `wh.va.order.getVasList` | 结构已知，数据未全 |

## 原子属性配置接口

| 字段 | 来源 | 当前状态 |
|---|---|---|
| `attrCode` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 已验证可映射到 `vas_event_attrs_slim.json` 的 `attributeKeyOriginal` |
| `attrName` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 已验证可映射到 `attributeName` |
| `showType` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 已验证可映射到 `showType` |
| `inputNode` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 已验证可映射到 `inputNode` |
| `isRequired` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 已验证可映射到布尔必填状态 |
| `unit` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 已验证可映射到 `unit` |
| `fileFormat` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 可作为文件格式字段证据，但不等同于完整附件模板 |
| `nodeRelVos` | `pms.BaseAttrRelService_findBaseAttrRelPage` | 可抽取 `OPTIONAL_VALUE` 作为枚举值，`DEFAULT_VALUE` 作为默认值关系 |

2026-06-25 临时接口验证结果：当前 slim 中 21 个 eventCode 与 `BaseAttrRelService` 实时返回的字段编码 21/21 匹配；对 normalized 中 52 个服务项查询，42 个有实时属性字段，其中 34 个当前未同步进 slim 快照。该接口可用于重建和扩充普通属性字段快照，但仍不能覆盖附件模板和上传关系。

## 不可推断项

以下内容没有完整证据前，不得写成确定结论：

- 某个原子没有输入字段。
- 某个原子没有附件要求。
- 某个原子不需要模板。
- 某个上传字段与普通属性字段等价。
- `BaseAttrRelService` 未覆盖或 `vas_event_attrs_slim.json` 未覆盖的原子一定无属性。
