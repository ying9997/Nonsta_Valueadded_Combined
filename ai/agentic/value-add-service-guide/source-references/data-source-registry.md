---
title: 数据源台账
type: reference
entity_type: source_reference
tags: [source-reference, dataset-reference, interface-reference, inbound, exception, value-added-service]
source_refs:
  - source-references/data-source-audit-and-update-plan.md
  - source-references/exception-vas-data-package/README.md
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/exception-vas-data-package/sources/data-coverage.md
  - source-references/interface-documents/README.md
  - source-references/kb-business-source-snapshots/README.md
updated: 2026-06-25
confidence: high
fidelity: summary
status: active
---

# 数据源台账

本文件用于维护当前可追溯数据源：每个来源从哪里来、能支撑什么、怎么刷新、刷新后影响哪些文件。

## 使用规则

- 业务适用性优先看 `relationship-mappings/` 和实体页，接口文档不能单独判断某异常是否支持某 VASC。
- `data/raw/` 只保留原始证据；`data/normalized/` 可以生成关系映射；`data/reports/` 用来记录覆盖率和缺口。
- 测试数据、纯更新时间、简繁体名称差异等轻量变化不单独生成报告；名称写入业务页时统一使用简体。
- 字段、附件、模板和上传要求必须有字段级来源；空字段只能标缺口，不能解释为“不需要配置”。

## 当前数据源

| source_id | source_type | 当前项目路径 | 上游/接口 | 可支撑内容 | 权威级别 | 覆盖状态 | 刷新方式 |
|---|---|---|---|---|---|---|---|
| `plan-event-standard-exception` | offline_snapshot | `source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json` | `pms.PlanEventService_queryPlanEventPage`, `ACTION_NAME=standardException`, `eventType=STANDARD_EXCEPTION` | 标准异常编码、名称、节点、对象、可选 VASC 编码 | primary | 422 条，已于 2026-06-25 同步 | 调接口导出后替换快照；若影响入库异常编码或 VASC 关系，同步重建关系映射 |
| `plan-event-vas` | offline_snapshot | `source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json` | `pms.PlanEventService_queryPlanEventPage`, `ACTION_NAME=valueAddedService`, `eventType=VAS` | 增值服务项/原子主数据、名称、定义、收费/成本/有效性等主数据字段 | primary | 当前 211 条；测试新增不纳入 | 调接口差异审查；测试数据不同步，轻量名称差异不单独出报告 |
| `vasc-master` | merged_snapshot | `source-references/exception-vas-data-package/source-snapshots/vasc-master.json` | `pms.VascTomService_queryVascPage` + `pms.VascRuleService_queryVascRulePage` + `oms.OutboundSlaConfigService_findOutboundSlaConfigPage` | VASC 基础信息、规则、SLA 配置 | primary | 当前入库异常引用 VASC 18/18 有基础配置 | 复跑 VASC master 构建脚本；同步检查 VASC 产品页和关系映射 |
| `exception-vasc-detail-items-raw` | tom_api_snapshot | `source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json` | TOM VASC 详情页 `detail_items` 抓取 | 异常引用 VASC 的真实原子编排 | primary | 18/18 个入库异常引用 VASC 有详情编排 | 复跑详情抓取脚本；新增 raw 文件，不人工改写旧 raw |
| `exception-vasc-orchestration-normalized` | normalized_dataset | `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json` | raw detail + 标准异常快照 + VASC master + 原子主数据 + 属性字段快照 | 关系映射上游数据，支撑异常到 VASC、VASC 到服务项、字段证据状态 | primary_derived | 52 个编排引用服务项已识别 | 任一上游快照变化后重算；必须同步映射表、README、index、log 和相关实体页 |
| `vas-event-attrs-slim` | offline_snapshot | `source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json` | 主来源为 `pms.BaseAttrRelService_findBaseAttrRelPage`，运行时可对照 `wh.va.order.basicInfo` / `wh.va.order.getVasList` 的 `vaAtomAttrs` | 普通属性字段、枚举/默认值、显示类型、输入节点、必填状态 | primary_for_normal_attrs | normalized 52 个服务项中覆盖 42 个；正式快照 61 条 | 用 BaseAttrRel 按 `instanceCode=<eventCode>` 重建；剩余 10 个仍标 missing |
| `data-coverage-report` | coverage_report | `source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json` | normalized 生成 | 覆盖率、缺口、字段证据状态机器可读汇总 | primary_derived | 当前 42 covered / 10 missing | normalized 或字段快照变更后重算 |
| `coverage-summary` | coverage_report | `source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md` | `data-coverage-report` 摘要 | 人工阅读覆盖率和缺口摘要 | secondary | 已同步 42/52 口径 | 覆盖率报告重算后同步更新 |
| `atom-attr-coverage` | coverage_report | `source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv` | normalized 生成 | 每个 VASC 编排原子的字段证据状态 | primary_derived | 52 个编排引用服务项全量列出 | 字段快照或 normalized 变化后重算 |
| `interface-documents` | interface_reference | `source-references/interface-documents/` | PMS / OMS / WH 接口文档 | 接口字段、请求响应结构、查询链路 | reference_only | 当前登记 13 个接口文档 | 接口文档变化时更新；不能单独作为业务适用性结论 |
| `kb-business-source-snapshots` | kb_snapshot | `source-references/kb-business-source-snapshots/` | KB / Feishu 业务资料快照 | 异常解释、SOP、处理限制、业务建议 | primary_for_business_explanation | 当前登记 35 个 KB 快照 | 原 KB 更新后复制或差异审查；同步相关业务页 |

