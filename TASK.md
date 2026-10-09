# TASK.md

## 使用规则
- 所有新会话只从本文件选择任务；Cursor 历史、handoff、聊天记录、_workflow 只能作为证据来源，不能直接当执行入口。
- 发现遗漏任务时，先补到本文件并标明证据路径或样本单号，再决定是否开工。
- 本文件目前是已确认任务池，不代表 Cursor 历史已完整盘点完毕。
- 会话粒度：一个 Codex/Cursor 会话只承接一个 TASK 编号；强相关子项可在同一会话完成，但不能把不同编号混成一批改动。
- 执行记录：任务开工后，在对应条目后补「执行会话/分支/验证命令/结果」；完成后再勾选，不以“代码已改”作为完成标准。
- 收尾要求：每个任务结束前必须回写本文件，说明完成、阻塞、转后续任务或等待人工授权。
- 会话准入：每个执行会话的 prompt 必须提前写清楚「agent 自验证步骤」「人工验收步骤」「40 部署准入门槛」；缺任一项不得开始改代码。
- 40 准入：只有本机 unit/integration/E2E 或等价只读验证通过、产出验证报告、用户人工确认报告接受、用户明确授权部署 40 后，才允许动 40。
- Prompt 入口：可复制的新会话 prompt 统一放在根目录 `task-prompts/`；新增/调整任务时优先更新对应 prompt 文件。
- 最终 E2E 验收群：需要发飞书做端到端人工验收时，统一发到 `oc_d45527b0abea480fcca82c269798c376`；发送前必须列出 VASC 单号、预期结果、是否会写 OMS/TOM，并等待用户明确授权发送。

## 当前唯一主线
- [ ] P0-001 智能审核助手：确认 L2.5 卡片文案本机修复是否通过人工查验

## P0 当前优先队列
- [ ] P0-002 修人工回复监听与 reply_received 回流闭环：确认 IM 话题回复/艾特是否被监听、识别、重评并收录 badcase
- [ ] P0-003 建立 L1/L2.5 线上质量对照框架：对照 AI 初判与人工终态，定位场景、缺失项、需求理解、必填规则和回流闭环问题
- [ ] P0-004 整理当前 git 脏工作区，拆出可提交改动和实验产物
- [ ] P0-005 放宽 40 轮询白名单：加入 OW01V1654 包裹串仓异常调拨【非标】和 OSF6V1646 货权转移（换标模式）【非标】，先本机验证，未授权不部署 40
- [ ] P0-006 修 SOP 生成失败兜底机制：覆盖 JSON 解析失败和模型不可用失败，样本 VASC000000448800 / VASC000000421227
- [ ] P0-007 梳理标签文件链路：确认标签文件从哪个 OMS/TOM/附件接口下载、是否需要转存/上传、SOP/卡片里如何引用（注意要区分客户上传的文件，要在文件名加个前缀“AI上传-”）
- [ ] P0-008 扩展 workflow 和轮询白名单到出库：确认出库服务码/场景码、出库订单事实字段、白名单入口和本机验证样本
- [ ] P0-009 修 L2.5 误路由到 L1/错误卡片问题：缺场景字段/附件时必须按 L2.5 资料待补充展示，不再展示“客户需求描述不完整”；历史 `needs_requirement_clarification + check-completeness` 样本也应按 L2.5 解释
  - 执行记录（2026-10-09，本会话）：与 P0-002A 面板层级合并处理，只做本机修改和验证，未部署 40、未写 OMS、未触发线上重评。
  - 修改文件：`internal-review-copilot/lib/feishu-card.ts`、`internal-review-copilot/scripts/test-feishu-card.ts`、`internal-review-copilot/scripts/build-reply-status-panel.ts`、`internal-review-copilot/scripts/test-reply-status-panel.ts`。
  - 报告路径：`internal-review-copilot/_runs/20261009_reply_status_panel/p0-002a-p0-009-local-verification-report.md`。
  - 验证命令：`npx tsx scripts/test-feishu-card.ts`；`npx tsx scripts/test-g2-pipeline.ts`；`npx tsx scripts/test-reassess-loop.ts`；`npx tsx scripts/test-reply-status-panel.ts`；`npx tsx scripts/build-reply-status-panel.ts --store _runs/20261008_l1_l25_readonly/case-store.json --poll-log _runs/20261008_l1_l25_readonly/poll.log --listen-log _runs/20261008_l1_l25_readonly/listen.log --out _runs/20261009_reply_status_panel --fetch-threads`。
  - 结果：本机验证通过；L2.5 历史 `needs_requirement_clarification + check-completeness` 卡片改为 `资料待补充 / 以下场景资料需要补充`；等待人工确认是否允许部署 40。
