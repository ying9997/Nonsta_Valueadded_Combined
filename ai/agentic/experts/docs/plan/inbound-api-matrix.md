# Inbound 专家 API 矩阵

> 关联文档：[入库 Experts 拆分方案](inbound-experts-plan.md) · [Winit 入库 Playbook](../inbound/playbook.md) · [Winit OpenAPI 接入](../winit-openapi-integration.md)  
> 版本：2026-06  
> 说明：本文件记录 18 个 inbound 专家各自需要调用的系统 API，含触发问题、数据源、OpenAPI 就绪度、KB 对照路径。action 命名参照出库侧惯例（`queryOutboundOrder*`），标注 `[待确认]` 的项需研发从官方文档或内部接口清单核实。

---

## 一、接入形态约定

| 接入方式 | 说明 | 典型用法 |
|---|---|---|
| **OpenAPI（首选）** | 经 Coze 插件 `cobra_winit_openapi_request` 透传，见 [`docs/winit-openapi-integration.md`](../winit-openapi-integration.md) | 入库单查询、OMS PSC 查询 |
| **内部 TOM API** | TOM 智运 / 云仓 WMS / MKS，需内部网关或待开放；KB 中「登录 TOM 查询」的路径是需求信号 | 头程物流单、验货系统、MKS 额度 |
| **多维表格（Bitable）** | 飞书多维表格承载的流程数据；需 Bitable API 或人工兜底，暂无 OpenAPI | 权限申请提交、审批进度 |
| **KB / RAG 优先** | 无实时查询必要，静态知识库覆盖即可 | 仓库基础资料、增值规则、入库 SOP |

---

## 二、18 专家 API 场景总览

| Expert ID | 层 | 需要 API | 主要系统 | 关键单据 | OpenAPI 就绪度 | 跨域依赖 |
|---|---|---|---|---|---|---|
| `inbound/inbound-warehouse-info` | 基础信息 | 否 | KB | — | — | — |
| `inbound/inbound-order-status` | 基础信息 | 是 P0 | OMS | 入库单、预报单 | 中（待确认） | — |
| `inbound/inbound-process-guide` | 基础信息 | 部分 | KB + OMS | — | — | `inbound-psc-eligibility`（可选） |
| `inbound/inbound-psc-eligibility` | 基础信息 | 是 P1 | **OMS** | PSC 权限记录 | 中（待确认 action） | — |
| `value-add/*` | 跨域增值链路 | 部分 | OMS + KB | 异常、VASC、服务项、增值单 | 中 | `sku/profile`（可选，特殊货品判断） |
| `inbound/inbound-exception-check` | 业务流程 | 是 P1 | OMS + IMS | 入库单、异常单 | 中 | `sku/profile` |
| `inbound/inbound-putaway-expedite` | 业务流程 | 是 P0 | OMS + WMS | 入库单 | 中 | `warehouse/capacity-signal` |
| `inbound/inbound-permission-apply` | 业务流程 | 是 P1 | **多维表格** | 权限申请单 | 低（无 OpenAPI，流程在多维表格） | `inbound-psc-eligibility`、`inbound-capacity-availability` |
| `inbound/inbound-arrival-status` | 业务流程 | 是 P0 | OMS + TMS | 入库单、头程物流单 | 高 | — |
| `inbound/inbound-putaway-status` | 业务流程 | 是 P0 | OMS + WMS | 入库单 | 高 | — |
| `inbound/inbound-customs-clearance` | 业务流程 | 是 P2 | TMS + OMS | 入库单、柜号 | 低（内部） | — |
| `inbound/inbound-capacity-availability` | 业务流程 | 是 P1 | **MKS** + WMS | 额度记录 | 低（待确认 action） | `warehouse/capacity-signal` |
| `inbound/inbound-self-inspection` | 业务流程 | 是 P1 | 验货系统 + OMS | 入库单、验货记录 | 低（内部） | — |
| `inbound/inbound-overseas-inspection` | 业务流程 | 是 P2 | WMS（验货模块） | 入库单 | 低（内部） | — |
| `inbound/inbound-appointment-manage` | 业务流程 | 是 P1 | OMS | 预约单 | 中（待确认） | `warehouse/capacity-signal` |
| `inbound/inbound-transit-tracking` | 业务流程 | 是 P1 | TMS | 头程物流单 | 低（内部） | — |
| `inbound/inbound-order-manage` | 业务流程 | 是 P1 | OMS | 入库单 | 中（待确认） | `inbound-psc-eligibility` |
| `inbound/inbound-customs-doc-manage` | 业务流程 | 是 P2 | UMS | 进口商记录、资料附件 | 低（待确认） | — |

