# 知识治理规则

## 唯一事实源

`data/canonical/` 是唯一可审查事实源：

- `entities/`：实体及其事实。
- `relationships/`：结构化关系。
- `vocabularies/`：受控术语、代码、状态域和对象层级。

生成视图不得手工维护业务事实。

当前 Canonical 只允许订单创建至仓库出库交接范围内的实体、事实和关系。轨迹、POD、查件、索赔和派送失败处置不得进入当前 Canonical；对应目录仅为延期占位。

## 稳定标识

- `entity_id`、`fact_id`、`relation_id` 发布后保持稳定。
- 中文标题变化不应改变 ID。
- 同一来源中的重复记录不生成重复实体，但保留来源证据。
- 名称相同、含义不同的对象不能自动合并。

## 事实要求

每条事实至少包含：

- 所属实体。
- 陈述、条件和例外。
- `knowledge_status`、`confidence`、`fidelity`。
- `applicability`、`effective_period`。
- `sensitivity`、`disclosure_level`、`runtime_eligible`。
- `source_refs`、`last_verified_at`、`superseded_by`。

`agent_internal` 事实必须有 `disclosure_guard`。

## 关系要求

关系至少包含起点、终点、关系类型、条件、适用范围、有效期、来源和知识状态。

两个实体出现在同一文档中不自动形成关系。关系必须有明确来源或有记录的推导规则。

`agent_internal` 关系必须有 `disclosure_guard` 和禁止披露测试。

## 状态和发布

知识状态只描述知识质量，不能与业务履约状态混用。

只有事实或关系自身满足以下条件才可进入 runtime profile：

- `knowledge_status: active`
- `runtime_eligible: true`
- 来源完整且可解析。
- 适用范围满足 Schema。
- 有效期合格且未被替代。
- 条件、限制和冲突说明一并进入切片。
- 属于当前仓内出库范围，且不越过交接终点。

## 维护闭环

Canonical 变化后必须：

1. 重建实体、流程、关系映射和 glossary。
2. 重建 index。
3. 重跑覆盖、检索、答案、边界和披露测试。
4. 更新来源和冲突报告。
5. 更新 `ROADMAP.md`、`log.md` 和必要的 CHANGELOG。
