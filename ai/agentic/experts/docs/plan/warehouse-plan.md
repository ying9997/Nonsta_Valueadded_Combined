# warehouse 域 Experts 规划

> **`warehouse` 域**：仓库**设施与运营状态**（库容、Slots、承接能力、运营公告等），跨 `inbound` / `storage` / `outbound` 共用。  
> **不是**「库内作业全流程」——库内作业按客户旅程拆在 `inbound`、`storage`、`outbound` 等域，见 [domain-taxonomy.md](domain-taxonomy.md)。

---

## 一、专家状态追踪

> 最左列：`[ ]` 未完整 · `[x]` 已完整（manifest、workflow、prompt、可被上游调用齐备）。  
> 当前状态：`待规划` / `设计中` / `开发中` / `待配置` / `已完成` / `阻塞`

| [ ] | 优先级 | Expert ID | 目标完成 | 当前状态 | 需要 API | API 就绪度 | 主要依赖 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ ] | P1 | `warehouse/capacity-signal` | 2026-07 | 待规划 | 是 | 0% | 库容配置 API、Slots 排期、承接能力矩阵；被 `inbound/inbound-capacity-availability`、`inbound/inbound-putaway-expedite` 等调用 |
| [ ] | P2 | `warehouse/operations-status` | 待定 | 待规划 | 是 | 0% | 运营公告、爆仓/节假日/系统维护；触发条件：公告类咨询量级达到需要 |

---

## 二、`warehouse/capacity-signal`

### 定位

不直接对客，作为共享专家被多个旅程域调用，输出仓库当前承接状态的结构化判断（温度、剩余库容、可约 Slots 等）。

### 适用调用场景

- `inbound/inbound-capacity-availability`：客户问剩余库容、能否预约、能否收这批货
- `inbound/inbound-putaway-expedite`：判断仓库拥堵是否导致上架延迟
- 未来 `outbound`：出库产能/截单压力（若与库容规则联动）

### 输入

| 字段 | 类型 | 说明 |
|---|---|---|
| `warehouseCode` | string | 仓库编码 |
| `customerCode` | string | 客户编码（用于查询该客户的额度占用） |
| `itemType` | string（可选） | 货型（标准件/大件/超大件），用于承接能力判断 |
| `requestedCbm` | number（可选） | 拟入库 CBM，用于判断是否超限 |
| `requestedDate` | string（可选） | 拟预约日期，用于 Slots 温度判断 |

### 输出

```json
{
  "capacityTemperature": "green | yellow | orange | red | grey",
  "slotsTemperature": "green | yellow | orange | red | grey",
  "acceptabilityTemperature": "green | yellow | orange | red | grey",
  "remainingCbm": 120.5,
  "usedCbm": 379.5,
  "totalCbm": 500,
  "remainingSkuSlots": 30,
  "slotsAvailableDates": ["2026-06-05", "2026-06-06"],
  "restrictionDetails": ["大件仓当前暂停接收超大件"],
  "suggestedActions": ["拆批入库", "预约 06-05 时段"]
}
```

### 温度档位定义

| 档位 | 含义 |
|---|---|
| 🟢 green | 可承接，库容 / Slots 充足 |
| 🟡 yellow | 可承接但紧张，存在时效延长风险 |
| 🟠 orange | 承接受限，部分货型 / 时间段不可用 |
| 🔴 red | 暂不可承接，已触发硬限制 |
| ⬜ grey | 数据缺失或规则未配置，无法判断 |

### 数据来源

- 仓库库容配置（客户 CBM 额度、已用量）
- Slots 排期系统（入库预约使用率）
- 仓库承接能力矩阵（仓型、货型、送仓方式、服务限制）
- 运营公告（临时限制、爆仓通知）

---

## 三、`warehouse/operations-status`（规划占位）

播报仓级运营事件：爆仓、节假日、系统维护、临时停收等。与 `capacity-signal` 区分：后者是**量化温度**，前者是**公告与规则变更**的文本/结构化摘要。

---

## 四、不属于本域的能力

| 能力 | 应归属域 | 说明 |
|---|---|---|
| 在库库存查询 | `storage` | 货已在仓内的数量/库位，见 [storage-plan.md](storage-plan.md) |
| 库内丢失核实 | `storage` | OKR 7 月 `inventory-loss`，在库环节异常 |
| 入库单/上架进度 | `inbound` | 对客业务流程，非仓级聚合 |
