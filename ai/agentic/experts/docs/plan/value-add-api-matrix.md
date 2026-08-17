# Value-Add 专家 API 矩阵

> 关联文档：[value-add-experts-plan.md](value-add-experts-plan.md)  
> 知识库来源：[Value-Add 领域知识库](../value-add/README.md)  
> 数据源台账：[data-source-registry.md](../value-add/data-source-registry.md)（2026-06-25）  
> 版本：2026-06  
> 说明：本文件记录 `value-add` 域 4 个 experts 的 API、KB、映射表和 Gap。接口文档用于确认字段、状态、查询链路；业务适用性仍以关系映射和业务流程知识库为准。
> 2026-06-26 复核：三份新增专家运行时只消费 `experts/value-add/{expert-id}/prompts/kb-*.md` 裁剪切片；下表 `docs/value-add/` 路径为维护来源，不表示运行时 RAG 或全量目录依赖。

---

## 零、数据源台账同步口径

| source_id | 权威级别 | 当前覆盖 | 对本矩阵的影响 |
|---|---|---|---|
| `plan-event-standard-exception` | primary | 422 条标准异常，2026-06-25 已同步 | 支撑异常编码、名称、节点、对象和可选 VASC；影响 `exception-diagnosis` 与 `product-recommendation` 的静态判断。 |
| `plan-event-vas` | primary | 当前 211 条；测试新增不纳入 | 支撑增值服务项/原子主数据；名称差异默认不单独触发矩阵更新。 |
| `vasc-master` | primary | 入库异常引用 VASC 18/18 有基础配置 | 支撑 VASC 基础信息、规则和 SLA 配置；来源合并自 `pms.VascTomService_queryVascPage`、`pms.VascRuleService_queryVascRulePage`、`oms.OutboundSlaConfigService_findOutboundSlaConfigPage`。 |
| `exception-vasc-detail-items-raw` | primary | 18/18 个入库异常引用 VASC 有详情编排 | 支撑 VASC 到服务项编排；当前来自 TOM VASC 详情页 `detail_items` 抓取，不应误写成列表接口。 |
| `exception-vasc-orchestration-normalized` | primary_derived | 52 个编排引用服务项已识别 | 支撑异常到 VASC、VASC 到服务项、字段证据状态三类关系映射。 |
| `vas-event-attrs-slim` | primary_for_normal_attrs | normalized 52 个服务项中覆盖 42 个，剩余 10 个标 `missing_field_evidence` | 只能支撑普通属性字段；附件、模板和上传要求仍需另找字段级来源。 |
| `interface-documents` | reference_only | 当前登记 13 个接口文档 | 只用于字段、状态和查询链路确认，不能单独作为业务适用性结论。 |
| `kb-business-source-snapshots` | primary_for_business_explanation | 当前登记 35 个 KB 快照 | 支撑异常解释、SOP、处理限制和业务建议。 |

---

## 一、接入形态约定

| 接入方式 | 说明 | 在本域的用法 |
|---|---|---|
| OpenAPI（首选） | 经万邑通 OpenAPI / Coze 插件调用，具备客户权限校验 | `value-add-order-status` 查询已提交增值单。 |
| KB / 关系映射 | 本地知识库、实体页、流程页和映射表 | `exception-diagnosis`、`product-recommendation`、`service-config` v1 主路径。 |
| 内部 TOM / PMS / Dubbo | 内部系统或 SPI 直调，通常不经过 OpenAPI | 作为知识库生成或后端调研来源，不直接写成 v1 可调用能力。 |
| 上游 handoff | 由 `inbound/inbound-exception-check` 或 planner 传入事实 | 衔接入库异常核实与增值推荐链。 |

---

## 二、4 个 experts API 总览

