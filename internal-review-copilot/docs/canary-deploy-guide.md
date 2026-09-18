# 部署防线机制

三层防线：金丝雀模式 → 自动熔断 → 逐步放量。给 `internal-review-copilot` 上 40 用。本页只讲怎么开、怎么停；**未过工作区 §9 门禁、你没说「可以部署 40」之前，不要上 40。**

覆盖现网代码必须走 `scripts/40-deploy.sh`（先 snapshot，再解包；冒烟失败自动盖回）。不要只备份 `.env` 就 `tar -xzf`。回滚：`scripts/40-rollback.sh`。

## 概览

| 层 | 干什么 | 挡住什么 |
|----|--------|----------|
| 1 金丝雀 | 前 N 单卡片先发测试群；你确认后再发到正式群 | 正式群被刷错卡 |
| 2 自动熔断 | 最近几单红卡/连续转人工 → 停轮询 + 给你发私信 | SOP 批量失败、场景识别集体跑偏 |
| 3 逐步放量 | `MAX_PER_HOUR` 限制每小时新评估单数 | 一次涌进太多单 |

OMS HTTP 断路器（`lib/oms-tom-client.ts`）管 Cookie/接口，**不要改**。本页第二层管的是业务结果。

## 第一层：金丝雀模式

- **干什么**：前 N 单**只**发到测试群。满额后会**暂停新单**，并给你（和测试群）发一张带按钮的卡片。你点「没问题，切到正式群」后，**同一批单会在正式群再发一遍**，之后新单也进正式群。**不用改 `.env`，也不用重启。**
- **环境变量**：`CANARY_MODE` / `CANARY_CHAT_ID` / `CANARY_LIMIT`
- **代码位置**：
  - `lib/canary.ts` 的 `getTargetChatId()`、`CanaryGate.promote()`
  - `scripts/poll-and-assess.ts` 满额发 `buildCanaryPromoteCard`；切正式群后 `replayCanaryToOfficial()`
  - `scripts/listen-card-actions.ts` 的 `canary_promote` 按钮
  - 计数、单号、是否已切正式群写在 `case-store.json` 的 `_meta.canaryCount` / `canaryOrderNos` / `canaryPromoted`

### 操作手册

- **首次部署**：`CANARY_MODE=1`，`CANARY_CHAT_ID=oc_测试群`，`CANARY_LIMIT=5`
- **满额后你会收到卡片**（个人号 + 测试群），上面有按钮 **「没问题，切到正式群」**
  - **没问题**：点按钮。这 5 单立刻在正式群各开一个新话题再发同一张卡；按钮会变成绿卡「已切到正式群」。新单最多等下一轮轮询（约 10 分钟）进正式群。`.env` 可以继续 `CANARY_MODE=1`，状态记在 `canaryPromoted`，重启也不会退回测试群
  - **有问题**：不要点按钮，自己先修。新单会一直暂停在测试群满额状态
  - 再点一次没副作用（已经切过会提示「不用再点」；补发名单里发过的不会再发）
- **备用（一般不用）**：也可以设 `CANARY_MODE=0` 再重启 poll，效果等同点按钮（下一轮 poll 开头补发）
- **想再跑一轮金丝雀**：先把 `CANARY_MODE` 改回 `0` 并重启一次（清掉 `canaryPromoted`），再设 `CANARY_MODE=1` 并重启。从 0 切回 1 时计数器和待补发名单清零
- 进程中途崩溃：计数已落盘，重启后 **不会** 再从 0 数，满额后继续暂停，直到你点按钮

满额后暂停 **新单评估**，给你个人号和测试群发卡片，大意：

`金丝雀 5 单已跑完，请先看测试群。没问题就点「切到正式群」：这 5 单会再发到正式群，之后新单也进正式群。有问题不要点，自己先修。`

补发只做一次；某单没有存下卡片则跳过并记日志 `canary_replay_skip`。

## 第二层：自动熔断

- **干什么**：连续出问题时自动停 polling，**给你个人发告警**（`BREAKER_ALERT_USER_ID`，一般就是你的飞书 open_id）。
- **环境变量**：`BREAKER_WINDOW` / `BREAKER_RED_THRESHOLD` / `BREAKER_TRANSFER_THRESHOLD` / `BREAKER_ALERT_USER_ID`
- **代码位置**：`lib/circuit-breaker-poller.ts` 的 `PipelineCircuitBreaker` / `pollerBreaker()`；`scripts/poll-and-assess.ts` 的 `afterPipelineOutcome()`

### 触发条件

| 条件 | 默认值 | 含义 |
|------|--------|------|
| 窗口内红卡数 ≥ N | N=2 | SOP 生成不稳定（`failureGate=llm-generate-sop`） |
| 连续 transfer_human ≥ N | N=3 | 场景识别可能出问题 |

窗口默认最近 5 单。红卡看窗口内合计；转人工看 **末尾连续** 条数。