## 刷新影响范围

| 刷新对象 | 必须同步检查 |
|---|---|
| `plan-event-standard-exception` | `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`、异常实体页、`data-source-audit-and-update-plan.md`、`log.md` |
| `plan-event-vas` | 服务项实体页、`relationship-mappings/service-item-config-field-evidence-coverage.md`、`vasc-product-to-service-item-orchestration-mapping.md`；测试数据和简繁体名称差异默认不触发同步 |
| `vasc-master` | VASC 产品页、VASC 规则说明、VASC 到服务项编排映射、覆盖率报告 |
| `exception-vasc-detail-items-raw` | normalized、VASC 到服务项编排映射、字段证据覆盖映射、相关 VASC 产品页 |
| `vas-event-attrs-slim` | normalized、字段覆盖报告、服务项字段说明、相关产品页中的字段证据状态 |
| `kb-business-source-snapshots` | 异常实体页、VASC 产品页、服务项实体页、流程页、关系映射中的业务限制说明 |

## 待补来源

| 缺口 | 当前状态 | 下一步 |
|---|---|---|
| 附件字段与上传关系 | BaseAttrRel 只能覆盖普通属性字段，不能完整覆盖附件、模板和上传关系 | 继续查 `vaAtomFiles`、页面运行时响应或等价接口 |
| 剩余 10 个服务项普通字段 | BaseAttrRel 去掉 `isActive` 后仍无记录，PlanEvent 单查 `attrList` 为空 | 暂标 `missing_field_evidence`，后续如有新来源再修复 |
| TOM VASC 详情页 `detail_items` 独立接口文档 | 当前 raw 已确认来自详情页抓取，但还没有完全匹配的接口文档 | 后续补一份详情页来源参考，避免误挂到列表接口 |
| KB 快照外部来源元数据 | 部分快照保留 `feishu:` 来源 id，但未统一进 `source_refs` | 后续补来源登记说明，外部 id 只作上游标识，不作为项目内正式 `source_refs` |

## 暂缓事项

| 事项 | 暂缓原因 | 恢复条件 |
|---|---|---|
| 附件字段、模板字段和上传关系补证 | 当前先不处理；已有关系映射和普通属性字段足够支撑现阶段异常到 VASC、VASC 到服务项维护 | 后续需要生成确定版 `service-item-to-config-field-mapping.md`，或需要回答“客户要上传什么文件/模板”时再补 |
| 剩余 10 个服务项普通字段补证 | BaseAttrRel 与 PlanEvent 当前均无可用字段证据，继续深挖收益不高 | 后续出现新字段来源、运行时样本或底层配置接口时再修复 |
