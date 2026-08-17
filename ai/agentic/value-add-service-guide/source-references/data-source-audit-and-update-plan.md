---
title: 数据源审计与更新规划
type: reference
entity_type: source_reference
tags: [source-reference, dataset-reference, interface-reference, coverage-report, inbound, exception, value-added-service]
source_refs:
  - source-references/exception-vas-data-package/README.md
  - source-references/exception-vas-data-package/sources/source-priority.md
  - source-references/exception-vas-data-package/sources/field-origin-map.md
  - source-references/exception-vas-data-package/sources/data-coverage.md
  - source-references/exception-vas-data-package/sources/tom-api-runbook.md
  - source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json
  - source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md
  - source-references/data-source-registry.md
  - relationship-mappings/README.md
  - source-references/interface-documents/README.md
  - source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md
  - source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md
  - source-references/interface-documents/pms-revenue-event-charge-item-service-find-charge-item-page-api.md
  - source-references/interface-documents/pms-vasc-tom-service-query-vasc-page-api.md
  - source-references/interface-documents/pms-vasc-rule-service-query-vasc-rule-page-api.md
  - source-references/interface-documents/oms-outbound-sla-config-service-find-outbound-sla-config-page-api.md
  - source-references/interface-documents/wh-va-order-basic-info-api.md
  - source-references/interface-documents/wh-va-order-get-vas-list-api.md
  - source-references/kb-business-source-snapshots/README.md
updated: 2026-06-25
confidence: high
fidelity: summary
status: active
---

# 数据源审计与更新规划

## 审计结论

当前知识库已经有来源链路，且本轮已完成正式来源文件的来源元数据统一。

核心业务实体页、关系映射和来源证据页均可通过 `source_refs` 追溯到项目内来源；全库正式 `source_refs` 链接均能解析到存在的项目内文件。原 `sources: [...]` 旧字段已从正式来源文件中迁移：Feishu 上游 id 保留为 `external_source_note`，本地 JSON / TOM / 接口文档来源已统一登记到 `source-references/data-source-registry.md` 和项目内 `source_refs`。`legacy-root-files/` 中的旧示例只作为历史保留，不作为当前元数据规范。

## 已确认的数据源类型

| 数据源类型 | 当前项目内承载 | 来源性质 | 可支撑内容 | 维护方式 |
|---|---|---|---|---|
| 离线静态 JSON 快照 | `source-references/exception-vas-data-package/source-snapshots/` | 离线数据快照 | 标准异常、VASC 主数据、增值服务项主数据、部分原子属性字段 | 重新导出后替换或新增版本，并同步 normalized、reports、映射表和日志。 |
| TOM 原始快照 | `source-references/exception-vas-data-package/data/raw/` | 接口或页面抓取后的原始快照 | 入库异常引用 VASC 的详情页原子编排 | 复跑取数脚本后保存新 raw 文件，不直接改写旧 raw。 |
| 规范化数据 | `source-references/exception-vas-data-package/data/normalized/` | 从 raw 和静态快照清洗生成 | 关系映射上游数据，支撑异常到 VASC、VASC 到服务项编排 | 任一 normalized 变更必须触发映射表、README、index 和 log 同步检查。 |
| 覆盖率报告 | `source-references/exception-vas-data-package/data/reports/` | 取数后生成的质量报告 | 主链路覆盖、字段证据缺口、缺失服务项列表 | 每次取数或 normalized 更新后重算，用于防止把缺口写成不存在。 |
| 接口文档 | `source-references/interface-documents/` | 接口说明快照 | 系统字段、接口路径、请求响应结构、可校验查询链路 | 接口变更时更新对应文档；不能单独作为业务适用性结论。 |
| KB 业务快照 | `source-references/kb-business-source-snapshots/` | 知识库/Feishu 业务文档快照 | 异常解释、处理流程、SOP、业务限制、人工处理建议 | 原知识库更新后复制新快照或差异审查，再更新业务页与日志。 |
| 人工判断 | 业务页或日志中的待核实说明 | 人工解释或推断 | 字段用途、业务解释、冲突处理 | 必须标记 `pending_verification` 或低置信度，不能写成确定规则。 |

## 快照文件与接口文档对应关系

