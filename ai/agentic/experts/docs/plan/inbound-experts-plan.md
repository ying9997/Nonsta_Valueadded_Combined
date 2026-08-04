# 入库 Experts 拆分方案

> 数据来源：[inbound-data.md](inbound-data.md)（原 `in-warehouse-data.md`，仅为入库场景分析数据），8,989 条入库客服咨询，11 个一级分类，52 个细分场景。  
> 域划分见 [domain-taxonomy.md](domain-taxonomy.md)。  
> 设计流程见 [how-to-design-expert.md](../how-to-design-expert.md)；实现见 [how-to-create-expert.md](../how-to-create-expert.md)。  
> 流程知识库见 [**Winit 入库 Inbound Playbook**](../inbound/playbook.md)（双轨模型、产品分层、状态机、决策树）。  
> **API 矩阵**：[inbound-api-matrix.md](inbound-api-matrix.md)（18 专家 API 场景、MKS 额度/OMS PSC/多维表格权限共享层、跨域索引）。研发接口调研 Prompt 见 [prompts/inbound-api-discovery-prompt.md](prompts/inbound-api-discovery-prompt.md)。  
> **无依据接口汇总**：[inbound-api-unverified.md](inbound-api-unverified.md)  
> **上线进度（按场景）**：[inbound-progress.md](inbound-progress.md)

---

## 一、结论

入库 experts 分为**两层**：

| 层 | 定位 | 数量 |
|---|---|---|
| **业务流程层** | 直接对应数据分析中的客服场景，处理客户提问的完整闭环 | 13 个 |
| **基础信息层** | 提供入库链路中的基础数据和通用解读，被业务流程层复用 | **5 个** |

此外有跨域依赖：`warehouse`、`sku` 等域的专家，由其所在域规划，不属于 `inbound` 域。CBM/SKU 额度与入库可用 PSC 属于入库专属语义，已归入 `inbound` 域（见基础信息层 `inbound-psc-eligibility` 与 `inbound-capacity-availability`）。

---

## 二、业务流程层（13 个）

直接对应 `inbound-data.md` 的咨询场景，一个 expert 处理一类客户诉求的完整闭环。

| | Expert ID | 对应数据场景 | 数据量 | 场景说明 |
| --- | --- | --- | ---: | --- |
| [x] | `inbound/inbound-exception-check` | 入库异常核实 | 2,099 | 商品数据不一致、包裹数量差异、签收争议、运输破损、其他入库异常；聚合预报/签收/验收/上架差异，生成差异报告，识别需人工介入的情形 |
| [x] | `inbound/inbound-putaway-expedite` | 加急上架/未上架催促 | 813 | 普通催促、超 24h 未上架、促销/活动急需；判断是否超 SLA、能否加急，触发工单或给出升级路径 |
| [x] | `inbound/inbound-permission-apply` | 权限申请及进度确认 | 851 | 新权限申请、审核进度查询、权限续期/变更；仓库操作权限、CBM 额度、SKU 注册、账号/平台权限 |
| [x] | `inbound/inbound-arrival-status` | 到仓时间确认 | 691 | 预计到仓时间、物流轨迹查询、已签收待确认；区分运输中/已签收/轨迹异常等状态 |
| [x] | `inbound/inbound-putaway-status` | 上架进度 + 上架数量核实 | 557 + 247 | 上架进度查询、预计完成时间、分批上架确认、数量多/少于预报；WMS 上架状态聚合输出 |
| [ ] | `inbound/inbound-customs-clearance` | 清关进度确认 | 254 | 清关状态查询、清关文件咨询、清关延误催促；清关数据源和合规边界独立 |
| [x] | `inbound/inbound-capacity-availability` | 库容/Slots/承接能力（新增场景） | — | 客户直接问剩余库容、是否可预约 Slots、该仓能否承接这批货；输出温度判断和建议动作 |
| [x] | `inbound/inbound-self-inspection` | 自验操作与进度 | — | 自验数据提交/修改/重验、PDA/API/Excel 验货状态、免验条件确认（发货前）；以及抽验进度/结果/异常费/权限回收预警（到仓后）|
| [-] | `inbound/inbound-overseas-inspection` | 海外验状态查询 | — | 海外验进行中进度（PEWC 阶段）、有箱单/无箱单/预报三种模式的状态差异、验货完成时间预估；Winit 执行，客户被动等待 |
| [x] | `inbound/inbound-appointment-manage` | 预约送仓管理 | — | 创建预约单/获取预约码、修改/取消预约、违规费异议、分批到仓拆单确认；直发散货/整柜必经路径 |
| [ ] | `inbound/inbound-transit-tracking` | 头程在途追踪 | — | **不在本期**；TMS 离港/到港后续迭代；临时 OMS 轨迹 → `inbound-order-status` |
| [x] | `inbound/inbound-order-manage` | 入库单创建/修改/关闭 | — | 新建入库单（选产品/PSC/填写信息）、修改目的仓、回退草稿、终止/关闭入库单；操作指导而非规则解释 |
| [ ] | `inbound/inbound-customs-doc-manage` | 清关资料与进口商管理 | — | 清关文件上传（英国/欧盟）、自有进口商注册与审核、第三方进口商配置；独立于 inbound-customs-clearance 的合规准备阶段 |

