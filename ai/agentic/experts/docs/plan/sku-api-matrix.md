# SKU 域 API 矩阵

> 关联文档：[sku-plan.md](sku-plan.md) · [sku-data.md](sku-data.md) · **[sku-data-fetch-strategy.md](sku-data-fetch-strategy.md)**（API 选型 + 剪枝）  
> 版本：2026-07  
> KB 来源：`_kb/system-team/public-api/OSWH/商品/`、`developer.winit.com.cn`
>
> **说明**：`_kb/system-team/sku/knowledge/mms/` 与飞书「知识底座」方案提供的是**实体概念**，**不是**可调用的知识图谱 API。下列映射一律以 OpenAPI / Webhook / KB 为准；查验、申报、禁限来源等未文档化字段标 **Gap / 待确认**。

---

## 一、`sku/profile`

**定位**：只读商品档案（按 OpenAPI `skuCode` 查询：尺重、属性、`supervisorMode`、`itemPackaging`、发布态、禁限来源）。不直接对客，被多域专家调用。

### 命名对照（OpenAPI → 契约）

| 业务含义 | OpenAPI 字段 | profile 契约 |
|----------|--------------|--------------|
| 商品编码 | 查询/多数接口：`skuCode`；注册/打标：`productCode` | **`skuCode`**（canonical；写入场景注明等价 `productCode`） |
| 商品条码（M 码） | `code` | `code` |
| 商品规格 | `specification` | `specification` |
| 管理模式 | `supervisorMode`：`SI` / `SKU` | `supervisorMode`（及 `managementMode.supervisorMode`） |
| 箱/套类型 | `winit.item.box.save` 的 `type`：`BOX` / `SUITE` | `type`（普通商品为 `null`；list 接口未必直出） |
| 入库包装类别 | `itemPackaging`：`LOGISTICS` / `SALES` / `NUDE_CARGO` | `itemPackaging` |
| 第三方商品条码 | `skuCodeThird` | barcode-guide 使用同名 |
| ~~Item 编码~~ | **无** | **不使用 `itemCode`** |

### 消费方

| 专家 | 调用场景 |
|------|----------|
| `inbound/inbound-exception-check` | 特殊属性是否导致核实口径差异 |
| `inbound/inbound-process-guide` | 件型/禁限运规则匹配（可内调 profile） |
| `value-add/value-add-product-recommendation` | 特殊货品对 VASC/缺失确认项的影响 |
| `inbound/inbound-capacity-availability` | 件型与 CBM 计算方式 |
| `sku/registration-guide` | 限直发 / 禁止入出库事实前置 |
| `sku/compliance-check`（P2） | 禁限来源与档案快照 |

### API 场景

| 场景 ID | 触发需求 | 系统 | Action | 关键字段 | 读/写 | 就绪度 |
|---------|----------|------|--------|----------|-------|--------|
| `sku.profile.by-sku` | 按商品编码查档案（**主路径**） | MMS | **`winit.item.page.list`** | `skuCodes[]`、`importCountryCode?`、`pageVo` | 读 | [SoT 文档](../sku/raw/api/winit-item-page-list.md) |
| `sku.profile.batch` | 批量查多个商品 | MMS | **`winit.item.page.list`**（单次批量，≤20） | `skuCodes[]` | 读 | 见 [剪枝策略](sku-data-fetch-strategy.md) |
| `sku.profile.legacy` | 代理未注册 page.list | MMS | `winit.mms.item.list` | `skuCode`、`pageNo`、`pageSize` | 读 | 遗留降级 |
| `sku.profile.derived` | API 不可用 | OMS | `getOrderDetail.merchandiseList` | 订单侧派生属性 | 读 | 降级路径 |

**`fetchProfile` 切片**（`inputs` 可选，默认 `facts_core`）：`facts_core` / `audit_status` / `barcode_third` / `supplement_third_sku` / `facts_compliance` / `minimal` — 详见 [sku-data-fetch-strategy.md](sku-data-fetch-strategy.md)。

### 响应字段映射（`winit.item.page.list` → profile 契约）

