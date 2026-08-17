# 变更日志

## [2026-06-25] qa-validation-field-source-wording | 抽检修正服务项字段来源口径

- Changed:
  - 更新 4 个已沉淀普通属性字段的服务项页，将字段来源说明统一为 `vas-event-attrs-slim.json` + `pms.BaseAttrRelService_findBaseAttrRelPage`。
  - 为上述服务项页补充 `source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md` 到 `source_refs`。
- Boundary:
  - 本次只修普通属性字段来源说明；附件、模板、上传关系仍保持未定版。

## [2026-06-25] source-path-cleanup | 清理当前来源说明中的旧路径口径

- Changed:
  - 更新 `source-references/exception-vas-data-package/README.md`，改为当前数据证据包口径，并将 frontmatter `source_refs` 指向当前项目内来源规则和覆盖率报告。
  - 更新 `source-references/exception-vas-data-package/sources/README.md`、`sources/data-coverage.md`，把报告路径统一为当前项目内相对路径。
  - 更新 `source-references/data-source-audit-and-update-plan.md`，移除已完成的旧路径待办，保留当前仍需处理的字段附件证据和 TOM 详情页来源缺口。
  - 更新 `source-references/interface-documents/pms-plan-event-service-query-plan-event-page-api.md`，收口为接口结构与调用边界说明。
- Verified:
  - 本轮改动后执行旧路径、`source_refs`、本机绝对路径和 Markdown 格式检查。

## [2026-06-25] source-registry | 建立数据源台账并收口 plan-event-vas 小差异

- Added:
  - `source-references/data-source-registry.md`
- Decision:
  - 剩余 10 个服务项字段证据暂时保留 `missing_field_evidence`，不影响关系映射和业务推荐，但不能生成确定配置字段清单。
  - `plan-event-vas.json` 的测试新增不进入正式快照；简繁体名称、更新时间/更新人等轻量差异不单独生成报告，业务页名称统一使用简体。
  - 附件字段、模板字段和上传关系补证先暂缓，仅记录到数据源台账；后续需要生成确定版字段映射或回答上传要求时再补。
- Removed:
  - 删除过细的 VAS 轻量差异报告，避免报告过多影响阅读。
- Changed:
  - 更新 `source-references/README.md`、`source-references/data-source-audit-and-update-plan.md` 和根 `index.md`，登记数据源台账入口。
  - 将正式来源文件中的旧 `sources: [...]` 元数据迁移为项目内 `source_refs`；KB 快照的 Feishu 上游 id 改为 `external_source_note` 保留。

## [2026-06-25] interface-sync | 同步标准异常快照并扩充普通属性字段快照