| Expert ID | v1 主路径 | 是否需要实时 API | 主要系统/来源 | 就绪度 | 备注 |
|---|---|---:|---|---|---|
| `value-add/value-add-exception-diagnosis` | KB + 关系映射 + 上游 `valueAddHandoff` | 否 | `../value-add/inbound-exceptions/`、总流程、异常到 VASC 映射 | 80% | 可选消费异常单接口结果，但不主动承担入库异常查询。 |
| `value-add/value-add-product-recommendation` | KB + 异常到 VASC 映射 + 客户意图流程 | 否 | `../value-add/relationship-mappings/inbound-exception-to-vasc-product-mapping.md` | 80% | 不用接口文档反推适用性。 |
| `value-add/value-add-service-config` | KB + VASC 到服务项编排 + 字段证据覆盖 + 原子可选性切片 | 否 | `../../experts/value-add/value-add-service-config/prompts/kb-*.md` | 75% | 18 个 VASC、64 条编排、52 个服务项字段证据已裁剪；字段/附件/模板仍非全量，动态配置仍需标 Gap。 |
| `value-add/value-add-order-status` | OpenAPI 查询已提交增值单 | 是 | `wh.va.order.basicInfo`、`wh.va.order.getVasList` | 70% | 费用和货物明细为增强，不是 v1 核心。 |

---

## 三、共享数据与映射层

| 数据层 | 文件/接口 | 消费方 | 用途 | 限制 |
|---|---|---|---|---|
| 入库异常实体 | `../value-add/inbound-exceptions/` | `exception-diagnosis` | 异常定义、对象、节点、解释。 | 不能替代实时异常单查询。 |
| 总流程 | `../value-add/inbound-exception-value-added-process/inbound-exception-to-value-added-overall-flow.md` | 3 个推荐链 experts | 决策树、对象、节点和处理意图框架。 | 是合成流程，不是单一线性 SOP。 |
| 客户处理意图流程 | `../value-add/inbound-exception-value-added-process/customer-action-decision-flow.md` | `product-recommendation`、`service-config` | 归一客户意图到 VASC/原子方向。 | 未提供独立结构化客户动作映射。 |
| 异常到 VASC 映射 | `../value-add/relationship-mappings/inbound-exception-to-vasc-product-mapping.md` | `product-recommendation` | 输出候选 VASC。 | 映射证明有关联，不单独解释为什么这样选。 |
| VASC 到服务项编排 | `../value-add/relationship-mappings/vasc-product-to-service-item-orchestration-mapping.md` | `service-config` | 输出服务项顺序、必选状态、互斥组。 | `attr_spec_status` 只表示字段证据覆盖状态。 |
| 字段证据覆盖 | `../value-add/relationship-mappings/service-item-config-field-evidence-coverage.md` | `service-config` | 标记 `partial_field_evidence` / `missing_field_evidence`；普通属性字段可追溯到 `pms.BaseAttrRelService_findBaseAttrRelPage` 扩充结果。当前 42/52 个编排引用服务项有普通字段证据。 | 不能生成完整字段、附件、模板配置；剩余 10 个服务项普通字段仍标缺口；附件、模板、上传关系仍需 `vaAtomFiles`、页面运行时响应或等价来源。 |
| 原子可选性规则 | `../../experts/value-add/value-add-service-config/prompts/kb-atom-selectability.md` | `service-config` | 已裁剪 confirmed inbound 规则，用于场景禁选、互斥、对象/阶段/VASC 依赖、前后端置灰/隐藏/校验、动态配置依赖。 | 维护源为离线结构化规则 v0.1；未覆盖或动态配置不明时仍输出待确认。 |

---

## 四、`value-add-order-status` 主路径 API

### 4.1 增值单基本信息

| 项 | 内容 |
|---|---|
| action | `wh.va.order.basicInfo` |
| 路径 | `POST /wh/va/order/basicInfo` |
| v1 优先级 | P0 |
| 业务入参 | `orderNo`，增值订单号，通常前缀 `V` |
| 权限 | 仅允许查询当前客户下的增值单 |
| 主要用途 | 查询增值单主状态、业务单、VASC、仓库、客户、控制信息和原子概览。 |

关键返回字段：

| 字段 | 用途 |
|---|---|
| `orderNo` | 增值单号。 |
| `status` / `statusDesc` | 增值单主状态。 |
| `orderDate`、`estimateCompleteTime`、`actualCompleteTime` | 下单和完成时间事实。 |
| `cancelReason`、`failReason` | 取消或失败原因。 |
| `businessOrder.businessNo` | 关联业务单号。 |
| `businessOrder.eventCode`、`businessOrder.unusualName`、`businessOrder.unusualObjectName` | 关联异常信息。 |
| `vasc.productCode`、`vasc.productName`、`vasc.isAudit`、`vasc.isNeedConfirm` | 增值产品和审核/确认信息。 |
| `vaAtoms[]` | 原子概览，可作为 `getVasList` 前的摘要。 |
| `control.vasObjectType` | 增值对象类型。 |

