# 评测资产权威索引（2026-08-31 修订）

> **唯一入口**。旧链路一律看「归档/废弃」表，禁止再当现行金标。

## 现行权威（用这些）

| 用途 | 路径 |
|------|------|
| 产品/评测文档根 | `agent-inventory-assist/` |
| **试用真实集（P0）** · OMS 场景倒查 F-001 | `03_evaluation/datasets/oms-scene-f001-v0.1/` |
| F-001 工程金标（4 条干跑） | `experts/value-add/nonstandard-sop-guide/tests/pilot-f001/` |
| F-001 模拟必填 | `03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md` |
| 字段/场景 2.1 | `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` |
| 场景细类对照 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` |
| 主对话数据源（反查用） | `workspace/data/raw/data_udesk_log_database_增值.csv` |
| 评测方案后续改进 / 试用优先级 | `03_evaluation/Agent评测方案-V1.0.md` §11 |
| 抽样/金标约定（含方向标签枚举；分层大盘已后移） | `03_evaluation/抽样规则草稿-真实客服会话-V0.1.md` |

**两套不互相替代**：F-001 四条 = 规则门禁干跑；`oms-scene-f001-v0.1` = 核心场景真实对话小集（先约 3 通深做）。

### P0 试用评测（现行）

1. OMS 场景概述 + 仓库操作 SOP 倒查 Udesk（先 F-001：`【入库】尺重/标签辨识后换标上架`）。  
2. 会话摘要 + **需求收束**切点后再切叶。  
3. 少量可懂闭环题（目标先 **3** 通）+ F-001 工程门禁。  
4. 粗桶全量分层、高危铺全 → **P2 后移**。

## 明确排除 / 已归档（不得当现行评测主源）

| 类型 | 路径/说明 | 原因 |
|------|-----------|------|
| **Udesk 粗桶分层集** | `03_evaluation/datasets/udesk-stratified-v0.1/` | **2026-08-31 归档**：无需求收束、分层过重；保留不删，禁止引用为现行集 |
| 同期分层运行痕迹 | `_runs/20260829_udesk_sample/` | 同上，仅历史 |
| 内部飞书群聊 | `workspace/data/raw/飞书群聊_*.xlsx` 等 | 不可仿真 |
| qa-gen 候选当金标 | `ai/agentic/qa-gen_base.csv` 等 | 非完整会话 |
| 旧 Udesk 派生评测集 | `workspace/eval/queue-regression/data/extracted-*.json` 等 | 旧口径 |

## 其它归档指针

总表见：`experts/value-add/nonstandard-sop-guide/DEPRECATED.md`。  
试点副本：`workspace/eval/cases/DEPRECATED-FOR-PILOT-F001.md`。

| 旧资产 | 状态 | 改去看 |
|--------|------|--------|
| `udesk-stratified-v0.1` | **archived-2026-08-31** | `datasets/oms-scene-f001-v0.1/` |
| `candidate_eval_cases.json` 等 | deprecated | 本文件 |
| 群聊抽评测 | excluded | Udesk / OMS 倒查 |

## sop_gate / 倒查

**现行：** 定场景 → VASC(+sop) → EB/WI → 反查 Udesk → 摘要 → 需求收束切叶。  
探针脚本：`scripts/eval/probe_oms_scene_f001_to_udesk.cjs`。  
后继单字段约定仍见抽样规则 §4.2（`anchor_vasc` / `sop_source_vasc` / `sop_provenance`）。