- [ ] P0-010 修 context/tool facts 未用于完整性判断：把 OMS 字段、商品明细、附件文件名、场景概述作为 L2.5 已知事实参与判定；优先子方向为 `VASC000000420921` 的 WI -> `oms.SystemOrderService_queryPackageInfos` 数量事实链路（`WI53076935` 需映射/查询为 11 位 `SYSTEM_ORDER_NO=WI530769351`）
  - 执行记录（2026-10-09，本会话）：只执行 P0-010 原子修复中的 package facts 注入；未改场景识别、未改 requiredInfoFields / requiredAttachments、未改 reply_received 状态机；未部署 40、未写 OMS/TOM、未触发线上重评、未改现网 Query / recaller。
  - 修改文件：`internal-review-copilot/lib/package-info-facts.ts`、`internal-review-copilot/lib/run-pipeline.ts`、`internal-review-copilot/lib/check-scene-completeness.ts`、`internal-review-copilot/scripts/test-g2-pipeline.ts`、`internal-review-copilot/_runs/20261009_p0_010_package_info_facts/p0-010-local-verification-report.md`、`TASK.md`。
  - 验证命令：`npx tsx scripts/test-oms-adapter.ts`；`npx tsx scripts/test-g2-pipeline.ts`。
  - 验证结果：通过；mock 回归确认 10 位 `WI53076935` 不会直接作为 package `systemOrderNo` 查询，解析到 11 位 `WI530769351` 后注入 `增值包裹数量：241`、`增值单品数量：241`、`增值商品数量：11`；空 `systemOrderNo` 不调用 `queryPackageInfos`。
  - 报告路径：`internal-review-copilot/_runs/20261009_p0_010_package_info_facts/p0-010-local-verification-report.md`。
  - Git 状态提示：`TASK.md`、`task-prompts/`、`oms.SystemOrderService_queryPackageInfos-api.md` 当前仍是 untracked；本次执行记录、prompt 目录和接口文档不代表已经被提交。`internal-review-copilot/_runs/` 报告按仓库规则只做本机归档，不默认提交。
  - 当前状态：本机原子修复完成；等待人工确认是否接受报告，40 部署仍需另行授权。
- [ ] P0-011 修必填附件/字段规则过严或过松：基于人工终态和样本非空率调整场景卡 requiredInfoFields / requiredAttachments
- [ ] P0-012 增强 AI/人工对照数据结构：记录 AI 初判出口、人工终态出口、缺失项差异、需求理解差异、回流状态和建议修复桶
- [ ] P0-013 建线上质量日报/看板：按场景错误、缺失项误判、需求描述被改、SOP 被改、reply_received 未闭环聚合
- [ ] P0-014 建立 reply 后 badcase 闭环优化体系：reply_received 后重新读取 OMS 事实，落独立闭环表，先分桶再决定修 OMS facts / 知识库 / 召回 / 场景卡 / L2 场景识别 / 多轮上下文；固定 gold cases 回归集，防止“修一个坏两个”

