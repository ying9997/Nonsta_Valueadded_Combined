# Value-Add 实现前评审清单

> 关联规划：[value-add-experts-plan.md](value-add-experts-plan.md)  
> API 矩阵：[value-add-api-matrix.md](value-add-api-matrix.md)  
> 生成日期：2026-06-24  
> 复核日期：2026-06-26（同步 value-add prompt KB 补强结果）
> 用途：在进入 `manifest.json`、`workflow.json`、`nodes/`、`prompts/` 实现前，统一检查 4 个 value-add experts 与 inbound 衔接是否可落地。

---

## 一、评审结论口径

| 项 | 当前结论 |
|---|---|
| Expert 数量 | 固定为 4 个：诊断、推荐、配置、状态查询。 |
| 旧 `value-add-guide` | 旧占位参考，不作为新规划约束。 |
| 费用能力 | 不新增费用 expert；未下单前费用预估不纳入 v1。 |
| 推荐链主路径 | `exception-diagnosis -> product-recommendation -> service-config`。 |
| 状态查询主路径 | `order-status` 使用 `wh.va.order.basicInfo` + `wh.va.order.getVasList`。 |
| inbound 衔接 | `inbound-exception-check` 增值类异常 handoff 到 `value-add/value-add-exception-diagnosis`。 |

---

## 二、正式文档产物检查

| 产物 | 路径 | 状态 | 检查点 |
|---|---|---|---|
| 域规划 | `docs/plan/value-add-experts-plan.md` | 已生成 | 4 experts、边界、路由、`valueAddHandoff`、费用边界、原子规则预留。 |
| API 矩阵 | `docs/plan/value-add-api-matrix.md` | 已生成 | 主路径 API、可选费用接口、内部接口定位、Gap。 |
| 诊断业务参考 | `docs/experts/value-add/value-add-exception-diagnosis.md` | 已生成 | 场景、流程、structured、降级。 |
| 推荐业务参考 | `docs/experts/value-add/value-add-product-recommendation.md` | 已生成 | 客户意图、候选 VASC、缺失确认项。 |
| 配置业务参考 | `docs/experts/value-add/value-add-service-config.md` | 已生成 | 服务项编排、字段证据、`atom-selectability-rules`。 |
| 状态业务参考 | `docs/experts/value-add/value-add-order-status.md` | 已生成 | 已提交增值单状态、原子进度、费用边界。 |
| 4 份实现侧 design | `experts/value-add/*/design.md` | 已生成 | 调用说明、示例 JSON、输入、工作流、输出、enrichedContext。 |
| 领域知识库副本 | `docs/value-add/` | 已生成 | 流程、实体、映射、source references 和数据源台账均在 repo 内。 |
| 4 份运行时 KB | `experts/value-add/*/prompts/kb-*.md` | 已生成；3 份新增专家 KB 已补强 | 每个新 expert 只读取自己的裁剪 KB，不读取外部路径或全量 source references；`product-recommendation` 按现有用户版单独复核。 |

---

## 三、实现准入 checklist

### 3.1 跨 expert 契约

- [ ] 4 个 experts 的 `manifest.id` 与目录名一致。
- [ ] `manifest.domain` 均为 `value-add`。
- [ ] `inputSchema.properties` 只写业务字段，不写 `query`、`customerIntent`、`inputContext`、`inputs`、`customerCode`、`customerName`、`username`、`language`、`data`。
- [ ] `outputSchema` 只描述 `structured` 和 `analysis`，不把 `outputContext` 写入业务 schema。
- [ ] `format-output` 根级返回 `structured`、`analysis`、`outputContext`、`enrichedContext`。
- [ ] `coze.config.yml` 如需注入知识库，只通过 `textNodes.sourceFile: prompts/kb-*.md` 注入运行时裁剪 KB。
- [ ] 正式源文件不得包含外部绝对路径、外部 KB 目录名或个人本地目录引用。
- [ ] experts 之间不直接互调，只通过 planner、handoff facts、`enrichedContext` 衔接。

### 3.2 `value-add-exception-diagnosis`

- [ ] 至少支持 `exceptionCode`、`exceptionName`、`customerDescription`、`valueAddHandoff` 四种入口。
- [ ] 输出 `isValueAddCandidate`、`missingEvidence`、`handoffFacts`。
- [ ] 不做入库责任判定，不推荐最终 VASC。
- [ ] 无法识别异常时输出候选和待补充信息，不编造异常编码。

### 3.3 `value-add-product-recommendation`

- [ ] VASC 候选只从异常到 VASC 映射和 VASC 知识生成。
- [ ] 输出 `recommendedVascCandidates`、`primaryRecommendation`、`notRecommendedOptions`、`missingConfirmations`。
- [ ] inactive VASC 不能直接作为可下单推荐。
- [ ] 不用接口字段反推业务适用性。

### 3.4 `value-add-service-config`

- [ ] 服务项/原子顺序、必选状态、互斥组来自 VASC 到服务项编排映射。
- [ ] 字段、附件、模板只输出证据状态，不生成完整配置映射。
- [ ] 预留 `selectableServiceItems`、`blockedServiceItems`、`mutexGroups`、`blockingReasons`、`pendingRuleEvidence`。
- [ ] `kb-atom-selectability.md` 未覆盖或动态配置不明时，不给确定的系统禁选/允许结论。

### 3.5 `value-add-order-status`

