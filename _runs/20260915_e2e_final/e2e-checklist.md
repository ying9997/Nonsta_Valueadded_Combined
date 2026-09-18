# E2E 验证检查清单（部署前最终版）

## 验证环境
- 本机 → 测试群 oc_80b07f38ed6833df3787a97a496f1097
- Pipeline: sceneLlmVersion=2, RAG_ENABLED=0, 场景卡 75 张
- 日期: 2026-09-15
- 证据目录：
  - `_runs/20260914_e2e_full/`（第一轮 25 项）
  - `_runs/20260915_e2e_rerun/`（#9 / #14 / #17 / #18 换数据重跑）
  - `_runs/20260915_pre_deploy_verify/`（5 条真实待审核单）
  - `_runs/20260915_historical_demo/`（历史演示 9 条）
- 工具契约 #26–#29：代码检查，未实际触发故障
- 40 未部署

## 卡片展示（5 项）
- [x] 1. 话题标题：VASC｜客户｜仓库｜摘要（topicSummary） ✅
- [x] 2. 绿卡：客户填写 + AI 总结 + 操作步骤三段 ✅
- [x] 3. AI 判断依据：中文 conclusionOneLiner ✅
- [x] 4. CC@李颖：在 @审核员的卡片上 ✅
- [x] 5. 入库@耿文文 / 库内@何静 ✅

## L1 节点（2 项）
- [x] 6. 需求 > 5 字不被拦（三要素不阻断） ✅
- [x] 7. 空需求 < 5 字才拦 ✅

## L2 节点（3 项）
- [x] 8. 蓝卡：AI 推荐场景 + "以上都不对" + "转人工" ✅
- [x] 9. 点"以上都不对" → 全场景卡 ✅（首轮 listen 未连上；9-15 重跑通过）
- [x] 10. 选场景后 → L2.5 → L4 ✅

## L2.5 节点（2 项）
- [x] 11. 精准追问（按场景，不是"操作动作不清"） ✅
- [x] 12. 需求+附件合并追问 + 已提供附件展示 ✅

## L4 节点（3 项）
- [x] 13. SOP 生成正常 ✅
- [x] 14. 编造降级：[待补充] + 黄色提示 ✅（首轮 282990 被 L2.5 拦住；9-15 构造粘连单号通过）
- [x] 15. SOP 修改闭环 ⚠（脚本 `sopEditInstruction` 闭环，未走飞书按钮 listen）

## 全节点通用（2 项）
- [x] 16. "场景不对"按钮（L4/L3/L1/错误卡都有） ✅
- [x] 17. SOP 失败红色错误卡（不是蓝色选场景卡） ✅（首轮 308661 被 L2.5 拦住；9-15 临时 maxTokens=50 触发红卡后已改回 2500）

## OMS 写入（3 项）
- [x] 18. 正常写入（待审核单） ✅
- [x] 19. 非待审核拒绝 ✅
- [x] 20. 写入失败 → 重试按钮 ⚠（发出模拟失败重试卡；真实 Cookie 失败路径未触发）

## @bot 对话（3 项）
- [x] 21. @bot "拍照暂存" → 确认卡片 ⚠（`searchSceneByKeyword` hits=1；未走真实 IM @bot）
- [x] 22. @bot "关联第三方" → 多结果卡片 ⚠（hits=2；未走真实 IM @bot）
- [x] 23. @bot 乱打字 → 未找到提示 ⚠（hits=0；未走真实 IM @bot）

## 限流/过滤（2 项）
- [x] 24. 非三种服务码跳过 ✅
- [x] 25. 限流生效 ✅

## 工具契约（4 项）
- [x] 26. 飞书发消息有重试（withRetry） ✅ 代码检查
- [x] 27. OMS 断路器（连续 3 次失败暂停 5 分钟） ✅ 代码检查
- [x] 28. LLM 5xx 重试 ✅ 代码检查
- [x] 29. Pipeline 顶层 try/catch ✅ 代码检查

## 各项验证结果

对每项标注：✅ 通过 / ❌ 不通过 / ⚠ 部分通过 / ⏭ 条件不满足跳过

### 卡片展示

**1. 话题标题：VASC｜客户｜仓库｜摘要（topicSummary）** ✅ 通过  
- 来源：`_runs/20260914_e2e_full/e2e-checklist.md`  
- 例：`VASC000000329235 | 13947840/******************** | US0001 | 4 个异常包裹（EB0126073131782987、…`  
- 历史演示 9 条标题格式：`[历史跑批] VASC｜客户｜仓库｜摘要`（`_runs/20260915_historical_demo/demo-summary.md`）

**2. 绿卡：客户填写 + AI 总结 + 操作步骤三段** ✅ 通过  
- 来源：E2E 全量 #2，`hasOriginal=true hasAi=true hasSteps=true`