| profile 字段 | OpenAPI 来源 |
|--------------|--------------|
| `skuCode` | `skuCode` |
| `code` | `code`（M 码） |
| `specification` | `specification` |
| `supervisorMode` | `attributes[]` 中 `attributeName=supervisorMode` |
| `type` | `attributes.hasSuitBoxItem` 等推断；箱套 `BOX`/`SUITE` 仍可能 Gap |
| `itemPackaging` | `attributes.packaging` 或 `itemPackaging` |
| `isActive` | `isActive` |
| `publishStatus` | 商品 `status` 1–6 → draft/auditing/published/returned/inactive |
| `registeredDimensions` | `sizeWeight.registerLength/Width/Height/Weight` |
| `verifiedDimensions` | `sizeWeight.length/width/height/weight`（实测） |
| `specialFlags.*` | `attributes`：`battery`、`liquid`、`powder`、`magnetism`、`food`、`dg`… |
| `managementMode.*` | `attributes`：`batchManagement`、`batchManagementType` |
| `prohibitInbound` | `declarations.isProhibitWarehousing`（按 `importCountryCode` 选国别） |
| `prohibitOutbound` | `[待确认]` |
| `directShipmentRestriction` | `declarations.firstLegType` 或 `attributes.firstLegType`：`NS`→限直发，`NL`→不限 |
| `restrictionReason` | 限直发原因文案 `[待确认]` |
| `rejectReason` | `declarations.returnReason`（**仅** status=5 或 status=4∧changeStatus=5） |
| `standardScript` | `declarations.standardScript`（同上规则；LLM 侧截断） |
| `estimateAuditDate` | `attributes.estimateAuditDate`（动态，按进口国） |
| `isUrgent` | `attributes.isUrgent` |
| `skuCodeThirds` | 顶层 `skuCodeThirds[]`（barcode 切片） |
| `itemType` | **非 API**：尺重 + 货型 KB 计算 |

### 遗留映射（`winit.mms.item.list` → profile 契约，降级用）

| profile 字段 | OpenAPI 来源 |
|--------------|--------------|
| `skuCode` | `skuCode`（商品编码） |
| `code` | `code`（商品条码 M 码） |
| `specification` | `specification` |
| `supervisorMode` | `supervisorMode`（`SI` / `SKU`） |
| `type` | 箱套接口 `type`（`BOX`/`SUITE`）；list **未必返回** → Gap / 补查 |
| `itemPackaging` | `itemPackaging` |
| `isActive` | `isActive` |
| `registeredDimensions` | `registerLength/Width/Height/Weight` |
| `verifiedDimensions` | 核实尺重（若有；Webhook/扩展）`[待确认]` |
| `specialFlags.isBattery` 等 | `isBattery`、`isWithLiquid`、`isWithPowder`、`isWithMagnetism`、`isFood`… |
| `managementMode.isBatchManager` | `isBatchManager`、`batchManagerType` 等 |
| `publishStatus` | 商品状态枚举（list 以 `isActive` 等为准，完整发布态 `[待确认]`） |
| `prohibitInbound` | 禁止入库标记（或 Webhook `PROHIBIT_INBOUND` / `EVENT_MERCHANDISE_UPDATE_V1`） |
| `prohibitOutbound` | 禁止出库（Webhook 头程变更说明含禁止出库）`[待确认]` 列表字段 |
| `prohibitReason` / `prohibitInboundReason` | 禁止原因文案 `[待确认]` |
| `prohibitSource` | **契约扩展**；OpenAPI 无直出 → 默认 `unknown` |
| `directShipmentRestriction` | 头程直发限制 `[待确认]`（Webhook 提及限直发） |
| `restrictionReason` | 限直发原因 `[待确认]` |
| `rejectReason` | 审核退回原因（维护任务/详情）`[待确认]` |
| `itemType` | **非 API**：尺重 + 货型 KB 计算 |

### 风险与 Gap

