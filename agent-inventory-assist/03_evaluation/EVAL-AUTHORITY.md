# 评测资产权威索引（2026-08-31 修订）

> **唯一入口。** 旧链路一律看「归档/废弃」表，禁止再当现行金标。

## 现行权威（用这些）

| 用途 | 路径 |
|------|------|
| 产品/评测文档根 | `agent-inventory-assist/` |
| **试用 · 核心场景真实集（P0）** | `03_evaluation/datasets/oms-scene-f001-v0.1/`（OMS 场景倒查；先 3 通深做） |
| F-001 工程金标（4 条干跑） | `experts/value-add/nonstandard-sop-guide/tests/pilot-f001/` |
| F-001 模拟必填 | `03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md` |
| 字段/场景 2.1 | `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` |
| 场景细类对照 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` |
| 主数据源（客户–客服，倒查用） | `workspace/data/raw/data_udesk_log_database_增值.csv` |
| 抽样/金标约定（方向标签与评分规则仍有效；分层大盘已归档） | `03_evaluation/抽样规则草稿-真实客服会话-V0.1.md` §4.2～4.3 |
| 评测方案改进点 | `03_evaluation/Agent评测方案-V1.0.md` §11 |

**两套不互相替代：** F-001 四条 = 规则门禁干跑；`oms-scene-f001-v0.1` = 真实对话 + OMS 场景/SOP 试用小集。

**试用阶段原则：** 少数真实、可懂、带权威金标的闭环题；核心场景先与业务共识，边界后迭代。八桶分层 **不是** 上线试用 P0。

## 明确排除（不得当评测主源）

| 类型 | 路径/说明 | 原因 |
|------|-----------|------|
| **Udesk 粗桶分层试点** | `03_evaluation/datasets/udesk-stratified-v0.1/` | **已归档（2026-08-31）**：未做需求收束；勿再引用为现行集。见该目录 `ARCHIVED.md` |
| 分层抽样运行痕迹 | `_runs/20260829_udesk_sample/` | 同归档；仅历史探针 |
| 内部飞书群聊 | `workspace/data/raw/飞书群聊_*.xlsx` 等 | 不可仿真、内部转述偏差 |
| qa-gen 候选当金标 | `ai/agentic/qa-gen_base.csv` 等 | 非完整多轮会话 |
| 旧 Udesk 派生「评测集」 | `workspace/eval/queue-regression/data/extracted-*.json` 等 | 旧抽取口径 |

## 归档 / 废弃指针

| 旧资产 | 状态 | 改去看 |
|--------|------|--------|
| `datasets/udesk-stratified-v0.1` | **archived-no-requirement-convergence** | `oms-scene-f001-v0.1` + 本文件 |
| 凡「未做需求收束」的前期会话切叶金标尝试 | archived | 本文件；勿引用 |
| `candidate_eval_cases.json` 等 | deprecated | 本文件 |
| 群聊抽评测 | excluded | Udesk / OMS 倒查 |

## 现行主路径（P0）

```text
定场景名（如【入库】尺重/标签辨识后换标上架）
  → 拉该场景 VASC（含 sop）
  → 抽 EB/WI
  → Udesk 反查命中会话
  → 会话摘要 / 需求收束
  → 切叶 / 方向标签
  → 评测（小集试用）
```

脚本：`scripts/eval/build_oms_scene_f001.py`
