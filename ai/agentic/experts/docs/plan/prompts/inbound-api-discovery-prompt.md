# Inbound API Discovery Prompt（研发 Agent 专用 · 自包含版）

> **用途**：将本文件**整份**发给运行在 **OMS / IMS / UMS / MKS 等后端仓库** 或 **OpenAPI 文档环境** 中的研发 Code Agent。  
> **版本**：2026-06
>
> **重要约束**：
> - 你**没有** experts 项目、客服 KB、Playbook 等文档的访问权限
> - 你**不需要**也不应尝试写回 experts 项目
> - 你**不知道** Coze、workflow、expert 节点等上游集成概念——**忽略**下文中的「消费场景 ID / Expert ID」，它们只是业务分组标签
> - 你的唯一交付物：在**本机工作目录**生成一套完整的 **Inbound API 文档包**

---

## 一、你的角色与任务

你是一名 **Winit 入库（Inbound）接口调研工程师**。

**任务**：根据下文「API 场景清单」，在你可访问的 **OMS / IMS / UMS / MKS 源码**、**内部服务接口**、**万邑通 OpenAPI 官方文档** 中，逐一确认每个场景对应的：

- OpenAPI `action` 名称（或内部 HTTP/RPC 接口）
- 官方 doc id / 文档 URL（如有）
- 请求 / 响应字段定义与样例
- 读 / 写属性、鉴权要求
- 若找不到开放接口，明确标注 **Gap** 及原因

**交付物**：在本机生成 `inbound-api-docs/` 文档包（结构见 §十），**不要**修改 experts 项目或任何外部仓库。

**你不负责**：
- 编写客服机器人 / expert 业务代码
- 猜测 action 名而不标注来源
- 访问你没有权限的系统（如 TMS 智运、飞书多维表格——仅标注 Gap）

---

## 二、你可用的调研来源

按优先级使用：

| 优先级 | 来源 | 用途 |
|---|---|---|
| 1 | **万邑通 OpenAPI 官方文档** | 确认对客户开放的 action、doc id、JSON 样例 |
| 2 | **OMS 源码 / 接口定义** | 入库单、预约单、PSC、异常单、增值单等 |
| 3 | **MKS 源码 / 接口定义** | 客户 CBM/SKU 额度 |
| 4 | **UMS 源码 / 接口定义** | 进口商、清关资料等 |
| 5 | **IMS / WMS 源码** | 上架、验货、仓级库容（若在你权限范围内） |
| 6 | **已有 OpenAPI action 命名规律** | 出库侧已公开 action 可作为 inbound 命名参考（见 §2.3） |

**OpenAPI 文档搜索关键词**（分别搜索）：

`inbound` / `入库` / `入库单` / `appointment` / `预约` / `merchandise` / `商品` / `import` / `进口商` / `value added` / `增值` / `quota` / `额度` / `CBM` / `PSC` / `product`

**源码检索建议**（在你有权限的仓库内）：

```
# Controller / Facade / OpenAPI action 注册
rg "queryInbound|createInbound|updateInbound|cancelInbound"
rg "InboundOrder|Appointment|InboundException"
rg "queryInboundProduct|InboundProduct|PSC"
rg "quota|CBM|SkuSlot" --glob "*mks*"
rg "Importer|CustomsDocument|清关"
rg "ValueAdded|增值"
rg "action.*inbound" -i
```

---

## 三、Winit OpenAPI 调用约定（通用，与上游集成无关）

万邑通 OpenAPI 采用 **action + data** 模式。你在文档包中应按此格式描述每个接口。

### 3.1 HTTP 请求形态

| 项 | 说明 |
|---|---|
| 核心字段 | `action`（字符串，接口动作名）、`data`（业务 JSON 对象或字符串，以官方为准） |
| 响应 | 顶层 `code`（0 或 "0" 为成功）、`msg`、`data`（业务结果，可能是嵌套 JSON 字符串） |

### 3.2 文档中应给出的样例格式

```json
{
  "action": "{actionName}",
  "data": {
    "inboundOrderNum": "WI20260101001"
  }
}
```