---

## 三、Inbound 域内共享 API 层

下表为多个专家共同调用的 API 能力，统一在本文件定义，避免各专家重复描述。

| 共享能力 | 建议 action（待确认） | 系统 | 主要消费方 |
|---|---|---|---|
| 入库单详情（无轨迹） | `winit.wh.inbound.getOrderDetail` | OMS | `inbound-order-status`、`inbound-arrival-status`、`inbound-putaway-status`、`inbound-exception-check` 等 |

> **详情分层（2026-06，已确认）**：`isIncludePackage=N` 仅表头（**无** `merchandiseList` / `packageList`）；SKU/包裹明细须 `Y`，**无包裹分页 API**。跨专家 `detailLevel` 约定见 [`inbound-getOrderDetail-detail-strategy.md`](inbound-getOrderDetail-detail-strategy.md)。
| **入库单全流程轨迹** | **`wh.tracking.queryOrderTracking`** | OMS | **`inbound-order-status`、`inbound-arrival-status`、`inbound-putaway-status`、`inbound-transit-tracking`** |
| **快递卸货轨迹（精确）** | **`wh.tracking.queryUnloadRecords`** | OMS | **`inbound-arrival-status`** |
| **快递卸货轨迹（模糊）** | **`wh.tracking.queryUnloadRecordsFuzzy`** | OMS | **`inbound-arrival-status`** |
| 入库单列表 | `wh.inbound.getOrderList` | OMS | `inbound-order-status`、`inbound-putaway-expedite` |
| 预约单查询 | `queryAppointment` `[待确认]` | OMS | `inbound-appointment-manage`、`inbound-arrival-status` |
| 预约单创建/修改 | `createAppointment` / `updateAppointment` `[待确认]` | OMS | `inbound-appointment-manage` |
| 入库异常单查询 | `wh.inboundOrderException.list` / `wh.inboundOrder.queryExceptionList` | OMS | `inbound-exception-check`、`inbound-self-inspection` |
| 增值单状态 | `wh.va.order.basicInfo` + `wh.va.order.getVasList` | OMS | `value-add/value-add-order-status` |
| **客户 CBM/SKU 额度** | `queryInboundQuota` `[待确认]` | **MKS**（营销管理系统） | **`inbound-capacity-availability`** |
| **入库可用 PSC** | `winit.wh.pms.getWinitProducts` | **OSWH OpenAPI** | **`inbound-psc-eligibility`**、`inbound-order-manage`、`inbound-permission-apply` |
| 权限申请提交 | 多维表格写入 `[无 OpenAPI]` | **飞书多维表格** | **`inbound-permission-apply`** |
| 权限审批进度 | 多维表格查询 `[无 OpenAPI]` | **飞书多维表格** | **`inbound-permission-apply`** |
| 进口商查询 | `winit.ums.getVendorInfo` | UMS | **`inbound-customs-doc-manage`** |
| 进口商注册 | 万邑联平台写操作 `[无 OpenAPI]` | UMS | **`inbound-customs-doc-manage`**（KB + 已有 vendor 列表） |
| 运输单分页查询 | **`tms.transportorder.queryPage`** | TMS | `inbound-transit-tracking`、`inbound-customs-clearance`、`inbound-customs-doc-manage`；详见 [inbound-tms-transportorder-queryPage.md](inbound-tms-transportorder-queryPage.md) |
| 运输单轨迹 | **`tms.transportorder.queryTrackingList`** | TMS | `inbound-transit-tracking`、`inbound-customs-clearance` |
| 头程物流单（旧称） | 对齐 `tms.transportorder.*` | TMS | `inbound-transit-tracking`、`inbound-customs-clearance`、`inbound-arrival-status`（辅助） |

> **轨迹接口说明**（2026-06）：`getOrderDetail` **不返回轨迹**；全流程轨迹见 [`inbound-tracking-api.md`](inbound-tracking-api.md)。旧矩阵中的 `trajectoryList` 字段应理解为 `queryOrderTracking.trackingList`。

---

