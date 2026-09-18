# internal-review-copilot

内部审核 Copilot 的本地验证与灰度准备目录。

本目录只放内部审核链路相关脚本、测试说明和后续 Bot 灰度适配代码。不要把这些文件放进 `experts/value-add/nonstandard-sop-guide/`，后者是线上外部客服 Expert 包。

## 边界

| 目录 | 用途 |
| --- | --- |
| `scripts/` | OMS 待审核单拉取、Agent 输入转换、本地 dry-run |
| `knowledge/` | 内部口径映射（权威原文仍在 `workspace/knowledge/sop/`，此处不复制模板） |
| `knowledge/scenario-cards/` | 场景卡 JSON。已有 6 张人工卡不覆盖；其余由 `scripts/build-scene-cards-batch.ts` 从 SOP 知识库批量生成（`status=supported`，附件规则 `auto_generated`）。`loadScenarioCards()` 加载目录下 JSON，**排除** `retired_dedicated_atom`（独立标准/免审原子，不走场景概述）。例外：`instock_ownership_transfer` 已按 OMS 概述码 `【In-warehouse】Transfer of ownership of goods` 接回，给「库内其他服务需求」用，不是独立原子货权转移 |
| `knowledge/scenario-evidence/` | OMS 场景概述码–名表。由 `../scripts/oms/pull_scene_overview_code_map.py` 从入库+库内+出库三张详情下拉合并生成 |
| `eval/` | 人工评测清单、match-template v0.2 smoke cases（不是金标） |
| `bot/` | 后续飞书 Bot 只读建议模式适配 |

## 异常名称查询

`lib/exception-lookup.ts` 会按异常单号实时查 OMS（`UnusualEventOrderService_findUnusualEventOrderPage`），查不到再回退硬编码表。进程内缓存，OMS 请求间隔 500ms。探测：

```powershell
npx tsx internal-review-copilot/scripts/probe-event-order-api.ts --eb EB0126090932893980
```

飞书卡片底部有 **AI 判断依据**（最多 5 行）。写入 OMS 时，若「上架入库单号」为空，只填仓库要扫上去的那一张 WI（有原单+新单时只填新单，不把两个都填进去）。不覆盖已有值。

## 跨入库单 SKU 校验（H11）

拦截 / 换标类场景（含 OMS「上架前拦截」`202507021814`）若同时出现原单 + 新单两个 WI，L4 出 SOP 前会自动比对两边 SKU。

- 一致：不额外提醒
- 不一致 / 部分一致 / 查不到：飞书卡片给审核员看「【提示：本单AI识别到……请审核人员关注】」，**不写进仓库 SOP**

本地探测：

```powershell
npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts
npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts --live
npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts --pipeline
# 连 LLM 确认仓库 SOP 不再写 SKU 核对步骤：
npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts --pipeline --llm
```

SKU 列表优先用异常单 events；没有则查 DWS `bi_dw.base_whs_inbound_merchandise_f`（需本机 `WINIT_DATA_MCP_TOKEN` 或 `~/.secrets/winit-data-mcp.env`）。

## T1 补贴包裹标：单/多 SKU 校验

场景 `inbound_package_barcode_batch_relabel`（【入库】包裹条码批量异常辨识后补贴包裹标签上架）在 L2.5 前查上架入库单商品码（`merchandise_serno`，去 `-10` / `-10X` 这类后缀）：

- **一个 SKU**（去后缀后相同，例如 `M010000000013991941-10` 与 `M010000000013991941`）：不再追问对应关系，直接生成 SOP
- **客户写一个/同一个 SKU，但去后缀后仍是多个**：橙卡请销售/客服核对是否填错，打回客户重新提交
- **多个 SKU**：必须提供辨识方法 / SKU 与入库单对应关系

查不到商品码或超时：跳过本校验，不卡住。

```powershell
npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts
npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts --live
```

## 本地 dry-run 链路

内部审核代码只放在本目录。线上 Expert 包仅做兼容引用（当前只引用 `validate-input`）。

```
validate-input → context-bind → check-requirement(L1 极简兜底) → match-template → sku-consistency-check(H11) → t1-sku-relabel-check(T1 商品码) → check-scene-completeness(L2.5 需求+附件) → format-output
```

