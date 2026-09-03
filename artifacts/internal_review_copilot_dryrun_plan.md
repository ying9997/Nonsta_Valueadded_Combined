# 内部审核 Copilot 本地干跑流程

## 目标

用 2026-09-02 下单、状态为待审核、增值服务为 `入库其他服务需求` / `OW01V1602` 的增值单，验证内部审核 Copilot 的三段分流：

1. 需求描述不完整 → 输出应补充的信息，并可转成群内艾特客服/销售的话术。
2. 需求描述完整 → 判断是否属于当前已支持模板 F-001。
3. 命中 F-001 → 检查附件/字段是否齐全；齐全才进入 SOP 生成，否则输出缺失附件/字段。

## 本地命令

先刷新 OMS 共享认证 Cookie：

```powershell
# 在已有 OMS 工具目录执行登录脚本
cd D:\DA\AI_EXPERT\TOM\共享认证
# 按原有方式运行 auto_login.py
```

拉取 09/02 待审核 `OW01V1602` 单据：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
node internal-review-copilot/scripts/pull_ow01v1602_review_orders.mjs --date 2026-09-02 --status-desc 待审核 --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders --max-pages 5
```

本地 dry-run：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders\details.json --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_internal_review_dryrun
```

查看结果：

```powershell
Get-Content D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_internal_review_dryrun\summary.md
```

## 输出文件

| 文件 | 用途 |
| --- | --- |
| `_runs/20260902_ow01v1602_review_orders/details.json` | OMS 原始明细：列表、服务原子、附件、关联异常单 |
| `_runs/20260902_internal_review_dryrun/agent-inputs.json` | 已转换成 Agent 输入的样本 |
| `_runs/20260902_internal_review_dryrun/dryrun-results.json` | 每单分流结果、缺失项、追问项 |
| `_runs/20260902_internal_review_dryrun/summary.md` | 业务/产品可读摘要 |

## 现有知识库和文档怎么用

| 资产 | 是否可直接用 | 用在测试哪一步 | 说明 |
| --- | --- | --- | --- |
| `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md` | 可直接用 | F-001 场景规则、附件白名单、SOP 生成口径 | 当前 F-001 最关键的规则来源 |
| `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md` | 可直接用，但需标明模拟 | F-001 必填附件策略 | 业务正式勾选前，只能作为工程干跑规则 |
| `workspace/knowledge/cases/f001-inbound-relabel-shelving/rules.md` | 可用于评测解释，不建议直接喂运行时 | 判断追问是否有业务依据 | 适合给标注人看为什么追问“标签种类、对应关系、WI” |
| `workspace/knowledge/cases/f001-inbound-relabel-shelving/CASEBOOK.md` | 可用于人工复评和补金标 | 抽样看 badcase、补规则 | 是教材，不是自动评测金标 |
| `experts/value-add/nonstandard-sop-guide/prompts/inbound/main.md` | 可直接用 | SOP 生成 Prompt | 进入 `sop_generated` 后再用 |
| `experts/value-add/nonstandard-sop-guide/prompts/inbound/kb-sop-templates.md` | 可直接用 | SOP 模板参考 | 需要验证是否和案例库规则一致 |
| `experts/value-add/nonstandard-sop-guide/prompts/inbound/kb-template-index.md` | 谨慎使用 | 场景匹配参考 | 文件标了旧 38 场景废弃；当前只应把 F-001 当自动支持模板 |
| `experts/value-add/nonstandard-sop-guide/prompts/inbound/kb-field-requirements.md` | 不建议作为 F-001 权威 | 旧字段追问参考 | 文件标了废弃；F-001 应以 2.1 和模拟规则为准 |
| `workspace/product/reference-prds/PRD-AI增值指引侧栏助手.md` | 可参考 | 内外部产品边界、审核端展示 | 用于确认“AI 不替代审核” |

## 能不能 dry-run 通过后直接上飞书 Bot

不能只凭本地 dry-run 直接给业务正式试用。建议分三道门：

1. **工程门**：16 条样本本地 dry-run 无脚本错误，且每条都有明确分流原因。
2. **知识门**：抽样人工核对追问是否符合 `2.1-inbound-relabel-shelving.md` 和案例库规则；尤其看 F-001 识别、标签对应关系、上架 WI、附件判断。
3. **业务门**：业务/审核人员确认一小批输出：追问没有误伤、SOP 没编造、群内艾特对象正确。

飞书 Bot 可以先做“内部灰度试用”，但建议只开只读/建议模式：发群消息、给缺失项、给 SOP 草稿，不自动改 OMS、不自动审核通过。

## 当前已知限制

- `check-requirement` 现在是 dry-run 脚本里的本地启发式规则，还没有落成正式节点。
- 当前不调用真实 LLM；`sop_generated` 只表示通过前置门禁，不代表 SOP 文案质量已通过。
- 业务未正式确认五个附件中哪些必填，因此附件完整性仍按模拟规则执行。
- 实时拉数依赖 OMS 共享认证 Cookie；Cookie 过期时需先重新登录。