## 四、各专家 API 场景详情

### 4.1 `inbound/inbound-order-status`（基础信息，P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-order-status.query-by-no` | 我的入库单现在什么状态 / 预报单号查询 | OMS | `getOrderDetail`（**`isIncludePackage=N`**） | TOM → OMS → 详情页 | `orderNo`、`status`、`winitProductCode`、`shelveCompletedDate` | 读 |
| `inbound-order-status.trajectory` | 轨迹里程碑 / 到哪一步了 | OMS | **`wh.tracking.queryOrderTracking`** | TOM → 轨迹页签 | `trackingList[]` | 读 |
| `inbound-order-status.decode-field` | 这个状态码是什么意思 / 为什么显示 PEWC | OMS | `queryInboundOrder` + KB | — | `statusCode`、`statusDesc` | 读 |
| `inbound-order-status.error-code` | 系统提示报错 ERR_xxx | OMS | KB 优先；无需实时 API | — | — | KB |

---

### 4.2 `inbound/inbound-arrival-status`（业务流程，P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-arrival-status.trajectory` | 货什么时候到仓 / 现在轨迹在哪里 | OMS | **`queryOrderTracking`** + `getOrderDetail`（**N**） | TOM → OMS → 轨迹页签 | `trackingList`、`awhDate`、`expectedSendwarehouseTime` | 读 |
| `inbound-arrival-status.ewc-confirm` | 仓库签收了但还没确认 / PEWC 变 EWC | OMS | `getOrderDetail`（**N**） | TOM → OMS → 入库状态 | `status`（PEWC/EWC） | 读 |
| `inbound-arrival-status.package-qty` | 直发少包裹 / 预约 vs 实收 | OMS | `getOrderDetail`（**Y** → `package_summary`） | 云仓 → 卸货记录 | `totalPackageQty`、`packagePutawaySummary` | 读 |
| `inbound-arrival-status.pod` | 快递是不是到了 / 有没有签收证明 | OMS | **`queryUnloadRecords`** / **`queryUnloadRecordsFuzzy`** + `queryOrderTracking` | 云仓 → 卸货包裹 | `unloadDate`、`expressNo` | 读 |

---

### 4.3 `inbound/inbound-putaway-status`（业务流程，P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-putaway-status.progress` | 上架了没 / 多久能完成 | OMS | `getOrderDetail`（**Y**）+ **`queryOrderTracking`** | TOM → 入库单 → 轨迹 | `shelveCompletedDate`、`trackingList`（OWS） | 读 |
| `inbound-putaway-status.qty-discrepancy` | 上架数量和预报对不上 | OMS | `getOrderDetail`（**Y** → extract 删 `packageList`） | TOM → 上架记录 | **`merchandiseList[].quantity`**、**`actualQuantity`** | 读 |

---

### 4.4 `inbound/inbound-putaway-expedite`（业务流程，P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-putaway-expedite.urge` | 帮我催上架 / 超 24h 还没上架 | OMS | `queryInboundOrder` + KB SLA | TOM → 工单 → 催架 | `putawayDeadline`、`isSlaBreached` | 读（判断 SLA） |
| `inbound-putaway-expedite.rush` | 活动明天开始急需上架 | OMS + `warehouse/capacity-signal` | `queryInboundOrder` `[待确认]` | TOM → 升级路径 | `warehouseLoadStatus` | 读 |

---

### 4.5 `inbound/inbound-exception-check`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-exception-check.query` | 有没有异常单 / 怎么查异常记录 | OMS | `wh.inboundOrderException.list` / `wh.inboundOrder.queryExceptionList` | 云仓 → 订单管理 → 入库异常记录 | `type`/`exceptionName`, `errormsg`/`exceptionDesc`, `merchandiseSerno` | 读 |
| `inbound-exception-check.qty-diff` | 签收少件 / 上架数量和入库单对不上 | OMS + WMS | `getOrderDetail` + `queryExceptionList` | TOM 异常事件 | `receivedQty`、`expectedQty`、`exceptionReason` | 读 |

---

