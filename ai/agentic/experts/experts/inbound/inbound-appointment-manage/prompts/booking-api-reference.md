# 预约送仓 OpenAPI 对接参考（只读解读用）

> 来源：`_kb/system-team/inbound-integration-solution/business/inbound/booking-overview.md`  
> **本专家不调用写接口**；以下供 `query` / `create_guide` 解读状态与说明平台操作链路。

## 适用业务场景

头程类型 = **卖家直发**，验货类型 = **客户自验 / 海外验货** 的入库单，货物到海外仓前须完成 **送仓时段预约**。万邑联预约单管理与 OpenAPI 预约链路透同一套业务对象。

## API 链路（对接顺序）

```
Step 1  unBookingOrder.list              查询待预约入库单
Step 2  queryAvailableWarehouseinPlan    查询目的仓可约时段
Step 3  create                           创建预约（一步完成）
Step 4  list                             查询预约单状态/明细
Step 5  cancel（可选）                    取消预约（建议至少提前 2 个自然日）
Step 6  exportPodPdf（可选，ERP 落盘）     返回 base64 PDF；Agent 通道不可转发给客户
```

| 序号 | OpenAPI Action | 用途 | 本专家 |
|------|----------------|------|--------|
| B.1 | `winit.wh.inbound.booking.unBookingOrder.list` | 待预约入库单列表 | 不调用；create_guide 说明「在万邑联勾选待约单」 |
| B.2 | `winit.wh.inbound.booking.queryAvailableWarehouseinPlan` | 可约时间窗 | 不调用；引导客户在万邑联预约页查看 Slot |
| B.3 | `winit.wh.inbound.booking.create` | 创建预约 | **不调用**；客户平台操作 |
| B.4 | `winit.wh.inbound.booking.cancel` | 取消预约 | **不调用**；客户平台操作 |
| B.5 | `winit.wh.inbound.booking.list` | 预约列表与详情 | **query / penalty 运行时读取**（Coze 代理 action 待注册） |
| B.6 | `wh.inboundSigned.exportPodPdf` | POD 签收 PDF（**响应 base64**） | **Agent 不调用**；仅 ERP 对接落盘；`pod_guide` 引导万邑联自助下载 |

> Coze 代理常用短名 `winit.wh.inbound.booking.list`，与 OpenAPI 全名等价，以代理工作流注册名为准。

## 核心业务规则

### 多单合并预约

- 多个入库单可合并为 **同一预约单**，须 **同一目的仓**
- **整柜（FCL）与散货（LCL）不可混约**

### 送仓方式

| 代码 | 名称 | 规则 |
|------|------|------|
| FCL | 整柜 | 一柜一预约；可含多入库单；联系人/托盘数/柜型必填 |
| LCL | 散货 | 散货送仓；联系人可选 |

### 卸货方式

| 代码 | 名称 | 适用 |
|------|------|------|
| LIVE | 现场卸货 | LCL、FCL 均可 |
| DROP | 落柜卸货 | **仅 FCL**；美国整柜多为 DROP |

### 时间规则

- API 返回时间均为 **仓库当地时间**
- 临近预约日取消可能产生 **迟取消费**（对接文档建议至少提前 **2 个自然日**）
- 系统 **不会主动取消** 客户预约

### FCL 必填字段（创建预约时）

- `contactPerson` / `email` / `contactNumber` — 送仓联系人（建议填司机电话）
- `cabinetType` — 柜型（20GP/40GP/40HQ/45HQ/53HQ）
- `containerNo` — 柜号
- `palletQty` — 托盘数
- `sealNo` — 封条号（有则填）

## 预约状态码

| 代码 | 英文 | 对客含义 |
|------|------|----------|
| WBO | Waiting Booking | 预约已创建，等待预约确认 |
| WABO | Waiting Approval | 等待审批（含增值预约） |
| SBO | Booking Successful | 预约成功，可按约送仓 |
| RBO | Arrived at Warehouse | 货物已到仓 |
| EXRBO | Abnormal Arrival | 到仓异常 |
| CANCEL | Cancelled | 预约已取消 |

解读 `booking.list` 或表头 `inboundBookingStatus` 时优先用上表；未知码如实转述并建议客户在万邑联查看详情。

## 预约类型

| 代码 | 名称 | 说明 |
|------|------|------|
| Normal | 普通预约 | Basic 3PL 客户主要使用 |
| ValueAdded | 增值预约 | 付费预约，见 premium-booking |
| VIP | VIP 预约 | 需配额 |
| RegularBus | 班车预约 | 班车送仓 |

## 柜型代码

20GP、40GP、40HQ、45HQ、53HQ

## 推荐集成时序（对客户说明创建流程）

```
入库单进入在途(TS) → 查待预约单 → 查可约时段 → 客户选日期 → 创建预约
→ 定期查 list 看状态 → 到仓后可下载 POD
```

客户通过 **万邑联 → 预约单管理** 完成上述写操作，无需也勿向客服提供柜号/Slot 等代为提交。