```json
{
  "code": "0",
  "msg": "Success",
  "data": {
    "inboundOrderNum": "WI20260101001",
    "status": "PEWC"
  }
}
```

### 3.3 已知的出库 OpenAPI action（命名参考，非入库）

| action | doc id | 说明 |
|---|---|---|
| `queryOutboundOrder` | id/55 | 单个出库单查询 |
| `queryOutboundOrderList` | id/54 | 出库单列表查询 |

入库侧 action 命名可能对称，如 `queryInboundOrder`，**但必须从官方文档或 OMS 注册表核实，不可假设**。

### 3.4 接入形态分类（写入文档时使用）

| 形态 | 说明 | 文档标注 |
|---|---|---|
| **OpenAPI 已开放** | 官方文档有 action + 样例 | 正常 document |
| **内部 HTTP/RPC** | 源码有 Controller/Facade，但未开放 OpenAPI | `[无 OpenAPI - 内部 API]` |
| **仅 UI / 流程系统** | 如飞书多维表格承载的权限申请 | `[无 OpenAPI - 流程系统]` |
| **无实时接口** | 纯规则/静态知识 | `[无 API - 规则兜底]` |

---

## 四、系统归属规则（2026-06 已确认，必须遵守）

调研时**不要搞错系统**：

| 能力 | 正确系统 | 错误归属（勿混淆） |
|---|---|---|
| 客户 CBM/SKU 额度 | **MKS**（营销管理系统） | ~~UMS~~、~~OMS~~ |
| 入库可用 PSC / 产品线开通态 | **OMS** | ~~UMS~~、~~MKS~~ |
| 入库单 / 预约单 / 异常单 / 增值单 | **OMS** | — |
| 上架 / 验收数据 | **IMS / WMS**（常与 OMS 聚合返回） | — |
| 权限申请提交 / 审批进度 | **飞书多维表格**（流程系统，非 OMS/UMS） | 标注 Gap，不强行找 OpenAPI |
| 进口商 / 清关资料 | **UMS** `[待确认]` | — |
| 仓级库容温度 / Slots 排期 | **WMS / 库容系统** | **≠** 客户 CBM 额度（MKS） |
| SKU 件型 / 特殊属性 | **商品系统** | — |
| 头程物流 / 清关轨迹 | **TMS 智运**（你可能无权限） | 标注 Gap |

---

## 五、业务场景分组说明

下文「消费场景 ID」（如 `inbound-order-status.query-by-no`）是**业务分组标签**，方便按客服问题归类 API，与任何上游框架无关。

入库业务分 **18 组消费场景**（13 业务流程 + 5 基础信息）。每组对应一类客户咨询，你需要为每组涉及的 API 写文档。

| 消费场景组 ID | 层 | 优先级 | 主要系统 | 说明 |
|---|---|---|---|---|
| `inbound/inbound-order-status` | 基础信息 | **P0** | OMS | 入库单/预报单状态、字段、报错 |
| `inbound/inbound-arrival-status` | 业务流程 | **P0** | OMS + TMS | 到仓轨迹、签收、PEWC/EWC |
| `inbound/inbound-putaway-status` | 业务流程 | **P0** | OMS + IMS | 上架进度、数量 |
| `inbound/inbound-putaway-expedite` | 业务流程 | **P0** | OMS + IMS | 催上架、SLA |
| `inbound/inbound-psc-eligibility` | 基础信息 | P1 | **OMS** | 入库可用 PSC、自验/海外验权限（只读） |
| `inbound/inbound-capacity-availability` | 业务流程 | P1 | **MKS** + WMS | 客户 CBM/SKU 额度 + 仓级 Slots |
| `inbound/inbound-permission-apply` | 业务流程 | P1 | 多维表格 | 权限申请/审批（无 OpenAPI） |
| `inbound/inbound-order-manage` | 业务流程 | P1 | OMS | 创建/修改/关闭入库单 |
| `inbound/inbound-appointment-manage` | 业务流程 | P1 | OMS | 预约送仓 CRUD |
| `inbound/inbound-exception-check` | 业务流程 | P1 | OMS + IMS | 入库异常单 |
| `inbound/inbound-transit-tracking` | 业务流程 | P1 | TMS + OMS | 头程在途（TS 阶段） |
| `inbound/inbound-self-inspection` | 业务流程 | P1 | 验货系统 + OMS | 自验/抽验 |
| `inbound/inbound-customs-clearance` | 业务流程 | P2 | TMS + OMS | 清关进度 |
| `inbound/inbound-customs-doc-manage` | 业务流程 | P2 | UMS | 清关资料、进口商 |
| `inbound/inbound-overseas-inspection` | 业务流程 | P2 | WMS | 海外验进度 |
| `inbound/inbound-warehouse-info` | 基础信息 | — | 无 API | 静态仓资料，跳过 |
| `inbound/inbound-process-guide` | 基础信息 | — | 弱 | 规则类，PSC 可读 OMS |
| `value-add/value-add-order-status` | 跨域 | 部分 | OMS | 已提交增值单状态 |