- 精确查询依赖 `skuCode` 过滤 + 分页；大批量需限流与缓存策略。
- 注册入参名 `productCode` 与查询 `skuCode` 同义，专家入参统一归一为 `skuCode`。
- 货型（`itemType`）由 KB 计算，非 API 直出。
- **不合规禁售数量/原因**在 TOM 库存查询，**不纳入** profile API 首期。
- 箱套 `type` 可能需另查/另接口，不能假设 list 返回。
- 禁限来源未就绪时：`prohibitSource: unknown`。
- **无 `itemCode`、无知识图谱 API**。
---

## 二、`sku/registration-guide`

| 场景 ID | 触发需求 | 系统 | Action | 关键字段 | 读/写 | 就绪度 |
|---------|----------|------|--------|----------|-------|--------|
| `sku.registration.submit` | 注册/编辑商品 | MMS | `registerProduct` | **`productCode`**（= 商品编码，同查询 `skuCode`）、尺重、属性、证书 | 写 | KB 已文档化；专家首期 **不代客写入** |
| `sku.registration.audit-status` | 查审核/退回/发布态（**有 skuCode 时首选**） | MMS | **`winit.item.page.list`** + `fetchProfile=audit_status` | `skuCode`、`importCountryCode`、`status`、`declarations` | 读 | [SoT](../sku/raw/api/winit-item-page-list.md) |
| `sku.registration.audit-task-list` | 维护任务列表（无 sku 或补充） | MMS | `mms.itemmttask.queryItemMtEntitys` | `skuCode`、`importCountryCode`、`status` | 读 | KB 已文档化；**无**应维护完成时间 |
| `sku.registration.audit-sla` | 加急话术：应维护完成时间 | MMS | **`page.list`** `attributes.estimateAuditDate` | 按进口国动态属性 | 读 | 已确认于 page.list |
| `sku.registration.expedite` | 客户点击加急 | 产品能力 | — | 加急原因枚举 | 写 | **非 OpenAPI**；万邑联产品功能 |
| `sku.registration.unban` | 解禁操作写入 | MMS | — | 解除禁止标记 | 写 | **Gap**；首期 **不代写**；KB 指引 + 人工 |
| `sku.registration.webhook` | 审核结果推送 | Webhook | `EVENT_MERCHANDISE_REGISTER_STATUS` | 异步通知 | 读 | 集成侧 |

### 新品承运流程（flows/01）— API Gap

| 场景 ID | 触发需求 | 就绪度 | 首期策略 |
|---------|----------|--------|----------|
| `sku.carriability.history-list` | 历史咨询清单匹配 | **Gap** | KB + 人工；机器人待对接 |
| `sku.carriability.restricted-list` | 禁限运清单结构化查询 | **Gap** | 公告附件 + KB 规则；无 API |
| `sku.carriability.create-task` | 生成商品注册咨询任务单 | **Gap** | 飞书「咨询接口」人工登记 |

**首期策略**：对客 **KB + LLM**（[`docs/sku/flows/01`](../sku/flows/01-new-product-carriability.md)）；可选只读审核状态增强 `guide_resubmit` / `guide_expedite`；`guide_unban` 依赖 profile 禁限事实 + KB，无解禁写 API。

---

## 三、`sku/compliance-check`（P2）

| 场景 ID | 触发需求 | 系统 | Action | 就绪度 |
|---------|----------|------|--------|--------|
| `sku.compliance.restricted-list` | 禁限运判定 | — | 无独立 API；KB 规则表 | KB 已有清单 |
| `sku.compliance.certificates` | 证书是否齐备 | MMS | 商品合规/文件管理（待细化 action） | Gap |
| `sku.compliance.declaration` | 申报要素查询/校验 | MMS | — | **Gap**；首期 KB 深判 |
| `sku.compliance.category` | 品类 / WEEE 类别 | MMS | — | **Gap** `[待确认]`；首期 KB |
| `sku.compliance.flags` | 禁止入出库标记 | Webhook | `PROHIBIT_INBOUND` / `PROHIBIT_OUTBOUND` | 事件驱动 |
| `sku.compliance.unban-criteria` | 解禁条件是否满足 | — | 无独立 API | **Gap**；KB + 人工 |

**首期策略**：深判以 `docs/sku/flows` + 禁限运/证书 KB 为主；已落地专家 `sku/compliance-check`（KB+LLM + 可选 page.list `facts_compliance`）；申报/品类结构化 API 仍 Gap。