## P1 下一批
- [ ] P1-001 修 L2 场景识别/场景卡问题（当前对照里 51 条场景认错）
  - 执行记录（2026-10-09，本会话）：只执行 `VASC000000416175` 原子修复；未处理全部 51 条场景认错；未部署 40、未写 OMS/TOM、未触发线上重评、未改现网 Query/recaller；未改 `P0-010` facts 注入、未改 `P0-011` 必填口径、未改 `reply_received` 状态机。
  - 证据结论：`416175` AI 初判 `【库内】商品组合` 与人工终态 `【库内】异常重新拍照` 不一致，应作为 L2 场景识别回归；不能用商品组合的 L2.5 完整性必填项追问掩盖场景识别问题。
  - 修改文件：`internal-review-copilot/lib/match-template.ts`、`internal-review-copilot/scripts/test-match-template-v02.ts`、`internal-review-copilot/CHANGELOG.md`、`TASK.md`。
  - 报告路径：`internal-review-copilot/_runs/20261009_p1_001_l2_scene_416175/p1-001-416175-local-verification-report.md`。
  - 验证命令：`npx tsx scripts/test-match-template-v02.ts`；`npx tsx scripts/test-g2-pipeline.ts`；`npx tsx scripts/test-reply-closure.ts`。
  - 验证结果：通过；`regression-vasc416175-instock-exception-rephoto` 实际 `decision=supported`、`sceneKey=instock_exception_rephoto`、`topK=[instock_exception_rephoto score=8]`。
  - Git 状态提示：`TASK.md` 和 `task-prompts/` 当前仍是 untracked；本次执行记录和 prompt 目录状态不代表已经被提交。`_runs/` 报告按仓库规则只做本机归档，不默认提交。
- [ ] P1-002 完成 dashboard / 本机验证报告归档
- [ ] P1-003 页面桥接线：确认测试 Bot 是否绑定 v2p_link
- [ ] P1-004 页面桥接线：拿 EDS 测试页 URL 做真页联调
- [ ] P1-005 盘点 Cursor/历史 handoff/_workflow 中未入 TASK.md 的遗留任务，只补任务名和证据路径，不直接改代码

## P0-002 拆分口径：人工回复监听与回流闭环
- [ ] P0-002A 排查 reply_received 回流未闭环问题（7 单）：定位 `reassess_missing_detail`、case-store 状态、详情缓存和重评触发断点，并验证审核员否定 AI 缺失项时能否记录 badcase / 进入自循环。必验样本：`VASC000000448314`（不需要补充对应关系）、`VASC000000420921`（新单据可判断数量）、`VASC000000411852`（无时间戳要求）
  - 执行记录（2026-10-09，本会话）：仅修用户明确授权的 reply status panel 层级展示；未实现 badcase 规则学习/自循环写入；未部署 40、未写 OMS、未触发线上重评。
  - 报告路径：`internal-review-copilot/_runs/20261009_reply_status_panel/p0-002a-p0-009-local-verification-report.md`。
  - 面板路径：`internal-review-copilot/_runs/20261009_reply_status_panel/reply-status-panel.html`、`reply-status-panel.csv`、`reply-status-panel.json`。
  - 验证结论：7 个 `reply_received` 样本仍卡在 `reassess_missing_detail`，断点为重评输入详情缺失/详情缓存缺失；三个必验样本面板层级已从 `L1` 修正为 `L2.5`，依据为 poll 日志 `gate=check-completeness`。
  - 验证命令：`npx tsx scripts/test-reassess-loop.ts`；`npx tsx scripts/test-reply-status-panel.ts`；`npx tsx scripts/build-reply-status-panel.ts --store _runs/20261008_l1_l25_readonly/case-store.json --poll-log _runs/20261008_l1_l25_readonly/poll.log --listen-log _runs/20261008_l1_l25_readonly/listen.log --out _runs/20261009_reply_status_panel --fetch-threads`。
