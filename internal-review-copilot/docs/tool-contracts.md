# 工具契约文档

> 记录 pipeline 中每个有外部依赖的工具的输入/输出/失败处理契约。
> 新增工具或修改失败逻辑时同步更新本文档。
> 内容从代码读取，不以口碑补全。

## 约定

每个工具包含 5 项：
- **何时调**：前置条件
- **输入**：类型 + 关键字段
- **必须返回**：类型 + 关键字段
- **软失败**：内容不合格时的降级方式
- **硬失败**：完全无法返回时的兜底方式

重试最多 1 次（飞书 / `callChat`）。OMS 断路器连续 3 次失败后冷却 5 分钟。

---

## 1. LLM 场景分类（classifyScene / classifySceneV1）

来源：`lib/llm-scene-classifier.ts`，调用方 `lib/match-template.ts` 的 `matchTemplateWithLlm`。

- **何时调**：L1 需求检查通过后做场景匹配；`matchTemplateWithLlm` 在 `sceneLlm` 开启时调用。v1 无异常单详情；v2（默认 `classifyScene`）先 `lookupExceptions` 再分类，prompt 含规则 A/B/C/D。候选卡来自规则预筛 `pickLlmCandidateCards`。
- **输入**：
  - `customerIntent: string`
  - `contextFacts: ContextFacts`（异常单号、入库单号、仓库、服务原子、附件状态）
  - v2 另加 `exceptionInfos: ExceptionInfo[]`
  - `config: LlmConfig`
  - `options: ClassifySceneOptions`（`candidateCards?`、`ragEnabled?`、`ragCategory?`、`excludeCaseIds?`）
  - 经 `callChat`，`jsonMode: true`，`maxTokens: 1000`，`temperature: 0.1`
- **必须返回**：`LlmClassifyResult`
  - `matchedScene` / `matchedSceneName`（sceneKey 之一或 `unsupported`）
  - `confidence: "high" | "medium" | "low"`
  - `reasoning`、`conclusionOneLiner`（截断 30 字）、`topicSummary`
  - `extractedActions[]`、`alternativeScenes[]`、`ambiguous`
  - 可选 `failed?`、`retrievedCases?`
- **软失败**：
  - JSON 坏但能从原文抠出 sceneKey → `confidence=medium`、`ambiguous=true`，reasoning 标明解析失败回退
  - `matchedScene` 不在候选 → 按名称模糊对齐；仍对不上则走后续规则
  - v2 成功后 `applyExceptionNameOverride`：OMS 异常名称可覆盖 LLM 选景
  - `confidence=low` / `ambiguous=true` / `unsupported` → 调用方出蓝卡让人选，本函数仍返回结构体
- **硬失败**：`callChat` throw（含解析彻底失败 `JSON parse failed`）→ `degrade()`：`matchedScene=unsupported`、`failed=true`、`ambiguous=true`。调用方 `if (classify.failed)` 回退纯规则 `matchTemplate`，`llmUsed=false`，`decisionPath` 追加 `llm_failed_fallback_rules`。

---

## 2. LLM SOP 生成（generateLlmTextSafe）

来源：`lib/generate-text.ts`；pipeline 经 `run-pipeline.ts` 的 `attachLlm` 调用。

- **何时调**：规则路径需要生成正文时（`sop_generated` / 澄清 / 转人工文案），且未 `skipLlm`。SOP 路径还要求场景已匹配且 L2.5 通过。
- **输入**：`GenerateTextArgs`
  - `outputPath`、`agentInput`、`contextFacts`
  - 可选 `requirement`、`matchResult`、`completeness`
  - `missing[]`、`clarificationPrompts[]`
  - 修订：`sopEditInstruction?`、`previousSop?`
  - SOP：`callChat` `jsonMode` + `maxTokens: 2500`
- **必须返回**：`LlmGeneration`
  - `text`、`model`、`mocked`、`error: string | null`
  - SOP 路径另含 `sop: LlmSopDraft`（`sopText` / `warehouseSop` / `requirementDescription` / `requirementBackground` / `degraded?` / `degradeReason?`）、`reflectionPass`、`reflectionIssues`、`regenerated`
- **软失败**：
  - SOP 编造输入中没有的 VASC/WI/EB → 带约束再生成 1 次；仍编造 → `replaceInventedOrderNos` 换成 `[待补充]`，`sop.degraded=true`
  - SOP JSON 不合法 → 再要一轮「完整 JSON」
  - reflection 不通过 → 带问题列表重写 1 次，第二次无论 reflection 是否过都接受（不无限循环）
  - 澄清类 `generatePlain` 若编造单号则 **throw**（不降级替换），由 Safe 包成 `error`
