# 内部审核 Copilot 试点运行手册

适用窗口：D+2 演示（2026-09-05）→ D+4 试点（2026-09-07）。  
范围：内部审核短期闭环。不做万邑联联调、不做客户侧 AI 客服、不自动审核通过/驳回。

## 试点群配置

环境变量（只放在 `.env` 或服务器环境，禁止写入代码）：

| 变量 | 用途 |
| --- | --- |
| `LITELLM_BASE_URL` / `LITELLM_API_KEY` | 真实 LLM |
| `LITELLM_MODEL` | 可选，默认 `claude-sonnet-4-5` |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书应用 |
| `FEISHU_TEST_CHAT_ID` | 试点/测试群 |
| `FEISHU_TEST_USER_ID` / `FEISHU_TEST_USER_NAME` | 测试时 @ 的人 |
| `FEISHU_REDIRECT_URI` | 可选，默认 `http://localhost:9988/callback` |

真人代发（优先）：先跑 `feishu-login.ts` 拿 `user_access_token`，写入 gitignore 的 `.feishu-user-token.json`。过期会尝试 refresh，失败则静默降级为机器人 `tenant_access_token`。不要把 user token 写进 `.env`。

开放平台还要同时满足：

1. 重定向 URL 含 `http://localhost:9988/callback`
2. **用户身份**权限开通 `im:message.send_as_user`（只开机器人权限不够）
3. 权限变更后如需版本发布，发布完成再重新跑登录

连通性：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/feishu-login.ts
npx tsx internal-review-copilot/scripts/test-feishu-bot.ts
```

群内 AI 消息标题用正常业务文字（如「增值单 VASC… 缺资料」），正文末尾带内部识别标记 💪，不在标题里写 AI。同一单同一话题不重复发。

## 试点场景限定

当前只自动支持 **F-001**（入库尺重/标签辨识后换标上架）。

| 规则结果 | 含义 | 群动作 |
| --- | --- | --- |
| `needs_requirement_clarification` | 需求要素不够，未进场景匹配 | 向客服/销售追问 |
| `needs_field_clarification` | 已识别 F-001，缺必填附件/字段 | 请补资料 |
| `transfer_human` | 非 F-001 / 歧义 / LLM 失败 | 通知审核员，不套模板 |
| `sop_generated` | 资料齐 | 只出 SOP 草稿，人工确认 |

「拦截不上架 / 先放一边 / 暂存不上架」不命中 F-001，一律转人工。  
处理方式默认「暂时」，不改时效字段。

## 日常命令

单次评估（可用已拉 details，不必每次打 OMS）：

```powershell
npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once --date 2026-09-03 --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders\details.json --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260903_internal_review_poll
```

定时轮询（每 10 分钟）：

```powershell
npx tsx internal-review-copilot/scripts/poll-and-assess.ts --interval 600 --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260903_internal_review_poll
```

端到端演示：

```powershell
npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "操作说明和商品标签对应关系稍后补到群里"
```

每日导出：

```powershell
npx tsx internal-review-copilot/scripts/export-pilot-log.ts --store D:\DA\Nonsta_Valueadded_Combined\_runs\20260903_internal_review_poll\case-store.json --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260903_pilot_export
```

## 人工兜底

- AI 只给建议，不改 OMS 审核状态，不自动通过/驳回。
- 任何 `transfer_human` / `llmError` 都视为转审核员。
- 群消息发出后仍由客服/销售/审核员决定是否追问客户。
- 回复总结只生成可复制备注；D+4 前不自动写回 OMS。
- 规则不确定时 `outputPath=transfer_human`，并尽量带 `riskFlags`（例如「单据归属未验证」）。

## 回滚

1. 停掉 `poll-and-assess.ts --interval` 进程（关掉定时任务即回滚）。
2. 不要删除 case-store，便于复盘。
3. 本试点不改 OMS 客户原文，也不改审核状态；回滚不影响业务系统数据。

## 每日导出格式

`export-pilot-log.ts` 产出：

- `pilot-daily.md`：总单数、SOP 数、转人工数、人工再评估数、LLM 失败数、明细表
- `pilot-daily.json`：同一份机器可读数据

「AI 判对」在试点期按审核员是否改写 `aiOutputPath` / 是否转入 `reassessed` 人工修正来统计，不把规则分流当金标。