### 5.1 权益类 API 依赖（帮助理解字段用途）

```
OMS inbound-psc-eligibility（只读 PSC 列表）
  ← inbound-order-manage 下单前校验
  ← inbound-permission-apply 判断申请类型

MKS capacity（客户 CBM/SKU 额度）
  ← inbound-permission-apply 判断是否需扩容

多维表格 inbound-permission-apply（申请/审批，无 OpenAPI）
  → 读 OMS PSC + MKS 额度做前置判断
```

---

## 六、共享 API 层（多个场景共用，优先调研）

| 共享能力 | 建议 action | 系统 | 消费场景组 |
|---|---|---|---|
| 入库单详情 + 状态 + 轨迹 | `queryInboundOrder` `[待确认]` | OMS | inbound-order-status、inbound-arrival-status、inbound-putaway-status、inbound-transit-tracking、inbound-exception-check |
| 入库单列表 | `queryInboundOrderList` `[待确认]` | OMS | inbound-order-status、inbound-putaway-expedite |
| 预约单查询 | `queryAppointment` `[待确认]` | OMS | inbound-appointment-manage、inbound-arrival-status |
| 预约单创建/修改 | `createAppointment` / `updateAppointment` `[待确认]` | OMS | inbound-appointment-manage |
| 入库异常单 | `queryInboundException` `[待确认]` | OMS | inbound-exception-check、inbound-self-inspection |
| 增值单状态 | `wh.va.order.basicInfo` + `wh.va.order.getVasList` | OMS | value-add/value-add-order-status |
| **客户 CBM/SKU 额度** | `[待确认]` | **MKS** | inbound-capacity-availability |
| **入库可用 PSC** | `[待确认]` | **OMS** | inbound-psc-eligibility、inbound-order-manage |
| 权限申请/审批 | `[无 OpenAPI]` | 多维表格 | inbound-permission-apply |
| 进口商 | `[待确认]` | UMS | inbound-customs-doc-manage |
| 头程物流单 | `[待确认]` | TMS | inbound-transit-tracking、inbound-customs-clearance |
| SKU 档案 | `queryMerchandise` `[待确认]` | 商品系统 | inbound-exception-check、value-add/value-add-product-recommendation |
| 仓级库容/Slots | `[待确认]` | WMS | inbound-capacity-availability、inbound-appointment-manage |

---

## 七、完整 API 场景清单（逐项调研并写文档）

> 对每个场景：确认 action / 内部接口，或标注 Gap。`[待确认]` 表示输入侧尚未核实。

### 7.0 入库轨迹 API（2026-06 已确认）

> 完整规格：[`docs/plan/inbound-tracking-api.md`](../inbound-tracking-api.md)

| Action | 说明 | 消费专家 |
|--------|------|----------|
| `wh.tracking.queryOrderTracking` | 入库单号 → 全流程 `trackingList` | inbound-order-status、inbound-arrival-status、inbound-putaway-status、inbound-transit-tracking |
| `wh.tracking.queryUnloadRecords` | 快递单号批量精确 → 卸货记录 | inbound-arrival-status |
| `wh.tracking.queryUnloadRecordsFuzzy` | 快递单号模糊 → 卸货记录 | inbound-arrival-status |

