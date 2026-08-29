# 02-domain-plan Completion Summary

Status: COMPLETED

## 本会话产物路径

- `workspace/experiments/nonstandard-submission-guide/02-domain-plan/value-add-experts-plan-delta.md`
- `workspace/experiments/nonstandard-submission-guide/02-domain-plan/completion-summary.md`

## 读过的关键来源

- `workspace/experiments/nonstandard-submission-guide/01-business-reference/value-add-nonstandard-submission-guide.md`
- `workspace/experiments/nonstandard-submission-guide/01-business-reference/completion-summary.md`
- `ai/agentic/experts/docs/plan/value-add-experts-plan.md`
- `ai/agentic/experts/docs/plan/domain-taxonomy.md`
- `ai/agentic/experts/docs/experts/value-add/value-add-exception-diagnosis.md`
- `ai/agentic/experts/docs/experts/value-add/value-add-product-recommendation.md`
- `ai/agentic/experts/docs/experts/value-add/value-add-service-config.md`
- `ai/agentic/experts/docs/experts/value-add/value-add-order-status.md`

## 关键结论

- S1 completion summary 未标记 BLOCKED，可以继续 S2。
- 建议将 `value-add` 域从“4 个已上线 experts”扩展为“4 个已上线 experts + 1 个新增规划中 expert”。
- 新 expert 建议命名为 `value-add/value-add-nonstandard-submission-guide`。
- 新 expert 定位为“非标其他服务提交前指引层”，只在 VASC 和 VaAtom 已确认进入“其他服务需求”类原子后承接。
- 新 expert 的 v1 核心范围是 `OW01V1602 入库其他服务需求` 的 `vasDes` 补齐、历史 `sceneOverviewName + sop` 模板匹配、SOP 客户确认稿和转人工原因。
- `OSF6V1603 库内其他服务需求`、`OSF8V1601 出库其他服务需求` 可作为后续同类扩展，但需要 API/样例单补证后再正式承诺。
- 新 expert 不替代 `exception-diagnosis`、`product-recommendation`、`service-config` 或 `order-status`；它应作为 `service-config` 之后的可选下游。
- 正式 plan 中“4 experts”相关表述、业务链路图、路由速查、专家边界卡、专家状态追踪和待确认项都需要调整。
- 旧表述中最容易冲突的是：`service-config` 的“用户准备资料提示”与新 expert 的 `vasDes` 追问/SOP 草稿边界，以及“正式规划只围绕上表 4 个 experts 展开”。

## 阻塞项

- 未发现 S1 与正式域 plan 完全无法对齐的阻塞冲突。
- 存在后续补证项，但不阻塞本 S2 delta：
  - `sceneOverviewCode`、`sceneOverviewName`、`data.list[].sop` 的稳定字段定义。
  - `OW01V1602` 历史模板 SOP 来源接口或样例单路径。
  - SOP 知识库标题与事实表场景名的同义归并规则。
  - 历史模板匹配阈值和是否需要人工确认后复用。
  - `preparedSubmissionDraft` 的正式字段范围、草稿状态和可见对象。

## 与上游是否一致

- 与 S1 一致：新增能力按 VaAtom 原子处理，不按 VASC 产品生成 SOP。
- 与 S1 一致：本期核心为 `OW01V1602 入库其他服务需求`，明确命名原子应回 recommendation/config 分流。
- 与正式 `value-add-experts-plan.md` 一致：不承接未下单前报价，不直接创建/提交增值单，不用接口文档反推业务适用性。
- 与 `value-add-service-config` 一致：配置层仍负责 VASC 下服务项/原子、互斥、可选性和字段证据；新增 expert 只消费其确认结果，不自行裁定配置。
- 与 `value-add-order-status` 一致：新增 expert 处理提交前；已提交增值单状态、退回、部分完成和费用增强仍由 order-status 承接。

## 是否建议进入下一步

建议进入 S3 API/KB gap。

进入 S3 时建议重点核查：

- 历史模板 SOP 的 API/样例单来源。
- `sceneOverviewName + sop` 与 SOP 知识库的同义归并证据。
- `OW01V1602`、`OSF6V1603`、`OSF8V1601` 的覆盖证据差异。
- `vasDes` 硬阻塞字段与允许人工后补字段的业务口径。
- `preparedSubmissionDraft` 是否有系统落点，还是仅作为 AI 草稿。