- **硬失败**：`generateLlmTextSafe` catch 任意 throw，返回 `{ text: "", model: "", mocked: false, error: message }`，不往外抛。`run-pipeline` 在 `ruleOutputPath === "sop_generated"` 且 `llm.error` 时把 `failureGate` 设为 `llm-generate-sop` → 红色错误卡。含：`SOP sopText 为空`、`notActionable`、超时 / 5xx（`callChat` 已按自身契约重试 1 次）。JSON 解析走 `parseJsonishObject`：先原样 `JSON.parse`，失败再修场景名里未转义的英文引号（`【入库】"…"辨识`），再去尾逗号 / 把弯引号当分隔符；禁止先把正文里的 `“ ”` 换成 `"`。

---

## 3. OMS 草稿写入（writeDraft）

来源：`lib/oms-draft-write.ts`。

- **何时调**：审核员点「确认写入 OMS」；`dryRun === false` 且 `OMS_WRITE_ENABLED` 开启且单号在 `OMS_WRITE_ALLOWLIST`（或白名单含 `*`）才会真写。禁止调用 `vaOrderReview`（`assertNotReviewApi`）。
- **输入**：`DraftWriteInput`
  - 必填：`orderNo`、`sceneOverviewCode`、`sop`（只应放操作步骤）
  - 可选：`warehouseActions` / `warehouseAction`（不传则默认贴商品标签 + 贴包裹标签，只为解开保存，不按场景精算）、`aiRequirementDescription` / `aiSummary`、`aiRequirementBackground`、`mutateRequirementAttrs`、`dryRun`
- **必须返回**：`DraftWriteResult`
  - `success`、`dryRun`、`written[]`、`skipped[]`（默认含 `vaOrderReview`）
  - 可选 `readBack`（sop / sceneOverviewCode / 需求描述 / 需求背景 / nweon 等）、`error?`
- **软失败**（返回结构体，不 throw）：
  - 不在白名单 → `success=false`、`dryRun=true`、`error` 说明拒绝真写
  - `assessOmsWriteGuard`：非待审核 → `skipped=status_not_writable`；审核信息已填 → `audit_info_filled`；OMS 已有非 AI SOP → `sop_already_filled`
  - 真写后回读不一致（需求描述未保留原文/`【AI总结】`、背景、WI）→ `success=false` + 对应 `error`
- **硬失败**：内部 `catch` 返回 `{ success: false, dryRun, written, skipped, error }`，不往外抛。Cookie / HTTP 失败由 `createTomClient` 先续期/断路器；调用方（listen `handleConfirmSopWrite` / `handleRetrySopWrite`）根据 `success` 发成功卡或重试卡。

---

## 4. 飞书发消息（sendCardMessage / sendGroupMessage / sendPersonalMessage）

来源：`lib/feishu-bot.ts`。同文件还有 `createThread`、`sendCardInNewTopic`，同样包 `withRetry`。`sendCardInNewTopic` 直接把交互卡片发成话题根，不再先发富文本摘要再嵌套卡片。

- **何时调**：pipeline / poll 出卡后发话题或回帖；listen 按钮或 @bot 后在线程里续发卡片/文本。卡片发送必须用增值咨询 app `cli_aa2a76198a7adcb3`。金丝雀满额卡片走 `sendPersonalCard`；熔断告警给人发私信走 `sendPersonalMessage`。
- **输入**：
  - `sendCardMessage(chatId, card: FeishuCard, threadId?: string)`
  - `sendGroupMessage(chatId, content: FeishuPostContent | string, threadId?: string)`
  - `sendPersonalMessage(openId, text: string)`（`receive_id_type=open_id`）
  - `sendPersonalCard(openId, card: FeishuCard)`（`receive_id_type=open_id`，交互卡片）
  - poll 的 `chatId` 一律来自 `getTargetChatId()`（`lib/canary.ts`）：金丝雀未切正式群时用 `CANARY_CHAT_ID`，点过「切到正式群」或 `CANARY_MODE≠1` 时用 `FEISHU_TEST_CHAT_ID`
  - 有 `threadId` 时走 `messages/{id}/reply` + `reply_in_thread: true`
