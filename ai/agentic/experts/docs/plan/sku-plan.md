# sku 域 Experts 规划

> `sku` 域负责**商品主数据**：注册/审核/发布、档案属性、合规与条码。跨入库、增值、出库等旅程复用。  
> 能力地图：[sku-data.md](sku-data.md) · LLM Wiki：[playbook.md](../sku/playbook.md) · API：[sku-api-matrix.md](sku-api-matrix.md) · **数据拉取**：[sku-data-fetch-strategy.md](sku-data-fetch-strategy.md) · **实现计划**：[sku-implementation.md](sku-implementation.md) · **业务说明**：[docs/experts/sku/expert-manual.md](../experts/sku/expert-manual.md)
>
> **设计原则（吸收 MMS 概念，字段名以 OpenAPI 为准）**：
> 1. **命名对齐 OpenAPI**：对客「商品编码」契约主键为 **`skuCode`**（`winit.mms.item.list`）；注册/打标入参同义字段为 **`productCode`**，语义相同、不另造 `itemCode`。商品条码（M 码）为 **`code`**。
> 2. **禁限是事实，解禁是引导**：入/出库禁止标记 + 原因 + `prohibitSource`（`rule` / `manual` / `unknown`）归 `profile`；解禁浅层 → `registration-guide`（`guide_unban`）；深判 → `compliance-check`。
> 3. **包装两分**：主数据侧用 OpenAPI 的 `supervisorMode`（`SI`/`SKU`）、箱套 `type`（`BOX`/`SUITE`）、入库包装 `itemPackaging`；出库 `outPackagingType` / `outPackagingMethod` 属旅程域（未来 inbound/outbound）。
> 4. **查验单独立**：验货进度/结论 → P2 `inspection-status`，不塞进 `profile` 主契约。
> 5. **置信度与升级**：输出约定 `confidence` 与 `escalate`；人工禁止、查验争议、深判无规则 → `need_human`（见 §七）。
> 6. **对客 / 对内**：`analysis` 对客；`structured` / `enrichedContext` 供下游；不单独建内部专家运行时。
> 7. **无 GraphRAG**：不以 MMS 知识图谱为运行时依赖；MMS Item/SKU 分层仅作概念理解，OpenAPI 对外已扁平为「商品编码」。

---

## 一、专家状态追踪

> 最左列：`[ ]` 未完整 · `[x]` 已完整。  
> 当前状态：`待规划` / `设计中` / `开发中` / `待配置` / `已完成` / `阻塞`  
> **进度口径（2026-07-14）**：仓库内 `design` / `manifest` / `nodes` / `prompts` / 单测 / `export:coze` 已通 → **待配置**（Coze 导入、专家登记、online 冒烟、recaller 路由尚未闭环）；上线验收通过 → **已完成**。

| [ ] | 优先级 | Expert ID | 目标完成 | 当前状态 | 需要 API | API 就绪度 | 主要依赖 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ ] | P1 | `sku/profile` | 2026-07 | **待配置** | 是 | 部分 | **已升级** `winit.item.page.list` + 剪枝映射；待 Coze/登记/冒烟 |
| [ ] | P1 | `sku/registration-guide` | 2026-07 | **待配置** | 部分 | 部分 | **已落地** page.list `audit_status`（estimateAuditDate/退回话术）；待 Coze/登记/冒烟 |
| [ ] | P2 | `sku/barcode-guide` | 2026-07 | **待配置** | 部分 | 部分 | **已落地** `barcode_third` / 缺码清单只读；待 Coze/登记/冒烟 |
| [ ] | P2 | `sku/compliance-check` | 2026-07 | **待配置** | 部分 | 部分 | **已落地** KB+LLM + `facts_compliance` 可选只读；待 Coze/登记/冒烟 |
| [ ] | P2 | `sku/inspection-status` | 待定 | 待规划 | 是 | 0% | 边界卡已有；查验 API Gap；按触发立项 |

> **已移除**：~~`sku/inventory-status`~~ → [`storage/inventory-query`](storage-plan.md)  
> **实现目录**：[`experts/sku/profile`](../../experts/sku/profile/)、[`registration-guide`](../../experts/sku/registration-guide/)、[`barcode-guide`](../../experts/sku/barcode-guide/) · 业务总览：[expert-manual.md](../experts/sku/expert-manual.md) · 阶段计划：[sku-implementation.md](sku-implementation.md)

---

## 二、边界卡片

### `sku/profile`