**合并说明：**
- 「上架数量核实」(247 条) 并入 `inbound-putaway-status`，属于同一数据源和处理闭环。
- 「退费申请」(35 条) 不做独立专家，量太低，由后续 `billing-*` 或人工兜底。
- `inbound-capacity-availability` 是基于新增维度（库容限制/Slots/承接能力）新增的场景，在原始数据中隐含在权限和流程类咨询里。
- `inbound-self-inspection`：自验是客户**发货前**主动操作（OD→TS），数据源是客户侧扫描/API，有重验/修改/抽验等独立操作流程，KB 有 6 篇专项文档，与 `inbound-process-guide`（规则）和 `inbound-exception-check`（上架后差异）均不同。
- `inbound-overseas-inspection`：海外验是货物**到仓后**由 Winit 执行（PEWC 阶段），客户侧只能查询进度和等待结果，三种模式（有箱单/无箱单/预报）状态逻辑不同，与 `inbound-arrival-status`（到仓确认）和 `inbound-putaway-status`（上架进度）分层明确。
- `inbound-appointment-manage`：直发预约是完整独立操作流程（创建/违规/拆单），与 `inbound-process-guide`（规则）、`inbound-capacity-availability`（槽位查询）均不重叠。
- `inbound-transit-tracking`：TS 阶段头程物流追踪与 `inbound-arrival-status`（到仓确认）、`inbound-customs-clearance`（清关合规）有明确分工，KB 有 4 篇独立 SOP（离港/到港/清关/送仓）。
- `inbound-order-manage`：操作指导（创建/修改/关闭单据）区别于 `inbound-order-status`（状态查询）和 `inbound-process-guide`（规则解释），KB 有独立文档覆盖。
- `inbound-customs-doc-manage`：清关资料上传与进口商注册是清关的**准备阶段**，先于 `inbound-customs-clearance` 的追踪阶段；英国/欧盟递延清关需客户主动配置，KB 有 3 篇独立 SOP。

---

## 三、基础信息层（5 个）

提供入库链路的通用基础信息，被业务流程层专家调用，也可直接响应客户简单查询。

