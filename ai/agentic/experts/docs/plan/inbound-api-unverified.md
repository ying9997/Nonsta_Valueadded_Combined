# Inbound 无依据接口汇总

> 更新：2026-06-09  
> 来源：各专家 `experts/inbound/*/design.md` §2「无依据接口」小节  
> 关联：[inbound-api-matrix.md](inbound-api-matrix.md) · [inbound-experts-plan.md](inbound-experts-plan.md)

**图例**

| 标记 | 含义 |
|------|------|
| **无依据** | 无 OpenAPI / 内部 HTTP 规格，或仅为 API 矩阵推断名；**勿作运行时依赖** |
| **不在本期** | 产品范围外，本期不交付（非「待联调 Gap」） |
| **误用字段** | 文档/旧代码曾引用，实测不在接口响应中 |
| **不调用** | 写接口或矩阵名；专家设计为 SOP 指引，不接入 workflow |

---

## 一、按系统汇总

### TMS / TOM 智运（头程 & 清关）

| 接口 / 能力 | 涉及专家 | 说明 |
|-------------|----------|------|
| `tms.transportorder.queryPage` | `transit-tracking`、`customs-clearance`、`customs-doc-manage` | **有 OpenAPI 规格**；见 [inbound-tms-transportorder-queryPage.md](inbound-tms-transportorder-queryPage.md)；Coze action 待注册 |
| `tms.transportorder.queryTrackingList` | `transit-tracking`、`customs-clearance` | 轨迹/清关节点；与 queryPage 组合使用 |
| `tms.transportorder.getDetail` | 同上 | TO 详情补充 |
| TMS 头程细粒度（离港/到港/航班） | `transit-tracking` | 依赖 `queryTrackingList`，非 queryPage 单独提供 |
| `transit.departure` / `transit.arrival-port` 等 | `transit-tracking` | 矩阵推断名；实现应对齐 `tms.transportorder.*` |
| TMS 清关状态 API | `customs-clearance` | 表头用 queryPage `importedInfoVo`；节点用 queryTrackingList |
| `departureTime` / `arrivalPortTime` | `transit-tracking` | 来自 queryTrackingList，本期 workflow 未接入 |

### WMS / 仓级信号

| 接口 / 能力 | 涉及专家 | 说明 |
|-------------|----------|------|
| WMS 验货进度 API | `overseas-inspection` | 矩阵 `inbound-overseas-inspection.progress` |
| 验货系统独立读 API | `self-inspection` | PDA 扫描细粒度，矩阵 `inbound-self-inspection.status` |
| `warehouse/capacity-signal` | `capacity-availability`、`putaway-expedite`、`appointment-manage` | 仓级 Slots/负载；capacity 已移除；不对客 |
| `winit.wh.inbound.booking.queryAvailableWarehouseinPlan` | `appointment-manage` | 有 OpenAPI 规格（booking-overview B.2）；专家不调用；Coze action 未注册 |

### UMS / 进口商 & 清关资料

| 接口 / 能力 | 涉及专家 | 说明 |
|-------------|----------|------|
| UMS 进口商注册写操作 | `customs-doc-manage` | 无 OpenAPI；须万邑联平台操作 |
| ~~UMS `queryImporter`~~ | `customs-doc-manage` | **已替换** → `winit.ums.getVendorInfo` |
| `wh.inbound.order.uploadCustomsDeclareDocs` | `customs-doc-manage` | 矩阵列名；Coze action 未验证 |

### 飞书

| 接口 / 能力 | 涉及专家 | 说明 |
|-------------|----------|------|
| 多维表格写入 / 查询 | `permission-apply` | 权限申请流程在 Bitable，无对外 API |
| 飞书审批实例查询 | `permission-apply` | action、字段映射未确认 |

### OMS 库存 / 写接口（矩阵推断，专家不调用）

| 接口 / 能力 | 涉及专家 | 说明 |
|-------------|----------|------|
| `queryProductInventoryList4Page` | `putaway-expedite` | 仅 id/58 模板；加急缺货判定未接入 |
| `createInboundOrder` / `order.create` | `order-manage` | 写接口，不调用 |
| `cancelInboundOrder` / `order.cancel` | `order-manage` | 写接口，不调用 |
| `updateCrossDockingWaveInfo` / `updateInboundOrder` | `order-manage` | 改目的仓；Coze action 未确认 |
| `createAppointment` / `booking.create` 等 | `appointment-manage` | 写接口，不调用 |
| `wh.inboundSigned.exportPodPdf` | `appointment-manage` | 有 OpenAPI 规格但响应 base64；Agent 通道无法向客户投递 PDF，仅万邑联自助下载 SOP |
| `wh.inbound.selfinspection.submit` | `self-inspection` | 写接口，仅 SOP |
| `queryInboundProduct` | — | **已废弃**；由 `winit.wh.pms.getWinitProducts` 替代 |
| `queryInboundException` | — | **已废弃**；见 `wh.inboundOrderException.list` / `wh.inboundOrder.queryExceptionList` |
| `queryInboundQuota` | `capacity-availability` | 矩阵名，**已弃用**；实际 `huaweiDas.invoke` |
| `queryValueAddedService` | `exception-check` | 矩阵列名，未接入 |

