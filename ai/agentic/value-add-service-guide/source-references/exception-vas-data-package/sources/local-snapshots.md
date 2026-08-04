---
title: 本地快照说明
type: reference
entity_type: source_reference
tags: [exception, vas, vasc, atom, source-map, tom]
updated: 2026-06-25
confidence: high
fidelity: preserve
status: draft
source_refs:
  - source-references/data-source-registry.md
  - source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json
  - source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json
  - source-references/exception-vas-data-package/source-snapshots/vasc-master.json
  - source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json
---

# 本地快照说明

## 基础配置快照

| 文件 | 用途 | 当前覆盖 |
|---|---|---|
| `source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json` | 标准异常配置 | 422 条标准异常，已同步 2026-06-25 实时快照。 |
| `source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json` | 增值服务项/原子主数据 | 211 条原子；实时接口存在新增测试记录，暂未同步。 |
| `source-references/exception-vas-data-package/source-snapshots/vasc-master.json` | VASC 基础配置、规则、SLA ruleMatch 汇总 | 73 个 VASC。 |
| `source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json` | 原子普通属性字段快照 | 总记录 61 条；normalized 编排引用服务项覆盖 42 / 52。 |

## 派生数据与报告

| 文件 | 用途 | 当前覆盖 |
|---|---|---|
| `source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json` | 入库异常引用 VASC 的详情页原子编排原始快照 | 18 / 18 个 VASC。 |
| `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json` | 规范化后的异常、VASC、原子编排、字段证据聚合 | 18 个 VASC、64 行编排、52 个唯一原子；普通属性字段覆盖 42 / 52。 |
| `source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json` | 机器可读覆盖率报告 | 主链路覆盖、字段证据覆盖和缺口。 |
| `source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv` | 原子属性覆盖明细 | 64 行 VASC-原子明细。 |
| `source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md` | 人类可读覆盖率结论 | 当前齐 / 不齐判断。 |

## 使用规则

- `raw/` 中的文件只作为证据保留，不在原文件上人工修正。
- `normalized/` 中的数据可以用于生成业务文档，但需要保留 raw 和快照来源。
- `reports/` 中的数据用于判断覆盖率和缺口，不作为业务字段定义的唯一来源。
- `vas-event-attrs-slim.json` 的普通属性字段已由 `pms.BaseAttrRelService_findBaseAttrRelPage` 扩充；附件、模板和上传关系仍需继续取证。