| | Expert ID | 对应数据场景 | 数据量 | 说明 |
| --- | --- | --- | ---: | --- |
| [x] | `inbound/inbound-warehouse-info` | 仓库信息获取 | 1,045 | 仓库地址/路线、联系人、营业时间、仓型/分区规则、操作规范、截单时间；静态信息为主，KB + 标准查询 |
| [x] | `inbound/inbound-order-status` | 入库单问题（入库管理-其他） | 382 | 入库单/预报单状态查询、字段解读、系统报错码解释；参考 `outbound/outbound-order-status` 的剪枝方式 |
| [x] | `inbound/inbound-process-guide` | 入库流程咨询 + 入库规则（入库管理-其他） | 236 + 部分 | 入库流程怎么走、规则/条件、CBM/容量限制、禁限运品、入库费用咨询；FAQ/RAG 为主 |
| [x] | `inbound/inbound-psc-eligibility` | 入库可用 PSC 查询 | — | 只读：客户当前 OW01* 产品线开通态、自验/海外验/头程权限快照；供 `inbound-order-manage`、`inbound-process-guide` 选型校验；数据源：**OMS** PSC 权限 API |
| [x] | `value-add/*`（见 [value-add-experts-plan.md](value-add-experts-plan.md)） | 增值推荐、配置与状态查询 | 1,563 | **4 experts 已上线 6.30**；推荐链 `exception-diagnosis` → `product-recommendation` → `service-config`，`order-status` 独立入口；上游 handoff 来自 `inbound-exception-check`。 |

**说明：**
- `inbound-warehouse-info` 回答的是「仓库是什么样的」，`inbound-process-guide` 回答的是「我该怎么操作」，两者不同。
- `inbound-order-status` 是入库数据的主要入口，类似出库侧的 `outbound-order-status`。
- `inbound-psc-eligibility` 是纯读专家，不处理申请/审批（→ `inbound-permission-apply`），不处理额度占用（→ `inbound-capacity-availability`）。
- 增值链路放在跨域目录 `experts/value-add/`，不放入 `inbound/`；具体拆分见 [value-add-experts-plan.md](value-add-experts-plan.md)。

---

## 四、跨域依赖（不属于 inbound 域）

以下专家属于其他域，各自的设计与规划见对应 plan 文档，不在本文件展开。

| [ ] | 域 | Expert ID | Plan 文档 | 为 inbound 提供什么 |
| --- | --- | --- | --- | --- |
| [ ] | `warehouse` | `warehouse/capacity-signal` | [warehouse-plan.md](warehouse-plan.md) | 仓级库容、Slots、承接能力温度（内部信号，不对客）；`inbound-putaway-expedite` 可选参考 |
| [ ] | `sku` | `sku/profile` | [sku-plan.md](sku-plan.md) | 件型、特殊属性（危险品/带电/液体）、单品化/批次管理；被 `inbound-exception-check`、`inbound-process-guide`、`value-add/value-add-product-recommendation` 等调用 |

> **说明**：`customer/profile` 不再作为 inbound 的强依赖。CBM/SKU 额度归 `inbound/inbound-capacity-availability`（**MKS**），入库可用 PSC 归 `inbound/inbound-psc-eligibility`（**OMS**），权限申请/审批归 `inbound/inbound-permission-apply`（当前流程在**飞书多维表格**），均写入 `inbound-api-matrix.md`。`inbound-process-guide` 若需识别 WF 群体、是否 Winit 头程等**跨旅程通用**属性，可弱依赖 `customer/profile`（可选，非阻塞）。

---

## 五、场景覆盖映射

| | 数据一级分类 | 数据量 | 对应 Expert | 层 |
| --- | --- | ---: | --- | --- |
| [x] | 入库异常核实 | 2,099 | `inbound/inbound-exception-check` | 业务流程 |
| [x] | 增值操作指引 | 1,563 | `value-add/value-add-exception-diagnosis` + `value-add/value-add-product-recommendation` + `value-add/value-add-service-config` + `value-add/value-add-order-status` | 跨域 value-add |
| [x] | 仓库信息获取 | 1,045 | `inbound/inbound-warehouse-info` | 基础信息 |
| [x] | 权限申请及进度确认 | 851 | `inbound/inbound-permission-apply` | 业务流程 |
| [x] | 入库管理 - 其他 | 834 | `inbound/inbound-order-status` + `inbound/inbound-process-guide` | 基础信息 |
| [x] | 加急上架/未上架催促 | 813 | `inbound/inbound-putaway-expedite` | 业务流程 |
| [x] | 到仓时间确认 | 691 | `inbound/inbound-arrival-status` | 业务流程 |
| [x] | 上架进度 | 557 | `inbound/inbound-putaway-status` | 业务流程 |
| [o] | 清关进度确认 | 254 | `inbound/inbound-customs-clearance` | 业务流程 |
| [x] | 上架数量核实 | 247 | `inbound/inbound-putaway-status`（合并） | 业务流程 |
| — | 退费申请 | 35 | 不做，由 `billing-*` 或人工兜底 | — |
| [x] | 库容/Slots/承接能力（新增） | — | `inbound/inbound-capacity-availability` | 业务流程 |