**问**：给定商品编码 `skuCode`（+进口国），其 **`code`（M 码）**、**`supervisorMode` / 箱套 `type` / `itemPackaging`**、件型、尺重、特殊属性、发布态、**头程直发限制及原因**、**禁止入库/出库标记、原因与来源类型**、退回态与退回原因是什么？  
**不问**：教客户注册/加急/属性解除/解禁操作（→ `registration-guide`）；禁限运/WEEE/GPSR/申报长文合规判定（→ `compliance-check`）；查验单进度与结论（→ `inspection-status`）；在库数量与禁售数量（→ `storage/inventory-query`）；出库打包方式（→ inbound/outbound 空缺专家）。  
**衔接**：输出 `enrichedContext.sku/profile` 或 `structured.skus[]` 供 `inbound-exception-check`、`inbound-process-guide`、`value-add-product-recommendation`、`inbound-capacity-availability`、**`registration-guide`（限直发/禁止入出库事实）**、`compliance-check` 读取。  
**输入**：`skuCodes[]`、`customerCode`；可选 `warehouseCode`、`importCountryCode`。（注册场景若上游持有 `productCode`，按同义归一为 `skuCode`。）  
**输出**：`structured.skus[]`（含 `skuCode`、`code`、`supervisorMode`、`type`、`itemPackaging`、入出库禁止与 `prohibitSource`、直发/退回字段）；`analysis` 简短；建议带 `confidence`。  
**依赖**：**`winit.item.page.list`**（主）+ [剪枝策略](sku-data-fetch-strategy.md)；遗留 `winit.mms.item.list`；箱套补充 `winit.item.box.save` 相关 KB；[`docs/sku/flows/04`](../sku/flows/04-direct-shipment-restriction.md)、[`05`](../sku/flows/05-prohibit-inbound-sale.md)；货型 KB。  
**实现状态**：**待配置**（nodes + export + 单测已通）。  
**降级**：API 不可用时订单 merchandise 派生 + `missingFacts`；禁限来源未知时 `prohibitSource: unknown`。

---

### `sku/registration-guide`

**问**（按咨询量排序）：
1. **SKU 注册加急**（~61%）：引用系统应维护完成时间 + 加急原因选项  
2. **新品能否承运/入库**（~25%）：禁限运清单自助 + 历史清单/任务单登记 + 引导注册  
3. **限直发原因与解法**（~3%）：引用 profile 事实 + IP 备案两种解法  
4. **退回原因与重提**（~2%）：引用系统退回条 + 修改重提 SOP  
5. **属性解除**（带电/液体/磁/粉末/刀片/DG/尺重）：实物确认 + 取消勾选路径  
6. **禁限解禁浅层**（`guide_unban`）：引用 profile 的禁止标记/来源；系统规则类给出补资料/改属性 SOP；人工来源优先升级  
7. 注册/批量注册、修改/失效、「商品不存在」无法下入库单  

**不问**：SKU 属性事实只读（→ `profile`）；禁限运/WEEE/GPSR/申报/品类**深判与解禁条件细判**（→ `compliance-check`）；查验进度（→ `inspection-status`）；禁售**库存数量**（→ `storage`）；CBM/SKU 额度（→ `inbound-capacity-availability`）；三方编码增删查（→ `barcode-guide`）；税率（→ `need_human`）；出库打包（`outPackagingType`/`outPackagingMethod` → 旅程域空缺）；入库包装/箱套事实仍属 `profile`（`itemPackaging` / `type`）。  
**衔接**：`inbound-order-manage` 遇商品不存在 → 本专家；`inbound-permission-apply` **不再**处理 `sku_registration`；`handoff_compliance` → `compliance-check`（未立项前对客转人工）；`handoff_inspection` → `inspection-status`（同上）。  
**输入**：`topic` 或 `intentType`；可选 `skuCode`、`importCountryCode`、`productLink`。  
**输出**：`structured.branch`（见下表）；`analysis` 对客步骤；可选 `auditStatusHint`、`expediteEligible`；建议带 `confidence`。  
**依赖**：[`docs/sku/flows/01–07`](../sku/flows/)；[`appendix/system-paths.md`](../sku/appendix/system-paths.md)；可选 `mms.itemmttask.queryItemMtEntitys`；可选前置 `sku/profile`。  
**实现状态**：**待配置**（KB+LLM 已落地；审核只读 API 首期 stub；**不代客点加急**）。  
**降级**：纯 KB + LLM；无 API 时指引万邑联商品信息自助查看。

**branch 枚举**：