**3. AI 判断依据：中文 conclusionOneLiner** ✅ 通过  
- 来源：E2E 全量 #3，例「【入库】包裹类异常换商品标签上架」

**4. CC@李颖：在 @审核员的卡片上** ✅ 通过  
- 来源：E2E 全量 #4，绿/蓝卡含李颖 open_id

**5. 入库@耿文文 / 库内@何静** ✅ 通过  
- 来源：E2E 全量 #5，`入库耿文文=true 库内何静=true`

### L1 节点

**6. 需求 > 5 字不被拦（三要素不阻断）** ✅ 通过  
- 来源：E2E 全量 #6，`VASC000000183069`：`outputPath=transfer_human node=match-template`（过 L1，进 L2）

**7. 空需求 < 5 字才拦** ✅ 通过  
- 来源：E2E 全量 #7，`VASC000000E2EEMPTY`：`outputPath=needs_requirement_clarification missing=需求描述为空或过短`

### L2 节点

**8. 蓝卡：AI 推荐场景 + "以上都不对" + "转人工"** ✅ 通过  
- 来源：E2E 全量 #8，`path=sop_generated recommend=true more=true human=true`  
- 补充：待审核 `VASC000000366432` 走 L2 `unsupported` 蓝卡（`_runs/20260915_pre_deploy_verify/VASC000000366432.review.json`）

**9. 点"以上都不对" → 全场景卡** ✅ 通过  
- 首轮：listen 未连上 / 条件不满足，**不算不通过**  
- 重跑：`_runs/20260915_e2e_rerun/rerun-checklist.md` — 同一 L2 话题发出 `buildAllScenesCard`（「请选择正确的场景」/「以上都没有，确认转人工」）  
- 说明：issues 记录本轮未在 listen 日志看到真实按钮事件，卡片路径与 `handleShowAllScenes` 相同

**10. 选场景后 → L2.5 → L4** ✅ 通过  
- 来源：E2E 全量 #10，`override=inbound_third_party_merchandise_barcode path=sop_generated`

### L2.5 节点

**11. 精准追问（按场景，不是"操作动作不清"）** ✅ 通过  
- 来源：E2E 全量 #11，`path=needs_field_clarification missing=新入库单号未说明 / 商品标签数量未说明 / 标签文件 hint=true`  
- 补充：待审核 366717 / 366735 / 368331 / 368313 四单均为「本场景（【入库】包裹类异常换商品标签上架）需要知道商品标签数量」+「请上传标签文件」

**12. 需求+附件合并追问 + 已提供附件展示** ✅ 通过  
- 来源：E2E 全量 #12，`info=true att=true missing=新入库单号未说明,商品标签数量未说明,标签文件`  
- 补充：上述四张待审核橙卡列出「已上传附件：包裹和标签的对应关系.xlsx」后再列缺少项

### L4 节点

**13. SOP 生成正常** ✅ 通过  
- 来源：E2E 全量 #13，`path=sop_generated llmError=`  
- 补充：历史演示 9 条中 6 条发出绿卡（329235 / 272319 / 305892 / 284952 / 321948 / 318543）

**14. 编造降级：[待补充] + 黄色提示** ✅ 通过  
- 首轮：282990 被 L2.5 拦住，到不了 L4，**不算不通过**  
- 重跑：在能过 L4 的 329235 需求描述粘连 `相关增值单VASC000000999999`，`looksInvented` → `degraded=true`，单号替换为 `[待补充]`

**15. SOP 修改闭环** ⚠ 部分通过  
- 来源：E2E 全量 #15，「脚本用 sopEditInstruction 生成修订绿卡并续发（未走飞书按钮 listen）」  
- 未验证：审核员点「需要修改」→ 话题回复 → listen 轮询修订的真实按钮路径

### 全节点通用

**16. "场景不对"按钮（L4/L3/L1/错误卡都有）** ✅ 通过  
- 来源：E2E 全量 #16，`L4=true L3/L2.5=true L1=true 错误卡=true`

**17. SOP 失败红色错误卡（不是蓝色选场景卡）** ✅ 通过  
- 首轮：308661 被 L2.5 拦住，到不了 SOP 失败卡，**不算不通过**  
- 重跑：对 329235 临时 `maxTokens=50`，JSON 截断 → `failureGate=llm-generate-sop` 红卡；验证完已改回 2500  
- 补充：历史演示 `VASC000000312144` 自然触发 `sop_llm_failed`（JSON parse）

### OMS 写入

**18. 正常写入（待审核单）** ✅ 通过  
- 首轮：`OMS_WRITE_ENABLED=0`，未真写  
- 重跑：`VASC000000366432` 真写 `sceneOverviewCode + sop + nweon`，`dryRun=false`，回读成功；写完 `OMS_WRITE_ENABLED=0`  
- 注意：该单 pipeline 停在 L2 unsupported；测试脚本先写仓库动作 `DZ000031` 再写 SOP，场景码用了 `20250929`（海运整柜 100%A+ 直接上架），需人工核对该草稿是否符合真实作业