**注意**：`winit.wh.inbound.getOrderDetail` **不含轨迹**；勿再写 `trajectoryList` 来自详情接口。

### 7.1 `inbound-order-status`（P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-order-status.query-by-no` | 入库单现在什么状态 | OMS | `winit.wh.inbound.getOrderDetail` | `orderNo`、`status`、`winitProductCode` | 读 |
| `inbound-order-status.trajectory` | 轨迹里程碑 | OMS | **`wh.tracking.queryOrderTracking`** | `trackingList[]` | 读 |
| `inbound-order-status.decode-field` | 状态码含义 / 为什么 PEWC | OMS | 详情 + KB | `status` | 读 |
| `inbound-order-status.error-code` | 系统报错 ERR_xxx | OMS | 错误码表 / 无独立 API | — | 规则 |

### 7.2 `inbound-arrival-status`（P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-arrival-status.trajectory` | 货什么时候到仓 / 轨迹在哪 | OMS | **`queryOrderTracking`** + `getOrderDetail` | `trackingList`、`awhDate` | 读 |
| `inbound-arrival-status.ewc-confirm` | 签收了但没确认 / PEWC→EWC | OMS | `getOrderDetail` | `status` | 读 |
| `inbound-arrival-status.pod` | 快递到了没 / 签收证明 | OMS | **`queryUnloadRecords`** / **`queryUnloadRecordsFuzzy`** | `unloadDate`、`expressNo` | 读 |

### 7.3 `inbound-putaway-status`（P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-putaway-status.progress` | 上架了没 / 多久完成 | OMS | `getOrderDetail` + **`queryOrderTracking`** | `shelveCompletedDate`、`trackingList` | 读 |
| `inbound-putaway-status.qty-discrepancy` | 上架数量和预报对不上 | OMS | `getOrderDetail` | `orderMerchandiseQty`、`actualOrderMerchandiseQty` | 读 |

### 7.4 `inbound-putaway-expedite`（P0）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-putaway-expedite.urge` | 催上架 / 超 24h 未上架 | OMS | `queryInboundOrder` + SLA 规则 | `putawayDeadline`、`isSlaBreached` | 读 |
| `inbound-putaway-expedite.rush` | 活动急需上架 | OMS + WMS | `queryInboundOrder` `[待确认]` | `warehouseLoadStatus` | 读 |

### 7.5 `inbound-exception-check`（P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-exception-check.query` | 有没有异常单 | OMS | `queryInboundException` `[待确认]` | `exceptionType`、`exceptionQty`、`createTime` | 读 |
| `inbound-exception-check.qty-diff` | 签收少件 / 数量对不上 | OMS + IMS | 入库单 + 异常单 | `receivedQty`、`expectedQty`、`exceptionReason` | 读 |

### 7.6 `inbound-psc-eligibility`（P1）— **OMS**

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-psc-eligibility.list` | 能用哪些入库产品 / OW01 开通了吗 | **OMS** | `[待确认]` | `productCode`、`productName`、`enabled`、`warehouseCode` | 读 |
| `inbound-psc-eligibility.inbound-self-inspection` | 有没有自验权限 | **OMS** | `[待确认]` | `productCode`（OW01021/OW01022）、`enabled` | 读 |
| `inbound-psc-eligibility.overseas` | 能不能用海外验 | **OMS** | `[待确认]` | `productCode`（OW01031/OW01032）、`enabled` | 读 |

### 7.7 `inbound-capacity-availability`（P1）— **MKS**

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `capacity.cbm-quota` | 还剩多少 CBM/SKU 额度 | **MKS** | `[待确认]` | `totalCbm`、`usedCbm`、`remainingCbm`、`totalSkuSlots`、`usedSkuSlots` | 读 |
| `capacity.slots` | 这个仓还能不能约 Slots | WMS | `[待确认]` | `slotAvailability`、`loadTemperature` | 读 |
| `capacity.overall` | 能不能收这批货 | MKS + WMS | 综合 | — | 读 |

### 7.8 `inbound-permission-apply`（P1）— **多维表格，无 OpenAPI**

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `permission.apply` | 怎么申请自验/海外验权限 | **多维表格** | `[无 OpenAPI - 流程系统]` | `permissionType`、`materialList` | 写（流程） |
| `permission.progress` | 申请审核到哪了 | **多维表格** | `[无 OpenAPI - 流程系统]` | `approvalStatus`、`approvalRemark` | 读 |
| `permission.current-snapshot` | 现在有哪些权限 | OMS | 同 inbound-psc-eligibility | — | 读 |

### 7.9 `inbound-order-manage`（P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-order-manage.create` | 新建入库单 / 选 PSC | OMS | `createInboundOrder` `[待确认]` | `productCode`、`warehouseCode`、`skuList` | 写 |
| `inbound-order-manage.modify-dest` | 修改目的仓 / SKU | OMS | `updateInboundOrder` `[待确认]` | `inboundOrderNum`、`newWarehouseCode` | 写 |
| `inbound-order-manage.close` | 关闭/终止入库单 | OMS | `cancelInboundOrder` `[待确认]` | `inboundOrderNum`、`cancelReason` | 写 |

