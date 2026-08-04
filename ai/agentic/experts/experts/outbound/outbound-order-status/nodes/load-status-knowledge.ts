/**
 * 节点：加载状态解读知识片段
 * FaaS 单文件闭环，无外部 import。与 `workflow.json` 本节点 `inputs` / `outputs` 一致。
 *
 * 【输入】`main({ params })` → `params`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | （无必填） | — | 工作流 `inputs` 为空；可忽略 `params` |
 *
 * 【输出】`return ret`：
 * | 字段 | 类型 | 说明 |
 * |------|------|------|
 * | statusLexicon | string | Markdown：状态码词典 |
 * | statusScenarios | string | Markdown：场景解读 |
 * | jsonFieldGuide | string | Markdown：JSON 字段说明 |
 *
 * 内容与 `prompts/` 下对应说明保持一致，便于 Coze 单文件部署。
 */

// ========== 知识片段（与 prompts/*.md 保持同步） ==========
const STATUS_LEXICON = `# 出库单状态词典

供 Agent 从返回 JSON 中解读出库单状态。状态码来源：[出库单订单状态列表](https://developer.winit.com.cn/document/detail/id/275.html)。

## 状态码对照表

| 状态码 | 状态名 | 万邑联页面 | 解读要点 |
|--------|--------|------------|----------|
| DR | 草稿 | 草稿 | 表示草稿，尚未提交 |
| CFI | 出库确认中 | 已下单 | 仓库确认中 |
| CF | 出库确认 | 已下单 | 确认完成，待拣货 |
| PKC | 拣选完成 | 仓库处理中 | 拣货完成，待打包 |
| PAC | 打包完成 | 仓库处理中 | 打包完成，可能进入暂存 |
| TSC | 暂存完成 | 仓库处理中 | 暂存场景：可能待增值信息或自提等 |
| OBC | 出库完成 | 出库完成 | 自提类交接完成 |
| DLI | 派送中 | 出库完成 | 已交尾程；跟踪号见 JSON 字段 |
| HPO | 移交邮局 | 出库完成 | 非跟踪渠道，已交邮局 |
| DLC | 派送完成 | 派送完成 | 妥投完成 |
| DLF | 派送失败 | 派送失败 | 派送失败 |
| DSC | 销毁完成 | 出库完成 | 销毁完成 |
| EX | 异常 | 异常 | 可能含部分子单异常 |
| VOI | 作废中 | - | 截单/作废处理中 |
| VO | 已作废 | 已作废 | 作废完成 |

## 出库单类型与状态流转

### 标准出库（派送跟踪服务）

\`\`\`mermaid
flowchart LR
    CFI[出库确认中] --> CF[出库确认]
    CF --> PKC[拣选完成]
    PKC --> PAC[打包完成]
    PAC --> TSC[暂存完成]
    TSC --> DLI[派送中]
    DLI --> DLC[派送完成]
    DLI --> DLF[派送失败]
\`\`\`

### 标准出库（非派送跟踪服务）

\`\`\`mermaid
flowchart LR
    CFI[出库确认中] --> CF[出库确认]
    CF --> PKC[拣选完成]
    PKC --> PAC[打包完成]
    PAC --> TSC[暂存完成]
    TSC --> HPO[移交邮局]
\`\`\`

### 自提出库

\`\`\`mermaid
flowchart LR
    CFI[出库确认中] --> CF[出库确认]
    CF --> PKC[拣选完成]
    PKC --> PAC[打包完成]
    PAC --> TSC[暂存完成]
    TSC --> OBC[出库完成]
\`\`\`

### 销毁出库

\`\`\`mermaid
flowchart LR
    CFI[出库确认中] --> CF[出库确认]
    CF --> PKC[拣选完成]
    PKC --> DSC[销毁完成]
\`\`\`

### 平台面单（3PL / OSF822）

当剪枝结果为 **\`isPlatformWaybill: true\`**（产品码 OSF822* 或下单产品名含 3PL）时：**数据含义上**，尾程轨迹通常不在万邑通侧同步；若 JSON 含 **trackingNum / trackingNos**，仅作字段归纳。**职责边界**：不向客户承诺可获取/下载面单或任何线下操作路径。

## JSON 中的状态字段

- **出库单层级**：\`status\`（状态码）、\`statusName\`（状态中文名）
- **子单/包裹层级**：\`packageList[].status\`，可能与出库单 \`status\` 不一致（一单多包裹时）
- **作废相关**：\`reasonForVoid\`（作废原因）、\`isOperateByWinit\`（是否由万邑通作废）
`;

