# DEPRECATED — 旧多场景资产（试点冻结）

- 状态：`deprecated-for-pilot-f001`
- 生效：2026-08-28
- 决策：ABC 全废弃；试点只围绕 Top1「【入库】尺重/标签辨识后换标上架」（112条）重建
- 权威替代：`tests/pilot-f001/` + `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` + 知识库 §2.1
- 处理方式：保留文件供历史对照，**不得**再作为 F-001 试点规则/用例/匹配索引来源

---

## A. 旧 38 场景库内 KB（废弃）

| 路径 | 废弃理由 |
|------|----------|
| `prompts/inbound/kb-template-index.md` | 38 场景库内索引，无 Top1，路由全指向库内其他服务需求 |
| `prompts/inbound/kb-field-requirements.md` | 场景 1–23 字段规则，非 2.1 六必填 |
| `prompts/inbound/kb-sop-templates.md` | 场景 1–23 SOP 模板，无 2.1 客户确认摘要结构 |
| `nodes/match-template.ts` 内 `SCENARIO_INDEX` | 38 场景硬编码 |
| `nodes/check-completeness.ts` 内 `SCENARIO_FIELDS` | 场景 1–23 字段硬编码 |
| `deploy/coze-package/nodes/match-template.ts` | 上述副本 |
| `deploy/coze-package/nodes/check-completeness.ts` | 上述副本 |
| `deploy/coze-package/prompts/main.md` | 随旧 KB 绑定；试点改写前勿当权威 |

## B. 旧多场景测试 / eval / debug（废弃）

| 路径 | 废弃理由 | 例外 |
|------|----------|------|
| `tests/test-flow.ts` | 6 条库内场景 | — |
| `tests/test-10-cases-simple.json` | 10 条混多场景 | **case `VASC000000311247`（Top1）已抽到 `tests/pilot-f001/gold/VASC000000311247.json`** |
| `tests/test-10-cases-coze.json` | 同上 Coze 包装 | 同上 case 仅作历史 |
| `tests/test-10-cases-coze-input.md` | 配套说明 | — |
| `tests/test-10-cases-comparison.md` | 多场景对比模板 | — |
| `deploy/coze-package/test-cases.json` | 拍照/拆分等 smoke | — |
| `eval/eval-dryrun.ts` | 141 条多场景 match 基线 | — |
| `eval/eval-dryrun-report.md` | 同上报告 | — |
| `eval/eval-customer-inputs.ts` | 489 条 Udesk 分类 | — |
| `eval/eval-customer-inputs-report.md` | 同上报告 | — |
| `eval/eval-llm-pipeline.ts` | 非 Top1 专集 | — |
| `eval/eval-llm-pipeline-report.md` | 同上报告 | — |
| `debug/debug-node-by-node.md` | 基于场景 6 + 旧 case1 推演 | — |
| `debug/debug-coze-task.md` | 旧调试任务 | — |

## C. 旧规划 / 离线样本不同 taxonomy（废弃）

| 路径 | 废弃理由 |
|------|----------|
| `workspace/product/expert-plan/plan-nonstandard-sop-guide.md` | 早期 38 场景 + 库内 KB 规划 |
| `ai/agentic/outputs/nonstandard_guidance_eval_cases/candidate_eval_cases.json` | 路由 `2a/2b/2d`，无 `inbound_label_identify` |
| `ai/agentic/outputs/nonstandard_guidance_eval_cases/extraction_report.md` | 同上 |
| `workspace/eval/cases/candidate_eval_cases.json` | 上述副本 |
| `scripts/eval/extract_nonstandard_guidance_eval_cases.py` | 产出上述 taxonomy；试点不用 |
| `ai/agentic/extract_nonstandard_guidance_eval_cases.py` | 同上副本（若存在） |

## E. 试点外标记（非整份废弃）

| 路径 | 标记 |
|------|------|
| `agent-inventory-assist/03_evaluation/Agent测试集-V1.0.md` | `out-of-scope-pilot-f001`：全量保留供日后全场景评测；**试点只允许引用 B-001 作合成种子，其余用例本轮不跑** |

## F. 与「全量真实 Udesk 分层抽样」共识冲突的旧链路（2026-08-29）

权威入口：`agent-inventory-assist/03_evaluation/EVAL-AUTHORITY.md`  
抽样规则：`agent-inventory-assist/03_evaluation/抽样规则草稿-真实客服会话-V0.1.md`

| 路径 | 冲突点 | 处理 |
|------|--------|------|
| `workspace/data/raw/飞书群聊_*.xlsx` 及待整理群聊 xlsx | 今天共识：**排除内部群聊**作评测主源 | 保留生数据；**禁止**当现行评测抽样池 |
| `ai/agentic/qa-gen_base.csv` + `outputs/nonstandard_guidance_eval_cases/` | 非完整客服多轮；旧 taxonomy | 仅历史候选；不作金标 |
| `workspace/eval/cases/*`（含 candidate） | 旧候选/群聊抽评测残留 | 已有 `DEPRECATED-FOR-PILOT-F001.md`；全量真实抽样不以本目录为准 |
| `workspace/eval/queue-regression/data/extracted-*.json` | 旧 `extract-udesk.ts` 产出 | 见 `queue-regression/DEPRECATED.md`；新样本写入 `03_evaluation/datasets/` |
| `ai/study/.../extract-udesk.ts` | 旧评测抽取脚本 | **可复用 `parseMessages`**；产出路径不作权威 |
| `experts/.../eval/eval-customer-inputs*` | 489 条旧分类 | deprecated；亦非新分层集 |
| `Agent测试集-V1.0.md` 默认「跑全量」 | 与「先 Udesk 分层再建全量」冲突 | 以 EVAL-AUTHORITY 为准 |

---

## 试点 / 现行权威清单（勿废弃）

- `tests/pilot-f001/` — 最小 4 条用例（规则门禁干跑）
- `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md`
- `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` §2.1
- `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md`
- `agent-inventory-assist/03_evaluation/抽样规则草稿-真实客服会话-V0.1.md`
- `agent-inventory-assist/03_evaluation/EVAL-AUTHORITY.md`
- `agent-inventory-assist/03_evaluation/VASC-SOP补齐链路探测.md`
- `workspace/data/raw/data_udesk_log_database_增值.csv` — 全量真实抽样主源
- `workspace/experiments/nonstandard-submission-guide/01-business-reference/value-add-nonstandard-submission-guide.md`
- `agent-inventory-assist/03_evaluation/非标增值生成Agent完整评测链路图-V1.0.md`（框架；口径以 2.1 / 抽样规则为准）