**合计**：18 个 inbound experts（13 业务流程 + 5 基础信息）；增值能力由跨域 `value-add` **4 experts** 承接（**已上线 6.30**），见 [value-add-experts-plan.md](value-add-experts-plan.md) §十。

**增值操作指引（1,563 条）子项进度**：

| | Expert | 上线 | 主路径 |
| --- | --- | --- | --- |
| [x] | `value-add/value-add-exception-diagnosis` | **已上线 6.30** | KB + 上游 `valueAddHandoff` |
| [x] | `value-add/value-add-product-recommendation` | **已上线 6.30** | 异常→VASC 映射 + 客户意图 |
| [x] | `value-add/value-add-service-config` | **已上线 6.30** | 服务项编排 + 原子可选性规则 v0.1 |
| [x] | `value-add/value-add-order-status` | **已上线 6.30** | `wh.va.order.basicInfo` + `getVasList` |

推荐链：`exception-diagnosis` → `product-recommendation` → `service-config`；上游 handoff 来自 `inbound-exception-check`（已上线 6.30）。

---

## 六、各专家边界速查

### `inbound/inbound-exception-check`
**问**：商品数据不一致、包裹数量差异、签收争议、运输破损、数量多/少于预报、其他入库异常  
**不问**：流程咨询、进度查询；抽验费用/规则（→ `inbound-self-inspection`）；抽验本身结论未超过容差时（→ `inbound-self-inspection` 继续处理）  
**衔接**：抽验发现实收与自验数据差异**超出容差、需要核实判责**时，由 `inbound-self-inspection` 上游传入，由本专家聚合差异报告  
**输入**：入库单号 / 预报单号，可选异常描述  
**输出**：差异报告（预报 vs 签收 vs 验收 vs 上架）、异常类型判断、是否需人工介入及原因  
**依赖**：`sku/profile`（特殊属性判断）

---

### `inbound/inbound-putaway-expedite`
**问**：催上架、超 24h 未上架、促销/活动急需上架  
**不问**：纯进度查询（→ `inbound-putaway-status`）、数量差异（→ `inbound-exception-check`）  
**输入**：入库单号，可选催促原因  
**输出**：是否超 SLA、能否加急、建议动作（工单/通知仓库/升级路径）  
**依赖**：`warehouse/capacity-signal`（判断仓库当前是否拥堵）

---

### `inbound/inbound-permission-apply`
**问**：权限申请、审核进度、权限续期/变更；仓库操作权限、CBM 额度申请、SKU 注册、账号权限  
**不问**：库容/额度还剩多少（→ `inbound-capacity-availability`）、当前开通了哪些 PSC（→ `inbound-psc-eligibility`）、入库规则解释（→ `inbound-process-guide`）  
**输入**：客户标识，权限类型  
**输出**：申请材料清单、提交路径（多维表格）、审批进度、预计完成时间  
**依赖**：`inbound-psc-eligibility`（读当前权限快照，判断申请类型） + `inbound-capacity-availability`（读当前额度占用，辅助判断是否需扩容）  
**数据源**：权限申请提交与审批进度当前在**飞书多维表格**（暂无 OpenAPI；短期 KB/SOP 指引）

---

### `inbound/inbound-arrival-status`
**问**：货什么时候到仓、轨迹到哪里、仓库是否签收、签收后为什么没确认  
**不问**：签收后上架进度（→ `inbound-putaway-status`）  
**输入**：入库单号 / 物流单号 / 头程单号  
**输出**：轨迹状态（运输中/已签收/待确认/异常）、预计到仓时间、签收证明摘要

---

