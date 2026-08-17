# 代客索赔 — 分支语义与编排提示

供维护者与 Planner 参考；**main.md** 为执行 Prompt，本文件为编排与分工说明。

## branch（validate-input）

| branch | 含义 | 典型动作 |
|--------|------|----------|
| `query` | 已具备 `claimIds` / `outboundOrderNos` / `trackingIds` 至少一类 | 组装 `afs.customer.compensate.pageList` 请求体并拉列表 |
| `guidance` | 仅有 `query` / `customerIntent` / `enrichedContext` 等文本与上下文 | 不调 OpenAPI；由 LLM 做流程与材料类说明 |
| `skip` | 入参无效 | 不调 OpenAPI；输出引导补全单号 |

## 与 refund-standard 分工

- **条款、责任是否成立、理算上限与公式**（含标准赔 vs 代客赔路径）以 **refund-standard** 为准；本专家**不**自行承诺赔付结论或复述长条款。
- 本专家侧重：**代客索赔流程、列表状态透传、材料/时效/节点类说明**；`compensateStatus` 等接口状态**先透传**，不做强映射中文阶段机（待真实 API 样例后收口）。

## 编排与事实源

- **确定性事实**：`fetch-compensate-list` 产出 `compensateListFacts`（列表解析、listStatus、notes）；**format-output** 将其合并进 `result.structured`，覆盖 LLM 同名字段。
- **KB**：`prompts/kb.md` 经 `{{kbMd}}` 注入；维护时勿在对客话术中带内部协作文档或未公开链接。

## suggestedNextExperts（Planner）

- 需条款/窗口/举证：→ `refund-standard`
- 需轨迹/妥投事实：→ `delivery-status`
- 需 POD：→ `pod-request`
