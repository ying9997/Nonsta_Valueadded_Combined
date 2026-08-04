# 尾程轨迹异常识别专家知识库

本文档为 delivery-status 专家的异常识别经验与分类依据，供 LLM 分析轨迹时参考。

**业务范围**：美国、欧洲、澳洲。轨迹状态多为英文，识别时需匹配英文关键词。

---

## 一、承运商与区域

### 1.1 主要承运商

| 区域 | 承运商 |
|------|--------|
| **美国** | USPS, UPS, FedEx, OnTrac, Amazon, GoFo |
| **英国** | Royal Mail, Evri, DPD, DHL, XDP |
| **欧洲** | DHL, DPD, Evri, Royal Mail, DePost |
| **澳洲** | Australia Post (AUPost), Toll, MCS, PFL, Allied Express |

### 1.2 承运商异常术语对照

| 承运商 | 异常/失败常用表述 | 说明 |
|--------|-------------------|------|
| **FedEx** | Delivery exception, Shipment exception | 天气、地址、收件人不在等导致延迟 |
| **UPS** | Exception: Action Required | 需采取行动，常见 security delay, incorrect address |
| **USPS** | Alert, AL - Delivery Exception | 天气、地址、量高峰等 |
| **OnTrac** | Attempted, Delayed, Delivery area inaccessible, Recipient refused, Incomplete address, Weather delay | 状态较具体 |
| **DHL** | Exception, Failure, INTERVENTION | 地址、收件人不在、清关、操作延误 |
| **Evri (UK)** | Delivery fail, Courier had an issue | 无法到达、收件人不在、ParcelShop 不可用 |
| **DPD (UK)** | Failed delivery, Last delivery attempt did not work | 需重新预约或到店自提 |
| **Australia Post** | Delivery exception, Attempted delivery, Incorrect address, Receiver not available | 地址错误、无人签收、无法进入 |
| **Toll (AU)** | UNDELIVERED, Held in Depot, HELD FOR COLLECTION | 司机留卡、晚到、客户要求暂存 |

### 1.3 FedEx 常见异常代码

| 代码 | 含义 |
|------|------|
| PMX | 天气相关延迟 |
| SEC | 客户要求暂存或安全相关延迟 |
| 96 | 恶劣天气导致延迟 |
| 77 | 承运商不可控的异常延迟 |
| 97 | 外部事件导致延迟 |

### 1.4 轨迹扫描类型词典（trackingType / 承运商状态码）

**解读优先级**：判断业务含义时以轨迹中的 **自然语言描述**（如 `eventDescription`、`nodes.description`、承运商原始英文状态句）为主；扫描码为辅。同一简码在不同承运商或不同产品线中可能略有差异。

#### A. Winit 摘要 `nodes.status` 中常见的 trackingType 类取值

| 代码（常见写法） | 业务含义（解读口径） | 备注 |
|------------------|----------------------|------|
| **BeforeMscan** | 主扫/入网前 | 多对应订单或面单已创建、尚未完成入网主扫描（如 Shipping order / label created 阶段） |
| **Ascan** | 到件扫描（Arrival） | 包裹到达仓/枢纽/网点等作业节点的到件或入场扫描 |
| **Mscan** | 揽收/入网或干线侧扫描（Manifest / Middle-mile） | 常见为入网揽收、枢纽处理；具体以描述为准（如 Picked up、Received） |
| **Dscan** | 妥投扫描（Delivery） | 派送完成侧扫描，多对应 **已妥投**（可与 Signed/Delivered 类描述同现） |
| **ATTScan** | 上车/外出派送扫描 | 装上派送车、外出派送、派送途中（Out for delivery / On vehicle for delivery） |
| **RDscan** / **RDScan** | **Return delivered scan**（退回妥投扫描） | 一般指：收件人侧**妥投失败**或进入退回流程后，承运商将货件退回发货地/原仓等，在**退回路径末端**产生的妥投类扫描（退回轨迹上的「已妥投」节点）。**区别于**收件人正常签收的 **Dscan** 等末端妥投。实务上须结合 `description`/地点是否为退货点或发件仓判断，勿仅凭英文 *Delivered* 当作客户签收。 |
| **Rscan** | 退件/退回途扫描（Return） | 包裹退回发货方或退回枢纽途中 |
| **InTransit** | 在途 | 枢纽间运输、干线在途 |
| **Exception** | 异常扫描节点 | 本身不是「环节名」，须结合 description 判断原因 |