### 7.10 `inbound-appointment-manage`（P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `appointment.create` | 预约送仓 / 获取预约码 | OMS | `createAppointment` `[待确认]` | `appointmentCode`、`appointmentDate`、`warehouseCode` | 写 |
| `appointment.modify` | 改预约 / 取消 | OMS | `updateAppointment` `[待确认]` | `appointmentNo`、`newDate` | 写 |
| `appointment.penalty` | 没预约被扣费 | OMS | `queryAppointment` `[待确认]` | `penaltyFee`、`appointmentStatus` | 读 |

### 7.11 `inbound-transit-tracking`（P1）— TMS，可能无权限

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `transit.departure` | 什么时候离港 | TMS | `[待确认 / 可能无权限]` | `departureTime`、`flightNo` | 读 |
| `transit.arrival-port` | 到港了没 | TMS | `[待确认 / 可能无权限]` | `arrivalPortTime` | 读 |
| `transit.eta-warehouse` | 预计什么时候到仓 | TMS + OMS | 组合 | `etaWarehouse`、`currentMilestone` | 读 |

### 7.12 `inbound-self-inspection`（P1）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-self-inspection.status` | 自验提交了没 | 验货系统 | `[待确认]` | `inspectionStatus`、`submittedQty` | 读 |
| `inbound-self-inspection.modify` | 验货数据修改/重验 | 验货系统 | `[待确认]` | `inboundOrderNum`、`correctedData` | 写 |
| `inbound-self-inspection.sampling-result` | 抽验结果/费用 | OMS + 验货 | 异常单 + 验货 API | `samplingResult`、`samplingFee` | 读 |

### 7.13 `inbound-overseas-inspection`（P2）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `inbound-overseas-inspection.progress` | 海外验进度 | WMS | `[待确认]` | `inspectionPhase`、`estimatedCompleteTime` | 读 |

### 7.14 `inbound-customs-clearance`（P2）

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `customs.status` | 清关进行到哪 | TMS + OMS | `[待确认]` | `customsStatus`、`customsNode` | 读 |
| `customs.dutiable` | 包税渠道有没有清关轨迹 | — | `[无 API - 规则兜底]` | — | — |

### 7.15 `inbound-customs-doc-manage`（P2）— UMS

| 场景 ID | 触发问题 | 系统 | 建议 action | 关键字段 | 读/写 |
|---|---|---|---|---|---|
| `customs-doc.upload` | 清关资料上传 | UMS | `[待确认]` | `documentType`、`uploadUrl`、`reviewStatus` | 写 |
| `customs-doc.importer-register` | 进口商注册 | UMS | `[待确认]` | `importerName`、`vatNo` | 写 |
| `customs-doc.importer-query` | 进口商审核结果 | UMS | `[待确认]` | `importerCode`、`status` | 读 |

### 7.16 跨域：`sku/profile`

