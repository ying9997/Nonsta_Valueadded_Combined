# SKU 域商品数据拉取策略（API 选型 + 剪枝）

> 接口 SoT：[winit-item-page-list.md](../sku/raw/api/winit-item-page-list.md)  
> 关联：[sku-api-matrix.md](sku-api-matrix.md) · [sku-plan.md](sku-plan.md) · inbound 同类模式：[inbound-getOrderDetail-detail-strategy.md](inbound-getOrderDetail-detail-strategy.md)

---

## 1. 问题与原则

`winit.item.page.list` 单条商品响应可含 `declarations[]`、`attributes[]`（数十项）、`sizeWeight`、`outPackaging`、`skuCodeThirds` 等，**批量查询时 JSON 体积大**。插件层仍会收到完整响应，因此：

1. **按需求选 API** — 不一律打最重接口。
2. **请求侧收窄** — `skuCodes` 批量、`importCountryCode`、`queryType`、必要时 `querySupplementType`。
3. **代码节点内立即剪枝** — 映射为专家契约前剥离无关字段；**禁止**把原始 `list[]` 传入 LLM。
4. **确定性映射优先** — 档案/状态类字段在代码节点算好，LLM 只吃 KB + 剪枝后摘要。

---

## 2. API 选型矩阵（按需求动态选择）

| 数据需求 | 首选 API | 备选 / 降级 | 不用 |
|----------|----------|-------------|------|
| 商品档案事实（尺重、特殊属性、管理模式、发布态、禁入、限直发） | **`winit.item.page.list`** + `fetchProfile=facts_core` | `winit.mms.item.list`（遗留，字段少） | — |
| 审核进度 / 应维护完成时间 / 是否加急 | **`winit.item.page.list`** + `fetchProfile=audit_status`（读 `attributes` 动态字段 `estimateAuditDate` / `isUrgent`） | `mms.itemmttask.queryItemMtEntitys`（仅维护任务状态/退回分类，**无**应维护完成时间） | 两接口同时打（除非 audit 切片缺字段） |
| 审核退回原因 + 对客话术 | **`winit.item.page.list`** + `fetchProfile=audit_status`（`declarations` 按国别 + status 规则） | `queryItemMtEntitys` 的 `mtBackReason` | — |
| 三方码是否已绑 / 缺三方码清单 | **`winit.item.page.list`** + `fetchProfile=barcode_third`；清单场景 `querySupplementType=SUPPLEMENT_THRID_SKU` | 条码 OpenAPI `10`/`11`（单品级明细，更重） | 全量 `facts_core` |
| 新品承运 / 合规浅层（危险品按国别） | `page.list` + `fetchProfile=facts_compliance` | KB only | — |
| 仅维护任务列表（无 skuCode、按时间扫） | `queryItemMtEntitys` | — | `page.list` 无 sku 时不宜用 |

**迁移决策**：`sku/profile` 主路径从 `winit.mms.item.list` **升级为** `winit.item.page.list`；`mms.item.list` 保留为 **legacy 降级**（代理未注册 page.list 时）。

---

## 3. `fetchProfile` 切片（跨专家 inputs）

在 `sku/profile` 的 `inputs` 增加可选字段 **`fetchProfile`**（默认 `facts_core`）。`registration-guide` / `barcode-guide` 内部调 profile 或自建 fetch 节点时透传。

| fetchProfile | 典型调用方 | 请求侧重 | 映射输出侧重 |
|--------------|------------|----------|--------------|
| `facts_core` | profile、inbound 前置、value-add | `skuCodes` + `importCountryCode?` | 发布态、管理模式、尺重件型、特殊属性、禁入、限直发 |
| `audit_status` | registration-guide：`expedite` / `audit_status` / `resubmit` | 同上；`queryType` 可为 `REGISTERING` | `publishStatus`、`estimateAuditDate`、`isUrgent`、`rejectReason`、`standardScript` |
| `barcode_third` | barcode-guide：绑码/查码/扫不上 | 单 `skuCode` 或 `thirdItemCodes` | `supervisorMode`、`skuCodeThirds`、`isSupportThirdSku` |
| `supplement_third_sku` | barcode-guide / 待办「缺三方码」 | `querySupplementType=SUPPLEMENT_THRID_SKU`，`pageSize≤50` | `skuCode` 列表摘要（无 LLM 全量） |
| `facts_compliance` | registration `handoff_compliance`、未来 compliance-check | `importCountryCode` **建议必填** | `dg`、按国别危险品、`itemLink`、`hsCode`（申报级） |
| `minimal` | 仅需存在性 / 发布态 | 最小请求 | `skuCode`、`status`、`publishStatus` 仅 |

**registration-guide 意图 → fetchProfile 默认映射**：

| intentType | fetchProfile | 是否建议先调 profile |
|------------|--------------|----------------------|
| `expedite` / `audit_status` | `audit_status` | 有 `skuCode` 时是 |
| `resubmit` | `audit_status` | 是 |
| `blocked_inbound` / `unban` / `direct_shipment` | `facts_core` | 是 |
| `carriability` / `register` / 纯 KB 引导 | 无 API 或 `minimal` | 否 |
| `attribute_change` | `facts_core` | 有 `skuCode` 时可选 |