---

## 二、误用字段（全 inbound 共享）

| 字段 | 正确做法 | 涉及专家 |
|------|----------|----------|
| `getOrderDetail.trajectoryList` | 不在详情响应；用 **`wh.tracking.queryOrderTracking`** → `trackingList` | `order-status`、`arrival-status`、`putaway-status`、`customs-clearance`、`overseas-inspection`、`transit-tracking` |
| `samplingFee` | 可能无独立字段；勿从 `exceptionType` 臆造金额 | `exception-check`、`self-inspection` |
| POD 附件 URL | 无单独接口规格 | `arrival-status` |
| `customsTrajectoryNodes` 细粒度 | OMS 轨迹未验证含清关节点时不得臆造 | `customs-clearance` |
| `inspectionStatus=InProgress` | OMS 枚举待字段确认 | `overseas-inspection` |

---

## 三、按专家明细

| 专家 | 无依据 / 不在本期 | design |
|------|-------------------|--------|
| `inbound-warehouse-info` | —（纯 KB） | [design.md](../../experts/inbound/inbound-warehouse-info/design.md) |
| `inbound-process-guide` | —（纯 KB） | [design.md](../../experts/inbound/inbound-process-guide/design.md) |
| `inbound-order-status` | `trajectoryList` 误用 | [design.md](../../experts/inbound/inbound-order-status/design.md) |
| `inbound-psc-eligibility` | —（`winit.wh.pms.getWinitProducts` 已确认） | [design.md](../../experts/inbound/inbound-psc-eligibility/design.md) |
| `inbound-arrival-status` | `trajectoryList` 误用；POD URL | [design.md](../../experts/inbound/inbound-arrival-status/design.md) |
| `inbound-putaway-status` | `trajectoryList` 误用 | [design.md](../../experts/inbound/inbound-putaway-status/design.md) |
| `inbound-putaway-expedite` | `queryProductInventoryList4Page`；`capacity-signal` | [design.md](../../experts/inbound/inbound-putaway-expedite/design.md) |
| `inbound-exception-check` | —（异常 API 已确认） | [design.md](../../experts/inbound/inbound-exception-check/design.md) |
| `inbound-capacity-availability` | `capacity-signal`；`queryInboundQuota`（弃用） | [design.md](../../experts/inbound/inbound-capacity-availability/design.md) |
| `inbound-permission-apply` | 飞书 Bitable；飞书审批 API | [design.md](../../experts/inbound/inbound-permission-apply/design.md) |
| `inbound-appointment-manage` | `queryAvailableWarehouseinPlan`；预约写接口；`capacity-signal` | [design.md](../../experts/inbound/inbound-appointment-manage/design.md) |
| `inbound-order-manage` | 入库单 create/cancel/update 写接口 | [design.md](../../experts/inbound/inbound-order-manage/design.md) |
| `inbound-self-inspection` | 验货系统读 API；`selfinspection.submit`；`samplingFee` | [design.md](../../experts/inbound/inbound-self-inspection/design.md) |
| `inbound-overseas-inspection` | WMS 验货 API；`trajectoryList`；`inspectionStatus` | [design.md](../../experts/inbound/inbound-overseas-inspection/design.md) |
| `inbound-customs-clearance` | TMS 清关 API；`trajectoryList`；清关节点臆造 | [design.md](../../experts/inbound/inbound-customs-clearance/design.md) |
| `inbound-customs-doc-manage` | UMS 进口商；`uploadCustomsDeclareDocs` | [design.md](../../experts/inbound/inbound-customs-doc-manage/design.md) |
| `inbound-transit-tracking` | **整专家不在本期**；TMS 头程全量 | [design.md](../../experts/inbound/inbound-transit-tracking/design.md) |

---

## 四、本期阻塞项（需研发 / 产品确认）

| 优先级 | 能力 | 负责系统 | 解锁专家 |
|--------|------|----------|----------|
| P0 | 飞书权限申请 Bitable / 审批 API | 飞书 | `permission-apply` |
| P1 | TMS 头程物流 | TOM 智运 | `transit-tracking`（后续） |
| P1 | TMS 清关节点 | TOM 智运 | `customs-clearance` |
| P1 | WMS 海外验货细粒度 | WMS | `overseas-inspection` |
| P2 | UMS 进口商 register/query | UMS | `customs-doc-manage` |
| P2 | 库存 `queryProductInventoryList4Page` | OMS/IMS | `putaway-expedite` v2 |
| P2 | 预约 Slot 时间窗 API | OMS/WMS | `appointment-manage` |
| — | `warehouse/capacity-signal` | WMS | **不对客**；已从 capacity 移除 |

---

## 五、维护说明

- 各专家 `design.md` §2 为**权威来源**；本文件为汇总视图，变更时请同步更新。
- 「端点待注册」类（内部 HTTP 已知、Coze action 未注册）**不算无依据**，未列入上文。
- API 矩阵中 `[待确认]` 但已在节点代码落地的 action，以 design §2「已确认」为准。