### 4.6 `inbound/inbound-psc-eligibility`（基础信息，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-psc-eligibility.list` | 我能用哪些入库产品 / OW01 开通了吗 | **OSWH** | `winit.wh.pms.getWinitProducts`（productType: OW0101/OW0102/OW0103） | 万邑联 → 个人中心 → 产品权限 | `productCode`、`productName`、`description` | 读 |
| `inbound-psc-eligibility.inbound-self-inspection` | 我有没有自验权限 | **OSWH** | 同上，productType=OW0102，过滤 OW0102* | 万邑联 → 个人中心 → 产品权限 | `productCode`（OW01021*/OW01022*） | 读 |
| `inbound-psc-eligibility.overseas` | 可以用海外验吗 / OW01031 有没有开通 | **OSWH** | 同上，productType=OW0103，过滤 OW0103* | 万邑联 → 个人中心 → 产品权限 | `productCode`（OW01031*/OW01032*） | 读 |

---

### 4.7 `inbound/inbound-capacity-availability`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `capacity.cbm-quota` | 还剩多少 CBM 额度 / SKU 额度用了多少 | **MKS** | `queryInboundQuota` `[待确认]` | 万邑联 → 账户中心 → 库容额度 | `totalCbm`、`usedCbm`、`remainingCbm`、`totalSkuSlots`、`usedSkuSlots` | 读 |
| `capacity.slots` | 这个仓还能不能预约 Slots | `warehouse/capacity-signal` | 见 [warehouse-api-matrix.md](warehouse-api-matrix.md) | — | `slotAvailability`、`loadTemperature` | 读 |
| `capacity.overall` | 能不能收这批货 / 要不要换仓 | **MKS** + `warehouse/capacity-signal` | `queryInboundQuota` + warehouse signal | — | 综合：额度 + 仓温度 + 货型 | 读 |

---

### 4.8 `inbound/inbound-permission-apply`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `permission.apply` | 怎么申请自验/海外验权限 | **多维表格** | 多维表格写入 `[无 OpenAPI]` | 飞书多维表格（权限申请流程表） | `permissionType`、`materialList`、`applyResult` | 写（流程指引 + 可选 Bitable API） |
| `permission.progress` | 我提交的权限申请审核到哪了 | **多维表格** | 多维表格查询 `[无 OpenAPI]` | 飞书多维表格（审批进度表） | `approvalStatus`、`approvalRemark`、`estimatedCompleteTime` | 读（可选 Bitable API） |
| `permission.current-snapshot` | 我现在有哪些权限 | `inbound-psc-eligibility` | 调用 `inbound-psc-eligibility`（上游共享，OMS） | — | — | 读（转发） |

---

### 4.9 `inbound/inbound-order-manage`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-order-manage.create` | 怎么新建入库单 / 该选哪个 PSC | OMS + `inbound-psc-eligibility` | `createInboundOrder` `[待确认]` | 万邑联 → 入库 → 新建入库单 | `productCode`、`warehouseCode`、`skuList` | 写 |
| `inbound-order-manage.modify-dest` | 修改目的仓 / 改 SKU 信息 | OMS | `updateInboundOrder` `[待确认]` | 万邑联 → 入库 → 修改单据 | `inboundOrderNum`、`newWarehouseCode` | 写 |
| `inbound-order-manage.close` | 怎么关闭/终止入库单 | OMS | `cancelInboundOrder` `[待确认]` | 万邑联 → 入库 → 关闭/撤销 | `inboundOrderNum`、`cancelReason` | 写 |

---

### 4.10 `inbound/inbound-appointment-manage`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `appointment.create` | 怎么预约送仓 / 获取预约码 | OMS | `createAppointment` `[待确认]` | 万邑联 → 海外仓 → 入库 → 预约送仓 | `appointmentCode`、`appointmentDate`、`warehouseCode` | 写 |
| `appointment.modify` | 改预约时间 / 取消预约 | OMS | `updateAppointment` `[待确认]` | 万邑联 → 预约单管理 | `appointmentNo`、`newDate` | 写 |
| `appointment.penalty` | 没预约被扣费怎么办 | OMS + KB | `queryAppointment` `[待确认]` | 万邑联 → 费用记录 | `penaltyFee`、`appointmentStatus` | 读 |

---