**barcode-guide 意图 → fetchProfile**：

| intentType | fetchProfile |
|------------|--------------|
| `print` / `third_party_add` / `scan_fail` | `barcode_third` 或 `facts_core`（仅 `supervisorMode`） |
| `third_party_query` | `barcode_third` |
| 待办缺三方码（topic 识别） | `supplement_third_sku` |

---

## 4. 请求侧收窄（build 节点）

### 4.1 通用

```json
{
  "action": "winit.item.page.list",
  "version": "2.0",
  "data": {
    "skuCodes": ["SKU-A", "SKU-B"],
    "importCountryCode": "US",
    "pageVo": { "pageNo": 1, "pageSize": 20 }
  }
}
```

| 规则 | 说明 |
|------|------|
| 批量 `skuCodes` | 一次请求最多 **20** 个编码；禁止 per-sku 循环（现状 `build-winit-item-list` 需改） |
| `pageSize` | `min(skuCodes.length, 20)`，不超过 100 |
| `importCountryCode` | 有则必传，用于申报/属性按国别解析 |
| `conditionQueryType` | 默认 `equals` |

### 4.2 按 fetchProfile 追加

| fetchProfile | 额外请求字段 |
|--------------|--------------|
| `audit_status` | `queryType`: `REGISTERING`（可选，缩小结果集） |
| `supplement_third_sku` | `querySupplementType`: `SUPPLEMENT_THRID_SKU`；不传 `skuCodes` 或仅分页 |
| `barcode_third` + 已知三方码 | `thirdItemCodes`: `["FNSKU-xxx"]` |
| `minimal` | 仅 `skuCodes` + `pageVo` |

---

## 5. 响应剪枝（`prune-item-page-list.ts`）

在 **`fetch-sku-profile` 之后、`derive-from-context` 之前**（或合并入 derive）执行。参考 inbound `extract-inbound-detail` / outbound `prune-outbound-json`。

### 5.1 永不进入 LLM 的字段

整段删除或不在映射中保留：

- `outPackaging[]`（旅程域；sku 默认不需要）
- `translates[]`
- `categoryId`、`description`、完整 `attributes[]` 原始数组
- 申报中 `declarePrice`、`importRate`、`supervisionCondition` 等（除非 `facts_compliance`）
- 未匹配进口国的 `declarations[]` 条目

### 5.2 按 fetchProfile 保留（映射前）

| 源路径 | facts_core | audit_status | barcode_third | facts_compliance |
|--------|------------|--------------|---------------|------------------|
| `skuCode` / `code` / `status` / `isActive` | Y | Y | Y | Y |
| `sizeWeight.register*` + `cargoTypeSpec*` + `pieceTypeSpec` | Y | — | — | — |
| `sizeWeight` 实测 `length/weight/...` | 可选 | — | — | — |
| `attributes` → 扁平化白名单 | 见 §5.3 | `estimateAuditDate`,`isUrgent`,`mtTaskNo` | `supervisorMode`,`isSupportThirdSku` | `dg`,`itemLink`,… |
| `declarations[]` 单国别一条 | `firstLegType`,`isProhibitWarehousing` | `returnReason`,`standardScript`,`status`,`changeStatus` | — | `hsCode`,`declareName` |
| `skuCodeThirds` | — | — | Y | — |

### 5.3 `attributes` 扁平化白名单（facts_core）

只提取以下 `attributeName`（`areaCode` 匹配 `importCountryCode` 或 `ALL` 或 `null`）：

`supervisorMode`, `packaging`, `batchManagement`, `batchManagementType`, `battery`, `liquid`, `powder`, `magnetism`, `food`, `withBlades`, `dg`, `dangerousLabel`, `firstLegType`, `fragileLabel`, `itemPackagingMaterial`, `itemShape`, `parcelType`, `hasSuitBoxItem`, `isReturn`, `isPreSaleItem`

**不保留**完整 URL 的 `itemLink` 进 LLM（可进 structured 供合规 handoff 截断存储）。

### 5.4 申报退回字段生效规则（SoT）

仅当以下成立时映射 `returnReason` / `standardScript` / `supplementReason`：

```text
(status === 5) || (status === 4 && changeStatus === 5)
```

否则**忽略**（历史残留，禁止展示给客户）。

### 5.5 限直发 / 禁入映射

| 源 | 契约 |
|----|------|
| `declarations.firstLegType` 或 `attributes.firstLegType` = `NS` | `directShipmentRestriction: seller_direct` |
| `NL` | `unlimited` |
| `PI` | 配合 `prohibitInbound` |
| `declarations.isProhibitWarehousing` = `Y` | `prohibitInbound: true` |

### 5.6 发布态映射（替代仅看 isActive）