#### B. FedEx 等轨迹中与 trackingType 混排的简码（`nodes.status` 可能出现）

| 代码 | 常见含义 | 提示 |
|------|----------|------|
| **OC** | 货件信息/电子运单已提交承运商 | 多对应 information sent to FedEx |
| **PAC** | 已打包 | Warehouse packed |
| **DIC** | 待揽收 | Awaiting pickup |
| **AR** | 到达枢纽/场地 | Arrived at FedEx location |
| **AO** | 时效类提示 | 如 On-Time 提示，非独立作业环节 |
| **ATTScan** | 在派送车上 | On FedEx vehicle for delivery |
| **DE** | 派送异常 | Delivery exception |
| **Exception** | 一般异常 | 结合 Cannot locate recipient 等全文 |
| **Rscan** / **RT** 类 | 退回发货方途中 | Returning to shipper |
| **SF** | 与 depot/退回相关扫描 | 常配合 returned to depot 类描述 |
| **RDscan** | **Return delivered**：退回路径上的妥投扫描 | 同表 A；若仅见 *Delivered* 字样，需分辨是**退回首程妥投**还是**收件人签收**（看地点、前文是否 Rscan/Returning 等）。 |
| **P** / **P1** / **T** / **M** | 枢纽处理、在途、清单类 | 强依赖英文一句描述，勿单凭字母推断 |

#### C. 其他常见片段（澳洲等区域）

| 代码/片段 | 说明 |
|-----------|------|
| **ATTScan** | 与「司机车载货派送」类描述一致时，按外出派送理解 |
| **Dscan** | 与 Delivered / Front door 等描述一致时，按妥投理解 |
| **eventCode 为纯字母数字** | 仅为承运商内部码，**必须结合 eventDescription** |

#### D. 维护溯源：扣费节点与 **Ascan**（已自租户导出核对）

> **禁止**在对客 `analysis` 中照抄本节文档名、飞书或「摘自…表」等表述；仅用下方要点理解计费与扫描语义。

以下维护说明对应内部文档 **《US尾程渠道附加费对应关系表》**（数据来源：WINIT 海外仓仓储尾程价格表；导出时间以内部版本为准）：

- **正向服务（WO 开头）**：订单**出库**时自动扣费。
- **逆向服务（RT 开头）**：**Ascan 时自动扣费**。

**对专家模型的用法**：

- 在 **Winit 计费/价卡语境**下，**RT 逆向单与「Ascan」扫描节点绑定扣费**：一旦出现符合价卡规则的 Ascan，即对应逆向费用计费时点（与作业上「包裹到达可操作节点并完成到件类扫描」一致）。
- 公开轨迹里的 **Ascan** 仍应优先结合 **英文事件描述** 判断是揽收、枢纽到件还是逆向入仓等到件；**勿将「扣费节点」 alone 等同于客户-visible 的物流状态终态**。

---

## 二、异常分类体系

### 2.1 按轨迹形态分类

| 类型 | 定义 | 典型表现 | 可能根因 |
|------|------|----------|----------|
| **消失型** | 轨迹突然中断且超 48 小时无更新 | 最后一条记录后长时间无新状态 | 错分、运输故障、面单脱落、漏扫 |
| **停滞型** | 长时间滞留于某一节点 | 同一状态持续 5 天以上未流转 | 分拣故障、路线中断、天气、清关 |
| **逻辑矛盾型** | 状态出现反向或矛盾流转 | Delivered 后再显示 Out for delivery | 面单重号、系统延迟、操作失误 |