| 场景 ID | 触发需求 | 系统 | 建议 action | 关键字段 |
|---|---|---|---|---|
| `sku.profile.by-sku` | SKU 件型、特殊属性 | 商品系统 | `queryMerchandise` `[待确认]` | `skuCode`、`hazmatFlag`、`batteryFlag` |
| `sku.profile.batch` | 批量 SKU 属性 | 商品系统 | `queryMerchandiseList` `[待确认]` | `skuCodes[]` |

### 7.17 跨域：`warehouse/capacity-signal`

> 仓级 Slots ≠ 客户 CBM 额度（MKS）

| 场景 ID | 触发需求 | 系统 | 建议 action | 关键字段 |
|---|---|---|---|---|
| `warehouse.capacity-signal.temperature` | 仓库容温度 | WMS | `[待确认]` | `warehouseCode`、`loadTemperature` |
| `warehouse.capacity-signal.slots` | 可约 Slots | WMS/预约 | `[待确认]` | `warehouseCode`、`availableSlots[]` |

---

## 八、UI 操作路径参考（帮助在源码中定位接口）

以下是客服在 TOM/万邑联上的操作路径，对应的后端接口即你要找的 API：

| 业务操作 | UI 路径 | 预期后端系统 |
|---|---|---|
| 查入库单状态/轨迹 | TOM → OMS → InboundOrderSearch → 详情/轨迹 | OMS |
| 查头程物流 | TOM → 智运 → 物流单 | TMS |
| 查上架进度 | TOM → 综合查询 → 入库单 → 轨迹 | OMS (+ IMS) |
| 查异常单 | 云仓 → 订单管理 → 入库异常记录 | OMS |
| 查/改预约 | 万邑联 → 海外仓 → 入库 → 预约送仓 | OMS |
| 查库容额度 | 万邑联 → 账户中心 → 库容额度 | **MKS** |
| 查产品权限 | 万邑联 → 个人中心 → 产品权限 | **OMS** |
| 权限申请/审批 | 飞书多维表格 | 流程系统（无 OpenAPI） |
| 进口商管理 | 万邑联 → 个人中心 → 进口商 | UMS |
| 自验操作 | 万邑联 → 自验进度 | 验货系统 |

---

## 九、调研优先级

```
P0（必须先完成，写入文档包 openapi/oms/ 目录）：
  queryInboundOrder / queryInboundOrderList
  → 覆盖 inbound-order-status、inbound-arrival-status、inbound-putaway-status、inbound-putaway-expedite

P1：
  OMS  → PSC 查询、预约 CRUD、异常单、入库单 CRUD
  MKS  → 客户 CBM/SKU 额度
  标注 → inbound-permission-apply（多维表格 Gap）、inbound-transit-tracking（TMS Gap）

P2：
  UMS  → 进口商、清关资料
  WMS  → 海外验、仓级 Slots
  TMS  → 清关/头程（可能无权限，写 gaps.md）
```

---

## 十、本机文档包结构（唯一交付物）

在本机工作目录创建以下结构，**全部写满**：

```
inbound-api-docs/
├── README.md                 # 文档包说明、生成日期、调研范围、未完成 Gap 摘要
├── INDEX.md                  # 总览表：场景 ID × action × 系统 × 状态 × 文件链接
├── GAPS.md                   # 所有无法确认 / 无 OpenAPI 的项及原因
├── openapi/                  # 已确认 OpenAPI 接口
│   ├── oms/
│   │   ├── queryInboundOrder.md
│   │   ├── queryInboundOrderList.md
│   │   ├── createInboundOrder.md
│   │   └── ...
│   ├── mks/
│   │   └── queryCustomerQuota.md   # 以实际 action 名为文件名
│   ├── ums/
│   │   └── ...
│   └── merchandise/
│       └── queryMerchandise.md
├── internal/                 # 有源码但未开放 OpenAPI 的内部接口
│   ├── oms/
│   ├── ims/
│   └── ...
└── scenarios/                # 按业务场景 ID 组织（与 §七 一一对应）
    ├── inbound-order-status.query-by-no.md
    ├── inbound-psc-eligibility.list.md
    ├── capacity.cbm-quota.md
    └── ...
```

### 10.1 `README.md` 必含

