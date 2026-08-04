# storage 域 Experts 规划

> **`storage` 域**：**在库 / 库内**环节——货已进入仓库后的库存、丢失、盘点等。与 `inbound`（到货至上架前）、`outbound`（出库作业）并列，共同覆盖库内作业链路。  
> 域划分说明见 [domain-taxonomy.md](domain-taxonomy.md)。

---

## 一、专家状态追踪

> 最左列：`[ ]` 未完整 · `[x]` 已完整（manifest、workflow、prompt、可被上游调用齐备）。  
> 当前状态：`待规划` / `设计中` / `开发中` / `待配置` / `已完成` / `阻塞`

| [ ] | 优先级 | Expert ID | 目标完成 | 当前状态 | 需要 API | API 就绪度 | 主要依赖 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [ ] | P1 | `storage/inventory-loss` | 2026-07 | 待规划 | 是 | 0% | 对齐 [project-plan.md](project-plan.md) 7 月 OKR「库内丢失」；WMS 库存 + 异常工单 |
| [ ] | P2 | `storage/inventory-query` | 待定 | 待规划 | 是 | 0% | WMS 在库库存 API；被补货建议、容量判断等调用 |

---

## 二、与 `warehouse` 域的边界

| 问题类型 | 域 |
|---|---|
| 某 SKU 在库多少、库位分布 | `storage/inventory-query` |
| 库内丢货、盘亏核实 | `storage/inventory-loss` |
| 仓还能不能收多少货、Slots 温度 | `warehouse/capacity-signal` → 由 `inbound/inbound-capacity-availability` 对客 |

---

## 三、后续规划

- `storage/inventory-loss`：待结合库内丢失咨询数据单独下钻（与 `inbound-data.md` 不同数据源）。
- `storage/inventory-query`：原在 ~~`in-warehouse`~~ 规划中的在库查询，已迁入本域；原 ~~`sku/inventory-status`~~ 亦划入本专家（见 [sku-plan.md](sku-plan.md)）。