| branch | 场景 | Flow |
|--------|------|------|
| `guide_expedite` | 注册加急 | 02 |
| `guide_carriability` | 新品能否发/入（浅层） | 01 |
| `guide_register` | 如何注册/批量 | 02/03 |
| `guide_resubmit` | 退回修改重提 | 03 |
| `guide_direct_shipment` | 限直发解法 | 04 |
| `guide_attribute_change` | 取消特殊属性勾选 | 06 |
| `guide_unban` | 禁入/禁出解禁浅层 SOP | 05 |
| `blocked_unpublished` | 未发布/禁止入库无法下单 | 05 |
| `handoff_compliance` | WEEE/GPSR/禁限运/申报深判 | 07 → P2 |
| `handoff_inspection` | 查验单进度/结论 | → P2 `inspection-status` |
| `need_info` | 缺 SKU/链接/国别 | — |
| `need_human` | 无话术/个案争议/人工来源禁止 | — |

---

### `sku/compliance-check`（P2）

**问**：新品承运**深判**（历史清单/禁限运均未覆盖）；某品类/国别禁限运细则；**申报要素争议**、品类/WEEE 类别判定；禁限**深判与解禁条件**；GPSR/MSDS/UN38.3 是否齐备；电商清关销售链接合规；品牌备案；熏蒸要求。  
**不问**：注册/加急/属性解除/解禁**浅层操作步骤**（→ `registration-guide` 已覆盖）；一般入库流程（→ `inbound-process-guide`）；查验单进度（→ `inspection-status`）。  
**衔接**：`registration-guide` 的 `handoff_compliance`；`inbound-process-guide` 禁限运深判；可读 `profile` 禁限来源。  
**输入**：`skuCode` 或品类/链接描述；`importCountryCode`；可选 `profile` 快照。  
**输出**：`structured.complianceVerdict`、`missingDocuments[]`、`analysis`；建议带 `confidence`。  
**依赖**：[`docs/sku/flows/01`](../sku/flows/01-new-product-carriability.md)、[`07`](../sku/flows/07-compliance-certificates.md)；禁限运清单 KB；`profile`。  
**实现状态**：**待配置**（KB+LLM + 可选 `facts_compliance` 只读；nodes/export/单测已通）。  
**降级**：KB 规则表；无法判定 → `need_human`。

| 层级 | Expert | 覆盖 |
|------|--------|------|
| 浅层 | `registration-guide` / `guide_unban` | 已有明确禁止标记时：指引补资料、改属性、看待办；`prohibitSource=manual` → 优先 `need_human` |
| 深判 | `compliance-check` | 无现成标记或规则未覆盖：品类/国别细则、申报要素、证书齐备、解禁**条件是否满足**的判定 |

**P2 触发条件（满足任一即立项）**：
1. `registration-guide` 中 `handoff_compliance` 占比 >15% 且需独立 Prompt；
2. 产品要求禁限运/证书/申报 API 化验收；
3. 「商品能否承运」深判无法由 flows/01 浅层 + 人工闭环满足（该场景已占咨询群 **~25%**）。

**P1 分工说明**：承运类咨询首期由 `registration-guide` 执行 flows/01 浅层（清单查询 + 引导注册 + 任务单登记），**不阻塞 P1 上线**。

---

### `sku/barcode-guide`（P2 · 已实现待配置）

**问**：如何打印 Winit 标签；**添加 / 删除 / 查看**第三方商品码与单品条码（含 FNSKU 绑定）；为何仓库扫不上；待办「缺第三方商品条码」如何补。  
**不问**：包裹条码异常增值作业（→ `value-add`）；SKU 注册本身（→ `registration-guide`）。  
**衔接**：`inbound-exception-check` / 条码类异常根因为未绑码时，先路由本专家；咨询群「删除三方编码」归本专家。  
**输入**：`topic` 或 `intentType`（`print` / `third_party_add` / `third_party_delete` / `third_party_query` / `scan_fail`）；可选 `skuCode`（与打标入参 `productCode` 同义）、`supervisorMode`、`skuCodeThird`。  
**输出**：`structured.branch`、`sopSteps`、`analysis`。  
**依赖**：打标 API 文档；OSWH 第三方条码 `08`–`11`（首期作 KB，未接插件）。  
**实现状态**：**待配置**（KB+LLM 已落地；**不代客**打标/绑码/删码；删除 OpenAPI 文档 Gap → 自助+人工）。  
**降级**：纯 KB 操作指引。

