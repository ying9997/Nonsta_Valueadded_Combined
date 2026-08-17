# pod-validation 专家设计

vPOD/ePOD 实时校验是否符合规范。

## 调用说明

### 适用场景

- 需要判断**上传或提供的 POD 是否符合 vPOD/ePOD 规范**。
- 不适用：尚未取得任何 POD 标识、无法关联运单时。

### 最小入参

- 建议同时提供 `trackingIds` 与 `podIds` 中至少一类非空；仅有一类时依赖具体实现能力。

### 参数提示

- `podIds` 与平台侧 POD 记录 ID 对齐；勿与文件名混淆。
- `customerIntent` 仅放在**调用 JSON 顶层**。
- 多专家编排时透传 `inputContext.chainId`。

### 示例调用

```json
{
  "query": "这份 POD 截图能过吗",
  "customerIntent": "客户担心格式不合规",
  "inputContext": { "chainId": "podv-001", "sourceExpertId": "", "previousOutput": "" },
  "inputs": {
    "trackingIds": ["1Z999AA10123456784"],
    "podIds": ["POD-20250401-001"]
  }
}
```

```json
{
  "query": "",
  "customerIntent": "",
  "inputContext": {},
  "inputs": { "trackingIds": [], "podIds": ["POD-ABC"] }
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
| podIds | string[] | POD ID |

## 2. 输出设计

- **structured**：POD ID、校验结果等
- **analysis**：校验结果、是否符合规范、整改建议

## 3. 工作流编排

待补充。

## 4. 节点说明

待补充。
