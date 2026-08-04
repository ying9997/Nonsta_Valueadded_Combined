# 尾程专家系统 - expected-arrival-time 设计文档

## 业务场景
根据运单号或出库单号查询包裹预计送达时间（ETA），回答客户关于到货时间、到货窗口的咨询，判断是否存在延误。

## 专家ID
`expected-arrival-time`

## 专家名称
预计到达时间查询

---

## 一、业务处理流程

```mermaid
flowchart TD
    A[接收用户请求] --> B[参数提取: trackingIds/outboundOrderNos]
    B --> C[通过 delivery-status 获取轨迹/订单数据]
    C --> D[分析物流节点信息]
    D --> E[计算预计送达时间]
    E --> F[标注不确定性说明<br/>(国际件清关影响)]
    F --> G[输出: 结构化时间 + 分析说明]
```

---

## 二、SOP 关键信息整理

| 项目 | 说明 |
|------|------|
| **适用场景** | 客户查询预计送达时间（ETA）、到货窗口、询问是否会延误 |
| **不适用场景** | 无任何单号/轨迹可关联时 |
| **特殊说明** | 国际件 ETA 常依赖清关与末端承运商，结论需带不确定性说明 |

---

## 三、输入输出 Schema

### 输入设计

#### 框架顶层（调用边界，不在 manifest.inputSchema 内）

| 字段 | 类型 | 说明 |
|------|------|------|
| `query` | string | 委托任务说明，可为空 |
| `customerIntent` | string | 业务摘要，可为空 |
| `inputContext` | object | 可选；链式上下文 |
| `customerCode` | string | 租户代码（框架约定，顶层保留） |
| `customerName` | string | 客户名称（框架约定，顶层保留） |
| `username` | string | 用户名（框架约定，顶层保留） |
| `language` | string | 语言（框架约定，顶层保留） |

#### `inputs` 内业务字段（与 manifest.json 一致）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `trackingIds` | string[] | 否 | 轨迹单号 |
| `outboundOrderNos` | string[] | 否 | 出库单号 |

> 最小入参要求：`trackingIds` 与 `outboundOrderNos` 至少其一非空，可两者都传。

### 输出设计

| 字段 | 类型 | 说明 |
|------|------|------|
| `structured` | object | 结构化数据：订单号、预计到达时间 |
| `analysis` | string | 预计到达时间、计算依据、异常说明 |

---

## 四、调用说明

### 最小入参
`trackingIds` 与 `outboundOrderNos` 至少其一非空，两者都传精度更高。

### 参数提示
- 国际件 ETA 常依赖清关与末端承运商，结论需带不确定性说明
- 透传 `inputContext.chainId` 保持追踪链路一致

### 示例调用

```json
{
  "query": "这单大概哪天能到？",
  "customerIntent": "客户需要安排收货",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": {
    "chainId": "eta-001",
    "sourceExpertId": "",
    "previousOutput": ""
  },
  "inputs": {
    "trackingIds": ["1Z999AA10123456784"],
    "outboundOrderNos": []
  }
}
```

```json
{
  "query": "",
  "customerIntent": "",
  "customerCode": "",
  "customerName": "",
  "username": "",
  "language": "",
  "inputContext": {},
  "inputs": {
    "trackingIds": [],
    "outboundOrderNos": ["OB20250401001"]
  }
}
```

---

## 五、代码实现状态

- ✅ 框架结构已创建 (`manifest.json`)
- ✅ 设计文档已完成 (`design.md`)
- ⚠️ `nodes/` 目录已创建，节点待实现
- ⚠️ `prompts/` 目录已创建，提示词待完善
- ⚠️ 工作流 `workflow/` 未创建，需要后续编排

---

## ⚠️ 外部系统依赖

本专家流程需要调用以下外部系统/服务才能完成自动处理：

- **delivery-status** → 获取已解析的包裹轨迹和历史节点数据
- **尾程产品信息**（不同渠道标准时效数据）

---

**文档生成时间**：2026年04月27日
**数据源**：代码仓库 `design.md` + `manifest.json` 分析整理
