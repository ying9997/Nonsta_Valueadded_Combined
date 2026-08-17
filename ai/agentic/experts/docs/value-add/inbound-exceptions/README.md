# 入库异常实体摘要

本目录承接 `value-add-exception-diagnosis` 所需的异常实体知识：异常编码、名称、对象、节点，以及是否进入 value-add 推荐链。

## v1 使用口径

- 已有明确异常编码或上游 handoff 时，优先归一异常事实。
- 只判断是否进入增值推荐链，不直接推荐最终 VASC 或服务项。
- 需要入库责任判定、数量差异、是否人工介入时，应由上游 `inbound/inbound-exception-check` 处理。

## 必备字段

| 字段 | 说明 |
|---|---|
| `exceptionCode` | 标准异常编码 |
| `exceptionName` | 异常名称 |
| `exceptionObject` | 异常对象，如包裹、商品、单品、托盘 |
| `exceptionNode` | 异常节点或入库阶段 |
| `valueAddCandidate` | 是否存在增值处理候选 |
| `candidateEvidence` | 进入增值链的证据来源，如异常到 VASC 映射 |

## 当前限制

全量 422 条标准异常快照待补；当前只提供 expert 设计要求的字段口径和关系映射入口。