| 节点 | 位置 | 规则 |
| --- | --- | --- |
| `validate-input` | 兼容引用 Expert 包 | 基础入参 / 兜底原子校验 |
| `context-bind` | `lib/context-bind.ts` | 绑定 OMS 已有 EB/WI/仓/附件，已有事实不再追问 |
| `check-requirement` | `lib/check-requirement.ts` | L1 极简兜底：只拦空白/过短需求。三要素正则仍提取给 trace，**不阻断** |
| `match-template` | `lib/match-template.ts` | **v0.2**：Load Scenario Cards → deterministic score → merge → rank → select。只自动放行 `status=supported` 且 `decision=supported`。A/B 可进 topK。当前是关键词/结构打分，**不是**真向量 RAG |
| `check-scene-completeness` | `lib/check-scene-completeness.ts` | L2.5：场景卡 `requiredInfoFields` 用 LLM 做语义完整性；已上传附件、单据仓库/EB/WI/文件名会进 prompt，允许从正文和单据信息推断。附件仍走规则（复用 `check-completeness.ts`） |
| `sku-consistency-check` | `lib/sku-consistency-check.ts` | H11：拦截/换标且有新旧 WI 时比对 SKU；不一致在飞书卡提示审核员，不写进仓库 SOP。查不到不阻断 |
| `t1-sku-relabel-check` | `lib/t1-sku-relabel-check.ts` | T1 补贴包裹标：按入库单商品码去后缀数 SKU。同一 SKU 直接生成；客户写一个 SKU 但去后缀后仍多个 → 打回销售客服；多个 SKU 必须辨识方法/对应关系。查不到不阻断 |
| `format-output` | `lib/format-output.ts` | 空白需求 → `needs_requirement_clarification`；场景已识别但缺信息/附件 → `needs_field_clarification`（一次追问）；齐全 → `sop_generated`。SOP 生成失败时 **不改** `outputPath`，用 `failureGate=llm-generate-sop` 区分 |

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/test-match-template-v02.ts
npx tsx internal-review-copilot/scripts/build-scene-cards-batch.ts --install
# 不加 --install 只写到 _runs/YYYYMMDD_batch_scene_cards，不覆盖 knowledge/scenario-cards
# 已有 6 张人工卡永远不覆盖。LLM 场景分类改为规则 top 15 候选（方案 B；原 top 10）
# 只重配 OMS 码（不跑 LLM）：入库/库内/出库同类别匹配，禁止跨类型
npx tsx internal-review-copilot/scripts/build-scene-cards-batch.ts --remap-oms --install
# 按 OMS SUBMIT 统计附件/字段必填（先看报告，再 --apply）
# 默认会叠加 _oms_files/files.csv（真实上传文件）；旧 attrs 空槽报告在 _runs/20260911_attachment_stats/
npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts
npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts --out _runs/20260911_attachment_stats/from-files --files _runs/20260911_attachment_stats/_oms_files/files.csv
# L2.5 过严修复后的附件重跑 + 已审单跑批（不发飞书）
npx tsx internal-review-copilot/scripts/batch-attachment-stats.ts --out _runs/20260915_attachment_restat
npx tsx internal-review-copilot/scripts/apply-l25-restat.ts --apply
npx tsx internal-review-copilot/scripts/sample-pass-test.ts
npx tsx internal-review-copilot/scripts/run-historical-batch.ts --input _runs/20260915_pass_test/details.json --pilot-file _runs/20260915_pass_test/test-set.json --skip-feishu --first-round-only --out _runs/20260915_pass_test/results
npx tsx internal-review-copilot/scripts/write-pass-test-report.ts
# L2 方案 B 后同一批 40（RAG 仍关；B 类开 RAG 未 ≥3 条变好）
npx tsx internal-review-copilot/scripts/run-historical-batch.ts --input _runs/20260915_pass_test/details.json --pilot-file _runs/20260915_pass_test/test-set.json --skip-feishu --first-round-only --out _runs/20260915_pass_test_v2
npx tsx internal-review-copilot/scripts/write-pass-test-report.ts --set _runs/20260915_pass_test --results _runs/20260915_pass_test_v2
# L2.5 + B 类后同一批 40 → v3
npx tsx internal-review-copilot/scripts/run-historical-batch.ts --input _runs/20260915_pass_test/details.json --pilot-file _runs/20260915_pass_test/test-set.json --skip-feishu --first-round-only --out _runs/20260915_pass_test_v3
npx tsx internal-review-copilot/scripts/write-pass-test-report.ts --set _runs/20260915_pass_test --results _runs/20260915_pass_test_v3
# 各场景需求关键信息（只出报告，不改场景卡）
npx tsx internal-review-copilot/scripts/extract-scene-requirement-fields.ts
# 把 G-1 必填字段写入仍生效的场景卡（样本≥5；跳过已下线独立原子；先 --dry-run）
npx tsx internal-review-copilot/scripts/apply-requirement-fields.ts --dry-run
npx tsx internal-review-copilot/scripts/apply-requirement-fields.ts
npx tsx internal-review-copilot/scripts/test-jsonish.ts
npx tsx internal-review-copilot/scripts/test-deploy-guards.ts
npx tsx internal-review-copilot/scripts/test-g2-pipeline.ts
npx tsx internal-review-copilot/scripts/test-feishu-card.ts
npx tsx internal-review-copilot/scripts/test-customer-display.ts
npx tsx internal-review-copilot/scripts/test-oms-adapter.ts
npx tsx internal-review-copilot/scripts/test-sku-consistency-check.ts
npx tsx internal-review-copilot/scripts/test-t1-sku-relabel-check.ts
npx tsx internal-review-copilot/scripts/test-prompt-j.ts
# Prompt J：飞书/LLM 各重试 1 次；OMS 连续 3 次失败断路 5 分钟；pipeline 意外 throw → transfer_human
# 橙色/红色卡展示「已提供附件」；话题标题 topicSummary → reasoning 第一句 → 原文 50 字
# 契约：docs/tool-contracts.md
# OMS 附件：从 vaAtomFiles.fileName 反推类型，写入 pageContext.attachmentStatus 与 omsFacts.uploadedFiles
# 话题标题：优先 topicSummary（≤60字），其次 conclusionOneLiner，最后才截原文
# 无 OMS 码场景卡模糊匹配（只出报告，不改场景卡）
npx tsx internal-review-copilot/scripts/fuzzy-match-oms-codes.ts
npx tsx internal-review-copilot/scripts/update-cards-attachment.ts --dry-run
npx tsx internal-review-copilot/scripts/update-cards-attachment.ts --apply
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <_runs/YYYYMMDD_internal_review_dryrun>
npx tsx internal-review-copilot/scripts/run-internal-review-dryrun.ts --input <details.json> --out <_runs/YYYYMMDD_internal_review_llm> --order VASC000000348477
npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once --input <details.json> --skip-feishu
npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "先补对应关系"
npx tsx internal-review-copilot/scripts/feishu-login.ts
npx tsx internal-review-copilot/scripts/test-feishu-bot.ts
```

凭证只放 `.env`（`LITELLM_*` / `FEISHU_*`）。SOP 生成失败记 `failureGate=llm-generate-sop` + `llmError`，不伪装成场景不确定。JSON 解析先吃原文（正文里的中文弯引号 `“ ”` 保留），失败才做格式兜底。确定性分流看 `ruleOutputPath`。试点手册见 `docs/pilot-runbook.md`。

## OMS 草稿写入（不自动审核通过）

`lib/oms-draft-write.ts` 的 `writeDraft` 按字段拆开写：操作 SOP 只写步骤，需求描述 / 需求背景各自追加 `【AI总结】`（不覆盖原文）：

```
操作SOP        = 【操作步骤】
需求描述       = {客户原文} + 【AI总结】{需求描述}
需求背景(BEOR) = {客户原文} + 【AI总结】{需求背景}
```

- 原文一个字不改；空总结不追加空的 `【AI总结】`
- 禁止调用 `vaOrderReview`
- **写入前门禁**：`writeDraft` 先读 `pageQuery` 订单状态。只有 `待审核`（码 `WA`）才写；`待客户确认` 等其它状态直接拒绝。再看审核信息：`isAuditThrough` 非空（已审核通过为 `Y`；待审核为空）也拒绝。atom 上没有 `auditRemark` / `auditInfo`；`vasc.isAudit` 是产品开关，不能当已审标志
- **人工 SOP 不覆盖**：OMS 操作 SOP 已有非空内容且与本次要写的不是同一份时，拒绝覆盖。**这种情况不在【增值】异常沟通建话题、不发群卡片、不 @ 审核员/销售/客服**，只私聊 `BREAKER_ALERT_USER_ID`（金萤）
- **没有 OMS 场景概述码**：SOP 仍写入，场景概述留空不选。飞书绿卡和私聊 @ 金萤，请业务确认该知识库场景对应哪个下拉项。未匹配到知识库场景时同样处理，不套用尺重换标模板。
- 真写需 `OMS_WRITE_ENABLED=1` 且单号在 `OMS_WRITE_ALLOWLIST`（`*` 表示不限制单号）
- 飞书：其它写入门禁（非待审核 / 已有审核信息）仍更新原卡为橙色「OMS 写入已取消」。人工 SOP 已填走私聊，**不**出现「请在 OMS 检查修改」群卡
- 飞书卡片：**只有需要销售/客服补信息时才 @ 销售和客服**。绿卡、SOP 失败、写入取消/重试、选场景 **不 @ 李颖 / 何静 / 耿文文**。销售/客服按客户编码查 DWS，再对【增值】异常沟通花名册 `config/exception-group-roster.json` 真 @；查不到人只写姓名。审核员人员见 `config/personnel.json`（open_id 必须是增值咨询 Bot 视角）
- 正式轮询：`npx tsx internal-review-copilot/scripts/start-live.ts --out _runs/YYYYMMDD_live_poll --interval 600`。首次评估走 `sceneLlm=true` / `sceneLlmVersion=2`；`RAG_ENABLED=0`。只处理 `OW01V1602` / `OSF6V1603` / `OSF6V1841`。**L4 跑完自动写入 OMS 审核信息**（不代为审核通过）
- SOP 生成必须产出 AI 总结的 `requirementDescription` / `requirementBackground`，不得复制客户原文
- AI vs 人工对照：真写入成功后追加 `eval/ai-human-comparison.jsonl`。定时补终态：`npx tsx internal-review-copilot/scripts/sync-audit-diff.ts --force`。周报：`npx tsx internal-review-copilot/scripts/analyze-ai-human-diff.ts`

## 飞书卡片出口

主路径只发两种卡片：需求不清晰（橙）、已写入 OMS（绿）。附件缺时 SOP 仍写入，另发橙色「附件未提交」。

| 出口 | 卡片 | 颜色 | 说明 |
|------|------|------|------|
| 需求不清晰（无场景 / 关键信息缺 / 过短无单号） | `buildRequirementClarificationCard` | 橙色 ⚠ | @销售客服补充后重跑 |
| 附件未提交（SOP 已写） | `buildAttachmentPendingCard` | 橙色 ⚠ | SOP 用 `[待补充：附件名]` |
| L4 SOP 已写入 | `buildSopCard` | 绿色 ✅ | 无确认按钮，请在 OMS 检查修改。缺 OMS 码时 @ 金萤找业务确认，仍不 @ 李颖/何静/耿文文 |
| SOP 生成失败 | `buildSopGenerateErrorCard` | 红色 ❌ | 请人工撰写 |

不再发蓝色选场景卡，也不再等人点「确认写入 OMS」。审核员直接在 OMS 改。

补贴 WINIT 包裹标签场景不要求客户上传标签文件。WI 号优先用 LLM 提取，正则兜底。术语：仓库已处理 / 补贴标签 / 辨识。

SOP 若仍编造了输入里没有的单号：不判失败，把编造单号换成 `[待补充]`，绿卡加黄色提示，审核员在 OMS 补单号。

首次发卡会新建话题，**话题根直接就是卡片**（不再先发一段「已创建审核话题」摘要再嵌套卡片）。左侧话题名走卡片标题（例如「⚠ 需求不清晰 — VASC…」/「✅ AI 已写入 OMS — VASC…」）。卡片正文里仍有单号、客户、仓库。**群卡片用真实客户名**。

SOP 修改请审核员直接在 OMS 改，飞书不再走「SOP 需要修改」按钮。listen 只保留金丝雀切群和写入失败重试。

```powershell
npx tsx internal-review-copilot/scripts/send-exit-cards.ts
```

常驻 listen 已含话题轮询，不要同时再跑 `poll-and-assess`，以免重复改写。进程会同时消费 `card.action.trigger` 和 `im.message.receive_v1`。上 40 前须在飞书开放平台给增值咨询 Bot 打开 `im.message.receive_v1` 事件订阅。

## 万邑通白名单（禁止使用 + 巡检告警）

内部员工 = 通讯录「组织内联系人 / 万邑通」+「关联组织 > Winit」（US / UK / AU / DE / System Account）。两套能力共用 `config/winit-tenant-whitelist.json`：

- 单聊：对方企业不在白名单 → 回复「禁止使用」
- 群里 @机器人：群里只要有非万邑通（或名单拉不全）→ 回复「禁止使用」
- 每天巡检：扫 Bot 已加入的群，把外部群 / 非万邑通人数发到告警群

**单聊 / 群 @ 拦截默认还没在听消息。** `.env` 里没有 `LISTEN_IM=1` 时，listen 只收卡片按钮，私聊不会自动回「禁止使用」。卡片点击已经会拦。

验证与回看私聊：

```powershell
npx tsx internal-review-copilot/scripts/test-winit-tenant.ts
npx tsx internal-review-copilot/scripts/audit-p2p-access.ts
npx tsx internal-review-copilot/scripts/patrol-external-groups.ts
npx tsx internal-review-copilot/scripts/patrol-external-groups.ts --send
```

实时拦截日志（listen 打开后才有）：`internal-review-copilot/logs/access-audit.jsonl`（不提交）。

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

场景分类默认会从 `knowledge/case-library/` 取最多 3 条相似历史单，塞进 LLM 提示词（相似度 < 1.0 不塞；整段约 500 字）。入库用 `inbound-cases.jsonl`，库内用 `instock-cases.jsonl`。**默认关闭**：`.env` 里 `RAG_ENABLED=0`；要打开设 `RAG_ENABLED=1`。

```powershell
npx tsx internal-review-copilot/scripts/build-case-library.ts --category inbound --max-per-scene 3
npx tsx internal-review-copilot/scripts/build-case-library.ts --category instock --max-per-scene 3
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