### 4.2 增值原子执行列表

| 项 | 内容 |
|---|---|
| action | `wh.va.order.getVasList` |
| 路径 | `POST /wh/va/order/getVasList` |
| v1 优先级 | P0 |
| 业务入参 | `orderNo`、`businessNo`、`orderEntry`、`pageVo` |
| 权限 | 仅允许查询当前客户下的增值单 |
| 主要用途 | 分页查询原子执行状态、退回原因、部分完成原因和实际完成数量。 |

关键返回字段：

| 字段 | 用途 |
|---|---|
| `list[].serviceCode` / `serviceName` | 原子服务编码和名称。 |
| `list[].status` / `statusDesc` | 原子执行状态。 |
| `list[].partCompleteReason` | 部分完成原因。 |
| `list[].returnReason` | 退回原因。 |
| `list[].completeTime` | 原子完成时间。 |
| `list[].orderCount` / `handleCount` | 下单数量与实际完成数量。 |
| `list[].vaAtomAttrs` | 已提交增值单上的执行属性；只能解释已下单事实或作为运行时对照，不等于事前字段配置全量来源。 |
| `list[].vaAtomFiles` | 已提交增值单上的附件；只能解释已下单事实或补附件证据，不等于事前模板/上传要求的完整来源。 |
| `list[].vaAtomResults` | 原子执行结果。 |

### 4.3 v1 查询策略

| 入参情况 | 策略 |
|---|---|
| 有 `vasOrderNo` | 先查 `basicInfo`，再按需查 `getVasList`。 |
| 只有 `businessNo` | 先用 `getVasList` 按 `businessNo` 尝试定位候选；若唯一命中，解析返回的 `orderNo` 再查 `basicInfo`，若不唯一则要求补充增值单号。 |
| 有 `eventNo` 但无增值单号 | 先由上游异常单查询或人工补充增值单号，`order-status` 不把异常单查询作为主路径。 |
| 只问“这个异常怎么处理” | 不进入状态查询，转推荐链。 |

---

## 五、可选增强 API

### 5.1 事后实际费用

| 项 | 内容 |
|---|---|
| action | `wh.va.order.getPaymentList` |
| 路径 | `POST /wh/va/order/getPaymentList` |
| 优先级 | P2 增强 |
| 入参 | `orderNo`、`manualentryFlag` |
| 返回 | `totalStandardAmount`、`atomFeeList`、费用明细、成本明细 |
| 定位 | 已提交且发生作业后的实际费用查询。 |

边界：这是事后实际费用，不是未下单前报价，不作为 v1 核心。

### 5.2 已有增值单的预估费用

| 项 | 内容 |
|---|---|
| action | `wh.va.order.getPrepaymentList` |
| 路径 | `POST /wh/va/order/getPrepaymentList` |
| 优先级 | P2 增强 |
| 入参 | `orderNo`、`manualentryFlag` |
| 返回 | 预估应收、预估成本、原子费用预估 |
| 定位 | 已有增值单 `orderNo` 下的预估费用查询。 |

边界：虽然接口名含 prepayment，但入参依赖 `orderNo`，不等同未提交增值单前的报价能力。

### 5.3 子货物明细

| 项 | 内容 |
|---|---|
| action | `wh.va.order.getSubGoods` |
| 路径 | `POST /wh/va/order/getSubGoods` |
| 优先级 | P2 增强 |
| 入参 | `orderNo`、`parentId`、`pageVo` |
| 返回 | 子货物、商品、条码、批次、尺重、附件 |
| 定位 | 当用户追问某个增值单货物明细、子包裹、单品或附件时辅助查询。 |

边界：不作为推荐链判断 VASC/原子适用性的依据。

---

## 六、内部接口与调研来源