- [ ] P0-002B 建监听监控面板：监控 agent 是否监听到 IM 话题内人员回复/艾特，展示最后监听时间、监听对象、漏听样本和错误原因；面板层级必须优先按 `failureGate/node` 判断，`check-completeness` 显示为 L2.5。执行会话：`codex://threads/01a11b91-eea4-7943-9c41-bcf92c7fce44`
- [ ] P0-002C 支持监听审核人员艾特/回复：识别是场景错误还是需求描述错误，并返回/收录 badcase。证据：`internal-review-copilot/_runs/20261008_l1_l25_readonly/group-ai-question-contrast.md`；样本 `VASC000000448608`（AI 追问下架单号，审核人员真实追问标签性质/贴标位置）；代码现状见 `scripts/listen-card-actions.ts` 的 `LISTEN_IM` 闸门和 IM 场景搜索分支；监听诊断：`internal-review-copilot/_runs/20261008_l1_l25_readonly/p0-014-listener-badcase-diagnosis.md`
  - 执行记录（2026-10-09，本会话）：先做本机改动和只读面板，未部署 40。新增 `lib/auditor-reply-classifier.ts`、`scripts/test-auditor-reply-classifier.ts`、`scripts/build-reply-status-panel.ts`；在 `scripts/listen-card-actions.ts` 的 IM @bot 分支中收录审核员反馈 badcase，并对 L1/L2.5 追问话题置 `reply_received`，交给后续 poll 状态机重跑。
  - 面板路径：`internal-review-copilot/_runs/20261009_reply_status_panel/reply-status-panel.html`、`reply-status-panel.csv`、`reply-status-panel.json`。面板读取 71 个 L1/L2.5 话题，识别 16 单有人回复、18 单 agent 曾标记收到回复、11 单 workflow 重跑、7 单卡在 `reassess_missing_detail`；样本 `VASC000000448314` 为“审核员已 @增值咨询 但 agent 未标记 reply_received”的正样本。
  - 验证命令：`npx tsx scripts/test-auditor-reply-classifier.ts`；`npx tsx scripts/test-reassess-loop.ts`；`npx tsx scripts/build-reply-status-panel.ts --store _runs/20261008_l1_l25_readonly/case-store.json --poll-log _runs/20261008_l1_l25_readonly/poll.log --listen-log _runs/20261008_l1_l25_readonly/listen.log --out _runs/20261009_reply_status_panel --fetch-threads`。
- [ ] P0-002D 回流重评闭环：收到人工补充/纠错后触发重新评估，更新状态，并写入 AI/人工对照与 badcase 数据
  - 执行记录（2026-10-09，本会话）：按用户补充的 7 个 reply_received 样本做本机闭环表设计与标注分析；未部署 40、未写 OMS/TOM、未触发线上重评。
  - 新增文件：`internal-review-copilot/lib/reply-closure.ts`、`internal-review-copilot/scripts/test-reply-closure.ts`、`internal-review-copilot/scripts/analyze-reply-closure.ts`。
  - 报告路径：`internal-review-copilot/_runs/20261009_reply_closure/reply-closure-report.md`；结构化表：`reply-closure-table.json`、`reply-closure-log.jsonl`。只读 OMS 复核产物：`internal-review-copilot/_runs/20261009_reply_closure_live/live-oms-readonly.json`。
  - 验证命令：`npx tsx scripts/test-reply-closure.ts`；`npx tsx scripts/test-oms-adapter.ts`；`npx tsx scripts/test-match-template-v02.ts`；`npx tsx scripts/test-reply-status-panel.ts`；`npx tsx scripts/test-reassess-loop.ts`；`npx tsx scripts/analyze-reply-closure.ts --out _runs/20261009_reply_closure`；`npx tsx scripts/analyze-reply-closure.ts --out _runs/20261009_reply_closure_live --live-oms`。
  - 结果：7 样本中 2 单取消排除（391044/403008）、3 单场景错判/场景层级问题（411852/416175/420921）、1 单必填规则 gap（415983：AI 问处理数量，人工真实退回要求上下架单据，按同客户+退回时间后最近通过单关联到 421590）、1 单保留但不纳入优化闭环（420954）。
  - 后续修复入口：reply_received 重跑需要在原单离开待审核列表时读取 `getTraceList/getVasList/getPrepaymentList` 等只读事实并落独立闭环表；415983 优先修上下架单据必填口径，420921 优先修 WI -> `queryPackageInfos` 数量事实链路，416175 单列 L2 场景识别优化。live 复核中 `getTraceList/getVasList` 已读到 415983 真实退回说明和 421590 终态场景；`queryPackageInfos` 已确认接口可通，`where[systemOrderNo]=WI530769351` 返回 `totalElements=241`、首包 `skuQty=1`，调用方必须传 11 位 `SYSTEM_ORDER_NO`，不能传 10 位 `WINIT_ORDER_NO=WI53076935`。

