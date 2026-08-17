# 增值服务项/原子摘要

本目录承接 `value-add-service-config` 所需的服务项/原子解释。

## v1 必备字段

| 字段 | 说明 |
|---|---|
| `serviceCode` | 服务项/原子编码 |
| `serviceName` | 服务项/原子名称 |
| `domain` | 业务域或服务方向 |
| `definition` | 业务定义 |
| `fieldEvidenceStatus` | 字段证据状态 |
| `selectabilityEvidence` | 可选性/禁选/互斥证据 |

## 使用规则

- 服务项顺序、必选、互斥来自 `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`。
- 字段、附件、模板和上传要求来自 `relationship-mappings/service-item-config-field-evidence-coverage.md` 及后续字段级来源。
- 原子可选性规则来自 `source-references/offline-documents/atom-selectability-rules.md`。
