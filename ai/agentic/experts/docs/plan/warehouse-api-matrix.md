# Warehouse 域 API 矩阵（骨架）

> 关联文档：[warehouse-plan.md](warehouse-plan.md)（待创建）  
> 版本：2026-06  
> 说明：本文件记录 `warehouse` 域共享专家的 API 场景，供 inbound 等域引用。action 标注 `[待确认]` 的项需研发从官方文档或内部接口清单核实。
>
> **注意区分**：`warehouse/capacity-signal` 提供**仓级**库容温度/Slots（面向所有客户的排期视角），与 `inbound/inbound-capacity-availability` 提供的**客户 CBM/SKU 额度**（面向单一客户的配额视角）不同，后者写入 [inbound-api-matrix.md](inbound-api-matrix.md)。

---

## 一、`warehouse/capacity-signal`

**定位**：提供仓库维度的实时库容温度、可预约 Slots 排期、承接能力状态。不直接对客，被多个 inbound 专家调用。

### inbound 侧消费方

| inbound 专家 | 调用场景 |
|---|---|
| `inbound/inbound-capacity-availability` | 综合判断「能不能收这批货」时，叠加仓级 Slots 温度 |
| `inbound/inbound-appointment-manage` | 判断指定日期 Slot 是否可约 |
| `inbound/inbound-putaway-expedite` | 判断仓库当前是否拥堵，影响催架策略 |

### API 场景

| 场景 ID | 触发需求 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `warehouse.capacity-signal.temperature` | 查询某仓当前库容温度（🟢/🟡/🟠/🔴） | 库容管理系统 | `queryWarehouseCapacity` `[待确认]` | `warehouseCode`、`loadTemperature`、`acceptanceStatus` | 读 |
| `warehouse.capacity-signal.slots` | 查询某仓未来 N 天可预约 Slots | 预约系统 | `queryAvailableSlots` `[待确认]` | `warehouseCode`、`dateRange`、`availableSlots[]` | 读 |

### 风险

- 库容温度数据是否通过 OpenAPI 开放，或仅限内部 TOM 系统，需确认
- Slots 排期与预约系统耦合度高，可能需与 `inbound-appointment-manage` 共用接入通道

---

## 二、后续扩展

其他 warehouse 域专家（仓库配置、SLA 规则等）待业务规划后补充。