**备注**：待办「缺第三方商品条码」与加急原因「急需打印条码」中，后者加急入口仍由 `registration-guide` 承接；绑码/删码操作指引归本专家。触发条件已满足并完成 Phase 3 实现，不再阻塞立项。

---

### `sku/inspection-status`（P2）

**问**：某 SKU / 查验单的**验货进度、结论、需补资料**是什么？结论如何影响发布或入库？  
**不问**：注册加急与审核 SLA（→ `registration-guide`）；禁限运深判（→ `compliance-check`）；在库数量（→ `storage`）；SKU 档案静态属性只读（→ `profile`）。  
**衔接**：`registration-guide` 的 `handoff_inspection`；客服查验争议可直达本专家。  
**输入**：`skuCode` 或 `checkOrderId`；可选 `customerCode`、`importCountryCode`。  
**输出**：`structured.inspectionStatus`、`conclusion`、`requiredActions[]`、`analysis`；建议带 `confidence`。  
**依赖**：查验单查询 API（**Gap**）；KB 话术；不依赖知识图谱。  
**降级**：指引万邑联/TOM 自助查看路径 + 人工；API 未就绪时纯 KB。

**P2 触发条件（满足任一即立项）**：
1. `registration-guide` 中 `handoff_inspection` 需独立 Prompt；
2. 查验单查询 API 就绪且客服要求自动化解释进度/结论；
3. 查验类咨询量足以支撑独立专家验收。

---

## 三、`sku/profile` 输出契约（草案）

```json
{
  "skus": [
    {
      "skuCode": "SKU001",
      "code": null,
      "specification": null,
      "supervisorMode": "SI | SKU",
      "type": null,
      "itemPackaging": "LOGISTICS | SALES | NUDE_CARGO",
      "isActive": "Y | N",
      "publishStatus": "published | draft | returned | inactive",
      "prohibitInbound": false,
      "prohibitOutbound": false,
      "prohibitReason": null,
      "prohibitSource": "rule | manual | unknown",
      "prohibitInboundReason": null,
      "directShipmentRestriction": "unlimited | seller_direct",
      "restrictionReason": null,
      "rejectReason": null,
      "itemType": "small | medium | large | oversized",
      "registeredDimensions": { "length": 10, "width": 8, "height": 5, "weight": 0.5, "unit": "kg" },
      "verifiedDimensions": null,
      "specialFlags": {
        "isBattery": true,
        "isWithLiquid": false,
        "isWithPowder": false,
        "isWithMagnetism": false,
        "isFood": false,
        "isDangerous": false,
        "isFragile": false
      },
      "managementMode": {
        "supervisorMode": "SI | SKU",
        "isBatchManager": false,
        "batchManagerType": null,
        "hasExpiry": false
      },
      "applicableRules": ["带电品需填报电池信息"],
      "handlingRequirements": [],
      "dataSource": "api | derived | kb",
      "confidence": "high | medium | low"
    }
  ],
  "missingFacts": []
}
```

| 字段组 | 要点 |
|--------|------|
| 标识（OpenAPI） | **`skuCode`**＝商品编码（canonical）；注册/打标同义 **`productCode`**；**`code`**＝商品条码（M 码）；可选 `specification` |
| 管理/包装（OpenAPI） | **`supervisorMode`**：`SI`（单品化）/ `SKU`（商品化）；箱套 **`type`**：`BOX` / `SUITE` / `null`（普通商品）；入库包装 **`itemPackaging`** |
| 禁限 | `prohibitInbound` / `prohibitOutbound`、`prohibitReason`（或分侧 `prohibitInboundReason`）、`prohibitSource`（契约扩展，API 常无此字段） |
| 派生 | `itemType`（货型）由尺重 + KB 计算，非 OpenAPI 直出；特殊属性对齐 `isBattery` / `isWithLiquid` 等 |

> `prohibitSaleReason`（如缺 GPSR）首期可不进 profile 契约；禁售**操作引导**在 `registration-guide` / P2 `compliance-check`，**库存数量**在 `storage`。  
> 查验单进度**不**进入本契约。

实现规格：[`experts/sku/profile/design.md`](../experts/sku/profile/design.md)

---

## 四、路由速查

