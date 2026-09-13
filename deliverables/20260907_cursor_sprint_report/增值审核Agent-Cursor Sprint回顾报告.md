# 增值审核 Agent — Cursor Sprint 回顾报告

| 项 | 内容 |
|---|---|
| 周期 | 2026-09-03（D+0）→ 2026-09-04（D+1）|
| 目标 | D+2（09-05）演示给业务方 / D+4（09-07）业务方试点使用 |
| 执行方式 | Claude Code 出 prompt → Cursor 执行 → Claude Code 验收 |
| 报告日期 | 2026-09-07 |

---

## 目录

1. [项目背景](#1-项目背景)
2. [Cursor 接手前已有基础](#2-cursor-接手前已有基础)
3. [任务拆解与执行结果](#3-任务拆解与执行结果)
   - [任务 1：真实 LLM 接入](#任务-1真实-llm-接入)
   - [任务 2：飞书 Bot 群聊链路](#任务-2飞书-bot-群聊链路)
   - [任务 3：OMS 轮询 + 状态表](#任务-3oms-轮询--状态表)
   - [任务 4：审核规则回归 + 结构化输出](#任务-4审核规则回归--结构化输出)
   - [任务 5：回复总结 + 可复制审核备注](#任务-5回复总结--可复制审核备注)
   - [任务 6：Demo 与试点验收包](#任务-6demo-与试点验收包)
   - [追加任务 A：飞书连通测试 + AI 标记改造](#追加任务-a飞书连通测试--ai-标记改造)
   - [追加任务 B：真人 OAuth 登录](#追加任务-b真人-oauth-登录)
   - [追加任务 C：L4 用例构造](#追加任务-cl4-用例构造)
   - [追加任务 D：飞书 E2E 7 条发群](#追加任务-d飞书-e2e-7-条发群)
   - [追加任务 E：端到端集成验证](#追加任务-e端到端集成验证)
4. [产出文件索引](#4-产出文件索引)
5. [运行结果汇总](#5-运行结果汇总)
6. [未完成项与遗留风险](#6-未完成项与遗留风险)
7. [Git 状态](#7-git-状态)

---

## 1. 项目背景

### 1.1 业务触发

2026-09-03 下午 2:15 与业务方开会（会议记录：`增值审核agent进度沟通.md`），达成以下共识：

- **短期方案先行**：万邑联页面交互依赖外部研发排期，不阻塞短期方案
- **短期方案 = 智能审核 + SOP 草稿 + 群聊试点**
- AI 从 OMS 读待审核增值单 → 判断需求完整性 → 在飞书群里 @客服/销售追问 → 补齐后生成 SOP 草稿 → 回写到 OMS 备注
- **10 分钟轮询**，14:00 后开始审核
- 处理方式默认"暂时"，不改时效字段
- AI 消息带内部识别标记（后来改为 💪），后续可能升级为真人代发
- **D+2 看效果，D+4 上线试用**

### 1.2 技术决策

- **不做万邑联页面联调**（外部依赖）
- **不做客户侧 AI 客服接入**（第二阶段）
- **不做全场景覆盖**（当前仅 F-001：入库尺重/标签辨识后换标上架）
- **不做自动审核通过/驳回**（AI 只给建议）
- 所有代码放在 `internal-review-copilot/` 下，不改线上 Expert 包

### 1.3 执行方式

Claude Code 根据会议内容和现有代码库，为 Cursor 撰写任务 prompt。Cursor 执行编码。Claude Code 做产出验收。

Prompt 文件：`_tmp/20260903_cursor_prompt/`（已 gitignore，含凭证占位）

---

## 2. Cursor 接手前已有基础

| 模块 | 状态 | 路径 |
|------|------|------|
| 6 节点 dry-run 管线（validate → context-bind → check-requirement → match-template → check-completeness → format-output） | 本地跑通 16 条真实单 + 183 条历史单 | `internal-review-copilot/lib/` |
| match-template v0.2（确定性关键词打分） | 3 张场景卡（F-001 supported, A/B candidate） | `internal-review-copilot/knowledge/scenario-cards/` |
| OMS 拉单脚本 | 手动触发，已导出 `pull_ow01v1602_review_orders.mjs` | `internal-review-copilot/scripts/` |
| mock-llm.ts | SOP 占位，不调真实 LLM | `internal-review-copilot/lib/mock-llm.ts` |
| 飞书鉴权参考 | Python/TypeScript tenant_token 实现，webhook 发消息示例 | `D:\DA\AI_EXPERT\TOM\`、`D:\DA\experts\scripts\` |
| F-001 规则 / 案例库 | 2.1 主规则 + CASEBOOK 12 组 + 8 条规则 + 模拟三必填 | `workspace/knowledge/`、`agent-inventory-assist/03_evaluation/` |

**缺的：** 真实 LLM、飞书 Bot、OMS 轮询、状态表、回复总结、端到端演示。

---

## 3. 任务拆解与执行结果

### 任务 1：真实 LLM 接入

**目标：** 把 `mock-llm.ts` 替换成真实 LiteLLM API 调用。

**验收标准：**

- [ ] 真实 LLM 调用，不用假数据
- [ ] 3 类文本生成：追问话术 / 补资料话术 / SOP 草稿（+ 转人工理由）
- [ ] 追问话术像人话（"您好，这张增值单还缺以下信息：…"）
- [ ] SOP 不编造单号/SKU/数量
- [ ] LLM 失败时降级 transfer_human + llmError

**实际产出：**

| 文件 | 说明 |
|------|------|
| `lib/llm-client.ts` | LiteLLM API 封装（fetch + timeout + 重试） |
| `lib/generate-text.ts` | 按 outputPath 分支选 prompt → 调 LLM → 安全检查 |
| `prompts/requirement-clarification.md` | 追问话术 prompt |
| `prompts/field-clarification.md` | 补资料话术 prompt |
| `prompts/sop-generate.md` | SOP 草稿 prompt |
| `prompts/transfer-human.md` | 转人工理由 prompt |
| `lib/env.ts` | .env 加载，凭证不进代码 |

**安全机制（加分项）：**

- `looksInvented()`：检测 LLM 输出中是否包含输入以外的 VASC/EB/WI 单号，有则报错
- `assertNoForbidden()`：拦截"AI 已审核通过""自动通过"等禁止表述
- `generateLlmTextSafe()`：所有异常 catch 后返回 error 字段，不中断管线

**验证结果：**

| 测试 | 结果 |
|------|------|
| 单条（VASC000000348477） | `needs_field_clarification`，LLM 生成"您好，该增值单需求内容已确认，但还缺少以下资料：…" |
| 16 条回归 | 0 LLM 失败，分流与 mock 一致 |
| 7 条 L1-L4 | 全部真实 LLM，4 条 SOP 引用了真实 EB/WI |
| 故意无效 key | 输出 `transfer_human` + `llmError`，流程 exit 0 |

**完成状态：已完成 | 质量评分：9/10**

瑕疵：L1 追问话术里把未匹配场景的附件白名单也塞给了 LLM，导致追问了不该追问的附件。

---

### 任务 2：飞书 Bot 群聊链路

**目标：** Bot 能在测试群发消息、@人、创建话题、读取回复。

**验收标准：**

- [ ] 测试群出现消息
- [ ] 能 @指定人
- [ ] 能创建话题，后续消息在话题内
- [ ] 能拉取话题回复
- [ ] 同一单不重复发

**实际产出：**

| 文件 | 说明 |
|------|------|
| `lib/feishu-bot.ts` | 飞书 Open API 封装：getToken / sendGroupMessage / createThread / getThreadMessages / mentionUser / sendDedupedOrderMessage |
| `lib/feishu-user-token.ts` | 用户 OAuth 登录 + token 刷新 + 文件持久化 |
| `scripts/test-feishu-bot.ts` | 7 步连通性测试脚本 |
| `scripts/feishu-login.ts` | 本地 OAuth 登录（localhost:9988 回调） |

**验证结果：**

| 测试 | 结果 |
|------|------|
| 连通性 7/7 | token 获取、发消息、@人、创建话题、话题回复、读取回复、去重 |
| AI 标记 | 从 `[AI辅助审核]` 改为正文末尾 💪，标题用业务文案 |
| 真人身份 | OAuth 登录成功（金萤），user_access_token 发群验证通过 |
| 16 条轮询发群 | 1 条缺资料 + 15 条转人工全部发送成功 |
| 7 条 E2E 发群 | L1/L2/L3/L4 全发送成功 |

**完成状态：已完成 | 质量评分：9/10**

过程中曾遇到 `99991679` 权限报错，原因是 OAuth scope 名与 API 权限标识不一致。修复 scope 后解决。

---

### 任务 3：OMS 轮询 + 状态表

**目标：** 定时拉待审核单 + 每条单有状态记录，避免重复处理。

**验收标准：**

- [ ] 手动触发拉单
- [ ] 10 分钟定时轮询
- [ ] 去重（同一单不重复处理）
- [ ] case-store 字段完整
- [ ] 异常写日志不中断
- [ ] 状态流转：pending → first_assessed → clarification_sent → awaiting_reply → reply_received → sop_ready / transferred

**实际产出：**

| 文件 | 说明 |
|------|------|
| `lib/case-store.ts` | JSON 文件持久化的案件状态表 |
| `scripts/poll-and-assess.ts` | 主循环脚本（`--once` / `--interval 600`） |
| `lib/run-pipeline.ts` | 统一管线执行器（串联 6 节点 + LLM） |

**状态机设计：**

```
pending → first_assessed → clarification_sent → awaiting_reply → reply_received → reassessed → sop_ready
                                                                                              → written_back
         → transferred（match-template 不支持 / LLM 失败）
```

附加：4 小时无回复催一次（`maybeRemind`，`REMIND_AFTER_MS = 4h`）

**验证结果：**

| 测试 | 结果 |
|------|------|
| `--once` 16 条 | 全部处理，case-store 写入 16 条记录 |
| 二轮 `--once` | 16 条全部 `skip_existing`，无重复发送 |
| `--send-feishu` | 1 条缺资料 + 15 条转人工全部发群 |
| 日志 | `poll.log` 两轮完整记录（assess/skip/feishu_sent/feishu_transfer_sent） |

**2026-09-07 补充验证：**

| 测试 | 结果 |
|------|------|
| 4 小时催办 | **通过** — `VASC000000348477` 在 `awaiting_reply` 状态下，`clarificationSentAt` 距今超 4 天，运行 `--once` 后成功触发催办消息发群（`reminded VASC000000348477 skipped=false`），`reminderSentAt` 已写入 case-store |
| 不重复催 | **通过** — `reminderSentAt` 已有值，再跑不会再催（代码第 242 行 guard） |
| 定时轮询代码 | **代码确认正确** — `setInterval(runOnce, seconds * 1000)` 在 `--interval` 模式下生效，但未做长时间稳定性测试 |

日志：`_runs/20260907_remind_test/poll.log`

**完成状态：代码完成，催办已验证 | 质量评分：8/10**

| 定时轮询（`--interval 120`） | **通过** — 4 轮循环，间隔 120s 精确，第 1 轮 assessed 16 条，第 2-4 轮全部 skip_existing，无崩溃 |

日志：`_runs/20260907_interval_test/poll.log`

**完成状态：代码完成，核心功能已验证 | 质量评分：8.5/10**

| 真实群回复 → 再评估 | **通过**（09-07 实测）— 在飞书话题里手动回复 1 条（不需要 @），运行 `--once` 后：`reply_received n=1` → `reassessed` → 审核备注已写入 case-store |

日志：`_runs/20260907_reply_test/poll.log`

**完成状态：已完成 | 质量评分：9/10**

仍未验证项：
- 长时间运行（数小时/天级）的 Cookie 过期和内存稳定性未测（需部署到服务器后观察）

---

### 任务 4：审核规则回归 + 结构化输出

**目标：** 确保已有规则在真实 LLM 下仍然正确。

**验收标准：**

- [ ] 16 条分流与 mock 一致
- [ ] 结构化 JSON 输出
- [ ] 处理方式默认"暂时"

**实际产出：**

| 文件 | 说明 |
|------|------|
| `_runs/20260903_internal_review_llm_16/gate-comparison.md` | 详细对比：当前规则 vs 09-02 mock |
| `_runs/20260903_internal_review_llm_16/structured-reviews.json` | 16 条结构化审核结果 |
| `lib/format-output.ts` → `buildStructuredReview()` | 结构化 JSON 输出函数 |

**结构化输出格式：**

```json
{
  "vascNo": "VASC000000348477",
  "requirementComplete": true,
  "missingRequirements": [],
  "sceneMatch": { "decision": "supported", "topScene": "inbound_label_identify", "confidence": 1 },
  "materialsComplete": false,
  "missingMaterials": ["操作说明附件", "商品和标签的对应关系"],
  "outputPath": "needs_field_clarification",
  "llmGeneratedText": "您好，该增值单需求内容已确认，但还缺少以下资料：...",
  "transferReason": null,
  "processingMethod": "暂时",
  "riskFlags": [],
  "llmError": null
}
```

**回归对比（`gate-comparison.md`）：**

| 口径 | 09-02 mock | 09-03 当前 + 真实 LLM |
|------|---:|---:|
| needs_requirement_clarification | 1 | 0 |
| needs_field_clarification | 1 | 1 |
| transfer_human | 14 | 15 |

唯一变化：`VASC000000348495` 从 `check-requirement` 停在"数量或范围" → 当前规则不再把数量当硬缺失，进入 `match-template`，reason=`unsupported_direct_scan_shelve`。这是规则文件本身的既有口径修正，不是 LLM 改判。

**完成状态：已完成 | 质量评分：9/10**

D+4 加分项（单据存在性校验）未做，符合预期。

---

### 任务 5：回复总结 + 可复制审核备注

**目标：** 群内收到回复后，AI 总结为审核员可用的结构化备注。

**验收标准：**

- [ ] 输出格式：客户原始需求 / AI 补全后需求 / 补充来源 / 仍缺失 / 建议 / SOP 草稿
- [ ] 可直接复制粘贴

**实际产出：**

| 文件 | 说明 |
|------|------|
| `lib/summarize-reply.ts` | LLM 总结 + fallback 模板 |
| `prompts/summarize-reply.md` | 总结 prompt |

**审核备注示例（`VASC000000348477`，模拟回复后）：**

```
=== 增值单审核辅助 ===
单号：VASC000000348477
客户：广州德诺汽配有限公司
仓库：CATO Warehouse

【客户原始需求】
包裹上面有SKU标签,需要你们一箱箱查看是哪个SKU...

【AI 补全后需求】
场景识别为入库-尺重/标签辨识后换标上架；已上传附件 111.png

【本次补充来源】
销售(demo)在话题中回复：操作说明见群内图片，商品和标签对应关系已上传附件

【仍缺失的信息】
需确认群内图片和新附件是否完整覆盖操作说明和SKU-条码对应关系

【建议审核动作】
人工核实附件完整性；完整且可操作则人工审核通过；不完整则继续跟进

【SOP 草稿】
未生成
```

**完成状态：已完成 | 质量评分：7/10**

未验证项：
- 只测了 `--simulate-reply`，没有真实群回复 → summarize 的完整链路
- 部分单（如 333147）备注里"客户/仓库"显示"未提供"，oms-adapter 字段兜底不完善

---

### 任务 6：Demo 与试点验收包

**目标：** 把任务 1-5 串成可演示的端到端流程。

**验收标准：**

- [ ] demo-e2e.ts 端到端跑通
- [ ] pilot-runbook.md 试点手册
- [ ] export-pilot-log.ts 日志导出
- [ ] D+2 演示命令可直接复制

**实际产出：**

| 文件 | 说明 |
|------|------|
| `scripts/demo-e2e.ts` | 端到端演示脚本（`--order` / `--send-feishu` / `--simulate-reply` / `--force-send`） |
| `docs/pilot-runbook.md` | 试点运行手册（配置/场景/命令/兜底/回滚） |
| `scripts/export-pilot-log.ts` | 日报导出（pilot-daily.md + pilot-daily.json） |
| `_runs/20260904_demo_cases/demo_commands.md` | 7 条演示命令可直接复制 |

**demo-e2e.ts 演示步骤：**

```
步骤 1：选一条真实待审核单
步骤 2：AI 判定（需求完整性 → 场景匹配 → 附件完整性 → 结论）
步骤 3：发飞书群消息（追问 / 转人工 / SOP）
步骤 4：等待回复（或 --simulate-reply）
步骤 5：AI 总结回复 → 输出审核备注
步骤 6：SOP 草稿（如资料齐全）
```

**试点日报示例（`pilot-daily.md`）：**

| 指标 | 数值 |
|------|------|
| 总单数 | 16 |
| SOP 草稿 | 0 |
| 转人工 | 15 |
| 人工再评估 | 0 |
| LLM 失败 | 0 |

**完成状态：已完成 | 质量评分：9/10**

---

### 追加任务 A：飞书连通测试 + AI 标记改造

**触发：** 验收任务 2 时发现需要改 AI 标记策略（从 `[AI辅助审核]` 改为 💪）。

**改动：** `feishu-bot.ts` 标题不再自动拼 AI_TAG；正文最后一行追加 💪；`summarize-reply.ts` 过滤条件同步改。

**验证：** test-feishu-bot.ts 7/7 通过。测试群消息标题为正常业务文案，末尾有 💪。

---

### 追加任务 B：真人 OAuth 登录

**触发：** 业务方希望消息看起来像审核员本人发的。

**改动：** 新建 `feishu-user-token.ts`（OAuth code exchange + refresh）、`feishu-login.ts`（本地 HTTP server + 浏览器授权）。`getToken()` 优先级：环境变量 → 本地 token 文件（可 refresh）→ 机器人 tenant。

**验证：** 浏览器授权成功，token 文件生成，身份为"金萤"。发群验证通过（feishu-e2e-report 确认 user_file 身份）。

**过程问题：** OAuth scope 名（`im:message.send_as_user`）与 API 权限标识（`im:message:send`）不一致，经过 3 轮调试修复。

---

### 追加任务 C：L4 用例构造

**触发：** 183 条历史 F-001 单跑 pipeline 有 L1/L2/L3 但 0 条 L4（OMS 附件记录不全）。

**方法：** 从 183 条中经 6 步漏斗筛选（PD + 审核通过 + SOP>100字 + 有背景/描述 + 有EB+WI + 补附件后确定性通过），选出 4 条 L4。只向 `vaAtomFiles` 追加三必填附件的 fileType 记录，不改业务字段。

**验证：** 4 条全部 `sop_generated`，真实 LLM 生成 SOP，无编造单号。

| orderNo | 仓库 | 展示内容 |
|---|---|---|
| VASC000000333147 | AU | 按箱序辨识并补贴 Winit 包裹条码 |
| VASC000000326061 | USKY5 | 多 SKU 辨识后按两张新单分别上架 |
| VASC000000143515 | DEBR2 | 按产品型号辨识并更换条码 |
| VASC000000080416 | UKGF | 已开箱编号与尺重规则结合辨识上架 |

产出文件：`_runs/20260904_demo_cases/selection.md`、`l4_patched_details.json`、`candidate-analysis.json`

---

### 追加任务 D：飞书 E2E 7 条发群

**触发：** L4 构造完成后，需要把 L1-L4 全部发到测试群验证完整效果。

**结果（`feishu-e2e-report.md`）：**

| 层级 | orderNo | 消息类型 | 验收 |
|---|---|---|---|
| L1 | VASC000000183069 | 缺需求 | 通过 |
| L2 | VASC000000344421 | 转人工 | 通过 |
| L3 | VASC000000343821 | 缺资料 | 通过 |
| L4 | VASC000000333147 | SOP 草稿 | 通过 |
| L4 | VASC000000326061 | SOP 草稿 | 通过 |
| L4 | VASC000000143515 | SOP 草稿 | 通过 |
| L4 | VASC000000080416 | SOP 草稿 | 通过（首次降级后重试成功） |

降级记录：080416 首次 LLM 输出未解析成 JSON，按设计降级为 `transfer_human` 并发了一条转人工消息；重试后 SOP 成功补发。群内保留降级消息用于演示异常处理。

---

### 追加任务 E：端到端集成验证

**触发：** 验收飞书 E2E 后，需要串联所有模块做完整 integration test。

**验证项目（`integration-report.md`，11 项全通过）：**

| 步骤 | 结果 |
|------|------|
| 真实单 AI 判定 | 通过 |
| 真实 LLM 追问 | 通过 |
| 飞书发群（业务标题 + @人 + 💪） | 通过 |
| 话题创建 | 通过 |
| 模拟回复总结 | 通过 |
| 16 单轮询 | 通过 |
| 转人工通知 | 通过（15 条） |
| 缺资料通知 | 通过 |
| 二次轮询去重 | 通过 |
| LLM 失败降级 | 通过 |
| 日报导出 | 通过 |

**集成中发现并修复的 8 个问题：**

1. 演示日志过于偏技术 → 改为中文摘要
2. 飞书发送失败会中断 → 加 try/catch 继续
3. 飞书标题与手机排版 → 去掉 Markdown 标记
4. 轮询未通知转人工案件 → 增加 transfer_human 飞书通知
5. 话题 ID 与根消息 ID 混用 → 回复用 `om_`，读话题用 `omt_`
6. OMS 拉取失败没有回退 → 增加 `--fallback-input`
7. 真人代发权限 → 修复 OAuth scope
8. LLM 失败时标题不一致 → 降级后标题改为"转人工"

---

## 4. 产出文件索引

### 核心代码（`internal-review-copilot/`）

| 目录 | 文件 | 说明 |
|------|------|------|
| `lib/` | `llm-client.ts` | LiteLLM API 封装 |
| | `generate-text.ts` | 3 类文本生成 + 安全检查 |
| | `run-pipeline.ts` | 统一管线执行器 |
| | `feishu-bot.ts` | 飞书 Open API 封装 |
| | `feishu-user-token.ts` | 用户 OAuth + token 刷新 |
| | `case-store.ts` | 案件状态表（JSON 持久化） |
| | `summarize-reply.ts` | 回复总结 |
| | `format-output.ts` | 结构化输出 + 审核 JSON |
| | `env.ts` | .env 加载 |
| | `check-requirement.ts` | 需求完整性门禁（已有） |
| | `match-template.ts` | 场景匹配 v0.2（已有） |
| | `check-completeness.ts` | 附件/字段校验（已有） |
| | `context-bind.ts` | OMS 事实绑定（已有） |
| | `oms-adapter.ts` | OMS 字段适配器（已有） |
| | `types.ts` | 类型定义 |
| `prompts/` | `requirement-clarification.md` | 追问话术 prompt |
| | `field-clarification.md` | 补资料话术 prompt |
| | `sop-generate.md` | SOP 草稿 prompt |
| | `transfer-human.md` | 转人工理由 prompt |
| | `summarize-reply.md` | 回复总结 prompt |
| `scripts/` | `demo-e2e.ts` | 端到端演示 |
| | `poll-and-assess.ts` | 轮询 + 评估主循环 |
| | `test-feishu-bot.ts` | 飞书连通测试 |
| | `feishu-login.ts` | OAuth 登录 |
| | `export-pilot-log.ts` | 日报导出 |
| | `build-l4-demo-cases.ts` | L4 用例构造 |
| | `run-internal-review-dryrun.ts` | 批量 dry-run |
| | `pull_ow01v1602_review_orders.mjs` | OMS 拉单 |
| `docs/` | `pilot-runbook.md` | 试点手册 |

### 运行产物（`_runs/`）

| 目录 | 说明 |
|------|------|
| `20260903_internal_review_llm_smoke/` | 单条（348477）真实 LLM 验证 |
| `20260903_internal_review_llm_16/` | 16 条回归（含 gate-comparison.md） |
| `20260903_internal_review_demo/` | 单条演示产物 |
| `20260903_pilot_export/` | 试点日报 |
| `20260904_demo_cases/` | 7 条 L1-L4 演示集 + 飞书 E2E 结果 |
| `20260904_e2e_integration/` | 端到端集成报告 + 各环节产物 |

---

## 5. 运行结果汇总

### 5.1 分流分布（7 条 demo 集，真实 LLM）

| outputPath | 条数 | 占比 |
|---|---:|---|
| needs_requirement_clarification (L1) | 1 | 14% |
| transfer_human (L2) | 1 | 14% |
| needs_field_clarification (L3) | 1 | 14% |
| sop_generated (L4) | 4 | 57% |

### 5.2 16 条当日待审核单（真实 LLM）

| outputPath | 条数 |
|---|---:|
| transfer_human | 15 |
| needs_field_clarification | 1 |

### 5.3 LLM 成功率

| 数据集 | 总数 | LLM 成功 | LLM 失败 |
|---|---:|---:|---:|
| 16 条回归 | 16 | 16 | 0 |
| 7 条 demo | 7 | 7 | 0 |
| 降级测试 | 1 | 0 | 1（预期） |

### 5.4 飞书发送

| 场景 | 条数 | 成功 |
|---|---:|---:|
| 16 条轮询发群 | 16 | 16 |
| 7 条 L1-L4 E2E | 7 | 7 |
| 连通测试 | 7 步 | 7 |

---

## 6. 未完成项与遗留风险

| # | 缺口 | 影响 | 优先级 |
|---|------|------|--------|
| 1 | **真实群回复 → AI 再评估** 未端到端测 | 试点时客服回复后 AI 不一定能接上 | 高 |
| 2 | **定时轮询未长跑** | 服务器部署后可能有 Cookie 过期/内存泄漏 | 高 |
| 3 | **当天新单未拉过** | 09-02 后没拉过，OMS Cookie 可能过期 | 高 |
| 4 | **L1 追问多列附件** | 未匹配场景时不该按 F-001 白名单追问 | 中 |
| 5 | **部分单备注缺客户/仓库** | oms-adapter 字段兜底不完善 | 低 |
| 6 | **OMS 回写未做** | 会议约定的"AI 修正后写入备注"未实现 | D+4 加分，已明确推迟 |
| 7 | **单据存在性校验未做** | EB/WI 归属验证 | D+4 加分，已明确推迟 |
| 8 | **服务器部署（PM2/systemd）** | poll-and-assess.ts 需要进程管理 | 试点前必做 |
| 9 | **代码未 commit** | 09-03 18:17 后的改动在 working directory | 立即处理 |

---

## 7. Git 状态

| 项 | 状态 |
|---|---|
| 最后 commit | `7156f7c` docs+feat: agent workflow design... (2026-09-03) |
| 最后 push | 同上，推到 `docs/two-phase-internal-proposal` 分支 |
| 未提交改动 | 09-03 17:45 → 18:17 之间的文件变动（feishu E2E、L4 构造、demo_commands、集成修复等） |
| remote | `https://github.com/ying9997/Nonsta_Valueadded_Combined.git` |

**需立即 commit + push 的内容：**
- `_runs/20260904_demo_cases/` 飞书 E2E 结果和 demo 命令
- `_runs/20260904_e2e_integration/` 集成报告
- `internal-review-copilot/scripts/demo-e2e.ts` 集成修复
- `internal-review-copilot/lib/feishu-bot.ts` AI 标记改造
- `.gitignore` 更新