- Synced:
  - `source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json`
  - `source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json`
  - `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json`
  - `source-references/exception-vas-data-package/data/reports/data-coverage-2026-06-22.json`
  - `source-references/exception-vas-data-package/data/reports/coverage-summary-2026-06-22.md`
  - `source-references/exception-vas-data-package/data/reports/atom-attr-coverage-2026-06-22.csv`
  - `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
  - `relationship-mappings/service-item-config-field-evidence-coverage.md`
- Result:
  - `plan-event-standard-exception.json` 已同步实时 422 条；本次无新增/删除，只吸收 `B0901E02`、`C04E09` 的字段变更。
  - `vas-event-attrs-slim.json` 从当前编排引用覆盖 12 / 52 扩充到 42 / 52；快照总记录数为 61。
  - normalized 和关系映射中的普通属性字段证据覆盖同步更新为 42 个覆盖、10 个缺失。
- Remaining:
  - 剩余 10 个服务项：`OSF6V1576`、`OSF6V1591`、`OSF6V1626`、`OSF6V1681`、`OSF6V1704`、`OSF6V1804`、`OW01V1562`、`OW01V1563`、`OW01V1572`、`OW01V1703`。
  - 这些服务项去掉 BaseAttrRel 的 `isActive` 过滤后仍无记录，PlanEvent 单查 `attrList` 也为空；只能标记为当前接口未覆盖，不能解释为确定无字段。
- Updated:
  - `source-references/data-source-audit-and-update-plan.md`
  - `source-references/exception-vas-data-package/README.md`
  - `source-references/exception-vas-data-package/sources/README.md`
  - `source-references/exception-vas-data-package/sources/data-coverage.md`
  - `relationship-mappings/README.md`
  - 4 个已创建服务项实体页：`OW01V1562`、`OW01V1563`、`OW01V1572`、`OW01V1703`，字段证据状态同步为 `missing`。
  - 4 个关联 VASC 产品页：`入库商品拍照`、`上架前销毁`、`原单上架`、`新单上架（WINIT创建入库单）`，对应原子编排字段证据状态同步为 `missing_field_evidence`。

## [2026-06-25] interface-verification | 核实 BaseAttrRel 字段来源

- Added:
  - `source-references/interface-documents/pms-base-attr-rel-service-find-base-attr-rel-page-api.md`
  - `source-references/interface-documents/pms-revenue-event-charge-item-service-find-charge-item-page-api.md`
- Verified:
  - `plan-event-standard-exception.json` 实时验证为 422 条，与正式快照数量一致，无新增/删除；仅 `B0901E02`、`C04E09` 两条存在字段变更，且当前关系映射或实体页正文未引用这两个编码。
  - `plan-event-vas.json` 实时验证新增 `OSF6V1829 审计盘点(测试)`，另有 13 条字段变更；暂不自动同步。
  - 临时接口验证目录中调用 `pms.BaseAttrRelService_findBaseAttrRelPage`，按 `instanceCode=<eventCode>` 对照 `vas-event-attrs-slim.json` 内 21 个 eventCode。
  - 结果：21/21 个 eventCode 字段编码完全匹配，确认 `vas-event-attrs-slim.json` 可由 BaseAttrRel 配置接口重建。
  - 进一步按 normalized 中 52 个服务项全量查询，BaseAttrRel 返回 42 个有属性字段；当前正式 slim 覆盖其中 12 个，另有 34 个服务项可补字段证据，正式快照尚未同步。
  - `pms.RevenueEventChargeItemService_findChargeItemPage` 返回收入费用项、计费服务和价格版本，适合作为费用/收入证据，不用于重建普通配置字段快照。
- Changed:
  - 更新 `source-references/interface-documents/README.md`，登记新增接口文档。
  - 更新 `source-references/data-source-audit-and-update-plan.md`，将 `vas-event-attrs-slim.json` 来源从待核实调整为 BaseAttrRel 配置接口可重建，并记录 34 个服务项待确认同步的字段证据差异。
  - 更新 `source-references/exception-vas-data-package/sources/README.md`、`source-priority.md`、`data-coverage.md`、`field-origin-map.md`，同步普通属性字段来源和覆盖率边界。
  - 更新根 `index.md` 的接口文档数量与接口来源入口说明。
- Not changed:
  - 未同步替换正式 `source-snapshots/` JSON；接口实测输出仍保留在已忽略的 `interface-verification-temp/` 中，待用户确认是否同步。

## [2026-06-25] interface-verification | 新建接口验证临时目录

- Added:
  - `interface-verification-temp/README.md`
  - `interface-verification-temp/.gitignore`
  - `interface-verification-temp/raw/.gitkeep`
  - `interface-verification-temp/outputs/.gitkeep`
  - `interface-verification-temp/logs/.gitkeep`
- Purpose:
  - 用于放置接口验证所需 `.env`、临时 raw 响应、差异输出和日志。
  - 临时文件不作为正式业务来源；新数据先输出差异报告，用户确认后再同步到正式来源目录。
- Safety:
  - `.env`、临时响应、输出和日志已加入该目录 `.gitignore`。
- Changed:
  - 更新根 `index.md`，增加接口验证临时目录入口。

## [2026-06-25] source-audit | 检查并规划数据源维护

- Added:
  - `source-references/README.md`
  - `source-references/data-source-audit-and-update-plan.md`
- Verified:
  - 全库 210 个 Markdown 中，199 个有 frontmatter，156 个有非空 `source_refs`。
  - 当前解析到的 `source_refs` 链接均能指向项目内已存在文件。
  - 业务实体页和关系映射可追溯到项目内来源；主要缺口集中在 `source-references/` 证据层自身的来源元数据统一。
- Findings:
  - `source-references/` 内部分文件仍使用旧字段 `sources: [...]`，包括 `local-json`、`tom-snapshot`、`interface-document` 和 `feishu:` 来源 id。
  - 旧数据包说明中仍有迁移前路径，需要后续统一为当前项目内路径或标记为 legacy。
  - 字段级证据仍不完整，暂不能生成确定版 `service-item-to-config-field-mapping.md`。
- Changed:
  - 更新根 `index.md`，增加来源参考总览和数据源审计入口。
  - 更新根索引统计日期和当前业务文件数说明。

## [2026-06-25] source-audit | 追溯快照文件对应接口文档

- Reviewed:
  - `source-references/exception-vas-data-package/source-snapshots/plan-event-standard-exception.json`
  - `source-references/exception-vas-data-package/source-snapshots/plan-event-vas.json`
  - `source-references/exception-vas-data-package/source-snapshots/vasc-master.json`
  - `source-references/exception-vas-data-package/source-snapshots/vas-event-attrs-slim.json`
  - `source-references/exception-vas-data-package/data/raw/exception-vasc-detail-items-2026-06-22T15-28-36-068Z.json`
  - `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json`
- Findings:
  - `plan-event-standard-exception.json` 和 `plan-event-vas.json` 均来自 `pms.PlanEventService_queryPlanEventPage`，分别对应 `STANDARD_EXCEPTION` 和 `VAS` 场景。
  - `vasc-master.json` 是多接口合并文件，结构为 `{ vasc, rules, slaConfigs }`，分别对应 VASC 分页、VASC 规则和 SLA 配置接口。
  - `vas-event-attrs-slim.json` 字段形态与 `wh.va.order.basicInfo` / `wh.va.order.getVasList` 的 `vaAtomAttrs` 一致，但当前缺少具体导出接口、订单号或脚本记录，只能标为待核实的部分字段证据。
  - TOM raw `exception-vasc-detail-items-*.json` 来自 VASC 详情页 `detail_items` 抓取，当前没有完全匹配的接口参考页；`pms.VascTomService_queryVascPage` 只能解释基础列表和属性映射，不能解释完整详情编排。
- Changed:
  - 更新 `source-references/data-source-audit-and-update-plan.md`，增加“快照文件与接口文档对应关系”和接口来源判断规则。

## [2026-06-22] initialize | 初始化根目录文件

- 新增 `value-add-service-guide/` 根目录文件规划。
- 创建以下文件：
  - `AGENTS.md`
  - `README.md`
  - `SCHEMA.md`
  - `index.md`
  - `log.md`
- 明确本知识库面向 AI 检索和回答生成。
- 明确本知识库采用多入口实体关系库模型。
- 明确所有目录名和文件名使用英文、小写、kebab-case，并尽量具体。
- 业务目录规划暂缓，待根文件内容确认后继续。

## [2026-06-22] schema-draft | 初版实体与关系 Schema

- 定义初始实体类型：
  - `overview`
  - `inbound_exception`
  - `vasc_product`
  - `value_added_service_item`
  - `config_field`
  - `relationship_mapping`
  - `answer_playbook`
  - `glossary`
  - `source_reference`
- 定义初始关系模型：
  - 异常到 VASC 产品。
  - VASC 产品到增值服务项。
  - 增值服务项到配置字段。
  - 配置字段到枚举和校验规则。
  - 异常到客户动作。
- 暂定关系映射表作为后续兼容性、适用性和选择逻辑的权威来源。

## [2026-06-22] language-adjustment | 根文件内容改为中文

- 根据需求，将根文件正文从英文改为中文。
- 文件名仍保持英文标准命名，便于工具、脚本和 AI 检索。
- 保留 frontmatter 枚举、实体类型、标签和关系类型的英文值，便于后续机器读取。

## [2026-06-22] terminology-refine | 根据现有增值资料修正产品与服务项定义

- 阅读并吸收现有知识库中的关键资料：
  - `source-references/kb-business-source-snapshots/vas-product-details.md`
  - `source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md`
  - `source-references/kb-business-source-snapshots/parcel-barcode-exception-subsidy-putaway.md`
  - 入库增值下单操作手册曾作为早期参考，但当前未纳入项目内来源快照；后续若继续使用，必须先复制到 `source-references/`。
- 明确术语：
  - VASC 产品 = 增值服务产品，是一个或多个增值服务项组成的场景级解决方案。
  - 增值服务项 = 增值原子 = 增值事件，是仓库不可再拆分的动作组，也是收入、成本和配置字段的主要承载点。
- 将实体类型从 `vasc_atom` 调整为 `value_added_service_item`，避免把服务项误称为 VASC 原子。
- 后续 Schema 和目录规划应围绕“异常 -> 客户需求 -> VASC 产品 -> 增值服务项 -> 配置字段”展开，但查询入口不固定。

## [2026-06-22] interface-reference | 增加接口来源参考类型

- 评估旧项目中的 `value-add-service-guide/interface_document` 接口文档，并复制到当前项目内。
- 结论：接口文档有助于补充系统字段名、编码字段、查询链路、响应结构和未来自动化校验来源。
- 在 `SCHEMA.md` 增加 `interface_reference` 实体类型。
- 明确接口文档不直接作为业务适用性结论；异常与 VASC 是否适用仍以关系映射表和实体页为准。
- 复制 11 份接口文档到 `source-references/interface-documents/`，统一为英文小写 kebab-case 文件名，并补充 frontmatter。

## [2026-06-23] dataset-reference | 纳入异常与 VASC 数据证据包

- 评估旧项目中的 `value-add-service-guide/exception-vas` 数据和记录，并复制到当前项目内。
- 结论：该目录可支撑“异常 -> VASC 产品 -> 增值服务项/原子”的主链路，是后续生成关系映射表和实体页的重要来源。
- 新增 `dataset_reference` 实体类型，用于数据证据包、原始快照、规范化数据和覆盖率报告。
- 复制数据包到 `source-references/exception-vas-data-package/`：
  - `data/raw/`
  - `data/normalized/`
  - `data/reports/`
  - `sources/`
  - `legacy-root-files/`
- 明确 `data/normalized/` 可用于生成映射，`data/raw/` 作为证据保留，`data/reports/` 用于标注覆盖率和缺口。
- 明确字段、附件、模板和上传关系仍需 `vaAtomAttrs`、`vaAtomFiles` 或等价来源支撑，不能根据空字段或未覆盖记录推断为“不需要配置”。

## [2026-06-23] path-portability | 统一项目内相对路径

- 移除知识库中的本机绝对路径引用，避免迁移 `value-add-service-guide/` 后失效。
- 将接口文档 `source_refs` 改为 `source-references/interface-documents/` 下的项目内相对路径。
- 将异常与 VASC 数据包中的来源快照复制到 `source-references/exception-vas-data-package/source-snapshots/`。
- 将覆盖率报告和规范化数据中的来源路径改为项目内相对路径。
- 明确外部 TOM 运行环境不记录本机路径，可沉淀输出必须复制进当前项目目录。

## [2026-06-23] schema-refine | 收紧为入库异常增值主题

- 将 `SCHEMA.md` 从通用增值服务知识库收紧为“入库 -> 异常 -> 增值”专题知识库。
- 新增主题链路：
  - `inbound_process -> inbound_exception -> customer_requirement / customer_action -> vasc_product -> value_added_service_item -> config_field`
- 新增实体类型：
  - `inbound_process`
  - `customer_action`
- 新增收录口径，区分核心收录、关联收录和不作为核心收录的内容。
- 扩展 frontmatter 可选字段：
  - 异常节点、是否需要客户处理。
  - 客户处理动作编码、动作类型、客户需提供的信息。
  - VASC 启用状态、处理方式。
  - 增值服务项在 VASC 中是否必选、互斥组。
  - 配置字段输入节点和字段证据状态。
- 新增入库异常增值总流程页、客户处理动作页模板。
- 将 `source_refs` 口径收紧为项目内相对路径，避免后续新增文件破坏迁移能力。

## [2026-06-23] maintenance-closure | 增加 AI 维护闭环规则

- 在 `AGENTS.md` 增加“AI 维护闭环规则”，明确 AI 不得只完成单文件修改后结束任务。
- 在 `SCHEMA.md` 增加变更影响范围、依赖关系、维护要求和自动化/手工更新规则。
- 在 `README.md` 增加 AI 维护闭环的项目维护原则。
- 明确新增、修改、移动、删除文件后，AI 必须同步检查：
  - 根索引和目录索引。
  - 关系映射。
  - 相关实体页的正向/反向链接。
  - 术语和标签。
  - 来源说明和证据状态。
  - 变更日志。
- Open issues:
  - 当前尚未建立自动索引脚本；在脚本建立前，AI 需要按闭环规则手动维护 `index.md` 和目录级索引。

## [2026-06-23] directory-skeleton | 建立业务目录骨架

- 按业务主体建立第一版业务目录：
  - `inbound-exception-value-added-process/`
  - `inbound-exceptions/`
  - `vasc-products/`
  - `value-added-service-items/`
  - `relationship-mappings/`
  - `glossary/`
- 参考原知识库的目录规范，为每个业务目录和二级分类目录增加 `README.md`。
- 根据 normalized 数据初步建立异常分类、VASC 产品分类和增值服务项分类。
- 在 `AGENTS.md`、`SCHEMA.md`、`README.md` 中补充“每个业务目录必须包含 README.md”的规则。
- 更新根 `index.md`，纳入新建业务目录导航。
- Open issues:
  - 当前仅建立目录骨架和目录 README，尚未生成实体页和关系映射文件。
  - 业务目录分类需在生成第一批实体清单后继续校正。

## [2026-06-23] relationship-mapping | 基于 normalized 数据生成第一批关系映射

- 基于 `source-references/exception-vas-data-package/data/normalized/exception-vasc-orchestration-2026-06-22.json` 生成：
  - `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`
  - `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
  - `relationship-mappings/service-item-config-field-evidence-coverage.md`
