# internal-review-copilot

内部审核 Copilot 的本地验证与灰度准备目录。

本目录只放内部审核链路相关脚本、测试说明和后续 Bot 灰度适配代码。不要把这些文件放进 `experts/value-add/nonstandard-sop-guide/`，后者是线上外部客服 Expert 包。

## 边界

| 目录 | 用途 |
| --- | --- |
| `scripts/` | OMS 待审核单拉取、Agent 输入转换、本地 dry-run |
| `knowledge/` | 内部口径映射（权威原文仍在 `workspace/knowledge/sop/`，此处不复制模板） |
| `knowledge/scenario-cards/` | 场景卡 JSON。已有 6 张人工卡不覆盖；其余由 `scripts/build-scene-cards-batch.ts` 从 SOP 知识库批量生成（`status=supported`，附件规则 `auto_generated`）。`loadScenarioCards()` 会加载目录下全部 JSON |
| `knowledge/scenario-evidence/` | OMS 场景概述码–名表。由 `../scripts/oms/pull_scene_overview_code_map.py` 从入库+库内+出库三张详情下拉合并生成 |
| `eval/` | 人工评测清单、match-template v0.2 smoke cases（不是金标） |
| `bot/` | 后续飞书 Bot 只读建议模式适配 |

## 异常名称查询

`lib/exception-lookup.ts` 会按异常单号实时查 OMS（`UnusualEventOrderService_findUnusualEventOrderPage`），查不到再回退硬编码表。进程内缓存，OMS 请求间隔 500ms。探测：

```powershell
npx tsx internal-review-copilot/scripts/probe-event-order-api.ts --eb EB0126090932893980
```

飞书卡片底部有 **AI 判断依据**（最多 5 行）。写入 OMS 时，若「上架入库单号」为空，会从需求文本提取 WI 自动填入（不覆盖已有值）。

## 本地 dry-run 链路

内部审核代码只放在本目录。线上 Expert 包仅做兼容引用（当前只引用 `validate-input`）。

```
validate-input → context-bind → check-requirement → match-template → check-completeness → format-output
```