### `inbound/inbound-putaway-status`
**问**：上架了没、什么时候完成、是否分批上架、实际上架数量  
**不问**：催促（→ `inbound-putaway-expedite`）、数量差异判责（→ `inbound-exception-check`）  
**输入**：入库单号  
**输出**：上架进度（已上架/总数）、预计完成时间、分批信息、数量与预报对比摘要

---

### `inbound/inbound-customs-clearance`
**问**：清关状态、清关文件要求、清关延误催促  
**不问**：物流 ETA（→ `inbound-arrival-status`）、上架催促（→ `inbound-putaway-expedite`）  
**输入**：入库单号 / 柜号  
**输出**：清关节点状态、所需文件清单、延误原因、升级路径

---

### `inbound/inbound-psc-eligibility`
**问**：我能用哪些入库产品/PSC、有没有开通自验权限、能不能用海外验、我的 OW01 产品开通了吗  
**不问**：如何申请新权限（→ `inbound-permission-apply`）、还有多少 CBM/SKU 额度（→ `inbound-capacity-availability`）  
**输入**：客户标识，可选仓库编码  
**输出**：当前可用入库产品线（OW01* 系列）、各产品开通状态、自验/海外验/头程权限标记  
**数据源**：**OMS** Inbound PSC 权限 API（只读）  
**被调用**：`inbound-order-manage`（下单前 PSC 校验）、`inbound-process-guide`（匹配差异化规则）、`inbound-permission-apply`（读当前权限快照）

---

### `inbound/inbound-capacity-availability`
**问**：还有多少库容没用、还剩多少 CBM/SKU 额度、这个仓还能不能预约、能不能收这批货、是否要扩容/换仓/拆批  
**不问**：怎么申请权限/额度（→ `inbound-permission-apply`）、入库单状态（→ `inbound-order-status`）、有哪些可用 PSC（→ `inbound-psc-eligibility`）  
**输入**：客户标识 + 仓库编码，可选货型、数量、SKU、送仓方式  
**输出**：库容温度（🟢/🟡/🟠/🔴/⬜）、客户剩余 CBM/SKU 额度（已用 vs 上限）、Slots 可约情况、建议动作  
**依赖**：**MKS** `winit.huaweiDas.invoke` → `InboundSkuLimitAggChart`（客户 CBM/SKU 额度）。Slots 可约指引 → `inbound-appointment-manage`，**不**接入 `warehouse/capacity-signal`。

---

### `inbound/inbound-warehouse-info`
**问**：仓库地址、路线、联系人、营业时间、仓型/分区、截单规则、操作规范  
**不问**：某单是否到仓/上架、是否有异常  
**输出**：静态仓库资料，按仓库编码/国家/仓型检索

---

### `inbound/inbound-order-status`
**问**：入库单/预报单的状态、字段含义、系统报错和提示  
**不问**：业务规则解释（→ `inbound-process-guide`）、权限问题（→ `inbound-permission-apply`）  
**输入**：入库单号 / 预报单号  
**输出**：单据状态、字段解读、报错码说明

---

### `inbound/inbound-process-guide`
**问**：入库流程怎么走、入库规则/条件、CBM/容量限制说明、禁限运品、入库费用  
**不问**：具体单据状态（→ `inbound-order-status`）、具体仓库地址（→ `inbound-warehouse-info`）、有哪些 PSC 可选（→ `inbound-psc-eligibility`）  
**输出**：SOP 步骤、规则说明、费用口径，按国家/仓库/货型/服务类型检索  
**依赖**：`inbound-psc-eligibility`（可选：匹配客户实际开通的产品线差异化规则）；WF 群体/是否 Winit 头程等属性可弱依赖 `customer/profile`（非阻塞）

---

### `value-add` 4 experts（跨域）
**问**：入库异常是否进入增值链、应选哪个 VASC、VASC 下服务项/原子如何配置、已提交增值单处理到哪一步。
**不问**：入库差异责任核实（→ `inbound-exception-check`）、入库单状态/上架状态（→ 对应 inbound 状态专家）、未下单前费用估算（v1 不承接）。
**入口**：增值类异常默认 handoff 到 `value-add/value-add-exception-diagnosis`；状态查询直接进入 `value-add/value-add-order-status`。
**规划**：[value-add-experts-plan.md](value-add-experts-plan.md)。