---

## 四、`sku/barcode-guide`（P2）

| 场景 ID | 触发需求 | 系统 | Action | 就绪度 |
|---------|----------|------|--------|--------|
| `sku.barcode.print-with-si` | 打印带单品信息标签 | MMS | 见 `05-打印商品条码标签-带单品信息.md` | KB 已文档化 |
| `sku.barcode.print-without-si` | 打印不带单品信息 | MMS | 见 `06-打印商品条码标签-不带单品信息.md` | KB 已文档化 |
| `sku.barcode.third-party-product` | **新增**第三方商品条码 | MMS | `08-新增第三方商品条码.md` | KB 已文档化 |
| `sku.barcode.third-party-si` | **新增**第三方单品条码 | MMS | `09-新增第三方单品条码.md` | KB 已文档化 |
| `sku.barcode.query-si` | **查看**单品/第三方条码状态 | MMS | `10`/`11` 查询文档 | KB 已文档化 |
| `sku.barcode.third-party-delete` | **删除**第三方商品/单品条码 | MMS | 删除类 action | **Gap** `[待确认]` 文档路径 |
| `sku.barcode.third-party-read` | 只读已绑三方码 | MMS | **`winit.item.page.list`** + `fetchProfile=barcode_third` | `skuCode`、`skuCodeThirds` | 读 | 见 fetch 策略 |
| `sku.barcode.supplement-list` | 缺三方码待办清单 | MMS | **`page.list`** + `querySupplementType=SUPPLEMENT_THRID_SKU` | 分页 | 读 | 列表可能大，需剪枝 |

---

## 五、`sku/inspection-status`（P2）

| 场景 ID | 触发需求 | 系统 | Action | 就绪度 |
|---------|----------|------|--------|--------|
| `sku.inspection.by-sku` | 按 SKU 查验货进度/结论 | MMS | 查验单查询（待确认 action） | **Gap** |
| `sku.inspection.by-order` | 按查验单号查询 | MMS | 同上 | **Gap** |
| `sku.inspection.self-serve` | 客户自助查看路径 | 万邑联 / TOM | UI 路径（KB） | 首期降级路径 |

**首期策略**：API 未就绪前，对客 KB 指引自助查询 + 人工；专家不依赖知识图谱。解禁/补资料结论解释可与 `registration-guide` handoff 衔接。

---

## 六、跨域引用索引

| 域 | 文档 | SKU 相关条目 |
|----|------|--------------|
| inbound | [inbound-api-matrix.md](inbound-api-matrix.md) §六 | `sku/profile` 跨域索引 |
| storage | [storage-plan.md](storage-plan.md) | `inventory-query`（非 sku 域）；有库存禁出 = 数量 + profile 禁出 |
| customer | [customer-plan.md](customer-plan.md) | 补货建议依赖库存+销量，非 SKU 注册 |

---

## 七、变更记录

| 日期 | 变更 |
|------|------|
| 2026-06 | 初版骨架 |
| 2026-07 | 对齐 OSWH 商品 API；确认 `winit.mms.item.list`；新增 registration-guide / barcode / compliance 场景；移除 inventory-status |
| 2026-07-10 | 按商品咨询群数据补充：直发/退回/禁止入库原因、审核 SLA、承运流程 Gap 表 |
| 2026-07-13 | `barcode-guide` 明确覆盖三方编码增删查；删除 action Gap |
| 2026-07-13 | 吸收 MMS 概念：禁限来源、解禁、申报/品类、查验单 Gap；标明非图谱 API |
| 2026-07-13 | **命名对齐 OpenAPI**：废弃 `itemCode`/`skuType`；统一 `skuCode`↔`productCode`、`code`、`supervisorMode`、`type`(BOX/SUITE)、`itemPackaging`、`skuCodeThird` |
| 2026-07-15 | 主路径升级为 `winit.item.page.list`；新增 [sku-data-fetch-strategy.md](sku-data-fetch-strategy.md)（fetchProfile 切片 + 剪枝）；审核 SLA 改由 page.list 动态属性 |