| 快照文件 | 当前判断 | 对应接口文档 | 接口或场景 | 说明 |
|---|---|---|---|---|
| `source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json` | 确认 | `source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md` | `pms.PlanEventService_queryPlanEventPage`，`ACTION_NAME=standardException`，`eventType=STANDARD_EXCEPTION` | 返回结构中的 `eventType`、`eventCode`、`eventName`、`sgCode`、`exceptionNode`、`exceptionObject`、`vascCode` 等字段与该接口文档的标准异常场景一致。 |
| `source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json` | 确认 | `source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md` | `pms.PlanEventService_queryPlanEventPage`，`ACTION_NAME=valueAddedService`，`eventType=VAS` | 与标准异常共用同一接口，通过场景参数区分；用于增值服务项/原子主数据。 |
| `source-references/exception-vas-data-package/source-snapshots/vasc-master.json` | 确认是多接口合并 | `source-references/interface-documents/pms-vasc-tom-service-query-vasc-page-api.md`; `source-references/interface-documents/pms-vasc-rule-service-query-vasc-rule-page-api.md`; `source-references/interface-documents/oms-outbound-sla-config-service-find-outbound-sla-config-page-api.md` | `pms.VascTomService_queryVascPage` + `pms.VascRuleService_queryVascRulePage` + `oms.OutboundSlaConfigService_findOutboundSlaConfigPage` | 文件结构为每个 VASC 一条 `{ vasc, rules, slaConfigs }`。其中 `vasc` 对应 VASC 基础信息和 `vascAttributeMap`；`rules` 对应 VASC 适用规则；`slaConfigs` 对应 SLA 配置和 `ruleMatchVoMap`。 |
| `source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json` | 已确认可由配置接口重建，且已同步扩充 | `source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md`; `source-references/interface-documents/wh-va-order-basic-info-api.md`; `source-references/interface-documents/wh-va-order-get-vas-list-api.md` | 主来源：`pms.BaseAttrRelService_findBaseAttrRelPage`，按 `instanceCode=<eventCode>` 查询；运行时对照来源：`wh.va.order.basicInfo` / `wh.va.order.getVasList` 的 `vaAtomAttrs` | 2026-06-25 临时接口验证显示，`vas-event-attrs-slim.json` 内 21 个 eventCode 使用 `BaseAttrRelService` 查询后字段编码数量 21/21 完全匹配；进一步对 normalized 中 52 个服务项查询，BaseAttrRel 返回 42 个有属性字段。本轮已将可同步的普通属性字段扩充进正式 slim，当前正式快照共 61 条记录，覆盖 normalized 编排引用服务项 42 / 52。该接口返回 `attrCode`、`attrName`、`showType`、`inputNode`、`isRequired`、`unit`、`fileFormat`、`nodeRelVos` 等字段，可重建普通属性字段快照；但附件字段、模板和上传关系仍未覆盖，不能直接生成完整字段映射。 |
| `source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json` | 确认来自 TOM 详情页，但当前缺少独立接口文档 | 暂无完全匹配的接口参考页；相关但不等价的是 `source-references/interface-documents/pms-vasc-tom-service-query-vasc-page-api.md` | TOM VASC 详情页 `detail_items`，由 `fetch-exception-vasc-detail-items.mjs` 批量抓取 | 该 raw 文件按 VASC 编码存储 `defaultVascAttribute` 和 `detail_items`。`queryVascPage` 只能解释 VASC 基础信息和属性映射，不能解释完整 `detail_items`；后续应补一份 “TOM VASC 详情页 detail_items 接口/页面来源参考”。 |
| `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json` | 确认是派生数据 | 上述多个快照文件共同支撑 | raw `detail_items` + 标准异常快照 + VASC master + 原子主数据 + 部分属性字段快照 | normalized 不是接口原始返回，而是清洗聚合结果；它反向引用了 raw detail 文件，并合并异常、VASC、原子主数据和部分属性字段。 |

补充边界：`source-references/interface-documents/pms-revenue-event-charge-item-service-find-charge-item-page-api.md` 返回收入费用项、计费服务、价格版本和费用配置，可作为后续费用/收入证据来源；它不返回普通配置字段、枚举值或附件规则，不能用于重建 `vas-event-attrs-slim.json`。

## 2026-06-25 接口验证与同步结果

| 数据源 | 实时验证结论 | 建议 |
|---|---|---|
| `plan-event-standard-exception.json` | 旧快照 422 条，实时 422 条；无新增、无删除；2 条字段变更：`B0901E02` 变更 `isNeedCharge`、`updated`，`C04E09` 变更 `requirementCost`、`updated`、`updatedby`。当前知识库未在关系映射或实体页正文中引用这两个编码。 | 已同步正式快照；本次不重建当前入库异常到 VASC 关系映射。 |
| `plan-event-vas.json` | 旧快照 211 条，实时 212 条；新增 `OSF6V1829 审计盘点(测试)`，另有 13 条轻量字段差异。13 条中多数是名称简繁体差异，另有更新时间/更新人差异和 1 条库内服务流程说明差异。 | 新增测试数据不进入正式快照；名称统一使用简体字。此类小差异不单独生成报告、不自动同步主快照；若后续维护对应实体页，再专项审查。 |
| `vas-event-attrs-slim.json` | 当前 slim 可由 `pms.BaseAttrRelService_findBaseAttrRelPage` 重建；normalized 52 个服务项中实时 42 个有普通属性字段。剩余 10 个去掉 `isActive` 过滤后仍为 0，PlanEvent 单查 `attrList` 也为空。 | 已同步扩充正式 slim、normalized、字段覆盖报告和关系映射；仍不得把剩余 10 个解释为“确定无字段”。 |