- **必须返回**：`SendResult`：`messageId`、`threadId`（`om_…` 根消息）、`topicId`（`omt_…`）、`skipped`、可选 `reason`
- **软失败**：无内容级降级；发出去即成功。`skipped=true` 仅表示调用方选择跳过发送。
- **硬失败**：`withRetry(fn, retries=1, delayMs=2000)` + `shouldRetryFeishu`：
  - 5xx → 隔 2s 再试 1 次
  - 无 `status`（超时、断网）→ 再试 1 次
  - 4xx 或 HTTP 200 但 `feishuCode≠0` → **不重试**，直接 throw `FeishuError`
  - 仍失败 → throw，由 poll / listen 的调用方 catch 记日志，不让进程崩

Pipeline 业务熔断见 `lib/circuit-breaker-poller.ts`，与 OMS API 断路器分开。部署操作见 `docs/canary-deploy-guide.md`。

---

## 5. OMS 异常单查询（lookupExceptions）

来源：`lib/exception-lookup.ts`。

- **何时调**：v2 场景分类前，`contextFacts.allEventNos` 非空时由 `matchTemplateWithLlm` 调用。优先级：inline hints → 进程内 cache → OMS UnusualEvent API → 硬编码 `KNOWN_EXCEPTIONS` → `not_found`。请求间隔至少 `OMS_GAP_MS=500`。
- **输入**：`ebNos: string[]`；可选 `inlineHints?: InlineExceptionHint[]`；可选 `deps`（测试可注入 `queryDetail` / `getClient`）。
- **必须返回**：`ExceptionInfo[]`，每个 EB 一条：`ebNo`、`exceptionName`、`exceptionObject`、`source`（`inline` | `cache` | `oms_api` | `known_table` | `not_found`）。**不会 throw**。
- **软失败**：OMS 返回空名称 → 走 `knownFallback`。`formatExceptionDetails` 在全部查不到时改写为「请仅根据客户需求描述判断」。
- **硬失败**：`lookupOne` catch OMS 错误后 `console.warn`，返回 `knownFallback`（表内有则 `known_table`，否则 `source=not_found`、名称为空）。底层 OMS HTTP 连续失败仍走断路器（见工具 6）。

---

## 6. OMS Cookie 客户端（createTomClient）

来源：`lib/oms-tom-client.ts`。

- **何时调**：任何 OMS 读/写：拉单、写草稿、查异常、打开订单页。Cookie 默认 `AI_EXPERT/TOM/共享认证/playwright_cookies.json`，可被 `TOM_COOKIE_PATH` 覆盖。
- **输入**：无业务入参；`createTomClient(): Promise<TomClient>`。其后方法：
  - `ajaxProcess(api, params)` / `ajaxSave(api, params)` / `ajaxUnusualEvent(api, params)` / `setOrderReferer(orderNo)` / `getPage(path)`
  - `assertNotReviewApi`：api 名含 `vaOrderReview` 立即 throw
- **必须返回**：`TomClient`；ajax 要求对端 JSON `status===1`，否则 throw。
- **软失败**：页面或 ajax 判定登录超时 / 跳转 IAM → `refreshTomCookies()`（`auto_login.py`）**续期 1 次**再请求；续期后仍失败 → throw「Cookie 失效：auto_login 后续期仍…」。
- **硬失败**：
  - `withOmsCircuit`：`consecutiveFailures >= 3` → `circuitOpenUntil = now + 5分钟`，期间 throw `OMS 断路器开启中，Ns 后重试`
  - HTTP ≥400、非 JSON、`status≠1`、抽不出 CSRF → throw
  - **throw，由调用方捕获**（`writeDraft` / `lookupExceptions` 各自 catch；poll 记失败原因）

断路器常量：`CIRCUIT_THRESHOLD = 3`，`CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000`。成功清零 `consecutiveFailures`。

---

## 7. LLM API 调用（callChat / callChatWithTools）

来源：`lib/llm-client.ts`。

- **何时调**：场景分类、L2.5 信息检查、SOP / 澄清 / 转人工文案、reflection。v3 分类用 `callChatWithTools`。缺 `LITELLM_API_KEY`（或 `OPENAI_API_KEY`）时 `resolveLlmConfig` 直接 throw。
- **输入**：
  - `callChat(config, messages, options?)`：`jsonMode?`、`maxTokens?`（默认 1600）、`temperature?`（默认 0.2）、`onDelta?`、内部 `_isRetry?`
  - `callChatWithTools(config, messages, tools, executeTool, options?)`：`maxToolRounds` 默认 3
