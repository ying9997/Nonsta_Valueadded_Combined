---
title: 入库异常 VASC 数据覆盖率检查
type: reference
entity_type: dataset_reference
tags: [exception, vas, vasc, atom, source-map, field-config, tom]
updated: 2026-06-25
confidence: high
fidelity: synthesize
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv
  - source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json
  - source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md
---

# 入库异常 VASC 数据覆盖率检查

## 本次同步数据

- 原始 TOM 详情页快照：`source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json`
- 规范化编排数据：`source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json`
- 覆盖率 JSON：`source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json`
- 原子属性覆盖 CSV：`source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv`
- 普通属性字段上游接口：`source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md`

## 覆盖结论

| 数据层 | 覆盖情况 | 结论 |
|---|---:|---|
| 标准异常配置 | 422 条 | 已同步最新快照 |
| 绑定 VASC 的异常 | 36 条 | 已识别 |
| 入库异常引用的唯一 VASC | 18 个 | 已识别 |
| VASC 基础配置 | 18 / 18 | 已齐 |
| VASC 到原子的真实编排 | 18 / 18 | 已补齐 |
| 编排引用的唯一原子 | 52 个 | 已识别 |
| 原子主数据 | 52 / 52 | 已齐 |
| 原子普通属性字段快照 | 42 / 52 | 已由 BaseAttrRel 扩充，仍非完整字段配置 |

## 仍未齐的部分

以下数据不能仅凭本次 BaseAttrRel 或 TOM VASC 详情页补齐：

- 原子普通属性字段：当前 BaseAttrRel 可覆盖 42 / 52 个编排引用服务项；剩余 10 个在 BaseAttrRel 去掉 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 也为空。
- 原子附件字段：对应订单接口中的 `vaAtomFiles`，当前没有完整静态配置来源。
- 附件、模板、上传关系：需要继续从运行时订单接口、页面响应或更底层配置接口取证。

## 已验证但不能修复普通属性字段的服务项

- `OSF6V1576` 库内-商品拆分
- `OSF6V1591` 拍照暂存后上架
- `OSF6V1626` 指定商品盘点
- `OSF6V1681` 错装商品直接上架
- `OSF6V1704` 库内-异常商品销毁
- `OSF6V1804` 库内-商品组合
- `OW01V1562` 入库-商品开箱拍照
- `OW01V1563` 上架前商品销毁
- `OW01V1572` 入库-第三方商品条码关联
- `OW01V1703` 上架前包裹销毁

## 判断

本轮已经同步“标准异常快照”和“普通属性字段快照”的最新可验证数据。主链路仍为“异常 -> VASC -> 原子编排 -> 原子主数据”；字段链路中，普通属性字段证据从 12 / 52 扩充到 42 / 52。仍不齐的是“无 BaseAttrRel 记录的普通属性字段、附件字段、模板和上传关系”，后续如果要生成确定版 `service-item-to-config-field-mapping.md`，仍需补 `vaAtomFiles` 或等价来源，不能把空字段解释为“不需要配置”。
