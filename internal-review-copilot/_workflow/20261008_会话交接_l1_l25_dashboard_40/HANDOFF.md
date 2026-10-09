# HANDOFF

## 给新会话的背景

本 handoff 恢复自 Codex 任务 `01a11983-1623-7ef0-bda4-49295272c684`（标题：`对比本机与40服务器workflow`）。该任务经历过一次 `contextCompaction`，原始上下文被压缩，但任务历史仍可读取。

本轮工作实际覆盖三条线：

1. 本机 `internal-review-copilot` 与 40 服务器 workflow 差异探测。
2. 40 上 A+B 误部署后的回滚，以及后续部署门禁固化。
3. 审核质量 dashboard 修复与 L1/L2.5 节点只读复盘。

用户明确要求：后续所有本机改动必须先做本机 unit / integration / E2E，并产出报告给用户人工查验；只有用户明确点名授权后，才允许部署 40。

## 已完成的产物

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\AGENTS.md`
  - 已写入 40 部署红线：部署 40 前必须先过本机 unit / integration / E2E，出验证报告给用户查验，并获得明确授权；覆盖现网代码前必须先跑 `40-snapshot-code.sh`。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\dashboard\refresh-from-40.ps1`
  - 新增本机看板刷新脚本：从 40 只读拉取 `eval/ai-human-comparison.jsonl`，重建 `dashboard/data.js`，再跑 dashboard 校验。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\dashboard\build-data.mjs`
  - 已改为优先选最新 `aiWriteTime` 的数据源，避免继续吃旧的 26 条快照。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\dashboard\打开质量看板.bat`
  - 已接入打开前刷新 40 当前数据；刷新失败时继续使用本机缓存。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\dashboard\app.js`
  - 已修复时间窗展示：按钮显示命中数，例如 `近 7 天 (13)` / `全部 (116)`。
  - 已修复数据参照日：按数据里的最新写入日计算窗口，避免历史快照默认筛空。
  - 已修复“按场景”表展示：展示完整 `【业务段】场景名称`，例如 `【库内】箱转单一`。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\dashboard\check-logic.mjs`
  - 已从旧固定断言改为动态统计自洽断言，并新增跨日期合成样本验证 `7d / 30d / all` 会分开。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20261008_l1_l25_readonly\l1-l25-readonly-report.md`
  - L1 / L2.5 只读复盘报告。数据源来自 40，只读拉取 `case-store.json`、`poll.log`、`listen.log`、`ai-human-comparison.jsonl`。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20261008_l1_l25_readonly\l1-l25-readonly-details.json`
  - L1 / L2.5 明细数据，供后续筛选样本。

## 当前状态

- 40 状态：
  - 曾因 A+B 未经人工查验被部署到 40，随后已按用户要求立即回滚。
  - 回滚到部署前 snapshot：`irc-code-20261008_144406.tgz`。
  - 回滚前状态另存：`irc-code-before-rollback-20261008_144948.tgz`。
  - 历史任务中已确认 `vas-internal-review-poll` / `vas-internal-review-listen` 都是 `active`。
  - 历史任务中已确认 40 当前代码里没有 A+B 的 `knownFactLines` / L2.5 `needs_field_clarification` 路由补丁痕迹。

- 本机 vs 40 workflow：
  - 历史探测范围：`lib/`、`scripts/`、`knowledge/`、`prompts/`、`docs/`、`config/`、`deploy/`，以及根部运行文件。
  - 结论：源码/脚本无真实功能差异；4 个 hash 差异 normalize 换行后完全一致。
  - 有意义差异在运行时 env，不是 workflow 文件：40 有线上 LLM fallback / TOM 自动登录相关配置；本机有 Feishu 测试相关配置。

- dashboard：
  - 本机刷新脚本已能拉到 40 当前 `eval/ai-human-comparison.jsonl`。
  - 历史验证结果：40 对照数据当时为 116 条，覆盖 `2026-09-16 ~ 2026-10-08`；近 7 天 13 条，近 30 天 116 条，全部 116 条。
  - 用户已要求 dashboard “按场景”显示完整 `【业务段】场景名称`，该点已改。

- L1 / L2.5 只读复盘：
  - case-store 单数：255。
  - AI/人工对照：118 条，覆盖 `2026-09-16 ~ 2026-10-08`。
  - 对照里场景认错：51 条。
  - `probable_L2_5_missing_info`: 34。
  - `L2_5_misrouted_to_L1_card`: 32。
  - `L2_5_field_card`: 13。
  - `reply_received` 且疑似回流未闭环：7 条。

## 当前卡点或待确认项

- 当前最大待确认项：下一步到底先修哪一类问题。
  - 报告建议顺序是：先讨论/修复 `L2_5_misrouted_to_L1_card`，再抽样验证 context/tool facts，再单独处理 `reply_received` 回流状态机，再处理 L2 场景识别。

- `reply_received + reassess_missing_detail` 是状态机/详情缓存问题，不能混进 prompt 或 L2.5 卡片文案修复里。