---

### `inbound/inbound-self-inspection`
**问**：我的自验提交了没、验货数据填错了怎么修改/重验、抽验结果是什么/收了多少费、我能用免验吗、PDA/API/Excel 哪种方式适合我
**不问**：验货规则/产品选型（→ `inbound-process-guide`）、上架后数量差异（→ `inbound-exception-check`）、海外验进度（→ `inbound-overseas-inspection`）
**输入**：入库单号
**输出**：自验完成状态、数据修改/重验操作指引、抽验结果与费用说明、免验条件判断
**数据源**：客户验货系统（PDA App / API / Excel）+ 抽验系统（到仓后 Winit 执行）；适用链路：OW01021 / OW01022
**时序**：发货前（OD→TS）处理自验操作；到仓后（PEWC）处理抽验结果——两阶段均属自验产品闭环，对比 `inbound-overseas-inspection`（OW01031/32 专属，Winit 全程执行，无客户侧抽验）
**KB**：自验系列 6 篇（旧自验/新自验/快速自验/免自验/API/第三方条码）+ `inbound-rules.md`（抽验类型/收费/权限回收规则）

---

### `inbound/inbound-overseas-inspection`
**问**：海外验现在进行到哪一步、什么时候能验完、有箱单和无箱单的进度有什么区别、预报单的验货状态怎么看
**不问**：自验数据/抽验（→ `inbound-self-inspection`）、上架进度（→ `inbound-putaway-status`）、到仓确认（→ `inbound-arrival-status`）
**输入**：入库单号
**输出**：海外验进度（验货中/完成/异常暂停）、预计完成时间、三种模式（有箱单/无箱单/预报）状态说明、数量结果摘要
**数据源**：Winit 海外仓验货系统（WMS 验货模块）；适用链路：OW01031 / OW01032；时序：PEWC → EWC（验货完成前）
**KB**：`无箱单有预报常见问答.md`；直发海外验系列

---
### `inbound/inbound-appointment-manage`
**问**：怎么预约送仓、预约码在哪、预约时间能改吗、没预约被扣费怎么办、分批到仓包裹要怎么处理  
**不问**：剩余库容/还能不能约（→ `inbound-capacity-availability`）、入库单总状态（→ `inbound-order-status`）  
**输入**：入库单号 / 预约单号，可选仓库编码  
**输出**：预约状态、操作指引（创建/修改/拆单）、违规费规则说明、升级路径  
**依赖**：`warehouse/capacity-signal`（判断 Slot 可用性）

---

### `inbound/inbound-transit-tracking`
**问**：货什么时候离港、到港了没、现在哪里（TS）、预计什么时候送到仓库  
**本期**：**不对客上线**（TMS 头程细粒度不在 6 月批次）  
**临时承接**：OMS 轨迹/状态 → `inbound-order-status`；到仓 → `inbound-arrival-status`  
**输入**：入库单号 / 头程物流单号（后续迭代）  
**数据源**：TOM 智运系统（非 WMS）

---

### `inbound/inbound-order-manage`
**问**：怎么新建入库单、该选哪个产品（PSC）、我要修改已下单的目的仓/SKU、怎么回退草稿、怎么关闭/终止入库单  
**不问**：单据当前状态（→ `inbound-order-status`）、入库规则是什么（→ `inbound-process-guide`）  
**输入**：客户标识，操作意图（新建/修改/关闭），可选当前入库单号  
**输出**：操作步骤指引、PSC 选型建议、可修改条件说明、风险提示  
**依赖**：`inbound-psc-eligibility`（下单前校验客户是否已开通目标 PSC）

---

