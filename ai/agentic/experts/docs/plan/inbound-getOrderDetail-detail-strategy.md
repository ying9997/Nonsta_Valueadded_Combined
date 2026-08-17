# 入库单 getOrderDetail 详情分层策略

> 官方文档：[查询入库单详情 id/39](https://developer.winit.com.cn/document/detail/id/39.html)  
> Action：`winit.wh.inbound.getOrderDetail`  
> 关联：[Inbound API 矩阵](inbound-api-matrix.md) · [入库轨迹 API](inbound-tracking-api.md)

---

## 1. 已确认约束（2026-06）

| 约束 | 说明 |
|------|------|
| **`isIncludePackage=N`** | **不返回** 根级 `merchandiseList`、**不返回** `packageList`；仅订单表头（含 `totalMerchandiseQty`、`totalPackageQty`、`status`、`shelveCompletedDate` 等汇总字段） |
| **`isIncludePackage=Y`** | 返回 **`packageList`**（包裹树）+ 根级 **`merchandiseList`**（按 SKU 汇总）+ 包裹内 `merchandiseList` / 可选 `itemList`（单品码） |
| **无包裹分页 API** | 必须一次拉取全量 `packageList`；大柜/上万件时 **网络与插件层仍会收到完整 JSON**，只能在代码节点内**立即剥离/剪枝**，**禁止**将原始 `packageList` 传入 LLM |
| **轨迹** | 不在本接口；见 `wh.tracking.queryOrderTracking` |

### 请求体示例

```json
{
  "action": "winit.wh.inbound.getOrderDetail",
  "data": {
    "orderNo": "WI49616707",
    "isIncludePackage": "Y"
  }
}
```

### 字段对照（与旧设计对齐）

| 官方 id/39 | 历史设计/代码中的名称 | 说明 |
|------------|----------------------|------|
| `packageList` | `inboundPackageVos`（待改） | 包裹列表 |
| `merchandiseList`（根级） | `inboundMerchandiseVos`（待改） | 订单级 SKU 汇总上架进度 |
| `merchandiseList[].actualQuantity` | — | SKU 实际上架数量（箱套需 × `standardPartsNum`） |
| `packageList[].merchandiseList[].itemList[]` | — | 单品码 `itemSerno` + `status`（SCP=已上架等） |

---

## 2. detailLevel 约定（跨专家 inputs）

| detailLevel | isIncludePackage | 代码节点处理后留给 LLM | 典型专家 |
|-------------|------------------|------------------------|----------|
| `header` | N | 仅表头 + 轨迹（若有） | `inbound-order-status`、`inbound-arrival-status`（仅阶段） |
| `sku_summary` | Y → **丢弃 `packageList`** | 根级 `merchandiseList` + **`aggregate-sku-putaway` 聚合** | `inbound-putaway-status`（默认） |
| `sku_filtered` | Y → 丢弃 `packageList` | 根级 `merchandiseList` 按 `targetMerchandiseCodes[]` 过滤后聚合 | `inbound-putaway-status`、`inbound-exception-check` |
| `package_summary` | Y | **不保留**包裹商品明细；`aggregate-package-putaway` 按 `package.status` / `shelvesTime` 统计 | `inbound-arrival-status`（少包裹/到齐） |
| `package_detail` | Y | 剪枝后 `packageList`（见 §3） | `inbound-arrival-status`、`inbound-exception-check`（客户给箱号） |
| `item_lookup` | Y | 本地过滤 `itemList`，仅保留 `targetItemSernos[]` 命中行 | `inbound-exception-check`、单品化管理 |

**默认原则**：能 `header` 就不 `Y`；必须 `Y` 时**第一个代码节点**就剥离 `packageList`（除非 `package_*` / `item_lookup`）。

---

## 3. 剪枝与聚合（无分页下的必做）

参考出库 [`experts/outbound/outbound-order-status/nodes/prune-outbound-json.ts`](../../experts/outbound/outbound-order-status/nodes/prune-outbound-json.ts)。

### 3.1 节点 `extract-inbound-detail.ts`（新建，共享逻辑）

在 `fetch-inbound-order` / `merge` 之后、`prune-inbound-json` 之前（或合并进增强版 prune）：

1. 读 `totalPackageQty`、`totalMerchandiseQty` 做**大单防护**
2. 按 `detailLevel` 分支：
   - `header`：删除 `packageList`、`merchandiseList`（若误返回）
   - `sku_*`：保留根级 `merchandiseList`，**删除整段 `packageList`**
   - `package_*`：保留剪枝后 `packageList`，根级 `merchandiseList` 可选保留
   - `item_lookup`：遍历 `packageList` 过滤 `itemList`，仅保留命中包裹
3. 写 `_detailExtractMeta`：`{ detailLevel, originalPackageCount, packagesDiscarded, merchandiseRowCount, … }`

### 3.2 包裹剪枝参数（仅 `package_detail`）

| 参数 | 默认 | 说明 |
|------|------|------|
| `maxPackagesPerOrder` | 50 | 超出时按「未上架优先、最近 `shelvesTime`/`unloadingTime`」排序截断 |
| `maxMerchandisePerPackage` | 20 | 超出写 `_remainingCount` 占位行 |
| `includeItemList` | false | 默认删除 `itemList`；`item_lookup` 时 true 且仅保留命中 |

### 3.3 大单防护（无分页）

| 条件 | 行为 |
|------|------|
| `totalPackageQty > packageFetchThreshold`（建议 200）且 `detailLevel` 为 `package_detail` / `item_lookup` | **不展开包裹**；`structured.requiresNarrowing=true`；对客说明需提供 **箱号 `sellerCaseNo` / 包裹条码 `packageNo` / SKU / 单品码** |
| `totalPackageQty > threshold` 且 `detailLevel=sku_summary` | 仍可调 `Y`（API 会下全量包裹），但 **`extract` 立即删 `packageList`**，仅保留根级 `merchandiseList`；`_detailExtractMeta.largeOrderSkuOnly=true` |
| 插件超时风险 | 记录 `_fetchMeta.warning`；链式编排优先复用上游已 extract 的 `rawOrderData` |

### 3.4 确定性聚合（LLM 只吃 summary）

**`aggregate-sku-putaway.ts`**（输出示例）：

```json
{
  "totalSkus": 120,
  "completedSkus": 98,
  "partialSkus": 5,
  "pendingSkus": 17,
  "putawayRate": 0.82,
  "anomalySkus": [{ "merchandiseCode": "SKU-A", "quantity": 100, "actualQuantity": 80 }],
  "targetSkusOnly": false
}
```

**`aggregate-package-putaway.ts`**：

```json
{
  "totalPackages": 8500,
  "byStatus": { "UD": 120, "SCP": 8200, "STOP": 10 },
  "recentUnshelvedSample": [{ "packageNo": "B04…", "status": "UD", "unloadingTime": "…" }]
}
```

---

## 4. 专家消费矩阵

| Expert | 默认 detailLevel | isIncludePackage | 上架/数量数据源 |
|--------|------------------|------------------|-----------------|
| `inbound-order-status` | `header` | N | 表头 `status`、`shelveCompletedDate`；轨迹另查 |
| `inbound-putaway-status` | `sku_summary` | Y（extract 丢 packageList） | 根级 `merchandiseList[].actualQuantity` |
| `inbound-putaway-expedite` | `sku_summary`（加急 SKU 列表）/ `header`（仅 SLA） | Y 或 N | SLA 用表头；`canRush` SKU 来自 `merchandiseList` |
| `inbound-exception-check` | `sku_summary` → 有差异再 `package_detail` | Y | 四层数量 + SKU 差异；包裹级下钻 |
| `inbound-arrival-status` | `header`；问包裹时 `package_summary` / `package_detail` | N / Y | 到仓看表头+轨迹；包裹到齐看 `packageList` 统计 |
| `inbound-appointment-manage` | `header` | N | `bookingNo`、`inboundBookingStatus` |

---

## 5. build-winit-inbound-detail 改造要点

`data` 除 `orderNo` / `customerOrderNo` 外增加：

```json
{
  "orderNo": "WI49616707",
  "isIncludePackage": "Y"
}
```

由 `detailLevel` 映射：`header` → `"N"`；其余 → `"Y"`。

---

## 6. 待办（实现跟踪）

- [x] 统一字段名：`packageList` / `merchandiseList`（`normalizeInboundOrderFields` + extract 节点）
- [x] 新增 `extract-inbound-detail.ts`、`aggregate-sku-putaway.ts`、`aggregate-package-putaway.ts`（`shared/inbound-get-order-detail.ts` + 各 expert 薄封装）
- [ ] 各专家 `manifest.inputSchema` 增加 `detailLevel`、`targetMerchandiseCodes`、`targetPackageNos`、`targetItemSernos`（部分已加）
- [ ] 实测：`isIncludePackage=Y` 且 `totalPackageQty` 极大时 Coze 插件超时阈值