```
客户问 SKU 加急 / 审核多久              → sku/registration-guide（guide_expedite）
客户问新品能否发/能否入（有链接无 SKU） → sku/registration-guide（guide_carriability）
客户问怎么注册 / 批量 / 退回怎么改      → sku/registration-guide
客户问为何限直发 / 不能下头程单         → sku/profile + sku/registration-guide
客户问取消带电/液体/磁等属性            → sku/registration-guide（guide_attribute_change）
客户问商品属性/件型/管理模式（事实）     → sku/profile（按 skuCode）
客户问禁止入库/出库 / 禁售原因（为何被拦）→ sku/profile + sku/registration-guide（guide_unban）
客户问怎么解禁（浅层 SOP）              → sku/registration-guide（guide_unban）；人工来源 → need_human
客户问某国能否入 / WEEE/申报/解禁深判   → sku/compliance-check（P2）
客户问验货单进度 / 查验结论             → sku/inspection-status（P2）
客户问怎么打标 / 绑 FNSKU / 增删查三方编码 → sku/barcode-guide（入参 skuCode / productCode 同义；已实现待配置）
客户问在库多少                          → storage/inventory-query
客户问有库存但不能出                    → storage（数量）+ sku/profile（禁出事实）
客户问 SKU 额度还剩多少                 → inbound/inbound-capacity-availability
客户问出库打包方式怎么改               → inbound/outbound（outPackaging*，空缺）；入库 itemPackaging / 箱套 type → profile
```

决策树详见 [playbook.md §二](../sku/playbook.md)。

---

## 五、设计评审状态（how-to-design-expert 步骤 9）

| 检查项 | 状态 |
|--------|------|
| Expert ID、domain 符合 [domain-taxonomy.md](domain-taxonomy.md) | 通过 |
| 边界卡覆盖咨询群 Top5（加急/承运/直发/退回/属性） | **已按咨询群数据修订（2026-07-10）** |
| OpenAPI 命名（skuCode/productCode/supervisorMode）、禁限来源、解禁、查验、包装两分 | **已按 OpenAPI 命名修订（2026-07-13）** |
| [sku-api-matrix.md](sku-api-matrix.md) 含直发/退回/SLA/历史清单/查验/禁限来源 Gap | 已修订 |
| Playbook：`docs/sku/playbook.md` + `flows/01–07` | 已对齐 |
| `docs/experts/sku/*.md` + P1/P2 已实现专家 `design.md` | 已同步（含 [expert-manual.md](../experts/sku/expert-manual.md)） |
| P2 触发条件含真实占比说明 | 已修订；`barcode-guide` 已实现 |
| 实现（manifest/workflow/export/单测） | **`profile` / `registration-guide` / `barcode-guide` / `compliance-check` → 待配置**；`inspection-status` 仍待规划 |

---

## 六、场景覆盖映射（咨询群 → Expert）

| 占比 | 场景 | Expert |
|-----:|------|--------|
| 61% | SKU 注册加急 | `registration-guide` |
| 25% | 商品能否承运/入库 | `registration-guide`（浅层）/ P2 `compliance-check`（深判） |
| 3% | 直发原因 | `profile` + `registration-guide` |
| 2% | 退回原因 | `registration-guide` |
| <2% 各 | WEEE/禁售/属性解除/证书/解禁 | `registration-guide` + P2 `compliance-check` |
| — | 查验进度 | P2 `inspection-status` |

完整表：[sku-data.md §二](sku-data.md) · [consultation-taxonomy.md](../sku/scenes/consultation-taxonomy.md)

---

## 七、运行约定：置信度与升级

> 摘自飞书 AI 客服设计思路，落到 branch / `need_human`；**不是**知识图谱检索置信度。

| `confidence` | 含义 | 典型条件 |
|--------------|------|----------|
| `high` | 有 API/明确 KB 规则支撑 | profile API 命中；加急 SLA 字段可读；flows 标准话术 |
| `medium` | 部分字段派生或规则模糊 | merchandise 派生；禁限来源 `unknown`；承运浅层需客户自助查清单 |
| `low` | 信息不足或争议边界 | 缺 SKU/国别；深判无规则命中 |

| 条件 | 动作 |
|------|------|
| `prohibitSource = manual` | 解禁不自助闭环 → `need_human`（可附「联系客服解禁」话术） |
| 查验结论争议 / 需人工复检 | `handoff_inspection` 或 `need_human` |
| 禁限运/申报深判无 KB 覆盖 | `handoff_compliance` → P2；P2 仍无法判 → `need_human` |
| `confidence = low` 且缺关键入参 | `need_info`；补参后仍低 → `need_human` |
| 客户要求代操作写入 | `need_human`（专家不代写 API） |

对客用 `analysis`；下游专家读 `structured` / `enrichedContext`。
