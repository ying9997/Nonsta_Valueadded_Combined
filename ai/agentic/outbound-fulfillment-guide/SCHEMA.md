# SCHEMA.md

## 当前成熟度

当前是 Phase 0 Schema 基线，用于项目骨架、命令报告、空来源台账和生成元数据。

完整业务实体、关系和 runtime Schema 将在 Phase 1 通过来源盘点后锁定。当前文件不能被解释为已有正式业务知识。

## Schema profile

| Profile | 对象 | Phase 0 状态 |
|---|---|---|
| `phase0-skeleton` | 根文件、规则、目录、命令和空库边界 | 已定义 |
| `business-knowledge` | 实体、事实、流程和规则 | 结构基线，未开放业务写入 |
| `source-snapshot` | 原始证据及元数据 | 结构基线，尚无来源 |
| `generated-view` | 实体页、映射、glossary、index 和报告 | 结构基线，尚无业务视图 |
| `runtime-artifact` | 发布给消费方的知识切片 | 未实现 |

## Canonical 目录

- `data/canonical/entities/`：实体与事实。
- `data/canonical/relationships/`：结构化关系。
- `data/canonical/vocabularies/`：受控术语、状态域和对象层级。
- `data/canonical/generation-metadata.json`：确定性生成时间输入。

Phase 0 期间上述三个业务目录必须为空。新增任何业务 JSON 前必须先进入 Phase 1，并升级机器 Schema 和 validator。

## 稳定 ID

- 实体：`entity_id`
- 事实：`fact_id`
- 关系：`relation_id`
- 来源：`source_id`
- 运行时 artifact：`artifact_id`

稳定 ID 发布后不因中文标题或文件名变化而改变。

## 知识状态

受控枚举：

- `draft`
- `pending_verification`
- `active`
- `deprecated`
- `superseded`
- `archived`

知识状态不得与订单、仓内任务、库存分配、波次、拣货、包装或交接状态混用。

本次业务 Schema 的生命周期终点是仓库完成出库并完成承运商或客户交接。轨迹、妥投、POD、查件、索赔和派送失败处置实体不进入当前 Canonical、生成视图或 runtime artifact。

## 置信度和保真度

`confidence`：

- `high`
- `medium`
- `low`

`fidelity`：

- `verbatim`
- `normalized`
- `summary`
- `derived`

`derived` 必须记录可复现的推导规则。

## 敏感与披露

`sensitivity`：

- `public`
- `internal`
- `restricted`

`disclosure_level`：

- `customer_safe`
- `agent_internal`
- `restricted`

两个维度正交。`agent_internal` 事实或关系必须有 `disclosure_guard`；`restricted` 不得进入一般运行时包。

## 适用范围

`applicability.scope_status`：

- `scoped`
- `global`
- `unspecified`

空数组不能表示全局适用。Schema 必须按实体类型定义必需维度。

## 有效期

`effective_period.status`：

- `bounded`
- `open_ended`
- `unknown`
- `not_applicable`

不能用两个 null 同时表示未知、长期有效和不适用。

## 事实基线

Phase 1 的事实记录至少需要：

```json
{
  "fact_id": "fact-example-001",
  "entity_id": "entity-example",
  "statement": "示例，不是业务事实",
  "conditions": [],
  "exceptions": [],
  "knowledge_status": "pending_verification",
  "confidence": "low",
  "fidelity": "derived",
  "sensitivity": "internal",
  "disclosure_level": "agent_internal",
  "disclosure_guard": "示例，不得复制到正式业务数据",
  "runtime_eligible": false,
  "applicability": {
    "scope_status": "unspecified",
    "required_dimensions": []
  },
  "effective_period": {
    "status": "unknown",
    "starts_at": null,
    "ends_at": null
  },
  "source_refs": [],
  "last_verified_at": null,
  "superseded_by": null
}
```

示例不得作为正式 Canonical 内容落盘。

## 关系基线

关系至少包含：

- `relation_id`
- `relation_type`
- `from_entity_id`
- `to_entity_id`
- `conditions`
- `applicability`
- `effective_period`
- `knowledge_status`
- `confidence`
- `sensitivity`
- `disclosure_level`
- `runtime_eligible`
- `source_refs`
- `last_verified_at`

推导关系增加 `derivation_rule_id`。关系不能仅因两个实体出现在同一文档中成立。

## 生成元数据

Canonical 派生 Markdown 使用：

- `generated_by`
- `generator_version`
- `input_sha256`
- `generation_epoch`
- `generated_at`

`input_sha256` 不包含生成输出。`generation_epoch` 来自受控生成元数据，不能读取当前时钟。

## 来源台账

`source-references/source-registry.json` Phase 0 必须满足：

```json
{
  "$schema": "../data/schemas/source-registry.schema.json",
  "schema_version": "0.1.0",
  "sources": []
}
```

正式来源记录将在 Phase 1 增加来源状态、哈希、快照、可读性、敏感等级和派生关系。

## 命令报告

报告使用 `data/schemas/command-report.schema.json`。最小字段：

- `$schema`
- `contract_version`
- `command`
- `tool_version`
- `input_digest`
- `started_from_commit`
- `status`
- `exit_code`
- `validation_profile`
- `business_content_status`
- `full_business_validation_available`
- `clone_ready`
- `release_ready`
- `summary`
- `checks`
- `errors`
- `warnings`
- `written_paths`
- `mutation_guard`

状态：`passed / failed / invalid_invocation / not_implemented / internal_error`。

退出码：

- `0`：当前 profile 全部门禁通过。
- `1`：校验失败。
- `2`：参数或配置错误。
- `3`：能力尚未实现。
- `70`：工具内部错误。

Phase 0 报告必须明确：

- `validation_profile: phase0-skeleton`
- `business_content_status: empty`
- `full_business_validation_available: false`
- `release_ready: false`

## 路径规则

- 正式内容只保存项目内相对路径。
- 相对路径解析后必须仍位于项目根。
- 外部根只能作为一次性命令参数，不能写入报告或配置。
- 来源路径本身参加敏感扫描。
- 报告不得回显敏感原文、外部参数原值或异常 stack。