### `inbound/inbound-customs-doc-manage`
**问**：清关需要提交什么资料、怎么上传清关文件、进口商怎么注册、英国/欧盟递延清关怎么申请开通  
**不问**：清关进度/延误（→ `inbound-customs-clearance`）、权限申请（→ `inbound-permission-apply`）  
**输入**：目的国、入库单号（上传场景）、客户标识（进口商注册场景）  
**输出**：所需文件清单、上传操作步骤、进口商注册材料要求、审核进度查询路径  
**数据源**：`_kb/service-team/inbound-services-doc/` 英国/比利时/注册进口商系列文档

---
## 七、路由速查

```
客户提问
│
├─ 地址/路线/联系人/营业时间/仓型               → inbound-warehouse-info
├─ 能用哪些入库产品/PSC/有没有自验权限           → inbound-psc-eligibility
├─ 还剩多少 CBM/SKU 额度/能不能约/能不能收       → inbound-capacity-availability
├─ 入库异常后增值推荐/服务项配置                 → value-add/value-add-exception-diagnosis → value-add-product-recommendation → value-add-service-config
├─ 已提交增值单状态/原子进度                    → value-add/value-add-order-status
├─ 自验提交/修改/抽验结果                       → inbound-self-inspection
├─ 海外验进度/有无箱单/预报状态                  → inbound-overseas-inspection
├─ 离港了没/到港了没/现在哪里/预计送仓           → inbound-transit-tracking
├─ 签收了没/已到仓的确认                        → inbound-arrival-status
├─ 上架了没/多久完成/上架数量                   → inbound-putaway-status
├─ 帮我催/超时未上架/活动急用                   → inbound-putaway-expedite
├─ 入库单/预约单状态/报错                       → inbound-order-status
├─ 流程/规则/CBM/费用/禁限运                    → inbound-process-guide
├─ 权限/额度申请/审核进度                       → inbound-permission-apply
├─ 差异/少货/多货/破损/签收争议                 → inbound-exception-check
└─ 清关进度/清关延误催促                        → inbound-customs-clearance
```

---

## 八、专家状态追踪

> 更新：2026-06-30 · 按场景汇总见 [inbound-progress.md](inbound-progress.md) · 增值详述见 [value-add-experts-plan.md](value-add-experts-plan.md) §十  
> 最左列：`[x]` 已上线（含 v1 交付）· `[ ]` 进行中 / 待联调 / 本期不做  
> **inbound** 17/17 manifest + workflow 齐备；**6.10 批次 12 个 + 6.30 批次 1 个（exception-check）已上线** · **value-add** 4/4 **已上线 6.30**