- 关系映射覆盖：
  - 18 个被入库异常链路引用的 VASC 产品。
  - 35 个唯一异常编码。
  - 168 条去重后的异常到 VASC 关系。
  - 64 条 VASC 到增值服务项编排行。
  - 52 个唯一增值服务项。
- 字段证据覆盖：
  - 12 个增值服务项有部分字段证据。
  - 40 个增值服务项当前缺少字段证据。
- 未生成 `inbound-exception-customer-action-to-vasc-product-mapping.md`：
  - 原因：normalized 数据未提供独立客户处理动作字段。
- 未生成确定版 `service-item-to-config-field-mapping.md`：
  - 原因：当前来源不足以支撑具体字段、附件、模板和上传要求。
- 同步更新：
  - `relationship-mappings/README.md`
  - `index.md`
  - `log.md`

## [2026-06-23] normalized-sync | 增加 normalized 到关系映射同步机制

- 明确 `source-references/exception-vas-data-package/data/normalized/` 是当前关系映射的上游数据。
- 在 `AGENTS.md` 增加 normalized 数据同步规则：
  - normalized JSON 新增、替换、重命名或内容变更时，必须触发关系映射重建或差异审查。
- 在 `SCHEMA.md` 增加 normalized 到关系映射的依赖表。
- 在 `source-references/exception-vas-data-package/README.md` 增加 normalized 同步机制。
- 在 `relationship-mappings/README.md` 增加上游同步机制。
- 明确当前 normalized 文件派生以下映射：
  - `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`
  - `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`
  - `relationship-mappings/service-item-config-field-evidence-coverage.md`
- 明确字段级证据未补齐前，不得因 normalized 更新直接生成确定版 `service-item-to-config-field-mapping.md`。

## [2026-06-23] mapping-check | 检查关系映射目录

- 检查 `relationship-mappings/` 下的映射文件与 normalized 数据的一致性。
- Verified:
  - `inbound-exception-to-vasc-product-mapping.md`：168 条数据行，与 normalized 去重后的异常到 VASC 关系一致。
  - `vasc-product-to-service-item-orchestration-mapping.md`：64 条数据行，与 normalized 中的 VASC 原子编排行一致。
  - `service-item-config-field-evidence-coverage.md`：52 条数据行，与 normalized 中唯一增值服务项数量一致。
  - 三张映射表列数一致，无表格错列。
  - 映射文件中的来源路径均为项目内相对路径，且来源文件存在。
- Changed:
  - 补齐 `relationship-mappings/README.md` 的 `source_refs`，增加覆盖率报告来源。

## [2026-06-23] process-docs | 建立入库异常与增值流程主干

- 新增 KB 业务知识来源快照目录：
  - `source-references/kb-business-source-snapshots/README.md`
  - `source-references/kb-business-source-snapshots/inbound-exception-handling.md`
  - `source-references/kb-business-source-snapshots/vas-product-details.md`
  - `source-references/kb-business-source-snapshots/vas-exception-solution-catalog.md`
  - `source-references/kb-business-source-snapshots/vas-exception-handling.md`
  - `source-references/kb-business-source-snapshots/customer-putaway-exception-sop.md`
  - `source-references/kb-business-source-snapshots/winit-unit-barcode.md`
  - `source-references/kb-business-source-snapshots/void-standard-inbound-order-sop.md`
  - `source-references/kb-business-source-snapshots/void-inbound-sop.md`
  - `source-references/kb-business-source-snapshots/parcel-barcode-exception-subsidy-putaway.md`
- 新增流程主干文件：
  - `inbound-exception-value-added-process/inbound-exception-to-value-added-overall-flow.md`
  - `inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md`
  - `inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md`
- 重写 `inbound-exception-value-added-process/README.md`，补齐当前文件、后续计划文件和维护规则。
- 更新根 `index.md`：
  - 业务文件数更新为 3。
  - 增加流程主干文件入口。
  - 增加 `source-references/kb-business-source-snapshots/` 来源入口。
- 证据边界：
  - 流程文档结合 KB 业务资料、normalized 数据和既有关系映射生成。
  - 未生成客户动作到 VASC 映射；该映射需后续解析 `vas-exception-solution-catalog.md` 并处理“关闭入口”“不推荐”“实际未产生异常”等备注。
  - 未生成字段配置详情；字段级证据仍需 `vaAtomAttrs`、`vaAtomFiles` 或等价来源补齐。

## [2026-06-23] source-boundary | 限制正式来源只引用项目内文件

- Changed:
  - 在 `AGENTS.md`、`README.md`、`SCHEMA.md` 增加来源标记边界。
  - 明确 `value-add-service-guide/` 外的资料只能阅读参考，不写入 `source_refs`、索引、关系映射来源或实体页来源。
  - 若目录外资料需要成为正式依据，必须先复制、摘要或规范化到 `value-add-service-guide/` 内，再使用项目内相对路径引用。
- Reason:
  - 后续可能只迁移 `value-add-service-guide/` 目录；知识库必须能脱离原工作区继续检索和维护。

## [2026-06-23] process-docs-multibranch | 重写入库异常增值多分支流程

- Changed:
  - 重写 `inbound-exception-value-added-process/inbound-exception-to-value-added-overall-flow.md`，从线性流程改为多入口、多分支、多对象决策模型。
  - 重写 `inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md`，改为仓内物理状态机和异常暂存/调查/上架/销毁/自提分支。
  - 重写 `inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md`，补充入库单状态、异常单入口、非异常入口、VASC 选择约束、字段证据边界。
  - 新增 `inbound-exception-value-added-process/inbound-business-branch-exception-trigger-map.md`，沉淀入库产品/业务节点到异常触发的分支地图。
  - 新增 `inbound-exception-value-added-process/customer-action-decision-flow.md`，沉淀客户处理意图到 VASC/服务项选择的决策流程。
- Added:
  - 补充 26 份 KB 业务文档快照到 `source-references/kb-business-source-snapshots/`，当前该目录共 35 份业务快照。
- Updated:
  - 更新 `inbound-exception-value-added-process/README.md`，纳入 5 个当前流程文件。
  - 更新 `source-references/kb-business-source-snapshots/README.md`，按用途分组列出当前 35 份来源快照。
  - 更新根 `index.md` 的流程入口、来源快照入口和统计。
- Evidence boundary:
  - 本次流程文件结合项目内来源快照和关系映射生成。
  - 目录外 `kb/` 仅作为阅读参考；正式 `source_refs` 只引用 `value-add-service-guide/` 内文件。
  - 仍未生成确定版客户动作到 VASC 映射和字段配置映射。

## [2026-06-23] inbound-exception-entity-batch-1 | 生成第一批条码类异常实体页

- Added:
  - `inbound-exceptions/product-barcode-exceptions/exception-b01e1315-product-barcode-abnormal-customer-action-required.md`
  - `inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md`
  - `inbound-exceptions/package-barcode-exceptions/exception-b0102e21-package-barcode-abnormal-customer-action-required.md`
- Updated:
  - `inbound-exceptions/product-barcode-exceptions/README.md`
  - `inbound-exceptions/package-barcode-exceptions/README.md`
  - `inbound-exceptions/README.md`
  - `index.md`