| 节点 | 位置 | 规则 |
| --- | --- | --- |
| `validate-input` | 兼容引用 Expert 包 | 基础入参 / 兜底原子校验 |
| `context-bind` | `lib/context-bind.ts` | 绑定 OMS 已有 EB/WI/仓/附件，已有事实不再追问 |
| `check-requirement` | `lib/check-requirement.ts` | pre-match 最低可路由门；权威见《非标增值服务SOP模板 及 填写示例》，映射见 `knowledge/requirement-completeness.md` |
| `match-template` | `lib/match-template.ts` | **v0.2**：Load Scenario Cards → deterministic score → merge → rank → select。只自动放行 `status=supported` 且 `decision=supported` 的 F-001。A/B 可进 topK，不进 `check-completeness`。当前是关键词/结构打分，**不是**真向量 RAG；SOP KB / casebook / reranker 端口已留空 |
| `check-completeness` | `lib/check-completeness.ts` | 仅 F-001 自动支持后查附件；A/B 附件策略 pending，不走正式校验 |
| `format-output` | `lib/format-output.ts` | 缺需求 → `needs_requirement_clarification`；缺附件/字段 → `needs_field_clarification`；齐全 → `sop_generated`。`llmGeneratedText` 来自真实 LiteLLM；失败降级 `transfer_human` + `llmError` |

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/test-match-template-v02.ts
npx tsx internal-review-copilot/scripts/build-scene-cards-batch.ts --install
# 不加 --install 只写到 _runs/YYYYMMDD_batch_scene_cards，不覆盖 knowledge/scenario-cards
# 已有 6 张人工卡永远不覆盖。LLM 场景分类改为规则 top 10 候选（方案 B）
# 只重配 OMS 码（不跑 LLM）：入库/库内/出库同类别匹配，禁止跨类型
npx tsx internal-review-copilot/scripts/build-scene-cards-batch.ts --remap-oms --install
# 按 OMS SUBMIT 统计附件/字段必填（先看报告，再 --apply）
# 默认会叠加 _oms_files/files.csv（真实上传文件）；旧 attrs 空槽报告在 _runs/20260911_attachment_stats/
npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts
npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts --out _runs/20260911_attachment_stats/from-files --files _runs/20260911_attachment_stats/_oms_files/files.csv
npx tsx internal-review-copilot/scripts/update-cards-attachment.ts --dry-run
npx tsx internal-review-copilot/scripts/update-cards-attachment.ts --apply
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <_runs/YYYYMMDD_internal_review_dryrun>
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <_runs/YYYYMMDD_internal_review_llm> --order VASC000000348477
npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once --input <details.json> --skip-feishu
npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "先补对应关系"
npx tsx internal-review-copilot/scripts/feishu-login.ts
npx tsx internal-review-copilot/scripts/test-feishu-bot.ts
```

凭证只放 `.env`（`LITELLM_*` / `FEISHU_*`）。LLM 失败降级为 `transfer_human` + `llmError`，不中断批次。确定性分流看 `ruleOutputPath`。试点手册见 `docs/pilot-runbook.md`。

## OMS 草稿写入（不自动审核通过）

`lib/oms-draft-write.ts` 的 `writeDraft` 按字段拆开写：操作 SOP 只写步骤，需求描述 / 需求背景各自追加 `【AI总结】`（不覆盖原文）：

```
操作SOP        = 【操作步骤】
需求描述       = {客户原文} + 【AI总结】{需求描述}
需求背景(BEOR) = {客户原文} + 【AI总结】{需求背景}
```

- 原文一个字不改；空总结不追加空的 `【AI总结】`
- 禁止调用 `vaOrderReview`
- 真写需 `OMS_WRITE_ENABLED=1` 且单号在 `OMS_WRITE_ALLOWLIST`（`*` 表示不限制单号）
- 飞书卡片按业务段 @审核员：入库 @耿文文，库内 @何静；L4/L2 额外 CC @李颖。人员见 `config/personnel.json`（open_id 必须是增值咨询 Bot 视角，不能用别的飞书应用查到的 ID）
- 正式轮询：`npx tsx internal-review-copilot/scripts/start-live.ts --out _runs/YYYYMMDD_live_poll --interval 600`。首次评估走 `sceneLlm=true` / `sceneLlmVersion=2`；`RAG_ENABLED=0`。只处理 `OW01V1602` / `OSF6V1603` / `OSF6V1841`。审核员点按钮后才写 OMS
- SOP 生成必须产出 AI 总结的 `requirementDescription` / `requirementBackground`，不得复制客户原文

## 飞书卡片出口

四个出口卡片都带 L1 已识别的两段总结：【AI 总结 - 需求描述】【AI 总结 - 需求背景】。绿卡额外再带【操作步骤】。

首次发卡会新建话题，标题为 `{VASC号} 增值单-智能审核请关注`，不要往旧话题里续发。同一单后续修订仍回该单自己的话题。

| 出口 | 卡片 | 颜色 | 话题名 |
|------|------|------|--------|
| L1 需求不全 | `buildRequirementClarificationCard` | 红色 ❓ | `{VASC号} 增值单-智能审核请关注` |
| L2 场景不确定 | `buildSceneConfirmCard` | 蓝色 🔄 | `{VASC号} 增值单-智能审核请关注` |
| L3 缺附件 | `buildClarificationCard` | 橙色 ⚠ | `{VASC号} 增值单-智能审核请关注` |
| L4 SOP | `buildSopCard` | 绿色 ✅ | `{VASC号} 增值单-智能审核请关注` |

对照四张演示卡（各开新话题）：

```powershell
npx tsx internal-review-copilot/scripts/send-exit-cards.ts
```

## SOP 需修改闭环

点绿色卡片「SOP 需要修改」后：状态变为 `sop_editing`。审核员在同一话题直接回复（不必艾特）。**监听常驻**：每约 12 秒拉话题，收到意见后先发「正在改写」并流式更新，改完再发「修订版」绿卡。点确认才写入 OMS。最多改 3 次。常驻 listen 已含话题轮询，不要同时再跑 `poll-and-assess`，以免重复改写。

```powershell
npx tsx internal-review-copilot/scripts/listen-card-actions.ts --store _runs/20260909_demo_e2e/card-test/case-store.json --input _runs/20260909_demo_e2e/card-test/listen-inputs.json --personnel _runs/20260909_demo_e2e/demo-personnel.json --out _runs/20260909_demo_e2e/card-test --seed-sop-card --order VASC000000360654
```

match-template v0.2 决策（详见 `lib/match-template.ts`）：

```powershell
npx tsx internal-review-copilot/scripts/test-oms-draft-write.ts --order VASC000000360654 --from-store
```

match-template v0.2 决策（详见 `lib/match-template.ts`）：

- 不能仅凭 `OW01V1602` / 「入库其他服务需求」命中任一场景。
- **订单类型过滤**：优先读增值单 `listHeader.businessTypeDesc`（入库订单 / 库内订单 / 出库订单），没有描述再用 `businessType`（`INBOUND` / `INHOUSE` / `OUTBOUND`）。有类型时，只给同类场景卡打分；没有类型时，正文没有「库内 / 在库 / 货权转移…」则库内卡不参与。不要靠正文猜订单类型，也不要只看 `vaSource`（异常单仍可能是入库订单）。
- 「拦截不上架 / 先放一边 / 暂存不上架」不命中 F-001，也不命中 B（除非同时有明确拍照要求）。
- Top1 高且 Top1−Top2 差距明显 → `decision=supported`；仅 F-001 会把旧字段 `supported=true` 并进入附件门。
- 无候选达阈值 → `unsupported`；Top1/Top2 接近（含 F-001 vs A）→ `ambiguous`，`supported=false`，转人工。
- A/B 是 candidate/pending，附件不得写成正式必填。

## 案例库 RAG（最小 BM25）

场景分类默认会从 `knowledge/case-library/inbound-cases.jsonl` 取最多 3 条相似历史单，塞进 LLM 提示词（相似度 < 1.0 不塞；整段约 500 字）。库内文件目前是空壳。**默认关闭**：`.env` 里 `RAG_ENABLED=0`；要打开设 `RAG_ENABLED=1`。

```powershell
npx tsx internal-review-copilot/scripts/build-case-library.ts --max-per-scene 3
npx tsx internal-review-copilot/scripts/run-ab-eval.ts --rag-on --out _runs/20260911_rag_ab
npx tsx internal-review-copilot/scripts/run-cards-rag-abcd.ts --out _runs/20260911_abcd_eval
```

## 40 常驻（172.16.3.40）

目录：`~/.agents/services/internal-review-copilot/`。tmux：`irc-poll`（每 10 分钟轮询）+ `irc-listen`（卡片按钮）。正式群 `FEISHU_TEST_CHAT_ID`。Cookie 沿用 `/home/winit/AI_EXPERT/TOM/共享认证/`。cron 每 10 分钟无头续期（`python3 auto_login.py`）。

```bash
ssh winit@172.16.3.40 "tmux ls"
ssh winit@172.16.3.40 "tail -50 ~/.agents/services/internal-review-copilot/logs/poll.log"
ssh winit@172.16.3.40 -t "tmux attach -t irc-poll"   # Ctrl+B D 退出，不杀进程
ssh winit@172.16.3.40 "python3 /home/winit/AI_EXPERT/TOM/共享认证/auto_login.py"
# Cookie 刷新后下一轮自动读；登录超时也会自动续一次
```

`validate-input.ts` 在 40 上放在 `~/.agents/services/experts/value-add/nonstandard-sop-guide/nodes/`（pipeline 相对引用）。不要改 40 上其它 systemd / 现有 Bot。

Cookie 每 10 分钟由 cron 无头续期：`cd /home/winit/AI_EXPERT/TOM/共享认证 && python3 auto_login.py`。登录超时也会在 poll 里自动续一次。

## 依赖关系

内部审核 Copilot 可以读取线上 Expert 包里的规则节点和 Prompt 做兼容测试，但不能把内部审核逻辑写进线上 Expert 包。

允许引用：

- `experts/value-add/nonstandard-sop-guide/nodes/`
- `experts/value-add/nonstandard-sop-guide/prompts/inbound/`
- `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md`
- `workspace/knowledge/cases/f001-inbound-relabel-shelving/`
- `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md`