| 接口/来源 | 类型 | 可服务 expert | 当前用途 | v1 处理 |
|---|---|---|---|---|
| `pms.VascTomService_queryVascPage` | PMS Dubbo / TOM 专用 | `product-recommendation`、`service-config` | 查询 VASC 基础信息、启用状态、属性映射。 | 不直接接入 expert；作为后续知识库同步或后端调研来源。 |
| `pms.VascRuleService_queryVascRulePage` | PMS Dubbo / TOM 专用 | `service-config` | 查询 VASC 适用规则。 | 不直接等同 `atom-selectability-rules`；需业务确认规则口径后沉淀为 KB。 |
| `oms.OutboundSlaConfigService_findOutboundSlaConfigPage` | OMS / SLA 配置来源 | `service-config`、`order-status` 风险解释增强 | 补充 VASC master 中的 SLA 配置口径。 | 仅作为知识库同步和解释来源；不作为 v1 运行时状态查询主路径。 |
| `pms.PlanEventService_queryPlanEventPage` | TOM 内部接口 | `exception-diagnosis`、`product-recommendation` | 查询标准异常事件和增值服务事件。 | 已作为知识库快照/映射来源，不作为运行时主路径。 |
| `oms.unusualEventOrder.queryEventList` | OMS OpenAPI | 上游 `inbound-exception-check` | 查询异常单列表、异常编码、对象、VASC 编码、增值单号等。 | 可用于上游产生 `valueAddHandoff`，不由 value-add 推荐链主动承担。 |
| `oms.unusualEventOrder.queryEventOrderDetail` | OMS OpenAPI | 上游 `inbound-exception-check` / 可选诊断增强 | 查询异常事件详情、附件、关联增值单号、异常对象。 | 可选增强；默认通过 handoff 消费结果。 |

---

## 七、按 expert 的 API 场景详情

### 7.1 `value-add/value-add-exception-diagnosis`

| 场景 ID | 触发问题 | 数据源 | 是否 API | 输出重点 |
|---|---|---|---:|---|
| `exception-diagnosis.by-code` | `B01E1615 是什么异常？` | `../value-add/inbound-exceptions/` + 异常到 VASC 映射 | 否 | 异常名称、对象、节点、是否 value-add 候选。 |
| `exception-diagnosis.from-handoff` | 入库异常专家识别到增值类异常 | `valueAddHandoff` | 否 | 归一异常事实，输出 `handoffFacts`。 |
| `exception-diagnosis.need-detail` | 用户只给异常单号但无上下文 | `oms.unusualEventOrder.queryEventOrderDetail` | 可选 | 查询详情后归一；若无法查询则要求补充异常编码或描述。 |

### 7.2 `value-add/value-add-product-recommendation`

| 场景 ID | 触发问题 | 数据源 | 是否 API | 输出重点 |
|---|---|---|---:|---|
| `product-recommendation.exception-to-vasc` | 异常可选哪些 VASC | 异常到 VASC 映射 | 否 | 候选 VASC、启用状态、推荐理由和限制。 |
| `product-recommendation.customer-action` | 客户想原单/新单/销毁/自提/拍照 | 客户处理意图流程 + 映射 | 否 | 意图归一、首选候选、缺失确认项。 |
| `product-recommendation.vasc-status-refresh` | VASC 启用态需刷新 | `pms.VascTomService_queryVascPage` | 内部调研 | 后续由 KB 同步，不在 v1 运行时调用。 |

### 7.3 `value-add/value-add-service-config`

| 场景 ID | 触发问题 | 数据源 | 是否 API | 输出重点 |
|---|---|---|---:|---|
| `service-config.orchestration` | VASC 下有哪些服务项/原子 | VASC 到服务项编排映射 | 否 | 服务项顺序、必选状态、互斥组。 |
| `service-config.field-evidence` | 下单要填哪些字段/附件/模板 | 字段证据覆盖映射 | 否 | 证据状态、不能承诺的字段、待确认项。 |
| `service-config.selectability` | 这个原子当前能不能选 | `atom-selectability-rules.md` | 否 | 可选/禁选/互斥/待确认；动态配置项标记可能漂移。 |
| `service-config.submitted-attrs` | 用户问已提交增值单里某原子填了什么 | `wh.va.order.getVasList` | 可选转状态专家 | 已下单事实应由 `order-status` 查询，不作为配置主路径。 |