const STATUS_SCENARIOS = `# 出库单状态场景解读

供 Agent 结合出库单状态与 JSON 字段，做**场景含义与数据对照**（非客服话术、非操作建议）。

## 1. 暂存场景（TSC）

状态码 **TSC（暂存完成）** 在数据上可能对应两类业务含义，需结合出库单类型字段判断：

| 场景 | 数据含义 / 与字段关系 |
|------|-------------------------|
| **标准出库 + 增值服务** | 订单处于暂存，常与待补充的增值信息相关；可对照 \`winitProductCode\`、\`deliverywayName\` 等 |
| **自提出库 2.0（OSF823）** | 暂存与自提流程相关；可对照 \`deliverywayName\` / \`winitProductCode\` 是否含自提标识 |

### 判断依据（仅基于字段）

- 出库单 \`deliverywayName\` 或 \`winitProductCode\` 含自提相关标识（如 OSF823）→ 数据上偏向自提暂存路径
- 否则 → 数据上偏向标准出库 + 增值相关路径

### 平台面单（\`isPlatformWaybill\`）

\`prunedOrderData.list\` 每项上的 **\`isPlatformWaybill\`**（boolean）由剪枝节点写入：**\`winitProductCode\` 以 OSF822 开头**，或 **\`orderWinitProductName\` 含 3PL**（均大小写不敏感）。为 true 时表示平台面单（3PL）路径，勿与自提 OSF823 等混淆。

- **数据事实**：此类订单下，尾程物流轨迹**通常不会同步到万邑通系统**。若 JSON 中存在 **\`trackingNum\` / \`trackingNos\`**，可在分析中**引用字段值**说明跟踪号来源；**不提供**「去哪查」「如何获取面单」等指引。

## 2. 增值场景

与 [增值服务参数说明](https://developer.winit.com.cn/document/detail/id/279.html) 关联：

- 选择特定增值服务的订单，在 **PAC（打包完成）** 后可能进入 **TSC（暂存完成）**
- 业务上常需在系统侧补充增值信息或确认后才会继续流转；**分析时只描述状态与字段反映的阶段**，不指引客户操作入口。

## 3. 异常场景

### 3.1 EX（异常）

- **含义**：部分子单作废或部分子单派送失败等导致的异常汇总状态
- **数据对照**：可结合 \`packageList[]\` 各子单的 \`status\`、\`reasonForVoid\` 做分项说明；**不**建议查件/索赔路径。

### 3.2 DLF（派送失败）

- **含义**：派送失败类终态之一
- **数据对照**：可引用 JSON 中与失败相关的字段；**不**输出索赔或查件流程。

### 3.3 VO（已作废）、VOI（作废中）

- **VO**：作废成功
- **VOI**：截单/作废处理中
- **数据对照**：可引用 \`reasonForVoid\`；**不**引导联系客服或异议流程。

## 4. 其他常见状态与字段含义（非话术）

| 状态 | 字段层面可归纳的要点 |
|------|----------------------|
| CFI / CF | 尚未进入后续仓库完成节点；处于确认/拣货前阶段 |
| DLI | 已交尾程；若有 \`trackingNum\`/\`trackingNos\` 可列出字段值 |
| DLC | 派送完成/妥投类状态 |
| HPO | 非全程跟踪渠道场景；常与移交邮局相关，可能无可用跟踪号 |
`;

const JSON_FIELD_GUIDE = `# 出库单 JSON 字段解读（精简，仅 id/54 列表）

## 问题类型与字段（仅作数据对照）
- 平台面单: list[].isPlatformWaybill（剪枝写入；OSF822* 或下单产品名含 3PL）；**尾程轨迹通常不同步到万邑通**；仅陈述字段，**不**引导去承运商/平台查询，**不**承诺面单获取
- 到哪步: status, statusName
- 出库单号: outboundOrderNum（列表 id/54 可能原为 documentNo，已对齐补全）
- 跟踪号: trackingNum, packageList[].trackingNos
- 派送商: carrier, packageList[].carrier
- 作废原因: reasonForVoid, packageList[].reasonForVoid
- 实际仓/渠道: actualWarehouseInfoList, actualProductInfoList

## 必读规则
- deliveryWayName=下单产品, carrier=实际派送商，组合产品时以 carrier 为准
- carrierHasChange: Y=已变更 N=未变更 O=组合服务
- 一单多包裹: 各子单 status/trackingNos 可能不同，部分异常时出库单 status 可能为 EX

## 根级附加
- _fetchMeta: strategy 恒为 list-only；含 batchPluginMerged、requestedTokenCount、actionPlanCount、pluginBatchOutputCount、resolvedCount 等
- 当前管线不追加 id/145 / id/56，根级一般无 _enrichment
- _pruneMeta: 剪枝元信息

## 剪枝 _pruneMeta
- 可说明：当前为剪枝后的部分数据；**不**要求客户执行任何操作
`;

/** Coze 入口：输出知识片段供下游 LLM 使用 */
async function main({ params }: { params: Record<string, unknown> }) {
  const ret = {
    "statusLexicon": STATUS_LEXICON,
    "statusScenarios": STATUS_SCENARIOS,
    "jsonFieldGuide": JSON_FIELD_GUIDE,
  };
  return ret;
}

// 仅当以本文件为入口运行时执行，Coze 不会触发
if (typeof process !== "undefined" && process.argv[1]?.includes("load-status-knowledge")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params }).then((r) => process.stdout.write(JSON.stringify(r)));
}
