---
title: Flow 02 — 直发 + 自验（客户国内验货）
type: flow
tags: [inbound, direct, inbound-self-inspection, customer-inspect]
updated: 2026-06-06
---

# Flow 02：直发 + 自验（客户国内验货）

> **适用条件：** 客户在国内发货前自行完成验货（数量、SKU 匹配），货物由客户自行安排物流（或 Winit 承运）直发至 Winit 海外仓，不再由 Winit 国内仓复检。
> **PSC 前缀：**
> - `OW01022*`：客户自验货 · 卖家直发（客户自选物流）
> - `OW01021*`：客户自验货 · Winit 承运（Winit 安排头程，但客户侧先验货）
>
> 见 [playbook.md](../playbook.md)「产品选择决策树」→「直发 + 自验」分支。

---

## 一、全链路概览

```
[信息流]
 下单（选 PSC OW01021/22）→ SKU 填写
  → 旧自验：上传完整箱单 → 客户完成 PDA/API/Excel 验货
  → 新自验：填 SKU + 数量（箱单可后补）→ 客户 PDA 扫描验货后系统自动更新
  → 轨迹追踪（DR→OD→TS→PEWC→EWC→SHD）

[实物流]
 客户发货（快递/散货/整柜）→ 海外仓卸货（PEWC/EWC）
  → 抽验（按概率/白名单）→ 上架（SHD）
```

> **注意：** 自验链路无 `RE` 状态（`RE` 仅在 Winit 国内仓收货时触发）。`TS` 由客户确认发货触发。`[KB]`

---

## 二、三种自验模式详解

`[KB]` 来自 [`inbound-product-details.md`](../../../_kb/product-team/winit/in-warehouse/inbound-product-details.md) 与 [`自验货方式常见问题.md`](../../../_kb/service-team/inbound-services-doc/自验货方式常见问题.md)

### 2.1 标准自验（旧自验）

- 客户下单时必须**提前上传完整装箱明细**（SKU × 数量 × 箱号）
- 验货方式：PDA 扫描枪（App）逐箱扫码确认，或 Excel 导入
- 特点：箱单与实物须完全匹配，否则触发异常

### 2.2 新自验

`[KB]` 下单时**无需先传箱单**，只需填写 SKU + 数量即可创建入库单 `[KB]`

- 客户用 PDA App 扫描商品条码完成验货（自动记录 SKU × 箱 × 数量）
- 验货完成后系统根据扫描数据生成箱单
- 支持重验（如验错可重新扫描修正）
- 适合工厂型客户，无需提前整理装箱明细
- App 更新地址：`http://tom.winit.com.cn/winitho/WinitHO2.apk`

### 2.3 API 对接验货（快速自验）

- 客户通过自有系统与 Winit API 对接，自动上传验货数据
- 适合有 ERP/WMS 的大客户，无需手动操作 PDA
- 支持「旧自验」与「新自验」两种模式

### 2.4 免验货

- 条件：`[推断]` 仅限客户已满足 Winit 白名单要求（历史验货准确率高）
- 以 Excel 箱单形式上传，Winit 不进行物理开箱核对
- 适用 PSC：部分 `OW01021*`

---

## 三、信息流步骤

| 步骤 | 旧自验 | 新自验 |
|---|---|---|
| 1. SKU 注册 | 提前注册发布 | 提前注册发布 |
| 2. 创建入库单 | 选 OW01021/22，同时上传箱单 | 选 OW01021/22，只填 SKU + 数量 |
| 3. 验货 | PDA 扫描 / API / Excel 逐箱对照 | PDA 扫描（扫后系统生成箱单） |
| 4. 确认发货（OD→TS） | 验货完成后确认发货 | 验货完成后确认发货 |
| 5. 打印包裹标签 | 下单后打印 Winit 包裹条码 | 草稿单内批量打印包裹条码 |

---

## 四、实物流步骤

### 4.1 客户发货