- **必须返回**：
  - `callChat`：非空 `string`（空内容 throw `LLM 返回空内容`）
  - `callChatWithTools`：`{ finalContent, toolCallHistory, totalRounds }`
- **软失败**：无内容级降级；JSON/业务质量由上层解析。`callChatWithTools` 若网关拒绝 tools（message 匹配 `tool` / `400` / `unsupported`）throw `TOOL_CALLING_UNSUPPORTED`，由 v3 调用方降级。
- **硬失败**：
  - **`callChat`**：`shouldRetryLlm` — status≥500 或无 status（超时/断网）且尚未 `_isRetry` → 等 2s 以 `_isRetry: true` 再调一次；4xx **不重试**；空内容 **不重试**。仍失败 throw `LlmError`，由上层 Safe/degrade 捕获。
  - **`callChatWithTools`**：走 `postChatCompletion`，**没有** `_isRetry`；失败直接 throw。

---

## 8. L2.5 场景完整性检查（checkSceneCompleteness）

来源：`lib/check-scene-completeness.ts`。附件规则 `checkCompleteness`；信息项经 `checkInfoWithLlm`。

- **何时调**：场景已匹配（有 `matchResult.sceneKey`）。信息 LLM 仅当 `skipInfoLlm` 为假、场景卡有 `requiredInfoFields`、且传入 `llmConfig`。
- **输入**：`customerIntent`、`contextFacts`、`matchResult`、`options?: { skipInfoLlm?, llmConfig?, skipCompleteness?, t1SkuRelabel? }`。T1 单 SKU 会从必填里拿掉对应关系；多 SKU 把辨识依据升为必填。`skipCompleteness` 为真时不跑信息 LLM、不拦附件，直接 `complete=true`（审核员点「信息已齐全」）。`checkInfoWithLlm` 会带上 `contextFacts.attachmentStatus` 已上传附件名单，以及单据仓库 / EB / WI / 文件名；提示词允许从正文和单据信息推断（WI / Winit 订单号、漏气/库位对应），并允许把数量/对应关系合理算进已上传附件，**不解析 Excel 内容**。
- **必须返回**：`SceneCompletenessResult`
  - `complete`（信息缺项为空 **且** 附件规则 complete）
  - `missingInfo[]`、`missingAttachments[]`、`clarificationPrompts[]`（按场景短名生成「本场景（…）需要知道…」/「请上传「…」」）
  - `sceneKey`、`infoChecks[]`、`infoCheckSkipped`、`infoCheckError`、`attachment`
- **软失败**：
  - LLM JSON 解析不出 checks：`parseInfoLlmResponse` 把所有 required 字段标 `present: true`（信息门放行），附件仍走规则
  - 无 `requiredInfo` 或 `skipInfoLlm` / 无 `llmConfig` → `infoCheckSkipped=true`，不跑 LLM
- **硬失败**：`checkInfoWithLlm` catch `callChat` throw → `missing=[]`、所有字段 `present: true`、`error=message`。**不阻断**附件检查，也不往外抛。

---

## 9. RAG 案例检索（retrieveSimilarCases）

来源：`lib/case-retriever.ts`。案例库 `knowledge/case-library/inbound-cases.jsonl` + `instock-cases.jsonl`。默认 `RAG_ENABLED=0`。

- **何时调**：`classifyScene` 组 user message 时 `retrieveForPrompt`；仅当 `options.ragEnabled !== false` 且 `isRagEnabled()`（环境变量 `RAG_ENABLED=1`）。
- **输入**：`customerIntent: string`；`options?: { topK? 默认 3, category?: inbound|instock, excludeCaseIds? }`
- **必须返回**：`RetrievedCase[]`（entry + BM25 `score` + `rank`）。`formatFewShotBlock` 再过滤 `score >= RAG_MIN_SCORE(1.0)`，拼进 prompt，总长不超过 `RAG_MAX_PROMPT_CHARS(500)`。
- **软失败**：无命中 / 分低于阈值 / 库为空 / query 分词为空 → 返回 `[]` 或 few-shot 空串，分类照常进行。
- **硬失败**：无外部 HTTP。`RAG_ENABLED` 未开直接 `return []`。读 jsonl 若文件不存在返回空数组；单行 `JSON.parse` 失败会 **throw，由调用方捕获**（当前 `classifyScene` 在 RAG 组装阶段未单独 catch，会进分类函数的外层 catch → `failed:true` 降级）。

---

## 10. 跨入库单 SKU 校验（checkSkuConsistencySafe）