- Evidence:
  - 复用 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md` 和 `relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`。
  - 复用项目内 KB 快照：`inbound-exception-handling.md`、`vas-exception-solution-catalog.md`、`vas-exception-handling.md`、`product-barcode-third-party-putaway.md`、`parcel-barcode-exception-subsidy-putaway.md`、`direct-ship-parcel-sop.md`、`no-box-list-forecast-faq.md`。
- Verified:
  - 每个新增异常页生成后单独校验 `source_refs` 和 Markdown 链接。
  - 未新增目录外正式来源路径。
- Open issues:
  - 本批异常页只提供 VASC 索引，不展开 VASC 产品实体详情。
  - 字段、模板、附件和费用结论待后续服务项页与字段证据补齐。

## [2026-06-23] inbound-exception-backlog | 标注未完成异常实体页待办

- Added:
  - `inbound-exceptions/pending-inbound-exception-entity-backlog.md`
- Purpose:
  - 记录 normalized/关系映射中已经识别但尚未生成实体页的异常。
  - 已完成异常页和待生成异常页分表维护，避免暂停异常页生成后丢失上下文。
- Maintenance:
  - 每完成一个异常实体页，必须同步更新该清单。
  - 清单内异常全部完成，并同步目录 README、根索引和日志后，删除该清单。

## [2026-06-23] vasc-product-batch-1 | 生成第一批 4 个 VASC 产品页

- Added:
  - `vasc-products/putaway-services/vasc-product-original-order-putaway.md`
  - `vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md`
  - `vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md`
  - `vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md`
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/putaway-services/README.md`
  - `vasc-products/destruction-services/README.md`
  - `inbound-exceptions/README.md`
  - `index.md`
- Evidence:
  - 复用 `relationship-mappings/inbound-exception-to-vasc-product-mapping.md`、`relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md`、`relationship-mappings/service-item-config-field-evidence-coverage.md`。
  - 复用项目内 normalized 数据和 KB 业务快照。
- Boundary:
  - 本批产品页只沉淀 VASC 产品、异常索引、候选原子编排和原子动态可选性。
  - 原子字段、模板、附件、枚举、上传内容和费用待第 4 部分 `value-added-service-items/` 补齐。
  - 候选原子不等于固定推荐；AI 必须按异常对象、客户处理意图、业务 SOP、互斥组和证据状态动态判断。
- Verified:
  - 每个新增 VASC 产品页生成后单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] flow-state-and-outcome-backfill | 补充异常发生时状态与增值后流向

- Updated:
  - `inbound-exception-value-added-process/physical-flow-inbound-exception-value-added.md`
  - `inbound-exception-value-added-process/information-flow-inbound-exception-value-added.md`
- Added to process docs:
  - 异常发生时的实物流/信息流状态。
  - 使用 VASC 后的实物流/信息流去向。
  - 终止、部分到仓、已上架后后到、拍照/盘点/调查等中间态和终态边界。
- Backfilled 3 completed exception pages:
  - `inbound-exceptions/product-barcode-exceptions/exception-b01e1315-product-barcode-abnormal-customer-action-required.md`
  - `inbound-exceptions/product-barcode-exceptions/exception-b01e1316-product-has-barcode-but-system-cannot-recognize.md`
  - `inbound-exceptions/package-barcode-exceptions/exception-b0102e21-package-barcode-abnormal-customer-action-required.md`
- Backfilled 4 completed VASC product pages:
  - `vasc-products/putaway-services/vasc-product-original-order-putaway.md`
  - `vasc-products/putaway-services/vasc-product-new-order-putaway-customer-created-inbound-order.md`
  - `vasc-products/putaway-services/vasc-product-new-order-putaway-winit-created-inbound-order.md`
  - `vasc-products/destruction-services/vasc-product-pre-putaway-destruction.md`
- Updated directory rules:
  - `inbound-exception-value-added-process/README.md`
  - `inbound-exceptions/README.md`
  - `vasc-products/README.md`
- Evidence boundary:
  - 仅使用 `value-add-service-guide/` 内项目相对路径作为正式来源。
  - 目录外 `kb/` 只作为阅读参考，不写入正式来源。
- Verified:
  - 小范围回填文件均通过 `source_refs`、Markdown 相对链接和本机绝对路径检查。
  - 未新增冗余关系映射或状态模型文件。

## [2026-06-23] value-added-service-item-batch-1 | 生成第一批 4 个增值原子配置页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-package-barcode-labeling.md`
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-new-product-barcode-labeling.md`
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-original-product-barcode-labeling.md`
  - `value-added-service-items/packaging-items/value-added-service-item-inbound-replace-product-packaging.md`
- Covered service items:
  - `OW01V1560` 入库-补贴包裹条码。
  - `OW01V1559` 入库-更换新商品条码。
  - `OW01V1558` 入库-补贴原商品条码。
  - `OW01V1561` 入库-更换商品包装。
- Field evidence:
  - 4 个服务项均有 `covered_by_vas_event_attrs_slim` 部分字段证据。
  - 字段表只沉淀 `attrSpec` 已覆盖字段；上传文件、模板列、附件格式只按业务快照标为部分证据。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `value-added-service-items/packaging-items/README.md`
  - `index.md`
- Boundary:
  - 本批不拆分独立 `config_field` 页面；待字段复用关系和完整字段证据稳定后再抽取。
  - 不生成费用金额、国家仓库差异、模板列和附件格式的确定结论。
- Verified:
  - 每个新增服务项页生成后单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1572 | 生成第三方商品条码关联原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-third-party-product-barcode-association.md`
- Covered service item:
  - `OW01V1572` 入库-第三方商品条码关联。
- Evidence:
  - 复用 normalized 数据、原子主数据、字段覆盖报告、接口结构文档和 `product-barcode-third-party-putaway.md` 业务 SOP。
  - 业务来源明确本原子核心场景为 `B01E1316` 商品有条码但系统无法识别。
- Boundary:
  - 覆盖映射显示该原子为 `partial_field_evidence`，但 normalized 当前未展开可定版 `attrSpec` 字段。
  - 本页只记录客户需补充第三方商品条码、SKU No.、条码类型等业务资料线索，不生成确定字段清单、模板列或附件格式。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1563 | 生成上架前商品销毁原子页

- Added:
  - `value-added-service-items/destruction-items/value-added-service-item-pre-putaway-product-destruction.md`
- Covered service item:
  - `OW01V1563` 上架前商品销毁。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档和入库异常销毁 SOP 快照。
  - 业务来源明确本原子适用于异常对象为商品的上架前销毁；异常对象为包裹时应选择包裹销毁原子。
- Boundary:
  - 覆盖映射显示该原子为 `partial_field_evidence`，但 normalized 当前未展开可定版 `attrSpec` 字段。
  - 本页不生成确定字段清单、销毁证明、附件格式、特殊品类或国家仓库差异结论。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/destruction-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1703 | 生成上架前包裹销毁原子页

- Added:
  - `value-added-service-items/destruction-items/value-added-service-item-pre-putaway-package-destruction.md`
- Covered service item:
  - `OW01V1703` 上架前包裹销毁。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档和入库异常销毁 SOP 快照。
  - 主数据明确本原子适用于异常包裹到仓后上架前销毁，且无法提供销毁证明。
- Boundary:
  - 覆盖映射显示该原子为 `partial_field_evidence`，但 `vas-event-attrs-slim` 和 normalized 当前未展开可定版字段。
  - 本页不生成确定字段清单、具体价格金额、附件格式、特殊品类或国家仓库差异结论。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/destruction-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1708 | 生成直接上架原子页

- Added:
  - `value-added-service-items/putaway-items/value-added-service-item-direct-putaway.md`
- Covered service item:
  - `OW01V1708` 直接上架。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、客户处理意图流程和异常解决方案目录。
  - 明确本原子同时属于 `原单上架（直接上架）` 与 `新单上架（直接上架）`，字段相同但入库单号的业务含义随所属 VASC 变化。
- Fields:
  - `SHELVE_PRODUCT_GRADE` 上架的商品等级，可选，枚举为良品/不良品。
  - `VAS_ATTR_REL_WRN` 入库单号，必填。
- Boundary:
  - 本页不生成附件、模板、图片或其他隐藏字段。
  - 直接上架不等于补贴包裹条码、补/换商品条码、包装处理或第三方条码关联。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/putaway-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1736 | 生成入库-覆盖包裹标签原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-cover-package-label.md`
- Covered service item:
  - `OW01V1736` 入库-覆盖包裹标签。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档和异常解决方案目录。
  - 明确本原子为包裹级覆盖标签动作，不等同于补贴包裹条码。
- Fields:
  - `CLEAR_LABEL_TYPE` 清除的标签类型，必填。
  - `COVER_LABEL_TYPE` 覆盖的标签类型，必填。
  - `CLEAR_LABEL_SAMPLE_IMAGE` 上传清除标签示例图，必填附件。
  - `COVER_LABEL_IMAGE` 上传覆盖标签图片，必填附件。
  - `COVER_LABEL_SIZE` 覆盖的标签尺寸规格，必填。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1825 | 生成入库-补贴原商品条码（带示例图）原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-original-product-barcode-labeling-with-sample-image.md`
- Covered service item:
  - `OW01V1825` 入库-补贴原商品条码（带示例图）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档和原有 `OW01V1558` 页面。
  - 明确本原子是不含无条码的商品级原单上架贴标场景，并有必填示例图片。
- Fields:
  - `SHELVE_PRODUCT_GRADE` 上架的商品等级，可选。
  - `LABEL_SIZE` 尺寸规格，必填。
  - `LABEL_TYPE` 标签类型，必填。
  - `VAS_ATTR_REL_SP` 示例图片，必填附件。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1573 | 生成入库-商品其他标签（非商品条码）原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-inbound-product-other-label-non-barcode.md`
