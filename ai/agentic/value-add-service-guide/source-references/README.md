---
title: 来源参考总览
type: reference
entity_type: source_reference
tags: [source-reference, dataset-reference, interface-reference, inbound, exception, value-added-service]
source_refs: ["SCHEMA.md", "source-references/data-source-registry.md", "source-references/exception-vas-data-package/README.md", "source-references/interface-documents/README.md", "source-references/kb-business-source-snapshots/README.md"]
updated: 2026-06-25
confidence: high
fidelity: summary
status: active
---

# 来源参考总览

本目录是 `value-add-service-guide/` 的证据层，用于保存可迁移、可追溯、可复查的数据来源、接口来源和业务知识快照。

业务实体页、关系映射和流程页应只引用本项目内已经沉淀的来源文件，不直接引用项目外路径、临时导出目录或本机绝对路径。

## 当前来源分层

| 来源层 | 目录 | 来源类型 | 主要用途 |
|---|---|---|---|
| 数据证据包 | `source-references/exception-vas-data-package/` | 离线快照、TOM 原始快照、规范化数据、覆盖率报告 | 支撑异常到 VASC、VASC 到增值服务项、字段证据覆盖状态。 |
| 接口来源参考 | `source-references/interface-documents/` | 接口文档、接口结构说明 | 支撑字段名、接口路径、请求响应结构、查询链路和未来自动化校验。 |
| KB 业务快照 | `source-references/kb-business-source-snapshots/` | 知识库/Feishu 业务文档快照 | 支撑异常解释、流程说明、业务规则、处理建议和人工 SOP。 |

## 使用边界

- 关系适用性结论优先回到 `relationship-mappings/`，接口文档不能单独判断某异常是否支持某 VASC。
- 数据证据包中的 `raw/` 只作证据保留，`normalized/` 可生成映射，`reports/` 用于覆盖率和缺口说明。
- 字段、附件、模板和上传要求必须有字段级证据，不能用空字段推断“不需要配置”。
- KB 业务快照是业务解释来源，若原始知识库更新，需要重新复制或差异审查后再更新业务页。

## 维护入口

- [数据源台账](data-source-registry.md)
- [异常与 VASC 数据证据包](exception-vas-data-package/README.md)
- [接口来源参考](interface-documents/README.md)
- [KB 业务知识来源快照](kb-business-source-snapshots/README.md)
- [数据源审计与更新规划](data-source-audit-and-update-plan.md)
