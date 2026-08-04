# Inbound 项目进度（按场景）

> 更新：2026-07-28 · 数据量来自 8,989 条入库客服咨询
> 详细拆分见 [inbound-experts-plan.md](inbound-experts-plan.md) · 增值详述见 [value-add-experts-plan.md](value-add-experts-plan.md) §十 · API/Gap 见 [inbound-api-unverified.md](inbound-api-unverified.md) · 轨迹接口见 [inbound-tracking-api.md](inbound-tracking-api.md)

**整体**：17 个 inbound 专家 + 4 个 value-add 专家均已具备 **manifest / 节点代码 / Coze workflow YAML**。**inbound 13 个已上线**（6.10 批次 12 + 6.30 `exception-check`）；**value-add 4 个已上线 6.30**。6 月 OKR 目标入库覆盖率 50%。

**已确认核心 OpenAPI（Coze 侧）**：`winit.wh.inbound.getOrderDetail` · `wh.inboundOrder.getOrderDetail`（订单级时间补充）· `wh.tracking.queryOrderTracking` · `wh.inbound.getOrderList` · `winit.wh.pms.getWinitProducts`（PSC）· `winit.huaweiDas.invoke`（MKS 额度）· `wh.inboundOrder.queryExceptionList` · `winit.ums.getVendorInfo`（进口商）

---

## 图例

| 标记 | 含义 |
|------|------|
| `[x]` | 已上线 |
| `[o]` | workflow 就绪，**待实测** |
| `[—]` | 本期不交付 / 仅保留骨架 |
| `[i]` | 正在实现 |
| `[ ]` | 未就绪或阻塞 |

---

## 高频场景（有咨询量）

| | 场景 | Expert | 咨询量 | 进度 | 说明 |
|---|------|--------|-------:|------|------|
| [x] | 入库异常核实 | `inbound/inbound-exception-check` | 2,099 | **已上线 6.30** | `getOrderDetail` + `queryExceptionList`；增值链 handoff 源；SKU/包裹级差异走 id/39 策略 |
| [x] | 增值推荐、配置与状态查询 | `value-add/*`（4 experts） | 1,563 | **已上线 6.30** | 推荐链 `exception-diagnosis` → `product-recommendation` → `service-config`；`order-status` 独立入口。见 [value-add-experts-plan.md](value-add-experts-plan.md) |
| [x] | 仓库信息获取 | `inbound/inbound-warehouse-info` | 1,045 | 已上线 6.10 | 纯 KB，无 API |
| [i] | 权限申请及进度 | `inbound/inbound-permission-apply` | 851 | 已上线 6.10 | SOP + 上游 PSC 快照；飞书多维表格/审批 **无 OpenAPI** |
| [x] | 入库流程 / 规则 | `inbound/inbound-process-guide` | 834 | 已上线 6.10 | Playbook + flows KB；PSC 实时列表可选链 `psc-eligibility` |
| [x] | 加急上架 / 未上架催促 | `inbound/inbound-putaway-expedite` | 813 | v1 上线 6.10 → v2 6.30 | v1：SLA + `getOrderDetail`；v2 缺货判定待 `queryProductInventoryList4Page` |
| [x] | 到仓时间确认 | `inbound/inbound-arrival-status` | 691 | 已上线 6.10 | `getOrderDetail` + `queryOrderTracking` + 卸货轨迹接口已确认 |
| [x] | 上架进度 | `inbound/inbound-putaway-status` | 557 | 已上线 6.10 | `getOrderDetail`（Y/extract）+ 轨迹；数量核实同专家 |
| [o] | 清关进度确认 | `inbound/inbound-customs-clearance` | 254 | 待联调 | OMS 表头 + 轨迹兜底；TMS 清关节点 / `queryTrackingList` **Gap** |
| [x] | 上架数量核实 | `inbound/inbound-putaway-status` | 247 | 已上线 6.10 | 并入「上架进度」 |

**同批待上线、表中未单独列出**：

| | 场景 | Expert | 进度 | 说明 |
|---|------|--------|------|------|
| [x] | 入库单状态 / 报错 | `inbound/inbound-order-status` | 已上线 6.10；v0.2 本地就绪，待发布 | v0.2 增加 `wh.inboundOrder.getOrderDetail`，补充预计送仓、预计到仓及订单级时间；已完成真实只读响应、脱敏、导出和编译验证，尚未导入/发布 Coze |