- `context/tool facts` 只能作为候选方向，不能直接假设 OMS 字段、商品明细、附件文件名一定能补足缺失项；需要抽样核验。

- 当前 git worktree 很脏，且包含大量历史/其他项目变更。不要做 `git add -A`，不要回滚用户或历史改动。改动必须显式列路径。

## 下一步计划建议

1. 先读：
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\AGENTS.md`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\README.md`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\CHANGELOG.md`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20261008_l1_l25_readonly\l1-l25-readonly-report.md`

2. 如果继续工程修复，优先做一个低风险本机改动：把 L2.5 缺资料输出从 L1 的 `needs_requirement_clarification` 文案/路由中分出来，确保卡片和状态明确表达“场景字段缺失”，而不是“客户需求描述不完整”。

3. 修 L2.5 路由/卡片前，先定位这些文件：
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\lib\run-pipeline.ts`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\lib\check-scene-completeness.ts`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\lib\feishu-card.ts`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\lib\format-output.ts`
   - `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\lib\types.ts`
   - 相关测试脚本：`scripts/test-g2-pipeline.ts`、`scripts/test-outbound-wo-and-cards.ts`、`scripts/test-feishu-card.ts`（是否存在需实际确认）

4. 本机验证必须按 AGENTS 规则执行：
   - unit：相关 node/ts 测试。
   - integration：本机 pipeline 或卡片生成链路。
   - E2E：能跑的本机真实页面/脚本验证。
   - 产出验证报告给用户人工查验。

5. 未经用户明确点名授权，不得部署 40，不得发飞书卡，不得触发线上 pipeline 重评，不得写 OMS。

## 踩过的坑，绝对不要再踩

- 不要在用户人工查验本机效果前部署 40。这个坑已经踩过一次，用户明确纠正过。

- 不要把 L1、L2.5、回流状态机、L2 场景识别混成一个问题。它们的根因和验证方式不同。

- 不要把 `reply_received` 卡住的问题当成 prompt 问题直接改 prompt；优先查状态机/详情缓存。

- 不要看到 dashboard 时间窗数量一样就判断按钮失效；先看数据覆盖日期。如果全部数据都在近 30 天，近 30 天和全部相同是正常的。

- 不要把 dashboard “按场景”截成短场景名；用户明确要求显示完整 `【业务段】场景名称`。

- 不要用 `git add -A`；本仓库和父 workspace 都非常脏，必须显式列路径。

- 不要把 `_runs/`、`logs/`、`node_modules/`、认证截图或 Cookie 提交进仓。

## 快速恢复上下文命令

```powershell
Set-Location 'D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot'

Get-Content -Raw -Encoding UTF8 '.\AGENTS.md'
Get-Content -Raw -Encoding UTF8 '.\_runs\20261008_l1_l25_readonly\l1-l25-readonly-report.md'
Get-Content -Raw -Encoding UTF8 '.\dashboard\refresh-from-40.ps1'
Get-Content -Raw -Encoding UTF8 '.\dashboard\build-data.mjs'
Get-Content -Raw -Encoding UTF8 '.\dashboard\app.js'
Get-Content -Raw -Encoding UTF8 '.\dashboard\check-logic.mjs'

git status --short -- AGENTS.md dashboard _runs/20261008_l1_l25_readonly
```

可选只读刷新 dashboard 当前数据：

```powershell
powershell -ExecutionPolicy Bypass -File '.\dashboard\refresh-from-40.ps1'
node '.\dashboard\check-logic.mjs'
```

## 给新会话的执行建议

先把本 handoff 当作恢复索引，不要直接部署或发卡。下一步若用户说“继续改”，优先从 `L2_5_misrouted_to_L1_card` 做小范围本机修复，并在改前读相关源码与测试；若用户说“先分析”，优先从 `l1-l25-readonly-details.json` 抽 5~10 个 context/tool facts 候选单，做只读核验报告。

所有结论都要区分：已验证事实、报告推断、待抽样确认。

## 2026-10-08 续接后补充

已继续做了一个本机小修：

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\lib\feishu-card.ts`
  - L2.5 `needs_field_clarification` 卡片标题改为“资料待补充”，正文改为“以下场景资料需要补充”，@ 销售/客服话术改为“补充以上资料”。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\scripts\test-g2-pipeline.ts`
  - 增加 `check-completeness -> needs_field_clarification` 路由断言。

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\scripts\test-feishu-card.ts`
  - 增加 L2.5 卡片不使用 L1 “客户需求描述不够完整”文案的断言。

验证报告：

- `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20261008_l25_route_card_verify\verification-report.md`

已通过：

- `npx tsx scripts/test-feishu-card.ts`
- `npx tsx scripts/test-g2-pipeline.ts`
- `node dashboard/check-logic.mjs`
- `npx tsx scripts/test-outbound-wo-and-cards.ts`

仍未执行：未部署 40，未发飞书卡，未触发线上 pipeline 重评，未写 OMS。