- Covered service item:
  - `OW01V1573` 入库-商品其他标签（非商品条码）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、原单上架产品页和异常解决方案目录。
  - 明确本原子用于商品级非商品条码标签，不处理商品条码、单品条码、第三方商品条码或包裹条码。
- Fields:
  - `LABEL_SIZE` 尺寸规格，必填。
  - `ALL_GOODS_SAME_LABEL` 标签文件是否全部相同，必填，当前仅展开 `Y`。
  - `FILE_OPERATION_POSITION` 文件操作位置，必填，当前仅展开贴标。
- Boundary:
  - 当前 `attrSpec` 未展开附件字段，不能定版标签文件上传格式或模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1562 | 生成入库-商品开箱拍照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-product-unboxing-photo.md`
- Covered service item:
  - `OW01V1562` 入库-商品开箱拍照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、入库拍照业务快照和异常解决方案目录。
  - 明确该原子为商品级中间辨识动作，拍照后仍需客户决定后续处理。
- Boundary:
  - `vas-event-attrs-slim` 和 normalized 当前未展开字段，因此不生成确定字段清单。
  - 关系映射中 `入库商品拍照` 产品为 `inactive`，推荐时必须核当前系统入口或转非标拍照。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1594 | 生成上架前自提（无需WINIT打托）原子页

- Added:
  - `value-added-service-items/self-pickup-items/value-added-service-item-pre-putaway-self-pickup-without-winit-palletizing.md`
- Covered service item:
  - `OW01V1594` 上架前自提（无需WINIT打托）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档和上架前自提 SOP。
  - 明确本原子适用于异常货物按包裹自提，不需要 Winit 打托。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、面单上传字段、预约字段或模板格式。
  - SOP 中的快递面单上传只作为业务操作提示，不作为字段级证据。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/self-pickup-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1604 | 生成上架前自提（需WINIT打托）原子页

- Added:
  - `value-added-service-items/self-pickup-items/value-added-service-item-pre-putaway-self-pickup-with-winit-palletizing.md`
- Covered service item:
  - `OW01V1604` 上架前自提（需WINIT打托）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、无需打托自提页和上架前自提 SOP。
  - 明确本原子适用于异常货物需 Winit 打托后由客户货代提走。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、打托参数、面单上传字段、预约字段或模板格式。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/self-pickup-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1622 | 生成入库-提供无箱单预报单上架原子页

- Added:
  - `value-added-service-items/putaway-items/value-added-service-item-inbound-no-box-list-forecast-putaway.md`
- Covered service item:
  - `OW01V1622` 入库-提供无箱单预报单上架。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、无箱单预报 FAQ 和异常解决方案目录。
  - 明确本原子用于无箱单识别标识丢失、客户提供原始无箱单信息后上架。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、预报单字段、附件格式或模板列。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/putaway-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1654 | 生成包裹串仓异常调拨原子页

- Added:
  - `value-added-service-items/transfer-and-ownership-items/value-added-service-item-inbound-cross-warehouse-package-transfer.md`
- Covered service item:
  - `OW01V1654` 包裹串仓异常调拨。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档和异常解决方案目录。
  - 明确仅支持 `DE/DEBR2`、`USWC/USWC2` 仓群内调拨，不能泛化任意跨仓。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、调拨模板、附件格式或审批字段。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/transfer-and-ownership-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1602 | 生成入库其他服务需求原子页

- Added:
  - `value-added-service-items/other-service-demand-items/value-added-service-item-inbound-other-service-demand.md`
- Covered service item:
  - `OW01V1602` 入库其他服务需求。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、非标流程和异常解决方案目录。
  - 明确本原子是入库非标兜底入口，需先排除标准 VASC/原子。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、SOP 模板、报价字段、附件格式或审批字段。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/other-service-demand-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1674 | 生成入库-异常包裹开箱拍照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-exception-package-unboxing-photo.md`
- Covered service item:
  - `OW01V1674` 入库-异常包裹开箱拍照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、异常解决方案目录和入库异常拍照增值 SOP。
  - 明确本原子是包裹级开箱拍照，用于客户需要对异常包裹指定位置拍照后再判断后续处理方向。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、照片数量、拍照位置字段、附件字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1610 | 生成入库-单品指定位置开箱拍照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-single-item-designated-position-unboxing-photo.md`
- Covered service item:
  - `OW01V1610` 入库-单品指定位置开箱拍照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、异常解决方案目录和入库异常拍照增值 SOP。
  - 明确本原子是商品/单品级指定位置开箱拍照，用于客户需要仓库按指定位置拍照并反馈辨识结果。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、照片数量、指定位置字段、附件字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1599 | 生成提供海外仓监控视频-少包裹调查原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md`
- Covered service item:
  - `OW01V1599` 提供海外仓监控视频-少包裹调查。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、监控视频服务快照和异常解决方案目录。
  - 明确整柜到仓、散货到仓、快递当面交付和快递整柜 drop 到仓的可处理边界。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、POD 附件字段、快递单字段、视频时间段字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-ow01v1600 | 生成提供海外仓监控视频-少单品调查原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-single-item-investigation.md`
- Covered service item:
  - `OW01V1600` 提供海外仓监控视频-少单品调查。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、接口结构文档、监控视频服务快照和异常解决方案目录。
  - 明确 B/C 包裹、A 包上架数量与验货数量一致、A 包上架数量与验货数量不一致三类判断分支。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、入库单号字段、包裹号字段、数量比对字段、视频时间段字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-inbound-monitoring-video-missing-parcel-investigation.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1566 | 生成库内-更换商品包装原子页

- Added:
  - `value-added-service-items/packaging-items/value-added-service-item-in-warehouse-replace-product-packaging.md`
- Covered service item:
  - `OSF6V1566` 库内-更换商品包装。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射、异常解决方案目录和增值产品说明。
  - 明确本原子属于 `OSF632` 库内增值，不等同 `OW01` 入库-更换商品包装。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、包材枚举、SKU 注册字段、附件字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/packaging-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1565 | 生成库内-更换新商品条码原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-in-warehouse-new-product-barcode-labeling.md`
- Covered service item:
  - `OSF6V1565` 库内-更换新商品条码。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射、异常解决方案目录和增值产品说明。
  - 明确本原子适用于库内商品换新 SKU 标签，不等同 `OW01` 入库-更换新商品条码。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、标签文件格式、新 SKU 字段、第三方条码字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1564 | 生成库内-补贴原商品条码原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-in-warehouse-original-product-barcode-labeling.md`
- Covered service item:
  - `OSF6V1564` 库内-补贴原商品条码。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射、异常解决方案目录和增值产品说明。
  - 明确本原子用于库内商品补贴原商品标签，不等同库内更换新商品条码或 `OW01` 入库补贴原商品条码。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、标签文件格式、第三方条码字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1681 | 生成错装商品直接上架原子页

- Added:
  - `value-added-service-items/putaway-items/value-added-service-item-in-warehouse-mispacked-product-direct-putaway.md`
- Covered service item:
  - `OSF6V1681` 错装商品直接上架。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 主数据定义和流程为空，因此文档标记 `confidence: low`，只沉淀“包裹内商品错装，客户按实物条码直接上架”的证据边界。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、上架目标字段、良品/不良品规则或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/putaway-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1574 | 生成库内-商品其他标签（非商品条码）原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-in-warehouse-product-other-label-non-barcode.md`
- Covered service item:
  - `OSF6V1574` 库内-商品其他标签（非商品条码）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射、异常解决方案目录和增值产品说明。
  - 明确本原子只用于库内非商品条码标签，不替代商品条码、SKU 标签或第三方商品条码关联。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、标签文件格式、贴标位置字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1591 | 生成拍照暂存后上架原子页

- Added:
  - `value-added-service-items/putaway-items/value-added-service-item-in-warehouse-putaway-after-photo-temporary-storage.md`
- Covered service item:
  - `OSF6V1591` 拍照暂存后上架。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子是库内拍照服务完成后的上架动作，不是拍照动作本身。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、拍照单关联字段、暂存辨识码字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/putaway-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1576 | 生成库内-商品拆分原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-product-splitting.md`
- Covered service item:
  - `OSF6V1576` 库内-商品拆分。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确流程为拆分单品为多个 SKU、使用新 SKU 上架、原商品做 `L007` 盘亏。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、拆分模板、新 SKU 字段、L007 字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1804 | 生成库内-商品组合原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-product-combination.md`
