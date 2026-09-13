# 正式轮询配置核对（2026-09-11）

核对对象：`_runs/20260911_live_poll/case-store.json` 中的 **VASC000000362139**，以及当前运行配置。

## 目标配置

| 项 | 目标 |
|----|------|
| sceneLlm | true |
| sceneLlmVersion | 2 |
| RAG_ENABLED | 0 |
| 场景卡 | 75 |
| OMS_WRITE | 1 |
| allowlist | `*` |

## VASC000000362139（重启前已处理单）

| 字段 | 实际值 | 是否符合目标 |
|------|--------|----------------|
| status | `awaiting_scene_confirm` | 已发卡，不重复评估 |
| aiOutputPath | `transfer_human` | L2 出口 |
| `matchResult.llmUsed` | **false** | ❌ 首次评估时 `runPipeline` 未开 sceneLlm |
| `matchResult.llmClassification.sceneLlmVersion` | 无 | ❌ 同上 |
| `matchResult.retrievedCases` | 无 | 符合 RAG 关闭；LLM 未跑所以也没有检索痕迹 |
| `matchResult.decisionPath` | `top1=A(4) gap=4 — score<HIGH(7) or gap<CLEAR(3) → ambiguous(below confidence)` | 纯规则路径 |

这张单已经不是 pending，重启后**不会自动重跑**。新进来的待审核单才会走 sceneLlm v2。

## 代码修复

`scripts/poll-and-assess.ts` 首次评估 / 追问重评已改为：

- `sceneLlm: true`
- `sceneLlmVersion: 2`
- `ragEnabled: isRagEnabled()`（`.env` 已写 `RAG_ENABLED=0`）

审核员点选场景后的重跑仍是 `sceneLlm: false` + `overrideScene`（按已确认场景，不再分类）。

`poll_start` 日志格式：

```
poll_start sceneLlm=true sceneLlmVersion=2 RAG_ENABLED=0 cards=75 OMS_WRITE=1 allowlist=* ...
```

## 人员 open_id（增值咨询 Bot 视角）

测试群：`oc_80b07f38ed6833df3787a97a496f1097`

| 姓名 | 邮箱探测 | consult-bot open_id | 是否已在测试群 |
|------|----------|----------------------|----------------|
| 金萤 | `ying.jin@winit.com` 命中 | `ou_d09d7409a63201462177f4d8a8b1ac7b` | 是 |
| 耿文文 | `wenwen.geng@winit.com` 未命中（Bot 通讯录可见范围不够） | `ou_fb036b896ab183f3eea939470e47bf66`（群成员名匹配） | 是 |
| 韩洪涛 | `hongtao.han@winit.com` 未命中 | `ou_17e2ea13de46f774fc36f970f84185e8` | 是（demo 销售，未写入 personnel.json） |
| 何静 | 邮箱未确认 / 通讯录未命中 | **空**（已去掉跨应用旧 ID） | 否 |
| 李颖 | 邮箱未确认 / 通讯录未命中 | **空** | 否 |

跨应用旧 ID（`ou_92cc10dc…` / `ou_d5829bcb…`）已从 `config/personnel.json` 删除，避免卡片 @ 失效。

拉人：增值咨询 Bot 有拉人权限，但 Bot 通讯录目前只能解析到金萤；用户身份缺 `im:chat.members:write_only`。何静、李颖需**手动拉进测试群**后，再按群成员姓名回填 consult-bot open_id。
