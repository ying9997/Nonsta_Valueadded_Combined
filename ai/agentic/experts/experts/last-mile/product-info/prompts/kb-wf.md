# Winit Fulfillment 履约服务范围知识库 — 索引

> 本知识库涵盖万邑通尾程履约服务的完整产品信息，按国家拆分为独立文件。通用规则适用于所有国家。

---

## 一、服务总览

## 一、服务总览

| 国家 | 正向派送（组合渠道） | 正向派送（指定渠道） | 逆向退货服务 | 增值保险 |
|------|---------------------|---------------------|-------------|---------|
| 美国 | 7日达、5日达、3日达、2日达 | USPS Ground Advantage、Shipping with Amazon、Ground（组合FedEx/UPS）、UPS Ground（一票多件）、USPS First Class Pkg Intl、USPS Priority Mail Intl | USPS Ground Advantage Return、USPS Priority Mail Return、UPS Ground Return、FedEx Ground Return | 追踪守护、时效保（仅2/3/5/7日达） |
| 澳洲 | Economy、Standard、Express | AuPost International NZ Delivery | AUPOST Parcel Post eParcel Return | 追踪守护 |
| 德国 | Economy、Standard | DHL Express-Worldwide、DHL Paket、DB SCHENKER Standard Delivery（托盘） | DHL Paket Return | 追踪守护 |
| 英国 | Standard、Express | DHL Next Day | Royal Mail Tracked Returns 48 Parcel | 追踪守护 |

---

---

## 二、国家文件索引

| 文件 | 国家 | 适用群体 |
|------|------|---------|
| [kb-wf-us.md](kb-wf-us.md) | 美国 | 美国 WINIT Fulfillment（分区价） |
| [kb-wf-au.md](kb-wf-au.md) | 澳洲 | 澳洲 WINIT Fulfillment |
| [kb-wf-de.md](kb-wf-de.md) | 德国 | 德国 WINIT Fulfillment |
| [kb-wf-uk.md](kb-wf-uk.md) | 英国 | 英国 WINIT Fulfillment |

---

## 三、通用规则与政策

### 3.1 计费重量规则

计费重量取实重和体积重的最大值。各国各渠道体积重计算公式：

| 渠道 | 体积重公式 |
|------|-----------|
| 美国：7日达/5日达/USPS Ground Advantage/USPS Return | 长×宽×高(cm)/6000 |
| 美国：2日达/3日达/Ground/UPS Ground(一票多件)/UPS Ground Return/FedEx Ground Return | 长×宽×高(cm)/8000 |
| 美国：Shipping with Amazon | 长×宽×高(cm)/7200 |
| 澳洲：Standard/Express | 长×宽×高(cm)/4000 |
| 德国：Standard（FR-Zonal）/DHL Express | 长×宽×高(cm)/5000 |

### 3.2 电池货物通用政策

- 电池货物的包装及标签需满足国际电池货物标准（包含但不限于 ADR/IATA/IMDG 及 Packing Instruction）。
- 离岸地址不支持配送带电商品（美国离岸邮编：006,007,009,00801-00851,967,968,96900-96970,995-999）。
- 纯电池商品（单独电池）大部分渠道不支持，仅部分指定渠道有条件接受。

### 3.3 尾程保险「时效保」

#### 产品概要

| 项目 | 说明 |
|------|------|
| 服务名称 | 时效保 |
| 结算币种 | USD |
| 承保的尾程产品 | 美国 Winit Fulfillment-2日达、3日达、5日达、7日达 |
| 保险范围 | 已有尾程揽收轨迹，但未在要求的时效内完成派送的订单（免赔场景除外） |
| 投保方式 | 下单时选择尾程增值「时效保 Lite」，订单提交成功即投保成功 |
| 保费 | 0.3 USD/订单 |
| 赔付标准 | 5 USD/订单 与 订单运费金额，二者取小 |
| 赔付方式 | 直接退到 Winit 账户余额 |
| 赔付时间 | Winit 每月主动 Review；M0 出库的订单，M1 月底前完成赔付到账 |

#### 时效要求

| 场景 | 2日达 | 3日达 | 5日达 | 7日达 |
|------|-------|-------|-------|-------|
| Day0 截单时间前提交的订单 | 工作日 Day2 24点前妥投 | 工作日 Day3 24点前妥投 | 工作日 Day5 24点前妥投 | 工作日 Day7 24点前妥投 |
| Day0 截单时间后提交的订单 | 工作日 Day3 24点前妥投 | - | 工作日 Day6 24点前妥投 | 工作日 Day8 24点前妥投 |

> **赔付举例**：订单 A 运费=4.15 USD，则赔付金额=4.15 USD；订单 B 运费=5.34 USD，则赔付金额=5 USD。

#### 免赔场景

1. 因收件人拒收/地址错误/不在家/截单改址/指定时间派送等收件人原因导致的派送超时，根据承运商第一次派送时间（Attempt scan）在应妥投时间内则计为准时。
2. 由于包装不符合承运要求、商品侵权等非 Winit/承运商原因导致的派送超时，不在保险范围。
3. 由于自然灾害、战争等不可抗力因素导致的派送超时，不在保险范围。
4. 因库存丢失或其它原因导致订单不能出库，Winit 及时通知客户作废订单的情况，不在保险范围。
5. 因下单地址问题或供应商系统异常导致抓单失败，Winit 及时通知客户作废订单的情况，不在保险范围。
6. 离岸岛屿及军事地址不在保险范围。
7. 超时无上网的订单请按 Winit 标准赔付流程申请超时无上网赔付，不在时效保保险范围。

### 3.4 时效与偏远地区

- 偏远地区及旺季期间的订单物流时效可能延长，请留意旺季期间公告。
- 各组合渠道时效达成率为送达率≥95%（偏远地区除外）。

### 3.5 赔付政策

- 赔付标准细节请参考《Winit赔付标准》合同条款。
- 高货值产品建议购买尾程保险【追踪守护】以获得更充分保障。

### 3.6 异形包装

- 2/3/5/7日达产品不支持异形包装（包含且不仅限于圆柱形、不规则形状）。
- 如因异形包装产生尾程账单费用差异，Winit 有权禁止对应商品发货权限或依据账单向客户补收费用。