### 4.11 `inbound/inbound-transit-tracking`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `transit.departure` | 货什么时候离港 | TMS | 内部 TOM 智运 API `[待确认]` | TOM → 智运 → 空运/海运物流单 → 离港 | `departureTime`、`flightNo` / `vesselName` | 读 |
| `transit.arrival-port` | 到港了没 / 到港时间 | TMS | 内部 TOM 智运 API `[待确认]` | TOM → 智运 → 到港时间 | `arrivalPortTime`、`estimatedPortTime` | 读 |
| `transit.eta-warehouse` | 预计什么时候送到仓库 | TMS + OMS | 内部 API + `queryInboundOrder` `[待确认]` | TOM → 查询头程到港时间的处理流程.md | `etaWarehouse`、`currentMilestone` | 读 |

---

### 4.12 `inbound/inbound-self-inspection`（业务流程，P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-self-inspection.status` | 我的自验提交了没 / 验货状态 | 验货系统 | 内部验货 API `[待确认]` | 万邑联 → 自验进度 | `inspectionStatus`、`submittedQty` | 读 |
| `inbound-self-inspection.modify` | 验货数据填错了怎么修改 / 重验 | 验货系统 | 内部验货 API `[待确认]` | 万邑联 → 自验操作 | `inboundOrderNum`、`correctedData` | 写 |
| `inbound-self-inspection.sampling-result` | 抽验结果是什么 / 抽验收了多少费 | OMS + 验货系统 | `queryInboundException` + 验货 API `[待确认]` | TOM → 异常事件（OW01V1266-68） | `samplingResult`、`samplingFee`、`exceptionType` | 读 |

---

### 4.13 `inbound/inbound-overseas-inspection`（业务流程，P2）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `inbound-overseas-inspection.progress` | 海外验现在到哪一步了 | WMS 验货模块 | 内部 WMS API `[待确认]` | 云仓 → 验货模块 | `inspectionPhase`、`estimatedCompleteTime` | 读 |
| `inbound-overseas-inspection.mode-diff` | 有箱单和无箱单进度有什么区别 | KB + WMS | KB 优先 | KB：`无箱单有预报常见问答.md` | — | KB |

---

### 4.14 `inbound/inbound-customs-clearance`（业务流程，P2）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `customs.status` | 清关进行到哪里了 | TMS + OMS | 内部 TOM API + `queryInboundOrder` `[待确认]` | TOM → OMS → 查询头程进口清关_查验进度.md | `customsStatus`、`customsNode`、`inspectionFlag` | 读 |
| `customs.delay` | 清关为什么延误 | TMS + KB | 内部 API + KB | KB：查验进度处理流程.md | `delayReason`、`expectedClearanceTime` | 读 |
| `customs.dutiable` | 包税渠道有没有清关轨迹 | KB | KB 优先（无独立轨迹） | KB：包税渠道特殊逻辑 | — | KB |

---

### 4.15 `inbound/inbound-customs-doc-manage`（业务流程，P2）

| 场景 ID | 触发问题 | 系统 | 建议 action | TOM 对照路径 | 关键字段 | 读/写 |
|---|---|---|---|---|---|---|
| `customs-doc.upload` | 清关资料怎么上传 / 英国需要提交什么 | UMS + KB | `uploadCustomsDocument` `[待确认]` | 万邑联 → 个人中心 → 清关资料上传 | `documentType`、`uploadUrl`、`reviewStatus` | 写 |
| `customs-doc.importer-register` | 自有进口商怎么注册 | UMS | 万邑联平台写操作 `[无 OpenAPI]` | 万邑联 → 个人中心 → 进口商注册 | `vendorCode`、`vendorName`（查询侧） | 写 |
| `customs-doc.importer-query` | 我有哪些进口商 / 编码是什么 | UMS | **`winit.ums.getVendorInfo`** | 万邑联 → 个人中心 → 进口商列表（审核状态） | `vendorCode`、`vendorName`、`isWinit` | 读 |

---

### 4.16 `inbound/inbound-warehouse-info`（基础信息，KB 优先）

无需实时 API，全 KB 覆盖。仓库地址/路线/联系人/截单时间等静态资料由知识库维护。

---

### 4.17 `inbound/inbound-process-guide`（基础信息，KB 优先）

主要 KB/RAG，PSC 实时列表可选调用 `inbound-psc-eligibility`（非阻塞），WF 群体判断可弱依赖 `customer/profile`。

---

### 4.18 `value-add/*`（跨域，部分 API）