| | 优先级 | Expert ID | 层 | 上线进度 | 需要 API | API 就绪度 | 主要依赖 / 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| [x] | P0 | `inbound/inbound-warehouse-info` | 基础信息 | **已上线 6.10** | 否 | 100% | 纯 KB，无 API；[design.md](../../experts/inbound/inbound-warehouse-info/design.md) |
| [x] | P0 | `value-add/value-add-exception-diagnosis` | 跨域 value-add | **已上线 6.30** | 否 | KB 80% | 35 异常实体 + `valueAddHandoff`；[design.md](../../experts/value-add/value-add-exception-diagnosis/design.md) |
| [x] | P0 | `value-add/value-add-product-recommendation` | 跨域 value-add | **已上线 6.30** | 否 | KB 80% | 168 条异常→VASC 映射；[design.md](../../experts/value-add/value-add-product-recommendation/design.md) |
| [x] | P0 | `value-add/value-add-service-config` | 跨域 value-add | **已上线 6.30** | 否 | KB 75% | 64 编排 + 原子可选性规则；[design.md](../../experts/value-add/value-add-service-config/design.md) |
| [x] | P1 | `value-add/value-add-order-status` | 跨域 value-add | **已上线 6.30** | 是 | API 70% | `basicInfo` + `getVasList`；[design.md](../../experts/value-add/value-add-order-status/design.md) |
| [x] | P0 | `inbound/inbound-process-guide` | 基础信息 | **已上线 6.10** | 部分 | 100% | Playbook + flows KB；可选链 `psc-eligibility`；[design.md](../../experts/inbound/inbound-process-guide/design.md) |
| [x] | P0 | `inbound/inbound-order-status` | 基础信息 | **已上线 6.10** | 是 | 80% | `getOrderDetail` + `queryOrderTracking`；[design.md](../../experts/inbound/inbound-order-status/design.md) |
| [x] | P1 | `inbound/inbound-psc-eligibility` | 基础信息 | **已上线 6.10** | 是 | 80% | `winit.wh.pms.getWinitProducts` 已确认；[design.md](../../experts/inbound/inbound-psc-eligibility/design.md) |
| [x] | P0 | `inbound/inbound-arrival-status` | 业务流程 | **已上线 6.10** | 是 | 80% | `getOrderDetail` + 轨迹/卸货接口；TMS POD 附件 Gap；[design.md](../../experts/inbound/inbound-arrival-status/design.md) |
| [x] | P0 | `inbound/inbound-putaway-status` | 业务流程 | **已上线 6.10** | 是 | 80% | `getOrderDetail`（Y/extract）；[design.md](../../experts/inbound/inbound-putaway-status/design.md) |
| [x] | P0 | `inbound/inbound-putaway-expedite` | 业务流程 | **v1 已上线 6.10** → v2 6.30 | 是 | 80% | v2 缺货判定待库存 API；WMS 拥堵信号 Gap；[design.md](../../experts/inbound/inbound-putaway-expedite/design.md) |
| [x] | P1 | `inbound/inbound-permission-apply` | 业务流程 | **已上线 6.10** | 部分 | 20% | SOP + PSC 快照；飞书多维表格/审批 **无 OpenAPI**；[design.md](../../experts/inbound/inbound-permission-apply/design.md) |
| [x] | P1 | `inbound/inbound-capacity-availability` | 业务流程 | **已上线** | 是 | 70% | MKS `huaweiDas.invoke` 已确认；仓级 Slots 不对客；[design.md](../../experts/inbound/inbound-capacity-availability/design.md) |
| [x] | P1 | `inbound/inbound-exception-check` | 业务流程 | **已上线 6.30** | 是 | 70% | `getOrderDetail` + `queryExceptionList`；增值链 handoff 源；[design.md](../../experts/inbound/inbound-exception-check/design.md) |
| [ ] | P2 | `inbound/inbound-customs-clearance` | 业务流程 | **待联调** | 是 | 20% | OMS 表头 + 轨迹兜底；TMS 清关节点 Gap；[design.md](../../experts/inbound/inbound-customs-clearance/design.md) |
| [x] | P1 | `inbound/inbound-appointment-manage` | 业务流程 | **已上线 6.10** | 是 | 80% | `booking.list` 有规格·Coze 待注册；`getOrderDetail` 兜底；[design.md](../../experts/inbound/inbound-appointment-manage/design.md) |
| [ ] | P1 | `inbound/inbound-transit-tracking` | 业务流程 | **不在本期** | — | — | TMS 头程细粒度不在 6 月批次；由 order-status/arrival 承接；[design.md](../../experts/inbound/inbound-transit-tracking/design.md) |
| [x] | P1 | `inbound/inbound-self-inspection` | 业务流程 | **v1 已上线 6.10** | 是 | 60% | OMS 链 + 抽验异常单；v2 抽验查询进行中；验货细粒度读 API Gap；[design.md](../../experts/inbound/inbound-self-inspection/design.md) |
| [ ] | P2 | `inbound/inbound-overseas-inspection` | 业务流程 | **搁置** | 是 | 20% | WMS 验货阶段全 Gap；不在 6 月批次；[design.md](../../experts/inbound/inbound-overseas-inspection/design.md) |
| [x] | P1 | `inbound/inbound-order-manage` | 业务流程 | **已上线 6.10** | 是 | 60% | 操作 SOP + 读单；写接口不调用；[design.md](../../experts/inbound/inbound-order-manage/design.md) |
| [ ] | P2 | `inbound/inbound-customs-doc-manage` | 业务流程 | **进行中** | 是 | 30% | UMS `getVendorInfo` 已确认；TMS `queryPage` 待注册；上传写接口 Gap；[design.md](../../experts/inbound/inbound-customs-doc-manage/design.md) |