## P0-003 拆分口径：L1/L2.5 线上质量对照
- [ ] P0-003A 只读拉取线上数据：AI 初判、人工审核终态、case-store、poll/listen 日志、ai-human-comparison 对照文件
- [ ] P0-003B 建对照表模板：VASC、AI出口、人工终态、场景差异、缺失项差异、需求理解差异、必填规则问题、context/tool facts 是否可补、回流状态、修复桶
- [ ] P0-003C 抽样归因 5-10 单：每类至少覆盖 L1 误拦、L2.5 误拦/漏拦、场景错判、reply_received 未闭环
- [ ] P0-003D 输出修复优先级：只把明确同根因的问题合并成修复任务，禁止把 L1、L2.5、回流状态机、L2 场景识别混成一个提交

执行记录（2026-10-08，本会话）：
- 会话范围：只做 P0-003 诊断框架和只读分析；未改业务代码；未部署 40；未改现网 Query / recaller；未触发线上 pipeline 重评；未写 OMS。
- 数据源：复用 `internal-review-copilot/_runs/20261008_l1_l25_readonly/` 下 40 只读快照，包括 `case-store.json`、`ai-human-comparison.jsonl`、`poll.log`、`listen.log`、`l1-l25-readonly-details.json`。
- 报告路径：`D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20261008_l1_l25_readonly\p0-003-diagnostic-report.md`。
- 对照表模板/样表：`D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20261008_l1_l25_readonly\p0-003-quality-comparison-template.csv`。
- 验证方式：读取指定源码/脚本和 handoff；核对 case-store 255 单、AI/人工对照 118 条、场景错判 51 条、`reply_received` 7 单；抽样核对 poll.log 中 `reassess_missing_detail` 证据。
- 结论：优先级建议为 F 回流状态机（P0-002）→ E L2.5 路由/卡片（P0-009）→ C context/tool facts（P0-010）→ B 必填字段/附件规则（P0-011）→ P0-012 数据结构增强；场景识别 51 条单列 P1-001，不与 L2.5/回流混修。当前未勾选完成，等待人工确认报告接受。
- 补充（2026-10-08）：用户提供 `VASC000000448608` 群聊真实追问线索（附件标签是否第三方标签、是否直接贴外快递袋）。已改用 `增值咨询` bot（profile: `zengzhi-consult`）拉取 `oc_6566160ccb2def51937469fe8144efdb` 09/16-10/08 群聊：336 条主消息、7 页完整；抽取 439 条 VASC 消息/回复，覆盖 285 个增值单；联表识别 77 个非 bot 真实追问候选。补充产物：`group-vasc-extract.json/csv`、`group-ai-question-contrast.md/csv`；`448608` 已更新为 AI 追问下架单号 vs 人工追问标签性质/贴标位置的差异样本。

## P0-014 拆分口径：reply 后 badcase 闭环优化体系
- [ ] P0-014A reply 后闭环表落地：`reply_received` 后即使原单已经取消/流转出待审核，也要重新读取 OMS 事实，保存 AI 初判、人工回复、审核轨迹、终态场景、关联新单、差异桶；不能只依赖待审核详情缓存
- [ ] P0-014B badcase 分桶与准入：先分桶再决定修哪里；事实/链路缺失修 OMS facts/知识库/召回，必填规则错修场景卡 requiredInfoFields/工具事实注入，场景错判进 L2 场景识别回归集，多轮上下文/指代错进多轮样本集；`VASC000000420954` 这种有回复但不是有效修正的样本不得进入优化闭环
- [ ] P0-014C 固定 gold cases 回归集：`VASC000000391044`、`VASC000000403008` 排除；`VASC000000415983`、`VASC000000420921`、`VASC000000416175`、`VASC000000411852` 分桶保留，每次 workflow 改动都跑，避免回归
- [ ] P0-014D 420921 facts 修复路由：AI 不应直接追问“处理数量或范围”，应先检查是否有上架入库单号；若有，则通过 `oms.SystemOrderService_queryPackageInfos` 查询包裹/商品事实，并把数量作为 context 注入后续 L2.5 判断；具体实现可落到 `P0-010`
- [ ] P0-014E 415983 必填规则修复路由：`【库内】商品拆箱加/减配件` 不是场景错，是必填项规则错，需要补“上下架单据”口径，不能只问处理数量；具体实现可落到 `P0-011`
- [ ] P0-014F 416175 / 411852 场景与规则细分：`416175` 进入 L2 场景识别回归；`411852` 保留为水印/时间戳规则 nuance 样本，不能把时间戳要求粗暴设为所有照片/视频场景必填