## 接口来源判断规则

- 如果快照字段与接口文档字段一致，且 `source_refs`、数据源台账或运行说明记录了对应脚本或接口场景，可标为“确认”。
- 如果字段结构一致，但快照文件未记录具体接口 action、订单号、查询参数或导出脚本，只能标为“推定，待补来源记录”。
- 如果当前接口文档只能解释一部分字段，不能解释完整快照结构，应新增独立接口参考页，不能强行挂到相近接口下。
- 多接口合并文件需要记录每个子对象来自哪个接口，例如 `vasc-master.json` 应拆分说明 `vasc`、`rules`、`slaConfigs` 的来源。

## 当前覆盖状态

| 链路 | 当前状态 | 结论 |
|---|---|---|
| 标准异常配置 | 422 条 | 已有静态快照。 |
| 绑定 VASC 的异常 | 36 条 | 已识别。 |
| 入库异常引用的唯一 VASC | 18 个 | 已识别。 |
| VASC 基础配置 | 18 / 18 | 当前入库异常链路所引用 VASC 已齐。 |
| VASC 到增值服务项真实编排 | 18 / 18 | 已由 TOM 详情页 raw 快照补齐。 |
| 编排引用的唯一增值服务项 | 52 个 | 已识别。 |
| 增值服务项主数据 | 52 / 52 | 已齐。 |
| 原子属性字段快照 | 当前正式 slim 对 normalized 编排引用服务项覆盖 42 / 52；slim 快照总记录 61 条 | 已由 BaseAttrRel 扩充普通属性字段证据；剩余 10 个服务项当前接口未覆盖，附件、模板和上传关系仍未齐。 |

## 主要问题

1. 字段级证据不足：`vaAtomFiles`、附件模板、上传关系未形成完整来源；当前已暂缓，不生成确定版 `service-item-to-config-field-mapping.md`。
2. TOM VASC 详情页 `detail_items` 已有 raw 证据，但还没有完全匹配的独立接口说明；后续如继续维护编排刷新链路，需要补详情页来源参考。

## 建议的数据源台账字段

后续可以为每个数据源建立机器可读清单，建议字段如下：

| 字段 | 含义 |
|---|---|
| `source_id` | 稳定来源 id，例如 `tom-vasc-detail-items`、`kb-feishu-inbound-exception-handling`。 |
| `source_type` | `offline_snapshot`、`tom_api_snapshot`、`interface_document`、`kb_snapshot`、`normalized_dataset`、`coverage_report`、`manual_inference`。 |
| `system_or_origin` | 来源系统或资料类型，例如 TOM、PMS、OMS、WH OpenAPI、Feishu KB。 |
| `project_path` | 当前项目内相对路径。 |
| `upstream_key` | 接口 action、Dubbo 方法、Feishu 文档 id、脚本名或 raw 文件名。 |
| `refresh_method` | 复制快照、复跑脚本、接口导出、人工差异审查。 |
| `refresh_frequency` | 按需、每次产品配置变更后、月度、上线前。 |
| `supports_entities` | 可支撑的实体类型，如 `inbound_exception`、`vasc_product`、`value_added_service_item`、`config_field`。 |
| `supports_relationships` | 可支撑的关系，如 `exception_to_vasc_product`、`vasc_product_to_service_item`。 |
| `authority_level` | `primary`、`secondary`、`reference_only`、`legacy`。 |
| `coverage_status` | `complete`、`partial`、`missing`、`unknown`。 |
| `last_verified` | 最近一次核验日期。 |
| `known_gaps` | 当前缺口。 |

## 更新优先级

1. 已补 `source-references/data-source-registry.md`：把当前离线 JSON、TOM raw、normalized、reports、接口文档、KB 快照统一登记。
2. 已将旧 `sources: [...]` 元数据迁移为当前 Schema 可识别的来源字段；`feishu:` id 保留为外部上游 `external_source_note`，不作为项目内 `source_refs`。
3. 已修正 `source-references/exception-vas-data-package/sources/` 中的来源路径说明，当前正式路径统一使用项目内相对路径。
4. 字段级附件、模板和上传关系来源已记录为暂缓；后续需要时再围绕 `wh.va.order.basicInfo`、`wh.va.order.getVasList`、页面运行时响应或底层配置接口取 `vaAtomFiles`。
5. 字段证据补齐后，再生成确定版 `service-item-to-config-field-mapping.md` 和配置字段实体页。

## 维护检查清单

每次新增或刷新数据源时，至少检查：

- 新文件是否位于 `value-add-service-guide/` 内。
- 路径是否为项目内相对路径。
- 是否记录来源类型、上游系统、刷新方式和覆盖范围。
- 是否更新受影响的 normalized、reports 和关系映射。
- 是否检查相关异常、VASC 产品、增值服务项、字段实体页的正反向链接。
- 是否更新 `index.md` 和 `log.md`。
