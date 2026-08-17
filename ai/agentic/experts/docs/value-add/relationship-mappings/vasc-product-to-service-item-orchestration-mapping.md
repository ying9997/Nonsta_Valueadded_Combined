# VASC 到服务项/原子编排映射

本文件是 `value-add-service-config` 输出服务项顺序、必选状态和互斥组的主依据。

## 覆盖口径

- 当前规划口径：64 条编排行，52 个唯一服务项。
- 全量 normalized 来源待补到 `source-references/exception-vas-data-package/data/normalized/`。

## 必备字段

| 字段 | 说明 |
|---|---|
| `vascCode` | VASC 产品编码 |
| `vascName` | VASC 产品名称 |
| `serviceCode` | 服务项/原子编码 |
| `serviceName` | 服务项/原子名称 |
| `sequence` | 编排顺序 |
| `required` | 是否必选 |
| `mutexGroup` | 互斥组 |
| `fieldEvidenceStatus` | 字段证据状态 |

## 使用规则

- 只能输出知识库能证明的编排和证据状态。
- 若 VASC 编码不存在或未覆盖，输出 `pendingRuleEvidence`。
- 不判断异常是否适用某个 VASC；该判断属于 `value-add-product-recommendation`。