---

## 扩展场景（规划新增）

| | 场景 | Expert | 进度 | 说明 |
|---|------|--------|------|------|
| [x] | 库容 / 额度 / 能否收这批货 | `inbound/inbound-capacity-availability` | 已上线 | MKS `huaweiDas.invoke` 已确认；仓级 Slots **不对客**，已从 workflow 移除 |
| [o] | 自验操作与抽验结果 | `inbound/inbound-self-inspection` | 已上线 v1 6.10, v2 支持抽验情况查询和抽验结果 | OMS 链：`getOrderDetail` + 抽验异常单；验货系统细粒度读 API **Gap** |
| [x] | 预约送仓 | `inbound/inbound-appointment-manage` | 已上线 6.10 | KB 创建/改约 SOP 就绪；`wh.inbound.booking.list` **有规格·Coze 待注册**；`getOrderDetail` 兜底 |
| [—] | 头程在途追踪 | `inbound/inbound-transit-tracking` | **本期不交付** | 离港/到港依赖 TMS；由 `order-status` / `arrival-status` 或人工承接 |
| [x] | 入库单创建 / 修改 / 关闭 | `inbound/inbound-order-manage` | 已上线 6.10 | 操作 SOP + 读单状态；写接口（create/cancel/update）**不调用** |
| [o] | 清关资料 / 进口商 | `inbound/inbound-customs-doc-manage` | 进行中 | UMS `getVendorInfo` 已确认；TMS `queryPage` 待注册；上传写接口 Gap |
| [x] | 可用入库产品（PSC） | `inbound/inbound-psc-eligibility` | 已上线 6.10 | `winit.wh.pms.getWinitProducts` 已确认 |

### value-add 链路（4 experts，跨域）

| | 场景 | Expert | 进度 | 说明 |
|---|------|--------|------|------|
| [x] | 异常是否进入增值链 | `value-add/value-add-exception-diagnosis` | **已上线 6.30** | KB + 上游 `valueAddHandoff`；35 异常实体 |
| [x] | VASC 产品推荐 | `value-add/value-add-product-recommendation` | **已上线 6.30** | 168 条异常→VASC 映射 + 客户意图归一 |
| [x] | 服务项/原子配置 | `value-add/value-add-service-config` | **已上线 6.30** | 64 编排 + 原子可选性规则 v0.1；字段/附件证据 partial |
| [x] | 增值单状态查询 | `value-add/value-add-order-status` | **已上线 6.30** | P0：`basicInfo` + `getVasList`；P2 费用/货物可选 |

---

## 不做独立场景

| | 场景 | Expert | 咨询量 | 处理方式 |
|---|------|--------|-------:|----------|
| — | 退费申请 | — | 35 | 转 billing 或人工 |

---

## API / 联调状态摘要

| 状态 | 涉及专家 |
|------|----------|
| **已上线 6.10** | `warehouse-info`、`process-guide`、`order-status`、`arrival-status`、`putaway-status`、`putaway-expedite`（v1）、`psc-eligibility`、`capacity-availability`、`permission-apply`、`self-inspection`（v1）、`appointment-manage`、`order-manage` |
| **已上线 6.30** | `exception-check`（增值链 handoff 源）；value-add 4 专家（`exception-diagnosis`、`product-recommendation`、`service-config`、`order-status`） |
| **Coze action 待注册** | `appointment-manage`（`booking.list`）、`customs-doc-manage`（TMS queryPage） |
| **已知 Gap，KB/SOP 兜底** | `permission-apply`（多维表格）、`customs-clearance`（TMS 清关节点） |
| **本期不启用** | `transit-tracking` |

---

## 下一步

1. **6.10 / 6.30 已上线**：入库高频场景 12 + `exception-check`；value-add 推荐链 4 专家  
2. **并行 Coze 注册联调**：`booking.list`、TMS queryPage（`customs-doc-manage`）  
3. **6.30 v2 / 待联调**：加急上架缺货判定（库存 API）、清关 TMS 节点（`customs-clearance`）、权限 Bitable（若开放）  
4. **后续迭代**：`transit-tracking`（TMS 头程）、WMS 海外验细粒度、预约 Slot 时间窗 API
5. **待发布验证**：导入并发布 `inbound-order-status` v0.2 后，在线回归 TS / PEWC / EWC / SHD、多单、补充接口失败与字段缺失场景
