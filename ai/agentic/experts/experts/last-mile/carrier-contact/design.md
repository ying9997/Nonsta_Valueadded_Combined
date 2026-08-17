# carrier-contact 专家设计

服务商和自提点等联系方式提供。

## 调用说明

### 适用场景

- 需要**服务商客服电话、自提点地址/电话**等联系方式。
- 不适用：无法提供承运商或区域线索且也无跟踪号时。

### 最小入参

- 建议至少提供 `trackingIds`、`carrierCode`、`region` 中一项；组合越多定位越准。
- 编排器可注入 **`enrichedContext`**（推荐前置 **`delivery-status`**），以使用 `carrierHints` / `trajectories[].summary` 反查承运商。

### 参数提示

- `carrierCode` 请与主数据或轨迹中的承运商编码一致。
- `region` 可用国家/州省/城市等粒度，与上游规范对齐。
- `customerIntent` 仅在**调用 JSON 顶层**。

### 示例调用

```json
{
  "query": "我要打快递客服",
  "customerIntent": "包裹异常需人工",
  "inputContext": { "chainId": "cc-001", "sourceExpertId": "", "previousOutput": "" },
  "inputs": {
    "trackingIds": ["1Z999AA10123456784"],
    "carrierCode": "",
    "region": "California, US"
  }
}
```

```json
{
  "query": "",
  "customerIntent": "",
  "inputContext": {},
  "inputs": {
    "trackingIds": [],
    "carrierCode": "UPS",
    "region": "DE"
  }
}
```

## 1. 输入设计

### 1.1 框架顶层（调用边界，不在 manifest.inputSchema 内）

| 字段 | 类型 | 说明 |
|------|------|------|
| query | string | 委托任务说明，可为空 |
| customerIntent | string | 业务摘要，可为空 |
| inputContext | object | 可选；链式上下文 |

### 1.2 inputs 内业务字段（与 manifest.json 一致）

| 字段 | 类型 | 说明 |
|------|------|------|
| trackingIds | string[] | 轨迹单号 |
| carrierCode | string | 承运商代码 |
| region | string | 区域 |
| enrichedContext | object | 可选；上游轨迹合并结果 |

## 2. 输出设计

- **structured**：`branch`、`carrierCode`、`standardCarrier`、`pickupPointIds`、`suggestedNextExperts`、`missingFacts`、`contactSummary`
- **analysis**：服务商电话、自提点地址与联系方式、联系建议（须与 KB 可核验）

## 3. 工作流编排

```
用户输入（扁平 params）
    │
    ▼
validate-input（校验最小线索 + 注入 analysisClock）
    │
    ▼
load-carrier-knowledge（解析侧重前缀 + CARRIER_KB_MARKDOWN → kbMd）
    │
    ▼
llm-analyze（prompts/main.md，占位符含 kbMd / carrierCode / region / enrichedContext）
    │
    ▼
format-output（result + outputContext）
```

## 4. 节点说明

| 节点 | 说明 |
|------|------|
| validate-input | 至少一线索；透传字段；合并 `enrichedContext.analysisClock` |
| load-carrier-knowledge | 产出 `kbMd`；内嵌 KB 与 [prompts/kb.md](prompts/kb.md) **须同步**；更新 KB 后运行 `node experts/last-mile/carrier-contact/scripts/embed-kb-into-load.mjs` 重新生成内嵌正文；若需同步 `workflow/workflow/carrier_contact-draft.yaml` 中代码节点内嵌字符串，再运行 `node experts/last-mile/carrier-contact/scripts/sync-kb-line-to-yaml.mjs` |
| llm-analyze | Coze/Runner LLM 节点 |
| format-output | 归一化 `analysisResult`，`outputContext.expertId` = `carrier-contact` |

## 5. 知识库与内部溯源

- **内部权威 SOP（维护者）**：[（海外仓）各供应商的客服电话](https://winitlink.feishu.cn/wiki/Ndqvw5WnSip7Juk9JavcVrapnPf)
- **AI 处理流程**（编排话术参考）：[咨询运输商联系方式](https://winitlink.feishu.cn/wiki/VJ6MwL0EeiZqhekaMBccEewjnse)
- 本地整理版：[prompts/kb.md](prompts/kb.md)；内部运营知识库更新后应同步 kb.md 并重新执行 embed 脚本。

## 6. 外部系统（后续）

- **万邑通主数据 / TOM 反查**：当前仓库无契约；API 就绪后可在 `load-carrier-knowledge` 前增加数据节点，将结果并入 `enrichedContext` 或替换 KB 片段。
