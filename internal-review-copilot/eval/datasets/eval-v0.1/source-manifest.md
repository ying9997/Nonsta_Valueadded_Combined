# Eval v0.1 source-manifest

正式产物不含真实客户名、邮箱、手机、地址、公司名、真实单号。映射：`_tmp/20260902_ab_datasource_probe/id_mapping.json`。

| 源 | 路径 | 含 PII | 本集用法 |
|----|------|--------|----------|
| Udesk CSV | `workspace/data/raw/data_udesk_log_database_增值.csv` | 是 | 抽会话切点后**脱敏**进 derived |
| 飞书群聊 | `workspace/data/raw/飞书群聊_非标增值讨论_20260421-20260801.xlsx` | 是 | 只作探测；本 jsonl 未直接贴群聊原文 |
| F-001 OMS 事实 | `_runs/20260901_oms_facts/` | 是（下单人邮箱等） | 1 条 F-001 gold，输入已改写 |
| A extras | `_runs/20260901_oms_eb_expand/extras_details.json` | 是 | 未入 jsonl（未按 §2.5 核验） |
| 16 条待审核 | `_runs/20260902_internal_review_dryrun_after_requirement_source_fix/` | 业务正文 | 3 条 shadow |
| §2.5 / §2.7 | `workspace/knowledge/sop/非标增值单审核SOP知识库-新版.md` | 否（示例 EB 已换假号） | A/B 正例 derived |
| 2.1 | `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` | 否 | L3 声称已上传 |
| evidence | `internal-review-copilot/knowledge/scenario-evidence/` | 无客户 PII | 边界规则 |
| 脱敏草稿 | `_tmp/20260902_ab_datasource_probe/` | 仍可能残留 URL，**不要复制进正式集** | 切点依据 |

关联键（脱敏后仍一致）：同一 candidate 内 `EB_*` / `WI_*` / `VASC_*` 相同。Udesk `对话ID` 只出现在 tmp 映射。