- 生成时间与 Agent 环境说明
- 调研来源列表（查了哪些仓库 / 官方文档）
- P0 完成度
- 如何将本包交给下游（experts 项目会导入，你无需操作）

### 10.2 `INDEX.md` 必含列

| 场景 ID | 业务问题摘要 | 系统 | action / 接口 | OpenAPI doc id | 状态 | 文档路径 |
|---|---|---|---|---|---|---|

状态枚举：`已确认 OpenAPI` | `内部 API` | `Gap - 无 OpenAPI` | `Gap - 无权限` | `规则兜底`

### 10.3 单个 OpenAPI 文档模板（`openapi/{system}/{action}.md`）

```markdown
# {action}

- **System**: OMS | MKS | UMS | IMS
- **Doc ID**: id/{xxx}
- **Doc URL**: https://developer.winit.com.cn/document/detail/id/{xxx}.html
- **Method**: 读 | 写
- **源码定位**: {仓库路径 / Controller 类名，如有}

## Request

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| ... | ... | ... | ... |

## Response

| 字段 | 类型 | 说明 |
|---|---|---|
| ... | ... | ... |

## 请求样例

\`\`\`json
{ "action": "{action}", "data": { ... } }
\`\`\`

## 响应样例

\`\`\`json
{ "code": "0", "msg": "Success", "data": { ... } }
\`\`\`

## 关联场景

- inbound-order-status.query-by-no
- inbound-arrival-status.trajectory
```

### 10.4 单个场景文档模板（`scenarios/{scenario-id}.md`）

```markdown
# {scenario-id}

- **业务问题**: ...
- **系统**: OMS | MKS | ...
- **OpenAPI action**: `{action}` 或 `[Gap 说明]`
- **Method**: 读 | 写
- **详细接口文档**: 链接到 openapi/ 或 internal/ 下对应文件
- **关键入参**: ...
- **关键出参**: ...
- **备注**: ...
```

### 10.5 `GAPS.md` 必含

| 场景 ID | 原因 | 建议 |
|---|---|---|
| permission.apply | 流程在飞书多维表格，无 OpenAPI | 人工/SOP 兜底 |
| transit.departure | TMS 智运，Agent 无仓库权限 | 需 TMS 团队补充 |
| ... | ... | ... |

---

## 十一、禁止事项

- **不要**访问或修改 experts 项目及本 Prompt 所属仓库
- **不要**引用 Coze、workflow、expert 节点等上游概念
- **不要**猜测 action 名；找不到就写进 `GAPS.md`
- **不要**把 MKS 客户额度与 WMS 仓级 Slots 混淆
- **不要**把 OMS PSC 查到 UMS 或 MKS
- **不要**假设权限申请/审批有 OpenAPI（在多维表格）
- **不要**在文档中使用 HTML 实体字符

---

## 十二、风险与已知 Gap（调研时重点核实）

| 项 | 说明 |
|---|---|
| 入库 OpenAPI action | 可能尚无 `queryInbound*`，需从 OMS 注册表 + 官方文档双向核实 |
| MKS 额度 | CBM/SKU 在 MKS，action 名未知 |
| OMS PSC | 与入库单同 OMS 域，action 名未知 |
| 权限申请/审批 | 飞书多维表格，确认无 OpenAPI 后写 Gap |
| TMS 头程 | 你可能无 TMS 仓库权限 |
| 验货系统 | 可能独立于 OMS |
| 写操作开放度 | create/update 类接口是否对客户 OpenAPI 开放需逐一确认 |

---

## 十三、背景参考（解读字段用）

### OW01* 入库产品代码

| 代码 | 产品 |
|---|---|
| OW01021 | 旧版自验 |
| OW01022 | 新版自验（快速自验） |
| OW01031 | 海外验（有箱单） |
| OW01032 | 海外验（无箱单/预报） |

### 入库状态码

| 状态 | 含义 |
|---|---|
| OD | 订单草稿 |
| TS | 运输中（头程在途） |
| PEWC | 已到仓待确认/验货中 |
| EWC | 到仓确认完成 |
| 上架完成 | WMS 上架结束 |