- Covered service item:
  - `OSF6V1804` 库内-商品组合。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子用于多个 SKU 组合为 1 个 SKU，并记录箱/套产品需同步库存调整单的边界。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、组合模板、新 SKU 字段、库存调整单字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1569 | 生成库内-商品外观拍照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-appearance-photo.md`
- Covered service item:
  - `OSF6V1569` 库内-商品外观拍照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射、异常解决方案目录和增值产品说明。
  - 明确本原子不拆销售包装/物流包装，提供正面、侧面、背面照片并按原 SKU 上架。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、SKU 字段、照片角度字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1570 | 生成库内-商品开箱拍照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-unboxing-photo.md`
- Covered service item:
  - `OSF6V1570` 库内-商品开箱拍照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射、异常解决方案目录和增值产品说明。
  - 明确本原子拆开外包装和销售包装，并记录塑封薄膜/亚克力板等拆后无法复原时不能继续操作。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、SKU 字段、数量字段、照片字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1643 | 生成库内-清除商品标签原子页

- Added:
  - `value-added-service-items/labeling-items/value-added-service-item-in-warehouse-clear-product-label.md`
- Covered service item:
  - `OSF6V1643` 库内-清除商品标签。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子仅支持根据客户示例图片清除指定标签，不扩展清除方式或工具要求。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、示例图片字段、标签位置字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/labeling-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1596 | 生成单品拆分后上架（拆分为一个SKU）原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-one-sku.md`
- Covered service item:
  - `OSF6V1596` 单品拆分后上架（拆分为一个SKU）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确流程为拆分为同一个 SKU、使用新入库单上架、原商品做 `L007` 盘亏。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、新入库单字段、拆分模板、标签文件或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1595 | 生成单品指定位置开箱拍照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-single-item-designated-position-unboxing-photo.md`
- Covered service item:
  - `OSF6V1595` 单品指定位置开箱拍照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子是库内非标指定位置开箱拍照，不等同入库 `OW01V1610`。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、指定位置字段、示例图字段、照片数量字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1627 | 生成单品辨识（不开箱）原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-identification-without-unboxing.md`
- Covered service item:
  - `OSF6V1627` 单品辨识（不开箱）。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子不拆单品外包装，按客户辨识方法反馈数量/标签内容等差异。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、辨识方法字段、数量字段、标签字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1650 | 生成辨识单品配件后更换原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-replace-identified-single-item-accessory.md`
- Covered service item:
  - `OSF6V1650` 辨识单品配件后更换。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子仅支持辨识单品配件后按 SOP 更换，SOP 内容和字段未定版。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、SOP 模板、配件清单字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1649 | 生成辨识单品配件后销毁原子页

- Added:
  - `value-added-service-items/destruction-items/value-added-service-item-in-warehouse-destroy-identified-single-item-accessory.md`
- Covered service item:
  - `OSF6V1649` 辨识单品配件后销毁。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子只销毁辨识出的配件，不等同整件商品销毁。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、配件清单字段、销毁确认字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/destruction-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1651 | 生成库内商品拍摄视频原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-product-video-shooting.md`
- Covered service item:
  - `OSF6V1651` 库内商品拍摄视频。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子根据客户 SOP 拍摄库内商品视频，常见场景为商品在库视频和模拟商品出库视频。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、SOP 模板、视频时长字段、SKU 字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1677 | 生成退货商品补拍细节照原子页

- Added:
  - `value-added-service-items/photographing-and-video-items/value-added-service-item-in-warehouse-return-product-detail-reshoot-photo.md`
- Covered service item:
  - `OSF6V1677` 退货商品补拍细节照。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子针对退货入库商品，按客户示例图补拍外箱标签照、内部商品细节图和内部商品标签照等。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、示例图字段、照片数量字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/photographing-and-video-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1639 | 生成测量商品内部配件尺重原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-measure-internal-accessory-dimensions-weight.md`
- Covered service item:
  - `OSF6V1639` 测量商品内部配件尺重。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子根据客户示例图检查商品内部配件长宽高和重量，并拍照反馈。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、测量模板、长宽高字段、重量字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1640 | 生成柔性打包装箱/装袋测量尺重原子页

- Added:
  - `value-added-service-items/packaging-items/value-added-service-item-in-warehouse-flexible-packing-carton-bag-dimensions-weight-test.md`