### 2.2 按业务环节分类

| 环节 | 异常类型 | 英文关键词/描述 |
|------|----------|-----------------|
| **揽收** | 揽收超时、未揽收 | Pickup delayed, Not yet picked up |
| **中转** | 中转超时、错分、错发 | In transit delayed, Misrouted, Wrong destination |
| **派送** | 派签超时、派送异常 | Delivery exception, Delivery attempted, Failed delivery |
| **签收** | 虚假签收、异常签收 | Delivered 但客户未收到、代签争议 |
| **退件** | 退回、退件异常 | Return to sender, RTS |

### 2.3 按根因来源分类

| 来源 | 异常示例 |
|------|----------|
| **内部因素** | 面单错误、错过截单、路由错误、打包错误、信息录入错误 |
| **外部干扰** | 天气、节假日高峰、劳工中断、清关检查 |
| **客户相关** | 地址错误/不全、电话无效、主动拒收、收件人不在 |
| **跨境/清关** | 清关延误、申报不全、禁运、税费争议 |

---

## 三、区域常见异常模式

### 3.1 美国（USPS, UPS, FedEx, OnTrac, Amazon）

| 异常 | 轨迹/状态表现 | 识别要点 |
|------|---------------|----------|
| **Delivery exception** | FedEx/UPS/USPS 通用表述 | 查看详细说明：weather, address, recipient |
| **Incorrect address** | Address exception, Incomplete address | ZIP+4 错误、门牌缺失、地址无法验证 |
| **Recipient not available** | Delivery attempted, No one home | 需签名但无人、门禁无码 |
| **Weather delay** | Local weather delay, PMX | 暴雪、飓风、洪水、野火、极端气温 |
| **Processing exception** | Hub 扫描异常 | 破损、条码问题、尺寸超限、需人工复核 |
| **Security delay** | UPS 常见 | 需额外验证或安全检查 |
| **Company closed** | OnTrac 等 | 商业地址在派送时段关闭 |

### 3.2 英国/欧洲（Royal Mail, Evri, DPD, DHL）

| 异常 | 轨迹/状态表现 | 识别要点 |
|------|---------------|----------|
| **Delivery fail** | Evri: Courier had an issue | 无法到达、收件人不在、ParcelShop 不可用 |
| **Access issues** | Unable to reach delivery address | 门禁、栅栏、道路障碍 |
| **Failed delivery** | DPD: Last attempt did not work | 需重新预约或到 DPD 网点自提 |
| **Instructions needed** | DPD exceptions | 需客户选择：重派、改址、自提 |
| **Exception / Failure** | DHL | 地址、收件人不在、清关、操作延误 |
| **INTERVENTION** | DHL API 状态 | 交付过程需要人工介入 |

### 3.3 澳洲（Australia Post, Toll, MCS, PFL, Allied Express）

| 异常 | 轨迹/状态表现 | 识别要点 |
|------|---------------|----------|
| **Incorrect address** | Attempted delivery - Incorrect address | 地址错误、无法投递 |
| **Receiver not available** | No one in attendance | 无人签收 |
| **Unable to gain access** | Locked gates, no safe place | 无法进入、无合适放置点 |
| **Held in Depot** | Toll: Late Linehaul Arrival | 晚到枢纽、暂存仓库 |
| **UNDELIVERED** | Toll: Driver left card | 司机留卡，需自提或重约 |
| **HELD FOR COLLECTION** | Toll | 客户要求暂存 |
| **Weather / Public holiday** | 高峰、圣诞等 | 大促、节假日导致延误 |

---

## 四、异常关键词（英文）识别表

分析轨迹时匹配以下关键词可辅助判断异常类型：