增值能力由 4 个跨域 experts 承接：`value-add/value-add-exception-diagnosis` 判断异常是否进入增值链，`value-add/value-add-product-recommendation` 推荐候选 VASC，`value-add/value-add-service-config` 解释服务项/原子配置，`value-add/value-add-order-status` 查询已提交增值单状态。已提交增值单状态主路径使用 `wh.va.order.basicInfo` + `wh.va.order.getVasList`；未下单前推荐和配置以 KB/关系映射为主。SKU 属性判断可选依赖 `sku/profile`（见 [sku-api-matrix.md](sku-api-matrix.md)）。

---

## 五、KB → 系统路径索引

| KB 文档 | TOM/系统路径 | 关联专家 |
|---|---|---|
| `查询头程进口清关_查验进度的处理流程.md` | TOM → OMS → InboundOrderSearch → 轨迹页签 | `inbound-transit-tracking`、`inbound-customs-clearance`、`inbound-order-status` |
| `查询头程到港时间的处理流程.md` | TOM → 智运 → 空运/海运物流单 | `inbound-transit-tracking` |
| `咨询入库单上架时间及催上架处理流程.md` | TOM → 综合查询 → 入库单查询 → 轨迹 | `inbound-arrival-status`、`inbound-putaway-status`、`inbound-putaway-expedite` |
| `如何查询异常单.md` | 云仓 → 订单管理 → 入库异常记录 | `inbound-exception-check` |
| `客户反馈上架数量异常处理流程.md` | TOM 异常事件 + 订阅群发 | `inbound-exception-check` |
| `如何查看入库单包裹的海外仓卸货时间.md` | 区域 WMS 云仓 → POD/卸货包裹记录 | `inbound-arrival-status` |
| 直发预约系列 | 万邑联 → 海外仓 → 入库 → 预约单管理 | `inbound-appointment-manage` |
| 注册/进口商系列 | 万邑联 → 个人中心 → 进口商 | `inbound-customs-doc-manage`、`inbound-permission-apply` |
| 自验系列（6 篇） | 万邑联 → 自验操作 | `inbound-self-inspection` |
| `无箱单有预报常见问答.md` | KB | `inbound-overseas-inspection` |

---

## 六、跨域 API 索引

| 共享专家 | 所属域 | 为 inbound 提供什么 | API 详情文档 |
|---|---|---|---|
| `sku/profile` | `sku` | SKU 件型、特殊属性（危险品/带电/液体） | [sku-api-matrix.md](sku-api-matrix.md) |
| `warehouse/capacity-signal` | `warehouse` | 仓级库容温度、Slots 排期（非客户 CBM 额度） | [warehouse-api-matrix.md](warehouse-api-matrix.md) |

`customer/profile` 不再作为 inbound 专家的 API 归属。MKS 额度、OMS PSC、多维表格权限流程均写入本文件。

---

## 七、无需/弱 API 专家说明

| Expert | 理由 |
|---|---|
| `inbound/inbound-warehouse-info` | 静态仓资料，KB 全覆盖，无实时查询必要 |
| `inbound/inbound-process-guide` | SOP/FAQ/RAG 为主；PSC 可选增强（调 `inbound-psc-eligibility`）；无独立 API 阻塞项 |

---

## 八、风险与待确认项

| 项 | 说明 |
|---|---|
| 入库 OpenAPI action 命名 | 仓库内尚无 `queryInbound*`，需研发从官方文档核实，勿硬编码 |
| MKS 客户额度 API | CBM/SKU 额度在 **MKS**（营销管理系统）；action 名 `[待确认]`，需确认 OpenAPI 或内部网关 |
| OMS 入库 PSC API | 入库可用 PSC 在 **OMS**；与入库单同属 OMS 域，action 名 `[待确认]` |
| 权限申请/审批（多维表格） | 申请提交与审批进度当前在 **飞书多维表格**，无 OpenAPI；短期 KB/SOP 指引 + 人工兜底，中期可接 Bitable API |
| TMS 头程数据 | KB 明确走 TOM 智运 UI，OpenAPI 覆盖度未知；transit/customs 可能需内部 API |
| 验货/抽验系统 | 可能独立于 OMS OpenAPI；`inbound-self-inspection`、`inbound-overseas-inspection` 需单独数据源确认 |
| 包税渠道 | 美森/普船无系统清关轨迹，`inbound-customs-clearance` 需规则兜底，KB 优先 |
| 写操作 API | `inbound-order-manage`、`inbound-appointment-manage` 的 create/update 是否对客户 OpenAPI 开放需确认 |
