# 异常与增值服务知识库索引

> 本索引用于汇总 `exception-vas/` 下的正式文档。新增文档后需要同步更新。

## 根文件

| 文件 | 用途 |
|---|---|
| [README.md](README.md) | 知识库说明 |
| [SCHEMA.md](SCHEMA.md) | 文档结构与写作规范 |
| [AGENTS.md](AGENTS.md) | AI 输出约束 |
| [log.md](log.md) | 变更记录 |

## 数据来源

| 文件 | 用途 |
|---|---|
| [sources/README.md](sources/README.md) | 数据来源总览 |
| [sources/source-priority.md](sources/source-priority.md) | 数据来源优先级与使用边界 |
| [sources/local-snapshots.md](sources/local-snapshots.md) | 本地 JSON、CSV、TOM 快照说明 |
| [sources/tom-api-runbook.md](sources/tom-api-runbook.md) | TOM `.env` 和脚本补数说明 |
| [sources/data-coverage.md](sources/data-coverage.md) | 当前数据覆盖率和缺口 |
| [sources/field-origin-map.md](sources/field-origin-map.md) | 字段来源映射 |

## 数据与报告

| 文件 | 用途 |
|---|---|
| [data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json](data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json) | 入库异常 VASC 详情页原子编排原始快照 |
| [data/normalized/exception-vasc-orchestration-2026-06-22.json](data/normalized/exception-vasc-orchestration-2026-06-22.json) | 规范化 VASC 到原子编排数据 |
| [data/reports/coverage-summary-2026-06-22.md](data/reports/coverage-summary-2026-06-22.md) | 入库异常 VASC 数据覆盖率检查 |
| [data/reports/data-coverage-2026-06-22.json](data/reports/data-coverage-2026-06-22.json) | 机器可读覆盖率结果 |
| [data/reports/atom-attr-coverage-2026-06-22.csv](data/reports/atom-attr-coverage-2026-06-22.csv) | 原子属性覆盖明细 |

## 业务文档

当前尚未建立业务文档目录。下一步可继续规划异常视角、VASC 视角、模板目录和正式 whole picture 文档。