- [ ] P0 主路径只依赖 `wh.va.order.basicInfo` 和 `wh.va.order.getVasList`。
- [ ] `wh.va.order.getPaymentList`、`wh.va.order.getPrepaymentList`、`wh.va.order.getSubGoods` 只做 P2 增强。
- [ ] `getPrepaymentList` 必须写清依赖 `orderNo`，不是未下单前报价。
- [ ] 只有 `businessNo` 且无法唯一定位时，要求补充增值单号。
- [ ] 状态分析只呈现接口事实，不承诺完成时间。

---

## 四、`inbound-exception-check` 衔接复核项

正式源文件已把入库异常专家与新 value-add 链衔接起来。实现前复核时，应确认正式源文件不再指向旧 `value-add/value-add-guide`，且旧导出草稿会在正式导出前重新生成。

| 文件 | 当前状态 | 复核方向 |
|---|---|---|
| `experts/inbound/inbound-exception-check/nodes/build-discrepancy-report.ts` | 已改：增值类异常返回 `value-add/value-add-exception-diagnosis`。 | 已构造 `valueAddHandoff`。 |
| `experts/inbound/inbound-exception-check/design.md` | 已改：输出字段和 analysis 指向新推荐链。 | 已补 `valueAddHandoff` 输出说明。 |
| `experts/inbound/inbound-exception-check/prompts/exception-type-guide.md` | 已改：增值类下游统一为 `value-add/value-add-exception-diagnosis`。 | 后续随业务规则继续细化。 |
| `experts/inbound/inbound-exception-check/prompts/main.md` | 已改：说明进入 value-add 推荐链，不直接推荐 VASC 或工单。 | 已要求保留 `valueAddHandoff`。 |
| `docs/experts/inbound/inbound-exception-check.md` | 已改：业务参考 handoff 到新诊断层。 | 已解释 `valueAddHandoff`。 |
| `experts/inbound/inbound-exception-check/workflow/workflow/inbound_exception_check-draft.yaml` | 未手改：导出草稿仍可能含旧专家 ID 和旧话术。 | 正式导出前重新生成。 |

### `valueAddHandoff` 必备字段

| 字段 | 说明 |
|---|---|
| `exceptionCode` | 异常编码。 |
| `exceptionName` | 异常名称。 |
| `exceptionCategory` | 异常类别。 |
| `exceptionObject` | 异常对象原始值。 |
| `objectLevel` | 归一对象层级。 |
| `inboundOrderNo` | 入库单号。 |
| `eventNo` | 异常单号。 |
| `customerActionHint` | 客户处理意图线索。 |
| `evidenceSummary` | 上游差异、条码、状态、图片等摘要。 |
| `recommendedEntryExpert` | 固定 `value-add/value-add-exception-diagnosis`。 |

---

## 五、费用评审

| 检查项 | 通过标准 |
|---|---|
| 是否新增费用 expert | 不新增。 |
| 未下单前估价 | 不纳入 v1，不在 `order-status` 中承诺。 |
| `getPaymentList` | 只写为事后实际费用增强。 |
| `getPrepaymentList` | 只写为已有增值单 `orderNo` 下的预估费用增强。 |
| 费用失败话术 | 只解释接口返回事实，费用争议转人工。 |

---

## 六、知识库缺口

| 缺口 | 影响 | 进入实现前状态 |
|---|---|---|
| `atom-selectability-rules` v0.1 已生成但未接入节点 | `service-config` 实现期需读取结构化表；未覆盖或动态配置不明时输出待确认，不可编造禁选/互斥规则。 | 允许带 Gap 实现。 |
| 字段/附件/模板证据不足 | 无法做完整字段级校验。 | 允许实现证据状态输出。 |
| 客户处理动作缺少结构化映射 | `product-recommendation` 对客户意图需要置信度和缺失确认项。 | 允许实现。 |
| PMS 内部规则接口不可直接 OpenAPI | 不能作为 v1 运行时依赖。 | 作为后续调研。 |

---

## 七、建议实现顺序

1. 先修改 `inbound-exception-check` 的 handoff 设计与旧指向，避免上游继续打到旧占位。
2. 实现 `value-add-exception-diagnosis`，打通异常事实归一和 `handoffFacts`。
3. 实现 `value-add-product-recommendation`，打通异常到 VASC 候选。
4. 实现 `value-add-service-config`，输出服务项编排和证据边界。
5. 实现 `value-add-order-status`，接入 `basicInfo` + `getVasList` 主路径。
6. 费用和货物明细在状态查询稳定后作为增强分支接入。

---

## 八、批次验收命令建议

```powershell
rg -n "旧方案编号|temp镜像草稿" docs experts
rg -n "value-add/value-add-guide|提增值工单" experts/inbound/inbound-exception-check docs/experts/inbound/inbound-exception-check.md
$drivePattern = 'D:' + '\\'
$externalKbPattern = '_kb' + '-0618'
$personalPathPattern = '郭' + '恒溢'
rg -n "$drivePattern|$externalKbPattern|$personalPathPattern" docs/value-add docs/plan/value-add-*.md docs/experts/value-add experts/value-add
rg --files experts/value-add | Select-String -Pattern "prompts.*kb-"
npm.cmd run check:experts:manifest
npm.cmd run check:format-output-contract
npm.cmd run check:coze-io
```

第二条命令修改完成后应只剩旧导出草稿或归档说明中的历史记录；正式源文件、prompt 和业务参考不应再命中旧衔接。
