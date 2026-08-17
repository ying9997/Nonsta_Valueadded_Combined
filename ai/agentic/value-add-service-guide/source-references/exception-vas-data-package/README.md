---
title: 异常与 VASC 数据证据包
type: reference
entity_type: dataset_reference
tags: [inbound, exception, value-added-service, vasc-product, value-added-service-item, relationship-mapping, dataset-reference]
source_refs:
  - source-references/exception-vas-data-package/sources/source-priority.md
  - source-references/exception-vas-data-package/sources/data-coverage.md
  - source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md
updated: 2026-06-25
confidence: high
fidelity: preserve
status: active
---

# 异常与 VASC 数据证据包

本目录保存异常、VASC 产品、增值服务项和字段配置之间关系映射所需的数据证据、取证记录和覆盖率结果。

这些文件不是最终业务实体页，也不是对客回答文档。AI 应把它们作为来源证据和覆盖率依据使用。

## 目录说明

| 路径 | 用途 | 使用方式 |
|---|---|---|
| `data/raw/` | 原始 TOM VASC 详情页快照 | 作为证据留存，不人工改写。 |
| `data/normalized/` | 规范化后的异常、VASC、原子编排数据 | 可作为后续生成关系映射表和实体页的主要数据来源。 |
| `data/reports/` | 覆盖率、缺口和字段覆盖报告 | 用于判断哪些链路已齐、哪些字段仍待补证。 |
| `source-snapshots/` | 标准异常、VASC、增值服务项和属性字段的本地静态快照 | 用于支撑覆盖率报告和后续映射生成，路径必须保持项目内相对引用。 |
| `sources/` | 来源优先级、字段来源、取数边界说明 | 用于约束 AI 如何解释这些数据。 |
| `legacy-root-files/` | 历史根文件的保留副本 | 仅作追溯记录，不进入当前检索链路。 |

## 当前可支撑的链路

根据 `data/reports/coverage-summary-2026-06-22.md`，本数据包已补齐以下主链路：

- 标准异常配置：422 条。
- 绑定 VASC 的异常：36 条。
- 入库异常引用的唯一 VASC：18 个。
- VASC 基础配置：18 / 18。
- VASC 到增值服务项的真实编排：18 / 18。
- 编排引用的唯一增值服务项：52 个。
- 增值服务项主数据：52 / 52。

因此，后续可以基于 `data/normalized/exception-vasc-orchestration-2026-06-22.json` 设计和生成：

- `exception -> vasc_product` 映射。
- `vasc_product -> value_added_service_item` 映射。
- VASC 产品实体页的“适用异常”和“可选增值服务项”部分。
- 增值服务项实体页的“所属 VASC 产品”部分。

## 当前不能直接支撑的链路

字段级链路仍不完整：

- 原子普通属性字段快照已由 BaseAttrRel 扩充到 42 / 52 个编排引用增值服务项；正式 `vas-event-attrs-slim.json` 当前共 61 条记录。
- `detail_items[].attrs` 当前为空，不能据此推断某个增值服务项没有配置字段。
- 附件字段、模板字段和上传关系仍缺少完整证据。

涉及配置字段、附件、模板、上传要求、必填条件和枚举值时，必须继续引用 `vaAtomAttrs`、`vaAtomFiles` 或等价来源。不能只凭本数据包中的空字段写成确定结论。

## 使用规则

1. `data/raw/` 是证据层，只能引用，不应改写。
2. `data/normalized/` 是生成业务映射和实体页的优先来源，但必须保留可追溯的 `source_refs`。
3. `data/reports/` 用于标注覆盖率和缺口，不能把缺口误写成“不存在”。
4. `sources/` 中的数据来源优先级和字段来源映射，应被当前根目录规则吸收；如有冲突，以当前根目录 `SCHEMA.md` 和 `AGENTS.md` 为准。
5. `legacy-root-files/` 仅用于追溯历史设计，不作为当前知识库的根规则或检索入口。

## normalized 同步机制

当前 `data/normalized/exception-vasc-orchestration-2026-06-22.json` 派生了以下关系映射：

- `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`
- `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
- `relationship-mappings/service-item-config-field-evidence-coverage.md`

如果 normalized 数据新增、替换、重命名或内容变化，AI 必须同步重建或差异审查上述映射，并更新：

- `relationship-mappings/README.md`
- 根 `index.md`
- 已存在的相关实体页
- `log.md`

字段级证据未补齐前，normalized 更新也不得直接触发确定版 `service-item-to-config-field-mapping.md`。