- Covered service item:
  - `OSF6V1640` 柔性打包装箱/装袋测量尺重。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子用于包材装箱/装袋测试，反馈装箱后包裹尺重信息并拍照。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、包材型号字段、M 码字段、尺重字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/packaging-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-item-osf6v1626 | 生成指定商品盘点原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-specified-product-inventory-count.md`
- Covered service item:
  - `OSF6V1626` 指定商品盘点。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、库内异常到 VASC 映射和异常解决方案目录。
  - 明确本原子按 SKU 清点在库商品数量，并根据实际盘点结果调整系统库存。
- Boundary:
  - 字段覆盖为 `missing_field_evidence`，不生成确定字段清单、盘点模板、库存调整字段或上传模板。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `index.md`
- Verified:
  - 新增服务项页已单独校验 `source_refs`、Markdown 链接和本机绝对路径。

## [2026-06-23] value-added-service-items-batch-completion | 补齐 normalized 剩余增值原子页

- Added:
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-single-item-split-putaway-multiple-skus.md`
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-return-product-dimensions-weight-check.md`
  - `value-added-service-items/packaging-items/value-added-service-item-in-warehouse-procure-packaging-materials.md`
  - `value-added-service-items/product-processing-items/value-added-service-item-in-warehouse-audit-inventory-count.md`
  - `value-added-service-items/destruction-items/value-added-service-item-in-warehouse-dg-product-destruction.md`
  - `value-added-service-items/transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-labeling-mode.md`
  - `value-added-service-items/transfer-and-ownership-items/value-added-service-item-in-warehouse-ownership-transfer-quantity-change-mode.md`
  - `value-added-service-items/other-service-demand-items/value-added-service-item-in-warehouse-other-service-demand.md`
  - `value-added-service-items/destruction-items/value-added-service-item-in-warehouse-exception-product-destruction.md`
  - `value-added-service-items/other-service-demand-items/value-added-service-item-outbound-other-service-demand.md`
- Covered service items:
  - `OSF6V1597` 单品拆分后上架（拆分为多个SKU）。
  - `OSF6V1625` 检查商品尺重（退货商品）。
  - `OSF6V1648` 代采购包材物料。
  - `OSF6V1660` 审计盘点。
  - `OSF6V1644` DG商品销毁。
  - `OSF6V1646` 货权转移（换标模式）。
  - `OSF6V1647` 货权转移（改数模式）。
  - `OSF6V1603` 库内其他服务需求。
  - `OSF6V1704` 库内-异常商品销毁。
  - `OSF8V1601` 出库其他服务需求。
- Evidence:
  - 复用 normalized 编排数据、原子主数据、字段覆盖报告、VASC 编排映射、业务来源快照和非标增值流程。
  - 复算 normalized 唯一增值服务项 52 个，当前已生成服务项页 52 个，剩余 0 个。
- Boundary:
  - 本批 10 个服务项字段覆盖均为 `missing_field_evidence`，不生成确定字段清单、附件模板、SOP 模板、报价字段或审批字段。
  - 对特批/需审核非标原子，仅沉淀适用判断和客户需提供信息，不替代审核、报价和仓库可执行性确认。
- Updated:
  - `value-added-service-items/README.md`
  - `value-added-service-items/product-processing-items/README.md`
  - `value-added-service-items/packaging-items/README.md`
  - `value-added-service-items/destruction-items/README.md`
  - `value-added-service-items/transfer-and-ownership-items/README.md`
  - `value-added-service-items/other-service-demand-items/README.md`
  - `index.md`
- Verified:
  - 每个新增服务项页均已单独校验 `source_refs`、Markdown 链接和本机绝对路径。
  - 业务目录、关系映射和根文件范围的 Markdown 校验通过：`files=104`。
  - 全项目校验未作为通过口径，因为 `source-references/` 下存在历史 legacy 文件和飞书快照图片链接缺失，属于既有参考快照问题。

## [2026-06-23] value-added-service-items-batch-review | 复查并修正本批原子 frontmatter 证据口径

- Reviewed:
  - 本批 10 个新增增值原子页。
- Fixed:
  - 将本批新增页的 `tags` 收敛到 `SCHEMA.md` 已登记的受控标签范围。
  - 将本批非标原子的 `service_item_type` 从 `nonstandard` 调整为 Schema 枚举 `non_standard`。
  - 将 `OSF6V1660` 的 `service_item_object_level` 从非枚举值 `account` 调整为 `other`，正文仍保留账号范围盘点说明。
  - 将本批缺少 `isCharge`、`isHaveCost`、`isEffective` 明确证据的字段从定版 `Y/true` 调整为 `conditional` 或 `unknown`，正文表格同步改为“需审核报价后确认”或 `unknown`。
- Verified:
  - 本批新增页无本机绝对路径、无缺失 `source_refs`、无缺失 Markdown 相对链接。
  - 本批新增页均保留 `missing_field_evidence` 和“不能生成确定字段清单”的证据边界。
  - normalized 唯一增值服务项覆盖仍为 52/52，剩余 0。
  - 业务目录、关系映射和根文件范围的 Markdown 校验通过：`files=104`。

## [2026-06-23] value-added-service-items-remaining-review | 复查并规范化剩余原子页 frontmatter

- Reviewed:
  - 除本批新增 10 页外的剩余 42 个增值原子页。
- Fixed:
  - 删除旧原子页中未登记到 `SCHEMA.md` 的描述性标签，保留受控标签。
  - 将旧原子页中的 `service_item_type: nonstandard` 统一调整为 `service_item_type: non_standard`。
  - 将三态字段中的 `null` 调整为 `unknown`。
- Unchanged:
  - 未改动正文业务结论、适用场景、客户需提供信息和字段证据说明。
- Verified:
  - 52 个原子页 frontmatter 元数据校验通过。
  - 业务目录、关系映射和根文件范围的 Markdown 校验通过：`files=104`。
  - normalized 唯一增值服务项覆盖为 52/52，剩余 0。

## [2026-06-23] vasc-product-in-warehouse-destruction | 生成库内销毁 VASC 产品页

- Added:
  - `vasc-products/destruction-services/vasc-product-in-warehouse-destruction.md`
- Covered VASC product:
  - `VASC202504171850278` 库内销毁。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、VASC 到原子编排映射和库内销毁原子页。
- Boundary:
  - 明确本产品面向库内异常商品销毁，不等同上架前销毁。
  - 明确 `库内-异常商品销毁` 原子无法提供销毁证明；DG 或证明需求需查特批非标。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/destruction-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-pre-putaway-self-pickup | 生成上架前自提 VASC 产品页

- Added:
  - `vasc-products/self-pickup-services/vasc-product-pre-putaway-self-pickup.md`
- Covered VASC product:
  - `VASC202411192240522` 上架前自提。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、自提 SOP 和两个自提原子页。
- Boundary:
  - 明确包裹自提选择无需 Winit 打托，托盘自提或需打托选择需 Winit 打托。
  - 面单上传只作为 SOP 操作提示，不定版字段。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/self-pickup-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-new-order-putaway-customer-provided-forecast-order | 生成新单上架（客户提供预报单）产品页

- Added:
  - `vasc-products/putaway-services/vasc-product-new-order-putaway-customer-provided-forecast-order.md`
- Covered VASC product:
  - `VASC202412111831129` 新单上架（客户提供预报单）。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、无箱单预报 FAQ 和 `OW01V1622` 原子页。
- Boundary:
  - 明确本产品是异常链路中客户提供预报单信息承接上架，不等同普通新单上架或补包裹条码。
  - 不定版预报单字段、识别码字段、附件模板和费用。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/putaway-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-original-order-direct-putaway | 生成原单上架（直接上架）产品页

- Added:
  - `vasc-products/putaway-services/vasc-product-original-order-direct-putaway.md`
- Covered VASC product:
  - `VASC202504251617529` 原单上架（直接上架）。
- Evidence:
  - 复用 normalized VASC 编排、直接上架原子页、覆盖包裹标签原子页和异常解决方案目录。
- Boundary:
  - 明确本产品使用原入库单直接上架，不等同普通综合 `原单上架`。
  - 产品页只沉淀候选原子和动态判断，不定版字段配置。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/putaway-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-new-order-direct-putaway | 生成新单上架（直接上架）产品页

- Added:
  - `vasc-products/putaway-services/vasc-product-new-order-direct-putaway.md`
- Covered VASC product:
  - `VASC202505282347101` 新单上架（直接上架）。
- Evidence:
  - 复用 normalized VASC 编排、直接上架原子页和异常解决方案目录。
- Boundary:
  - 明确本产品使用新单方向直接上架，不等同原单直接上架或客户创建新单综合产品。
  - 产品页不定版字段配置、附件、模板和费用。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/putaway-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-inbound-product-photo | 生成入库商品拍照产品页

- Added:
  - `vasc-products/photographing-and-video-services/vasc-product-inbound-product-photo.md`
- Covered VASC product:
  - `VASC202407031507376` 入库商品拍照。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射和入库商品开箱拍照原子页。
- Boundary:
  - 明确 normalized 中本产品为 inactive，仅作为历史/未启用映射保留，不作为当前推荐入口。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/photographing-and-video-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-in-warehouse-product-photo | 生成库内商品拍照产品页

- Added:
  - `vasc-products/photographing-and-video-services/vasc-product-in-warehouse-product-photo.md`
- Covered VASC product:
  - `VASC202407031511413` 库内商品拍照。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、库内商品拍照原子页和流程实物流/信息流文档。
- Boundary:
  - 明确本产品是库内拍照信息获取动作，通常不单独闭环异常；后续处理取决于客户继续选择的上架、销毁、换标、包装或其他增值。
  - 产品页不定版拍照字段、照片数量、拍摄角度、附件模板和费用。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/photographing-and-video-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-inbound-nonstandard-photo-or-video | 生成入库非标拍照或提供视频产品页

- Added:
  - `vasc-products/photographing-and-video-services/vasc-product-inbound-nonstandard-photo-or-video.md`
- Covered VASC product:
  - `VASC202411271721537` 入库非标拍照或提供视频。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、4 个拍照/视频原子页、入库异常拍照 SOP 和监控服务快照。
- Boundary:
  - 明确本产品是拍照/视频调查类非标产品，不能替代上架、销毁、自提、换标、包装、盘点等最终处理动作。
  - 区分单品指定位置拍照、异常包裹开箱拍照、少包裹视频调查和少单品视频调查；字段证据缺失时不定版配置字段。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/photographing-and-video-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-in-warehouse-light-processing | 生成库内轻加工产品页

- Added:
  - `vasc-products/labeling-and-packaging-services/vasc-product-in-warehouse-light-processing.md`
- Covered VASC product:
  - `VASC202407031456553` 库内轻加工。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、8 个库内轻加工相关原子页、增值产品说明、异常解决方案目录和监控/SLA 快照。
- Boundary:
  - 明确本产品是库内 `OSF632` 标准综合轻加工产品，不得与入库 `OW01` 上架处理产品和相近原子混用。
  - 标注 `贴标/换标` 互斥组和全部原子的 `missing_field_evidence` 字段边界。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/labeling-and-packaging-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-inbound-nonstandard-special-approval | 生成入库非标增值（特批）产品页

- Added:
  - `vasc-products/nonstandard-and-other-services/vasc-product-inbound-nonstandard-special-approval.md`
- Covered VASC product:
  - `VASC202411192246131` 入库非标增值（特批）。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、包裹串仓异常调拨原子页、入库其他服务需求原子页和非标增值申请流程快照。
- Boundary:
  - 明确本产品需要审核、客户确认和 PD 处理，不作为普通标准产品直接推荐。
  - 区分明确串仓调拨原子与入库非标兜底原子，字段证据缺失时不定版配置字段和审批/报价字段。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/nonstandard-and-other-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-in-warehouse-nonstandard-no-review | 生成库内非标增值（免审核）产品页

- Added:
  - `vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-no-review.md`
- Covered VASC product:
  - `VASC202411192229072` 库内非标增值（免审核）。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、11 个免审核库内非标原子页、增值产品说明和非标流程快照。
- Boundary:
  - 明确 `免审核` 仅来自产品属性 `VASC_REQUIRE_REVIEW = N`，仍需按异常对象、客户意图和互斥组动态选择原子。
  - 标注全部候选原子字段证据缺失，不定版字段、附件、SOP、照片/视频数量、盘点模板或费用。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/nonstandard-and-other-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-in-warehouse-nonstandard-review-required | 生成库内非标增值（需审核）产品页

- Added:
  - `vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-review-required.md`
- Covered VASC product:
  - `VASC202412111836315` 库内非标增值（需审核）。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、两个需审核库内非标原子页和非标流程快照。
- Boundary:
  - 明确本产品 `VASC_REQUIRE_REVIEW = Y`、审核部门为 `PD`，不能按免审核产品口径处理。
  - 标注两个原子的字段证据缺失，不定版拆分模板、尺重模板、审核字段或费用。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/nonstandard-and-other-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-in-warehouse-nonstandard-special-approval | 生成库内非标增值（特批）产品页

- Added:
  - `vasc-products/nonstandard-and-other-services/vasc-product-in-warehouse-nonstandard-special-approval.md`
- Covered VASC product:
  - `VASC202411192250069` 库内非标增值（特批）。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、6 个库内特批非标原子页、增值产品说明、异常解决方案目录和非标流程快照。
- Boundary:
  - 明确本产品需要审核、报价和客户确认后才下发仓库操作。
  - 区分代采购包材、审计盘点、DG 销毁、货权转移和库内其他服务需求，避免把兜底原子泛化。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/nonstandard-and-other-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] vasc-product-outbound-nonstandard-special-approval | 生成出库非标增值（特批）产品页

- Added:
  - `vasc-products/nonstandard-and-other-services/vasc-product-outbound-nonstandard-special-approval.md`
- Covered VASC product:
  - `VASC202411192253186` 出库非标增值（特批）。
- Evidence:
  - 复用 normalized VASC 编排、异常到 VASC 映射、出库其他服务需求原子页、出库异常快照、增值产品说明、异常解决方案目录和非标流程快照。
- Boundary:
  - 明确本产品是 `OSF8` 出库关联特批非标产品，收录原因是 `B07E1616 自提出库单分批提货` 在 normalized 中映射到本产品，不作为入库异常默认推荐。
  - 保留审核、报价、客户确认和字段证据缺失边界，不定版出库单状态流转、字段、附件、费用或仓库 SOP。
- Updated:
  - `vasc-products/README.md`
  - `vasc-products/nonstandard-and-other-services/README.md`
  - `index.md`
- Verified:
  - 新增产品页已单独校验 `source_refs`、Markdown 链接、本机绝对路径和 VASC 产品编码。

## [2026-06-23] inbound-exception-entity-pages-p1-batch | 生成 P1 异常实体页

- Added:
  - `inbound-exceptions/order-status-exceptions/exception-b01e01-inbound-order-status-abnormal.md`
  - `inbound-exceptions/warehouse-mismatch-exceptions/exception-b01e49-customer-direct-ship-package-wrong-warehouse.md`
  - `inbound-exceptions/wrong-item-and-mispack-exceptions/exception-b03e03-out-of-order-product-in-package.md`
  - `inbound-exceptions/order-status-exceptions/exception-b01e1470-order-terminated-unable-to-putaway.md`
  - `inbound-exceptions/order-status-exceptions/exception-b01e1514-order-already-putaway-package-interception-required.md`
  - `inbound-exceptions/wrong-item-and-mispack-exceptions/exception-b01e1516-abc-package-subpackage-product-mispacked-temporary-storage.md`
  - `inbound-exceptions/quantity-difference-exceptions/exception-b01e1517-arrived-package-product-quantity-greater-than-inspection-quantity.md`
  - `inbound-exceptions/package-barcode-exceptions/exception-b01e1579-a-plus-product-barcode-package-barcode-mismatch.md`
  - `inbound-exceptions/package-barcode-exceptions/exception-b01e1615-package-barcode-batch-abnormal-customer-action-required.md`
  - `inbound-exceptions/product-barcode-exceptions/exception-b05e1586-single-item-barcode-unscannable-customer-action-required.md`
  - `inbound-exceptions/product-barcode-exceptions/exception-b06e1369-2b-box-product-barcode-abnormal.md`
  - `inbound-exceptions/package-barcode-exceptions/exception-b06e1613-a-plus-package-barcode-unscannable.md`
- Evidence:
  - 复用事件标准异常快照、normalized 异常到 VASC 关系、VASC 编排映射、实物流和信息流流程文档。
- Boundary:
  - 异常页只解释异常含义、发生时实物流/信息流状态、客户判断点和可关联 VASC 索引。
  - 未展开 VASC 产品细节、原子字段、模板、费用和 SLA；字段不足时保留证据边界。
- Updated:
  - `inbound-exceptions/README.md`
  - 相关异常分类目录 `README.md`
  - `inbound-exceptions/pending-inbound-exception-entity-backlog.md`
  - `index.md`
- Verified:
  - P1 12 个新增异常页均已逐页校验 `source_refs`、Markdown 链接、本机绝对路径和异常编码。

## [2026-06-23] inbound-exception-entity-pages-p2-batch | 生成 P2 异常实体页并删除待办清单

- Added:
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b0102e08-product-packaging-abnormal.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b0102e23-a-plus-package-quality-abnormal.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b0102e27-product-without-logistics-packaging.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b01e1314-product-quality-abnormal-affects-sales.md`
  - `inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b01e1378-a-plus-package-box-product-batch-info-missing-or-incomplete.md`
  - `inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b01e1381-product-physical-batch-info-missing-or-incomplete.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b05e012-single-item-outer-packaging-damaged.md`
  - `inbound-exceptions/wrong-item-and-mispack-exceptions/exception-b05e013-product-mispacked-in-package.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b05e014-single-item-quality-abnormal.md`
  - `inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b05e1382-inventory-batch-number-wrong.md`
  - `inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b05e1383-unplanned-batch.md`
  - `inbound-exceptions/quantity-difference-exceptions/exception-b06e1370-2b-box-extra-single-items.md`
  - `inbound-exceptions/quantity-difference-exceptions/exception-b06e1371-2b-box-missing-single-items.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b06e1628-dg-product-packaging-noncompliant.md`
  - `inbound-exceptions/self-pickup-and-outbound-related-exceptions/exception-b06e1735-outbound-order-voided-after-packing-with-product-vas.md`
  - `inbound-exceptions/self-pickup-and-outbound-related-exceptions/exception-b07e1339-self-pickup-order-cancelled-need-customer-inbound-order.md`
  - `inbound-exceptions/self-pickup-and-outbound-related-exceptions/exception-b07e1616-self-pickup-outbound-order-batch-pickup.md`
  - `inbound-exceptions/quality-and-packaging-exceptions/exception-b0809e03-in-warehouse-product-packaging-damaged.md`
  - `inbound-exceptions/product-barcode-exceptions/exception-b0809e05-in-warehouse-single-item-barcode-abnormal-manually-unrecognizable.md`
  - `inbound-exceptions/batch-sn-and-attribute-exceptions/exception-b12e1784-sn-code-missing-unable-to-collect.md`