- 客户自行安排物流（OW01022）或 Winit 承运（OW01021）将货物发往 Winit 海外仓
- 发货方式决定是否需要预约：快递免预约；散货/整柜必须预约（见 [flows/06](06-appointment-and-delivery.md)）

### 4.2 海外仓到仓与卸货

- 快递：快递单妥投 → 系统记录到仓时间（`PEWC`）
- 散货：预约单实际到仓时间（`PEWC`）
- 到仓后进行卸货清点（仓库按收货数与包裹条码对应）

### 4.3 入库抽验

`[KB]` 来自 [`inbound-rules.md`](../../../_kb/product-team/winit/in-warehouse/inbound-rules.md)

Winit 对自验入库单进行**随机抽验**，抽验类型包括：

| 抽验类型 | 增值编码 | 说明 |
|---|---|---|
| 数量抽验 | OW01V1268 | 核对包裹内实物数量是否与验货数量一致 |
| 错装抽验 | OW01V1266 | 核对装箱商品是否与验货商品一致 |
| 尺重抽验 | OW01V1267 | 核对商品实物尺重是否与验货尺重吻合 |

抽验结果影响：
- 准确率较低的客户会被 Winit **回收自验权限**，转为标准海外验
- 差异超出误差范围时收取**异常处理费**（尺重异常尤其触发）`[KB]`

### 4.4 上架（`EWC → SHD`）

自验链路上架 SLA（见 [playbook.md](../playbook.md)「上架 SLA 速查」直发国内验部分）：
- 美国空卡/DHL：**1 工作日**
- 美国其他快递：**4 工作日**
- 美国散货/整柜：**4 工作日**
- 非美国空卡：**1 工作日**；其他快递：**2 工作日**；海运：**3 工作日**

---

## 五、使用条件与风险提示

| 条件/风险 | 说明 |
|---|---|
| **权限要求** | 自验需提前向 Winit 申请开通，部分客户有资质要求 `[推断]` |
| **丢失赔付上限** | 自验丢失货物赔付上限为**申报价值的 0.5%** `[推断]` |
| **准确率监控** | Winit 每月 review 抽验结果，准确率持续偏低会撤销自验权限 `[KB]` |
| **串仓风险** | 直发入库单包裹发错仓库会触发「直发包裹串仓」异常（见 [flows/07](07-receiving-putaway-exceptions.md)） |
| **送仓方式一致** | 下单选择的产品（快递/散货）必须与实际送仓方式一致，否则产生散装卸货费或未预约违规费 |

---

## 六、OW01021 vs OW01022 区别

| 项目 | OW01021（Winit 承运自验） | OW01022（卖家直发自验） |
|---|---|---|
| 头程承运 | Winit 负责承运国内→海外 | 客户自行安排物流 |
| 国内仓节点 | 经过 Winit 国内中转仓（国内仓收发货）| 不经过 Winit 国内仓 |
| 状态流转 | DR→OD→RE→TS→... | DR→OD→TS→... |
| 轨迹管理 | Winit 提供全程轨迹 | 客户需上传快递单号追踪 |

---

## 七、延伸阅读

| 文档 | 路径 |
|---|---|
| 自验方式常见问题 | [`_kb/service-team/inbound-services-doc/自验货方式常见问题.md`](../../../_kb/service-team/inbound-services-doc/自验货方式常见问题.md) |
| 新自验常见问题 | [`_kb/service-team/inbound-services-doc/（新版）客户自验常见问题（下单未提供装箱明细-原新自验）.md`](../../../_kb/service-team/inbound-services-doc/（新版）客户自验常见问题（下单未提供装箱明细-原新自验）.md) |
| 入库抽验规则 | [`_kb/product-team/winit/in-warehouse/inbound-rules.md`](../../../_kb/product-team/winit/in-warehouse/inbound-rules.md) |
| 预约送仓规则 | [flows/06-appointment-and-delivery.md](06-appointment-and-delivery.md) |
| 到仓与上架异常 | [flows/07-receiving-putaway-exceptions.md](07-receiving-putaway-exceptions.md) |