执行口径：
- `P0-014` 是体系父任务，不等于直接把所有 badcase 喂给模型；它的产出应是闭环表、分桶报告、固定回归集和后续原子修复任务映射。
- `P0-010` 只覆盖 `420921` 暴露的 OMS/package facts 注入，不代表 `P0-014` 完成。
- `P0-011` 只覆盖必填附件/字段规则，不应混入 reply 状态机或 L2 场景识别。
- `P1-001` 承接 L2 场景识别回归，不应和 L2.5 完整性判断混成一个提交。

执行记录（2026-10-09，本会话）：
- 会话范围：只做 `P0-014` 闭环体系产出与最小本地脚本/测试更新；未部署 40、未写 OMS/TOM、未触发线上重评、未修 `P0-010` / `P0-011` / `P1-001` 原子问题。
- Git 状态提示：`TASK.md` 和 `task-prompts/` 当前仍是 untracked；本次执行记录和 prompt 文件不代表已经被提交。`internal-review-copilot/lib/reply-closure.ts`、`internal-review-copilot/scripts/analyze-reply-closure.ts`、`internal-review-copilot/scripts/test-reply-closure.ts` 也处于 untracked 任务产物状态，后续提交前需要显式纳入或拆分。
- 修改文件：`internal-review-copilot/lib/reply-closure.ts`、`internal-review-copilot/scripts/analyze-reply-closure.ts`、`internal-review-copilot/scripts/test-reply-closure.ts`、`TASK.md`。
- 报告路径：`internal-review-copilot/_runs/20261009_reply_closure_p0_014/reply-closure-report.md`；闭环表：`reply-closure-table.json` / `reply-closure-log.jsonl`；分桶报告：`badcase-bucket-report.md`；gold cases：`gold-cases-regression.json`；A/B 修复效果验收矩阵：`ab-effect-validation.md`。
- 验证命令：`npx tsx scripts/test-reply-closure.ts`；`npx tsx scripts/analyze-reply-closure.ts --out _runs/20261009_reply_closure_p0_014`。
- 验证结果：通过；7 单分桶为 `excluded_cancelled=2`、`context_fact_gap=1`、`required_rule_gap=1`、`l2_scene_recognition=1`、`rule_nuance=1`、`not_actionable=1`。
- 每个样本最终分桶：`391044` / `403008` -> `excluded_cancelled`，排除不进优化闭环；`420921` -> `context_fact_gap`，转 `P0-010`；`415983` -> `required_rule_gap`，转 `P0-011`；`416175` -> `l2_scene_recognition`，转 `P1-001`；`411852` -> `rule_nuance`，作为 `P0-011` 时间戳规则 nuance 保护样本，不能粗暴扩大时间戳必填；`420954` -> `not_actionable`，排除不进优化闭环。
- A/B 口径：`reply 后闭环表` 是 A 侧 baseline/归因表；`ab-effect-validation.md` 是 B 侧修复效果验收矩阵。后续 `P0-010` / `P0-011` / `P1-001` 原子修复必须用同一批 gold cases 回填 B 结果，不能只证明接口可通。
- 当前状态：P0-014 本机闭环体系产出完成；等待后续原子修复会话分别处理 `P0-010` / `P0-011` / `P1-001`。

## 冻结/不做
- [ ] 不部署 40，除非用户明确授权
- [ ] 不改现网 Query / recaller
- [ ] 不把 internal-review-copilot 和 cs-eds-page-bridge 混成一个提交
- [ ] 不提交 _runs、截图、cookie、token、临时实验包