| `status` | `publishStatus` |
|----------|-----------------|
| 1 / 2 | `draft` |
| 3 | `auditing` |
| 4 | `published` |
| 5 | `returned` |
| 6 | `inactive` |

### 5.7 大单与超长文本防护

| 条件 | 行为 |
|------|------|
| `skuCodes.length > 20` | validate 拒绝，提示分批 |
| `supplement_third_sku` 且 `totalCount > 100` | 仅返回前 100 条 `skuCode` + `_fetchMeta.truncated=true` |
| `standardScript` 长度 > 2000 | structured 保留全文；**传入 LLM 的 `auditStatusHint` 截断至 500 字** +「详见万邑联」 |
| 插件超时 / API 失败 | 降级 `merchandise` 派生或 KB-only；`missingFacts` 标明 |

### 5.8 `_fetchMeta` 契约（调试与降级）

```json
{
  "action": "winit.item.page.list",
  "fetchProfile": "facts_core",
  "requested": 2,
  "found": 2,
  "strategy": "page-list-batch",
  "pruned": true,
  "droppedSections": ["outPackaging", "translates", "rawAttributes"],
  "warning": null
}
```

---

## 6. 专家 DAG 调整（设计级）

### 6.1 `sku/profile`

```text
validate-sku-codes
  → resolve-fetch-plan（新增：fetchProfile + build page.list 请求）
  → [Winit 插件] winit.item.page.list
  → fetch-sku-profile
  → prune-and-map-item（新增：剪枝 + 映射 page.list 嵌套结构）
  → derive-from-context（保留 merchandise 降级）
  → calc-item-type-from-kb
  → format-output
```

`inputs` 新增：`fetchProfile?: string`（默认 `facts_core`）。

### 6.2 `sku/registration-guide`

```text
validate-intent
  → resolve-audit-fetch（新增：有 skuCode 且 intent∈{expedite,audit_status,resubmit,blocked_inbound,direct_shipment,unban}）
  → [可选] 内调 profile 快照或轻量 page.list audit_status 切片
  → load-sku-kb
  → llm-analyze（仅 kbContent + auditStatusHint + profileSnapshot 剪枝摘要）
  → format-output
```

- **移除** `fetch-audit-status` 对 `queryItemMtEntitys` 的硬依赖（首期 stub 改为 page.list 切片）。
- `auditStatusHint` 由映射节点生成（含 `estimateAuditDate` 文案），非原始 API JSON。

### 6.3 `sku/barcode-guide`

- `third_party_query` / `print`：有 `skuCode` 时 `fetchProfile=barcode_third`（只读 `skuCodeThirds` + `supervisorMode`）。
- 缺三方码待办：`supplement_third_sku` 列表 → LLM 只收「共 N 个 SKU 待补」+ 前 10 个示例编码。

---

## 7. LLM 输入边界（硬约束）

| 专家 | 可传入 LLM 的 API 衍生字段 |
|------|---------------------------|
| registration-guide | `auditStatusHint`（字符串）、`profileSnapshot`（契约 `skus[]` 子集，无 raw API） |
| barcode-guide | `barcodeSnapshot`（`skuCodeThirds`、`supervisorMode`） |
| profile | **无 LLM 节点** |

`profileSnapshot` 传给 registration-guide 时建议 **单 SKU ≤ 15 个字段**，勿传完整 `skus[]` 历史。

---

## 8. 与 `queryItemMtEntitys` 的分工（更新）

| 能力 | page.list | queryItemMtEntitys |
|------|-----------|-------------------|
| 应维护完成时间 | `attributes.estimateAuditDate`（动态注入） | **无** |
| 退回原因（对客话术） | `declarations.standardScript` + 状态规则 | `mtBackReason`（短分类） |
| 维护任务状态 DR/PD/CO/BK | 商品 `status` + 申报 `status` | `status` 枚举 |
| 按 skuCode 精确查 | Y | Y |
| 无 skuCode 按时间范围扫 | 需时间范围，重 | **适合** |

**结论**：有 `skuCode` 的加急/退回/发布态场景 **优先 page.list**；仅当 `estimateAuditDate` 缺失且需维护任务列表时用 `queryItemMtEntitys` 补充。

---

## 9. 实施顺序

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | profile：`page.list` 批量请求 + `prune-and-map` + `facts_core` 映射 | **已落地**（2026-07-15） |
| P1 | registration-guide：`audit_status` 切片 + `estimateAuditDate` / 退回话术 | **已落地** |
| P2 | barcode-guide：`barcode_third` + `supplement_third_sku` | **已落地** |
| P3 | `facts_compliance` 切片（已由 compliance-check 使用）；legacy `mms.item.list` 下线 | 部分落地 |

---

## 10. 变更记录

| 日期 | 变更 |
|------|------|
| 2026-07-15 | 初版：page.list 选型、fetchProfile 切片、剪枝规则、专家 DAG 调整 |
| 2026-07-15 | **代码落地** P0–P2：`shared/sku-item-page-list.ts`；profile / registration-guide / barcode-guide 节点 + 单测 + export |