上 40 用三层防线（金丝雀 → 熔断 → `MAX_PER_HOUR` 放量），操作见 [`docs/canary-deploy-guide.md`](docs/canary-deploy-guide.md)。金丝雀那几单先只发测试群；你点「没问题，切到正式群」后，会在正式群再发一遍（不用改 `.env`、不用重启）。未点名「可以部署 40」前不要上。

**覆盖 40 现网代码必须走固定脚本（先 snapshot，再解包）：**

```bash
# 本机把 patch.tgz 拷到 40 后：
ssh winit@172.16.3.40 "bash ~/.agents/services/internal-review-copilot/scripts/40-deploy.sh /tmp/irc-patch.tgz"
# 回滚到最近一次 snapshot：
ssh winit@172.16.3.40 "bash ~/.agents/services/internal-review-copilot/scripts/40-rollback.sh"
```

禁止只备份 `.env` 就 `tar -xzf`。snapshot 不含密钥和现网 `live_poll`。备份目录：`~/.agents/backups/internal-review-copilot/`。

当前 40（2026-09-18）：`OMS_WRITE_ENABLED=1`（生成 SOP 才写入待审核单，不点审核通过）；新话题进 **【增值】异常沟通** `oc_6566160ccb2def51937469fe8144efdb`，**话题根直接发卡片**（不再外套「已创建审核话题」摘要）；轮询拉**全部待审核**（不限下单日）；**只有缺信息/补附件才 @ 销售客服**，绿卡不 @ 李颖/何静/耿文文。人工 SOP 已填只私聊金萤。`MAX_PER_POLL=2`、`MAX_PER_HOUR=10`。

Cookie 每 10 分钟由 cron 无头续期：`cd /home/winit/AI_EXPERT/TOM/共享认证 && python3 auto_login.py`。登录超时也会在 poll 里自动续一次。

## 依赖关系

内部审核 Copilot 可以读取线上 Expert 包里的规则节点和 Prompt 做兼容测试，但不能把内部审核逻辑写进线上 Expert 包。

允许引用：

- `experts/value-add/nonstandard-sop-guide/nodes/`
- `experts/value-add/nonstandard-sop-guide/prompts/inbound/`
- `workspace/knowledge/sop/2.1-inbound-relabel-shelving.md`
- `workspace/knowledge/cases/f001-inbound-relabel-shelving/`
- `agent-inventory-assist/03_evaluation/F-001-SIMULATED-BUSINESS-RULES.md`

