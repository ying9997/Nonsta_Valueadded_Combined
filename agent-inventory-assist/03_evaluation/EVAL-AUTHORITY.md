# 评测资产权威索引（2026-08-29）

> 今天脑暴共识后的**唯一入口**。旧链路一律看「归档/废弃」表，禁止再当现行金标。

## 现行权威（用这些）

| 用途 | 路径 |
|------|------|
| 产品/评测文档根 | `agent-inventory-assist/`（本目录为评测入口） |
| F-001 工程金标（4 条干跑） | `experts/value-add/nonstandard-sop-guide/tests/pilot-f001/` |
| F-001 模拟必填 | `03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md` |
| 全量真实会话抽样规则 | `03_evaluation/抽样规则草稿-真实客服会话-V0.1.md` |
| 全量真实会话清单（阶段0～2） | `03_evaluation/datasets/udesk-stratified-v0.1/sessions.json` |
| 全量真实叶子（intent/missing） | `03_evaluation/datasets/udesk-stratified-v0.1/leaves.jsonl` |
| 主数据源（客户–客服） | `workspace/data/raw/data_udesk_log_database_增值.csv` |
| 场景细类对照 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` |
| 字段/场景 2.1 | `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` |

**两套评测不互相替代**：F-001 四条 = 规则门禁干跑；Udesk 分层抽样 = 真实分布评测原料。

## 明确排除（不得当评测主源）

| 类型 | 路径/说明 | 原因 |
|------|-----------|------|
| 内部飞书群聊 | `workspace/data/raw/飞书群聊_*.xlsx` 及待整理群聊 xlsx | 不可仿真、内部转述偏差（今天共识） |
| qa-gen 候选当金标 | `ai/agentic/qa-gen_base.csv` → `outputs/nonstandard_guidance_eval_cases/` | QA 导出形态，非完整多轮会话；taxonomy 旧 2a/2b/2d |
| 旧 Udesk 派生「评测集」 | `workspace/eval/queue-regression/data/extracted-*.json`；`experts/.../eval/eval-customer-inputs*` | 旧抽取口径；脚本 `extract-udesk.ts` **仅可复用 parseMessages 技术**，产出不作现行金标 |

## 归档 / 废弃指针（冲突旧链路）

总表见：`experts/value-add/nonstandard-sop-guide/DEPRECATED.md`（已扩「全量真实抽样」节）。  
试点副本标记：`workspace/eval/cases/DEPRECATED-FOR-PILOT-F001.md`。

| 旧资产 | 状态 | 改去看 |
|--------|------|--------|
| `candidate_eval_cases.json`（agentic / workspace/eval） | deprecated | 本文件 + 抽样规则 V0.1 |
| `scripts/eval/extract_nonstandard_guidance_eval_cases.py` | deprecated-for-current-gold | 新抽样脚本（待建） |
| `ai/study/.../extract-udesk.ts` 产出 JSON | archived-as-tool-output | 仅解析参考；新样本落 `03_evaluation/datasets/` |
| `Agent测试集-V1.0.md` 全量用例 | out-of-scope-until-udesk-set | 待 Udesk 分层集落地后重对齐 |
| 群聊抽评测（vas/eval、群聊 xlsx） | excluded-as-eval-source | Udesk only |

## sop_gate 补齐（后续任务，本轮不切叶子）

链路：**Udesk 会话抽 VASC → 对齐事实表/接口 → 回填需求描述/背景 + sceneOverviewName + sop**。

探测结论见同目录 `VASC-SOP补齐链路探测.md`。