- Removed:
  - `inbound-exceptions/pending-inbound-exception-entity-backlog.md`
- Evidence:
  - 复用事件标准异常快照、normalized 异常到 VASC 关系、VASC 编排映射、实物流和信息流流程文档。
- Boundary:
  - 对只存在少量来源定义的异常，仅保留来源定义、发生时状态和 normalized VASC 候选，不补充未证实 SOP。
  - 对出库关联异常，明确标注 `OUT_BOUND` 或出库关联边界，不作为普通入库异常默认处理。
- Updated:
  - `inbound-exceptions/README.md`
  - 相关异常分类目录 `README.md`
  - `index.md`
- Verified:
  - P2 20 个新增异常页均已逐页校验 `source_refs`、Markdown 链接、本机绝对路径和异常编码。

## [2026-06-23] full-project-coverage-and-link-audit | 全盘覆盖率与链接审计

- Checked:
  - normalized 异常覆盖：`35/35`，无缺失、额外、空编码或重复编码。
  - normalized VASC 产品覆盖：`18/18`，无缺失、额外、空编码或重复编码。
  - normalized 增值服务项/原子覆盖：`52/52`，无缺失、额外、空编码或重复编码。
  - 当前业务知识页 Markdown 本地链接：排除旧版迁移快照后坏链为 `0`。
  - `source_refs`：实体内容引用均可解析到项目内相对路径；`SCHEMA.md` 示例占位符不作为实体引用。
  - 本机绝对路径：未发现。
- Fixed:
  - 删除 `vasc-products/nonstandard-and-other-services/vasc-product-outbound-nonstandard-special-approval.md` 中指向已删除待办清单的旧链接。
  - 更新 `index.md` 顶部维护说明和业务知识文件数量口径：当前业务知识文件为 `113`。
- Remaining known gaps:
  - normalized 原子配置字段证据中仍有 `missing` 状态；对应原子页只能标注“当前无可定版字段”，不能补造字段、附件、模板、费用或 SLA。
  - `source-references/exception-vas-data-package/legacy-root-files/` 为旧版迁移快照，内部仍保留历史断链；该目录不作为当前业务检索链路。