来源：`lib/sku-consistency-check.ts`；调用方 `lib/run-pipeline.ts`（L2.5 通过后、L4 SOP 前）。

- **何时调**：场景命中拦截/换标相关 key，或 OMS 场景码 `202507021814` / 名称含「上架前拦截」；且需求含「原单/拦截/换标签」等词，并识别到至少两个 WI（或一个 WI + 单据上的原入库单号）。
- **输入**：`AgentInput`、`MatchResult`、`ContextFacts`、可选 `detail.events`。SKU：先 `VaOrderService_getEventOrder4VaAtom` 的 `merchandiseCode`；没有则 DWS `bi_dw.base_whs_inbound_merchandise_f.order_no`。
- **必须返回**：`SkuCheckResult`（`triggered` / `oldWi` / `newWi` / `oldSkus` / `newSkus` / `match` / 可选 `mismatchDetails` `source` `error`）。
- **软失败**：
  - `match=consistent`：不提示
  - `mismatch` / `partial` / `unknown`：飞书绿卡/橙卡顶部展示「【提示：本单AI识别到……请审核人员关注】」，**不写进仓库 SOP / OMS 操作步骤**
- **硬失败**：超时（默认 25s，`SKU_CHECK_TIMEOUT_MS`）或 DWS/OMS throw → `match=unknown`，仍出审核员提示，**不往外抛**，不阻断 pipeline。

---

## 10.1 T1 商品码单/多 SKU 校验（checkT1SkuRelabelSafe）

来源：`lib/t1-sku-relabel-check.ts`；调用方 `lib/run-pipeline.ts`（H11 之后、L2.5 之前）。

- **何时调**：L2 命中 `inbound_package_barcode_batch_relabel`。审核员点「信息已齐全」时不打回。
- **输入**：`AgentInput`、`MatchResult`、`ContextFacts`。上架 WI 优先 `VAS_ATTR_REL_NWEON`，否则正文「新单」/ `pickPutawayWiNos`。商品码查 DWS `bi_dw.base_whs_inbound_merchandise_f.merchandise_serno`（空则 `merchandise_code`），去后缀 `-数字` / `-数字+字母`。
- **必须返回**：`T1SkuRelabelResult`（`triggered` / `targetWis` / `merchandiseCodes` / `stems` / `claim` / `verdict` / `bouncePrompt`）。
- **软失败 / 分流**：
  - `single_ok`：L2.5 去掉「SKU与入库单对应关系」，直接可出 SOP
  - `single_mismatch_bounce`：`needs_requirement_clarification`，请销售客服核对并打回客户重提，不进 L2.5
  - `multi_need_mapping`：L2.5 把「辨识依据」升为必填，保留对应关系
  - 无 WI / 无商品码 → `skip`，L2.5 沿用场景卡原必填
- **硬失败**：超时或 DWS throw → `verdict=skip`，**不往外抛**，不阻断。

---

## 11. 飞书卡片按钮事件（listen-card-actions handleCardAction）

来源：`scripts/listen-card-actions.ts`。进程同时消费 `card.action.trigger` 与 `im.message.receive_v1`（lark-cli `--profile` 增值咨询 bot，`--timeout 8h`，退出后 3s 重连）。

- **何时调**：测试群 / 个人卡片上审核员点按钮，或在已绑定话题里发文本 / @bot。同一 `event_id` 去重。
- **输入**：规范化后的 `CardActionEvent` + `action_value` JSON。`im.message.receive_v1` 经 `handleIncomingIm` / `handleBotMessage` 转成同等动作或场景搜索。
- **必须返回**：无函数返回值（副作用：改 `CaseStore`、发/更新飞书卡）。未知 `action` 直接 return。
- **有效 action**：
  1. `canary_promote` → 金丝雀切正式群
  2. `retry_sop_write` → 写入失败后重试 `writeDraft`
- 以下历史按钮只打日志忽略（交互改为 AI 自动写入 OMS，审核员在 OMS 改）：`confirm_scene` / `show_all_scenes` / `scene_wrong` / `skip_completeness` / `confirm_sop_write` / `sop_needs_edit` / `confirm_sop`
- **`im.message.receive_v1`**：群聊补充回复给 poll 状态机重跑 pipeline。历史「选场景」口令不再切蓝卡。
- **软失败**：无 case / 状态不允许 / 未 @bot / 无 thread → skip 打日志。
- **硬失败**：发飞书或写 OMS throw → listen 队列 `.catch` 打 `listen queue error`，**不崩进程**。单条事件失败不阻塞后续事件。
