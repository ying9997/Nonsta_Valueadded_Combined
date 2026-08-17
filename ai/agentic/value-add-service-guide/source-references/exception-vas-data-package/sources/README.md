---
title: 数据来源总览
type: reference
entity_type: source_reference
tags: [exception, vas, vasc, atom, source-map]
updated: 2026-06-25
confidence: high
fidelity: synthesize
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/sources/source-priority.md
  - source-references/exception-vas-data-package/sources/local-snapshots.md
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/exception-vas-data-package/sources/data-coverage.md
---

# 数据来源总览

本目录用于约束当前数据证据包的数据来源、取数优先级、覆盖率判断和字段来源映射。

## 文件说明

| 文件 | 用途 |
|---|---|
| [source-priority.md](source-priority.md) | 定义数据来源优先级与使用边界 |
| [local-snapshots.md](local-snapshots.md) | 说明本地 JSON、CSV、TOM 快照的用途 |
| [tom-api-runbook.md](tom-api-runbook.md) | 说明如何用 TOM `.env` 和脚本补数据 |
| [data-coverage.md](data-coverage.md) | 汇总当前数据是否齐全 |
| [field-origin-map.md](field-origin-map.md) | 映射关键字段来自哪个来源 |

## 目录关系

- `sources/`：记录来源规则、取数方式和字段证据。
- `data/raw/`：保存原始接口或页面快照，不人工改写。
- `data/normalized/`：保存清洗后的结构化数据，供业务文档引用。
- `data/reports/`：保存覆盖率、缺口和对账报告。

## 当前结论

当前已经补齐“异常 -> VASC -> 原子编排 -> 原子主数据”主链路。

字段级仍不完整：普通属性字段已由 `pms.BaseAttrRelService_findBaseAttrRelPage` 扩充到 42 / 52 个编排引用服务项；正式 `vas-event-attrs-slim.json` 当前共 61 条记录。剩余 10 个服务项在 BaseAttrRel 去掉 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 也为空；附件模板和上传关系还需要继续取证，不能把空字段解释为“不需要配置”。