### 7.4 `value-add/value-add-order-status`

| 场景 ID | 触发问题 | action | 优先级 | 输出重点 |
|---|---|---|---|---|
| `order-status.basic` | 增值单现在什么状态 | `wh.va.order.basicInfo` | P0 | 主状态、业务单、VASC、时间、风险标记。 |
| `order-status.atom-progress` | 处理到哪个原子、为什么部分完成/退回 | `wh.va.order.getVasList` | P0 | 原子状态、完成数量、退回/部分完成原因。 |
| `order-status.payment` | 实际扣费多少 | `wh.va.order.getPaymentList` | P2 | 事后实际费用、原子费用明细。 |
| `order-status.prepayment` | 已有增值单的预估费用 | `wh.va.order.getPrepaymentList` | P2 | 已有订单的预估费用。 |
| `order-status.goods` | 增值单里哪些货/子货物 | `wh.va.order.getSubGoods` | P2 | 子货物、商品、条码、批次、附件。 |

---

## 八、费用与报价决策

| 用户问题 | v1 路由 | 接口 | 说明 |
|---|---|---|---|
| `还没下增值单，帮我估算费用` | v1 不承接 | 无确认接口 | 当前未确认真正的事前报价接口或价卡规则来源。 |
| `这张增值单预估费用是多少` | `value-add-order-status` 可选增强 | `wh.va.order.getPrepaymentList` | 必须已有 `orderNo`；不是下单前报价。 |
| `这张增值单实际扣费多少` | `value-add-order-status` 可选增强 | `wh.va.order.getPaymentList` | 事后实际费用，不影响状态主路径。 |
| `为什么费用算不出来` | `value-add-order-status` 可选增强 | `calRevenueErrorMsg` / `calCostErrorMsg` | 仅解释接口返回事实，必要时转人工。 |

后续如业务确认必须支持未下单前估价，需要另起调研：

- 是否存在无需 `orderNo` 的事前报价接口。
- 是否可以从价卡、VASC、服务项、仓库、对象层级、数量、尺重、耗材和操作动作推导。
- 该能力应放在 `service-config` 内作为增强，还是另行规划。

---

## 九、Gap 与跟进

| Gap | 影响 | 处理策略 |
|---|---|---|
| 字段/附件/模板证据不完整 | `service-config` 不能输出完整下单字段校验 | 普通属性字段已可由 BaseAttrRel/字段覆盖表支撑部分结论；附件、模板、上传关系继续补 `vaAtomFiles`、页面运行时响应或等价配置来源。当前只输出证据状态和 blockedClaims。 |
| `kb-atom-selectability.md` 仍需实现期接入 | 原子可选/禁选/互斥已有运行时规则切片，但 expert 节点尚未读取 | 实现期接入 `prompts/kb-atom-selectability.md`；未覆盖规则仍输出待确认，动态配置项需标明可能漂移。 |
| PMS VASC/规则接口是内部 Dubbo | 无法直接作为专家 v1 OpenAPI | 用作知识库同步或后端调研来源。 |
| 只有业务单号时增值单定位可能不唯一 | `order-status` 查询体验不稳定 | v1 要求不唯一时补充增值单号。 |
| 费用接口依赖 `orderNo` | 不能支持未下单前报价 | 明确费用增强只服务已有增值单。 |
| 异常单详情与入库异常核实属于 upstream | value-add 推荐链不应重复做入库异常查询 | 通过 `valueAddHandoff` 消费上游事实。 |

---

## 十、实现准入检查

- [ ] `value-add-order-status` v1 只把 `basicInfo` + `getVasList` 作为 P0 主路径。
- [ ] `getPaymentList`、`getPrepaymentList`、`getSubGoods` 只作为 P2 增强或可选分支。
- [ ] 未下单前费用预估不写入 v1 能力。
- [ ] `exception-diagnosis`、`product-recommendation`、`service-config` 的业务适用性不从接口文档反推。
- [ ] `service-config` 输出 `pendingRuleEvidence`，并在实现期读取 `prompts/kb-atom-selectability.md` 计算已覆盖规则。
- [ ] 上游 `inbound-exception-check` 的异常查询能力通过 `valueAddHandoff` 衔接，不由 value-add 链重复承担。