**19. 非待审核拒绝** ✅ 通过  
- 来源：E2E 全量 #19，`success=false skipped=vaOrderReview,status_not_writable error=订单状态为「已完成」，非待审核状态，禁止写入。`

**20. 写入失败 → 重试按钮** ⚠ 部分通过  
- 来源：E2E 全量 #20，「发出模拟失败重试卡；真实 Cookie 失败路径未在本轮触发」  
- 未验证：`auto_login` 续期仍失败后的真实重试卡

### @bot 对话

**21. @bot "拍照暂存" → 确认卡片** ⚠ 部分通过  
- 来源：E2E 全量 #21，`search hits=1 【入库】指定商品拍照暂存`；写明「未走真实 IM @bot（事件总线可能被占用）」

**22. @bot "关联第三方" → 多结果卡片** ⚠ 部分通过  
- 来源：E2E 全量 #22，`hits=2`；同样未走真实 IM

**23. @bot 乱打字 → 未找到提示** ⚠ 部分通过  
- 来源：E2E 全量 #23，关键词「啊啊啊」`hits=0`；同样未走真实 IM

### 限流/过滤

**24. 非三种服务码跳过** ✅ 通过  
- 来源：E2E 全量 #24，`[2026-09-14T14:32:18.038Z] skip_service_code VASC000000E2ESKIP code=OW99SKIP`

**25. 限流生效** ✅ 通过  
- 来源：E2E 全量 #25，`[2026-09-14T14:32:20.424Z] rate_limit_hour reached 10/hour`

### 工具契约（代码检查，不触发故障）

**26. 飞书发消息有重试（withRetry）** ✅ 通过  
- `lib/feishu-bot.ts`：`export async function withRetry`；`sendCardMessage` / `sendGroupMessage` / `createThread` / `sendCardInNewTopic` 均包 `withRetry`  
- 口径：5xx / 无 status 最多再试 1 次（间隔 2s）；4xx 不重试

**27. OMS 断路器（连续 3 次失败暂停 5 分钟）** ✅ 通过  
- `lib/oms-tom-client.ts`：`consecutiveFailures`、`CIRCUIT_THRESHOLD = 3`、`CIRCUIT_COOLDOWN_MS = 5 * 60 * 1000`  
- `withOmsCircuit` 失败累计 ≥3 次后抛「OMS 断路器开启中」

**28. LLM 5xx 重试** ✅ 通过  
- `lib/llm-client.ts`：`callChat` 的 `options._isRetry`；`shouldRetryLlm` 对 status≥500 或无 status 再试 1 次（间隔 2s）；4xx 与「LLM 返回空内容」不重试  
- 注意：`callChatWithTools` 走 `postChatCompletion`，**没有** `_isRetry`

**29. Pipeline 顶层 try/catch** ✅ 通过  
- `lib/run-pipeline.ts`：`runPipeline` 最外层 `catch` 返回 `outputPath=transfer_human`、`failureType=unexpected_error`

## 旁证（不计入 29 项分数）

### 5 条真实待审核单（`_runs/20260915_pre_deploy_verify/`）

| VASC | 节点 | 结果 |
|---|---|---|
| 366717 | L3 | `needs_field_clarification`，场景 inbound_package_exception_relabel_shelving |
| 366735 | L3 | 同上 |
| 368331 | L3 | 同上 |
| 368313 | L3 | 同上 |
| 366432 | L2 | `transfer_human` / `unsupported`（后用于 #18 真写） |

### 历史演示 9 条（`_runs/20260915_historical_demo/`）

| 结果 | 条数 | 单号 |
|---|---|---|
| l4_direct | 4 | 329235 / 272319 / 305892 / 284952 |
| sop_after_rounds | 2 | 321948 / 318543 |
| max_rounds_exceeded | 2 | 305787 / 338049 |
| sop_llm_failed | 1 | 312144（JSON 截断，属 #17 同类硬失败） |

OMS_WRITE_ENABLED=0，绿卡按钮未点击。

## 结论

✅ 通过：24/29  
❌ 不通过：0/29  
⚠ 部分通过：5/29（#15 SOP 按钮闭环、#20 真实写入失败重试、#21–#23 真实 IM @bot）  
⏭ 跳过：0/29（#9 / #14 / #17 首轮条件不满足，重跑后已记入 ✅，不标 ⏭）

是否达到部署标准：**是（本机测试群）**

依据：29 项无 ❌；#9/#14/#17/#18 已用换数据补齐；#26–#29 代码契约存在。5 项 ⚠ 不阻断本机验收，但上 40 前建议补真实 IM @bot 与真实 OMS 失败重试（若业务要求）。40 仍停着，需用户明确授权才部署。
