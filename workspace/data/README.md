# workspace/data

原始数据、候选样本和清洗结果。

适合放飞书群聊、客服会话、真实对话候选、抽取中间结果等。评测用例和验收报告放 `workspace/eval/`。F-001 试点金标在 `experts/value-add/nonstandard-sop-guide/tests/pilot-f001/`。

## 评测生数据（`raw/`）

大数据留在本目录，不整包塞进 `agent-inventory-assist/03_evaluation/`。

| 文件 | 体量（约） | 用途 | 仓内状态 |
|---|---|---|---|
| `../../ai/agentic/qa-gen_base.csv` | 23 MB | 主抽取源（`scripts/eval/extract_nonstandard_guidance_eval_cases.py`） | 已入库 |
| `raw/data_udesk_log_database_增值.csv` | 4.4 MB | 客服会话抽取（`ai/study/.../extract-udesk.ts` → 489 条派生） | **2026-08-29 从 `D:\DA\待整理\value_added_realted\` 迁入**；旧脚本路径 `D:\DA\AI_EXPERT\_workflow\...\data_udesk_log_database_增值.csv` 已失效 |
| `raw/全量_增值单接口口径事实补齐.xlsx` | 1.2 MB | 接口口径 / Top1「112条」口径来源 | 已在本目录；`.gitignore` 排除（含接口事实），未入库 |
| `raw/飞书群聊_非标增值讨论_20260421-20260801.xlsx` | 1 MB | 早期群聊抽评测 | 已入库（与待整理「无图片本地路径」副本同哈希） |

不迁入：

- `D:\DA\outputs\value_added_related_probe\`（含 ~72 MB ndjson）：历史探针，不宜当权威。其中 `全量_增值单接口口径事实补齐.xlsx` 与本目录同哈希。
- `D:\DA\vas_OW01V1602_20260701_20260731_with_scene.csv`：旧 141 条干跑源，全盘未找到；`eval/eval-dryrun.ts` 已对 F-001 废弃。
- `D:\DA\待整理\value_added_realted\两个群_*_任一艾特命中.xlsx`：带图变体；评测用无图副本已在 `raw/`。