熔断时：

1. 停下来，不再评估新单（之后的 poll 循环直接 return）
2. **给你发私信**（不是群消息）：

```
⚠️ 智能审核熔断告警
原因：最近 5 单中 2 单 SOP 生成失败
最后处理：VASC000000xxx
时间：2026-09-16 14:32
操作：看完原因、确认可以继续后，重启 poll 服务即恢复（不用改环境变量）
```

3. 日志打印 `[CIRCUIT-BREAKER] tripped: reason=xxx, pausing polling`

### 你怎么确认后再继续

告警是发给你的。停了以后**不会自己恢复**。

1. 看私信里的原因和最后一单号
2. 打开 `poll.log` 搜 `[CIRCUIT-BREAKER]`，对照最近几单
3. **你自己判断**：只是偶发、可以继续 → 重启 poll 进程（tmux 里停掉 `irc-poll` 再拉起）。重启 = 你确认可以继续
4. 如果要先修代码/场景卡：先修，再重启
5. **不用改** `CANARY_MODE` 或任何 `RESUME` 变量。熔断标志只在内存里，重启就清掉

## 第三层：逐步放量

- **环境变量**：`MAX_PER_HOUR`（已有，`scripts/poll-and-assess.ts` 的 `maxPerHour()` → `envNumber("MAX_PER_HOUR", 10)`）
- 另有 `MAX_PER_POLL`（默认 2），一轮最多新评估几单

### 推荐节奏

| 阶段 | MAX_PER_HOUR | 持续时间 | 配合 |
|------|-------------|---------|------|
| 首日 | 3 | 1 天 | + 金丝雀模式 |
| 第二天 | 5 | 1 天 | 点按钮关金丝雀（那几单会补发到正式群） |
| 第三天起 | 10 | 常态 | 只靠自动熔断 |

`envNumber` 把空值或 ≤0 当成默认值，所以不要写 `MAX_PER_HOUR=0` 指望停机，应停进程。

## 所有环境变量汇总

| 变量 | 默认 | 类型 | 在哪读取 |
|------|------|------|----------|
| `CANARY_MODE` | `0` | `1`/`0` | `lib/canary.ts` `isCanaryMode()` |
| `CANARY_CHAT_ID` | （空，金丝雀开启时必填） | `oc_…` | `lib/canary.ts` `getTargetChatId()` |
| `CANARY_LIMIT` | `5` | 正整数 | `lib/canary.ts` `canaryLimit()` |
| `BREAKER_WINDOW` | `5` | 正整数 | `lib/circuit-breaker-poller.ts` |
| `BREAKER_RED_THRESHOLD` | `2` | 正整数 | 同上 |
| `BREAKER_TRANSFER_THRESHOLD` | `3` | 正整数 | 同上 |
| `BREAKER_ALERT_USER_ID` | （空则退回 `FEISHU_TEST_USER_ID`） | `ou_…`（你的飞书号） | `lib/canary.ts` `alertUserId()` |
| `MAX_PER_HOUR` | `10` | 正整数 | `scripts/poll-and-assess.ts` `maxPerHour()` |
| `MAX_PER_POLL` | `2` | 正整数 | `scripts/poll-and-assess.ts` `maxPerPoll()` |
| `FEISHU_TEST_CHAT_ID` | （必填，正式群） | `oc_…` | `lib/feishu-bot.ts` `resolveTestChatId()`；金丝雀关闭时 `getTargetChatId()` 用它 |

个人告警走 `lib/feishu-bot.ts` 的 `sendPersonalMessage(open_id, text)`。金丝雀满额卡片走 `sendPersonalCard`。

## 故障排查

- **熔断了怎么办**：看私信 → 看 `poll.log` 搜 `[CIRCUIT-BREAKER]` → 你确认可以继续后 **重启 poll 进程**。
- **金丝雀跑完了但测试群没收到卡**：检查 `CANARY_CHAT_ID` 是不是测试群、Bot 是否在群里、`.env` 是否 `CANARY_MODE=1`。日志里应有 `canary_count x/N`。
- **点了按钮正式群没收到那几单**：看日志 `canary_promote` / `canary_replay_sent` / `canary_replay_skip` / `canary_replay_error`。Bot 必须已在正式群，listen 进程必须在跑。补发名单在 `_meta.canaryOrderNos`。
- **点了按钮新单还进测试群**：等下一轮 poll（最多约 10 分钟）。日志 `CANARY_MODE=0` 或 `canaryPromoted`。不要只改内存、不点按钮。
- **重启后又从 0 开始跑金丝雀**：只有把 `CANARY_MODE` 改成 `0` 再改回 `1` 才会清零。崩溃重启或点过按钮后重启，都应接着 `_meta`。
- **熔断告警没发到你**：检查 `BREAKER_ALERT_USER_ID` 是不是你的 `ou_…`，且增值咨询 Bot 能给你发私信（你要先和 Bot 有过会话）。
