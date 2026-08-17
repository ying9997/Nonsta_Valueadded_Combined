# Value-Add 数据源台账

本文件登记 value-add 新 experts 当前可引用的 repo 内知识来源。所有路径均为相对 `docs/value-add/` 的路径。

| source_id | repo 内路径 | 权威级别 | 支撑内容 | 当前状态 |
|---|---|---|---|---|
| `plan-event-standard-exception` | `source-references/exception-vas-data-package/source-snapshots/` | primary | 标准异常编码、名称、节点、对象、可选 VASC 编码 | 待补全量快照；当前由关系映射摘要承接 |
| `plan-event-vas` | `source-references/exception-vas-data-package/source-snapshots/` | primary | 增值服务项/原子主数据、名称、定义、收费/成本/有效性字段 | 待补全量快照；当前由服务项摘要承接 |
| `vasc-master` | `source-references/exception-vas-data-package/source-snapshots/` | primary | VASC 基础信息、规则、SLA 配置 | 待补全量快照；当前由 VASC 产品摘要承接 |
| `exception-vasc-detail-items-raw` | `source-references/exception-vas-data-package/data/raw/` | primary | 异常引用 VASC 的真实原子编排 | 待补 raw；当前由 VASC 到服务项编排摘要承接 |
| `exception-vasc-orchestration-normalized` | `source-references/exception-vas-data-package/data/normalized/` | primary_derived | 异常到 VASC、VASC 到服务项、字段证据状态 | 待补 normalized；当前由 `relationship-mappings/` 承接 |
| `vas-event-attrs-slim` | `source-references/exception-vas-data-package/source-snapshots/` | primary_for_normal_attrs | 普通属性字段、枚举/默认值、显示类型、输入节点、必填状态 | 待补字段快照；当前保留 42/52 covered、10/52 missing 口径 |
| `interface-documents` | `source-references/interface-documents/` | reference_only | 接口字段、状态、请求响应结构和查询链路 | 已建立摘要文件；待补全量接口文档 |
| `offline-documents` | `source-references/offline-documents/` | primary_for_selectability_rules | 原子可选性、禁选、互斥、置灰/隐藏和动态配置依赖 | 已复制当前 repo 已有离线规则 |
| `kb-business-source-snapshots` | `source-references/kb-business-source-snapshots/` | primary_for_business_explanation | 异常解释、SOP、处理限制、业务建议 | 待补业务快照；当前由领域摘要承接 |

## 刷新影响范围

| 刷新对象 | 必须同步检查 |
|---|---|
| 标准异常快照 | `inbound-exceptions/`、`relationship-mappings/inbound-exception-to-vasc-product-mapping.md`、`inbound-exception-value-added-process/` |
| 增值服务项主数据 | `value-added-service-items/`、`relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`、`relationship-mappings/service-item-config-field-evidence-coverage.md` |
| VASC master | `vasc-products/`、VASC 到服务项编排、原子可选性说明 |
| VASC detail items | VASC 到服务项编排、字段证据覆盖、服务项实体页 |
| 普通字段快照 | 字段证据覆盖、`value-add-service-config` 运行时 KB |
| 接口文档 | `value-add-order-status` 运行时 KB、API 矩阵 |
| 业务 KB 快照 | 异常实体、流程页、VASC 产品页、服务项实体页 |
