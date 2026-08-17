---
title: Flow 01 — 标准海外仓入库（Winit 头程全链路）
type: flow
tags: [inbound, standard, first-leg, winit-transport]
updated: 2026-06-06
---

# Flow 01：标准海外仓入库（Winit 头程全链路）

> **适用条件：** 客户选择 Winit 全程托管，从国内揽收/自送至 Winit 国内仓，由 Winit 安排出口、国际运输，最终送达海外仓上架。
> **PSC 前缀：** `OW01011*`（头程产品）
>
> 见 [playbook.md](../playbook.md)「产品选择决策树」→「使用 Winit 头程」分支。

---

## 一、全链路概览

```
[信息流]
 下单（选 PSC）→ SKU 确认 → 箱单上传 → 轨迹追踪（DR→OD→RE→TS→PEWC→EWC→SHD）

[实物流]
 揽收/自送国内仓 → 国内仓质检 → 出库发运（TS）
 → 国际运输（空/海/快递）→ 进口清关 → 海外仓卸货（PEWC/EWC）→ 上架（SHD）
```

---

## 二、信息流步骤

| 步骤 | 操作 | 关键要求 |
|---|---|---|
| 1. SKU 注册 | 在万邑联完成 SKU 注册并发布 | 必须在下单前完成；含品名、申报价值、尺重 |
| 2. 创建入库单 | 选择 PSC（`OW01011*`）、目的仓、填写包裹信息 | 重量：21–99 kg/单；包裹 ≤60 kg `[KB]` |
| 3. 上传箱单 | 提供完整装箱明细（SKU + 数量 + 箱号） | 标准头程需有箱单，国内仓据此完成质检 |
| 4. 提交发货 | 确认入库单（OD） | 此后进入国内仓揽收流程 |
| 5. 轨迹追踪 | 在万邑联查看状态变化及轨迹里程碑 | 到港、清关、送仓各阶段均可追踪 |

> **申报价值建议** `[KB]`：美国单票申报价值 ≤ 660 USD（上限 700 USD），澳洲 ≤ 600 USD。超限可能触发正式报关，关税实报实销。

---

## 三、实物流步骤

### 3.1 揽收 / 自送国内仓

- **揽收**：Winit 安排上门揽货
- **自送**：客户将货物送至 Winit 指定的国内中转仓
- 状态变为 `RE`（已收货）

### 3.2 国内仓质检

- Winit 国内仓按箱单对货物完成验货（数量、条码、SKU 匹配）`[KB]`
- 质检通过后触发出库安排
- 国内仓出库时效 `[KB]`：
  - 周一至周五验货完成 → 次日交快递供应商
  - 周六至周日验货完成 → 下周一交快递供应商

### 3.3 出口报关与发运（`RE → TS`）

- 国内仓完成出库后状态变为 `TS`（运输中）
- 出口清关采用快件申报（快递产品），不提供一般贸易申报
- 详细出口/清关逻辑见 [flows/05-customs-and-international.md](05-customs-and-international.md)

### 3.4 国际运输

按 PSC 选择的运输方式，时效差异较大：

| 运输方式 | PSC 示例 | 特点 |
|---|---|---|
| 空运 | OW010111x | 时效最快，适合小体积高价值 |
| 海运散货（LCL）| OW010112x | 中等时效，适合中批量 |
| 海运整柜（FCL）| OW010113x | 大批量低成本，时效较长 |
| 快递（FedEx/UPS 等）| OW010114x | 点对点，时效快，有重量限制 |
| 空卡 / 空派 / 海卡 / 海派 | OW010115x+ | 空陆联运或海陆联运 |
| 美森快船 | OW01011xx | 美线专项，到仓后 SLA 2 工作日 |

> **混装柜转运 `[KB]`**：多客户货物共柜，到达中转港（如 USWC）后拆分并转运至最终目的仓（如 USTX）。见 [`流程起始话术.md`](../../../_kb/service-team/inbound-services-doc/流程起始话术.md) 相关说明。

### 3.5 进口清关

- 美国 / 澳洲 / 加拿大 采用**预清关**模式：货物未到港前可提前完成清关手续，因此清关时间可能早于到港时间 `[KB]`
- 欧洲（UK / DE / BE 等）有递延清关选项，见 [flows/05-customs-and-international.md](05-customs-and-international.md)
- 如发生查验（实物查验），会延误到港和送仓时间

### 3.6 海外仓到仓（`TS → PEWC → EWC`）

- **快递到仓**：取快递单号妥投时间（无单号则取实际卸货时间）`[KB]`
- **散货到仓**：取预约单实际到仓时间
- **整柜 LIVE**：取预约单实际到仓时间
- **整柜 DROP**：取预约单预约卸货时间

> 标准头程不需要客户提交预约单（Winit 承运，仓库可识别来货）。`[推断]`

### 3.7 上架（`EWC → SHD`）

按到仓时间计算 SLA（详见 [playbook.md](../playbook.md)「上架 SLA 速查」）：

- 美国空运 / FedEx：**1 工作日**
- 美国美森/以星散货：**2 工作日**
- 美国其他散货/整柜：**3 工作日**
- 非美国空运/快递：**1 工作日**；海运：**3 工作日**

---

## 四、常见坑与注意事项

| 问题 | 说明 | 处理 |
|---|---|---|
| 预计到港 vs 实际到港 | 异常（离港延误/查验）可能导致实际到港晚于预计 | 查 TOM 异常事件 C03 开头记录 `[KB]` |
| 清关完成早于到港 | 美/澳/加预清关正常现象 `[KB]` | 不需要客户处理，提示客户知悉 |
| 国内仓收货时效 | 揽收后国内仓收货扫描才变 RE，进度不等同于发运 | 等待国内仓扫描 |
| 空卡 SLA 降级 | 送仓 POD 未备注航单号，仓库默认按海卡 SLA（4 工作日）处理 | 客户须在 POD 注明「空卡 + 11 位航运单号」`[KB]` |
| 申报价值超限 | 触发正式报关，关税实报实销 | 建议客户分批发货或调整申报 |

---

## 五、延伸阅读

| 文档 | 路径 |
|---|---|
| 头程产品详情 | [`_kb/product-team/winit/in-warehouse/inbound-product-details.md`](../../../_kb/product-team/winit/in-warehouse/inbound-product-details.md) |
| 头程快递常见问题 | [`_kb/service-team/inbound-services-doc/海外仓头程快递入库服务常见问题.md`](../../../_kb/service-team/inbound-services-doc/海外仓头程快递入库服务常见问题.md) |
| 头程到港查询 SOP | [`_kb/service-team/inbound-services-doc/查询头程到港时间的处理流程.md`](../../../_kb/service-team/inbound-services-doc/查询头程到港时间的处理流程.md) |
| 进口清关查询 SOP | [`_kb/service-team/inbound-services-doc/查询头程进口清关_查验进度的处理流程.md`](../../../_kb/service-team/inbound-services-doc/查询头程进口清关_查验进度的处理流程.md) |
| 上架时效与催架 | [`_kb/service-team/inbound-services-doc/咨询入库单上架时间及催上架处理流程.md`](../../../_kb/service-team/inbound-services-doc/咨询入库单上架时间及催上架处理流程.md) |
| 出口/进口清关分支 | [flows/05-customs-and-international.md](05-customs-and-international.md) |