| 类别 | 关键词 |
|------|--------|
| **异常/失败** | exception, failed, failure, alert, attempted, undelivered, delay, delayed |
| **地址** | incorrect address, incomplete address, address error, wrong address |
| **收件人** | recipient not available, no one home, receiver not known, refused |
| **天气** | weather delay, local weather, PMX |
| **清关** | customs, clearance, held at customs |
| **派送** | delivery exception, delivery attempted, out for delivery failed |
| **退回** | return to sender, RTS, returning |
| **暂存/自提** | held for collection, available for pickup, ParcelShop, Post Office |

---

## 五、识别规则与优先级

### 5.1 异常严重度（对客只作客观标签；内部运营 SLA 见下，**勿**写入对客 `analysis` 作为指令）

| 级别 | 异常类型 | 内部参考 SLA（不输出给用户作「建议」） |
|------|----------|----------------------------------------|
| **P0 紧急** | 消失型、包裹丢失、虚假签收争议 | 排障用 |
| **P1 高** | 停滞型超 5 天、派送多次失败、清关超 5 天 | 排障用 |
| **P2 中** | 中转/派签超时、逻辑矛盾型 | 排障用 |
| **P3 低** | 一般延误、可解释的滞留 | 排障用 |

### 5.2 识别检查清单

1. **时间连续性**：相邻节点时间是否合理？是否存在 >48h 无更新？
2. **状态逻辑**：是否存在 Delivered 后再次 Out for delivery 等反向流转？
3. **节点滞留**：各节点停留时长是否超过阈值？
4. **异常关键词**：是否包含 exception, failed, attempted, delay, incorrect address 等？
5. **目的地一致性**：当前城市/网点是否与收件地址（ZIP/postcode）匹配？
6. **签收合理性**：签收人、签收方式、签收地点是否可解释？

---

## 六、参考阈值（可配置）

| 指标 | 美国 | 英国/欧洲 | 澳洲 |
|------|------|-----------|------|
| 单节点滞留预警 | 48 小时 | 48–72 小时 | 48 小时 |
| 轨迹无更新预警 | 48 小时 | 48–72 小时 | 48 小时（区域/大促可放宽至 72h） |
| 清关正常时长 | - | 1–3 工作日 | 1–3 工作日 |
| 派送尝试次数 | 2–3 次后转自提/退回 | 视承运商，Evri 自动重试 | AU Post 转邮局自提 |
| 丢失调查触发 | 7–10 工作日无更新 | 7 工作日 | 10 工作日（AU Post 建议） |

---

## 七、对客 `analysis` 内容要点（全链路事实 + 关键里程碑；**不含**对用户的行动建议）

1. **时间线概览**：按时间先后概述主要状态（在途/枢纽/派送/妥投/退回/异常等），**不**只写「有无异常」。
2. **承运商**：与 `trajectories` / `carrierHints` 一致写出。
3. **关键扫描与结果**：Ascan、Dscan、**RDscan 与 Dscan 须区分**；**时间、地点**以 `nodes` 与系统抽取的 `computedScanFacts` 为据；**派送是否失败**结合节点描述与 `deliveryFailureLikely` 证据，客观陈述，勿夸大。
4. **异常**（若存在）：类型、严重度 P0–P3、**可核验**原文/时间点。
5. **可能根因**：可写「推断：…」；**不**向终端用户写「应联系谁、应请客户如何」等操作建议。

**结构化 `scanFacts`**：由工作流在 `format-output` 中从节点确定性写入 `structured.scanFacts`；`analysis` 须与之自洽，勿臆造 Ascan/Dscan 节点。

---

**其他承运商**（XDP, DePost, MCS, PFL, Allied Express, GoFo 等）异常模式与上述主流承运商类似，可参考同区域承运商的术语与阈值进行识别。

*本知识库综合 FedEx、UPS、USPS、OnTrac、DHL、Evri、DPD、Australia Post、Toll 等承运商资料整理，实际识别时需结合具体承运商规则与业务场景调整。*
