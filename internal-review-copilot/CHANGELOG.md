# CHANGELOG · vas-internal-review

### 7 · 2026-10-08 · feat · 轮询白名单接入串仓调拨与货权转移换标

- 文件: `lib/oms-adapter.ts`, `scripts/pull_ow01v1602_review_orders.mjs`, `scripts/test-oms-adapter.ts`, `scripts/test-match-template-v02.ts`, `lib/match-template.ts`, `knowledge/scenario-cards/instock_ownership_transfer_relabel.json`, `../experts/value-add/nonstandard-sop-guide/nodes/validate-input.ts`
- 验证: `npx tsx internal-review-copilot/scripts/test-oms-adapter.ts` PASS；`npx tsx internal-review-copilot/scripts/test-match-template-v02.ts` PASS；`VASC000000448542` 受控 E2E PASS（测试群 `oc_867cf8749520eaa910938681d51f6e41`，TOM/OMS 真写 `createdVaActionFeeDetail` / `sceneOverviewCode` / `sop`）
- 部署: 用户确认后同步 40，重启 `vas-internal-review-poll/listen`，常驻轮询切换到新白名单
- 说明: `OW01V1654 / 包裹串仓异常调拨【非标】` 复用已有 `inbound_parcel_cross_warehouse_transfer`；`OSF6V1646 / 货权转移（换标模式）【非标】` 接回已有 `instock_ownership_transfer_relabel`，不新增场景卡。

### 6 · 2026-10-08 · feat · OW01V1654 串仓原子纳入本机轮询白名单

- 文件: `lib/oms-adapter.ts`, `scripts/pull_ow01v1602_review_orders.mjs`, `scripts/test-oms-adapter.ts`, `scripts/test-match-template-v02.ts`
- 验证: `npx tsx internal-review-copilot/scripts/test-oms-adapter.ts` PASS；`npx tsx internal-review-copilot/scripts/test-match-template-v02.ts` PASS
- 部署: 本机改动，未同步 40；等人工确认后才允许部署 40
- 说明: `OW01V1654 / 包裹串仓异常调拨【非标】` 复用已有 `inbound_parcel_cross_warehouse_transfer` 场景卡，不新增场景卡。

### 5 · 2026-10-08 · feat · LLM 原因码 + 模型降级链（方案 A）

- 文件: `lib/llm-client.ts`, `lib/generate-text.ts`, `lib/feishu-card.ts`, `.env.example`, `scripts/test-llm-fallback.ts`, `scripts/test-prompt-j.ts`, `scripts/40-deploy.sh`, `run-poll.sh`, `run-listen.sh`
- 验证: 本机三测 PASS；40 部署后 poll/listen `active`；进程环境含 `LITELLM_MODEL_FALLBACKS=claude-sonnet-4-6,claude-haiku-4-5`
- 部署: 已同步40（snapshot `irc-code-20261008_110256.tgz`）；secrets 已加 FALLBACKS；曾因 Windows CRLF 致 unit 127，已 sed 修复并在 40-deploy 加防护
- 说明: 主模型 `claude-sonnet-4-5`；可降级原因走 `claude-sonnet-4-6,claude-haiku-4-5`；对人短文案带原因码。

### 4 · 2026-09-24 · chore · P4 切流 + 观察一轮 poll + 归档旧目录

- 文件: systemd enable `vas-internal-review-poll/listen`；`_runs/live_poll` 自旧路径迁入；旧树 → `/srv/gateway/_archive/internal-review-copilot-legacy-20260924.tar.zst` + `~/.agents/services/_archive/internal-review-copilot-20260924-frozen/`
- 验证: 两 unit `enabled+active`，cgroup 落在 `app.slice/vas-internal-review-*.service`；旧 tmux 已停；首轮 `poll_done cases=128`、`interval=600s`；listen `event ready card.action.trigger`
- 部署: 已切流40
- 说明: 首轮有若干历史消息已撤回导致 `remind_error`（230011），属存量帖，非切流故障；`rate_limit_poll 2/poll` 按配置正常。

### 3 · 2026-09-24 · chore · P3 同步代码 + secrets 迁移 + 隔离冒烟

- 文件: `/workspace/projects/value-service/vas-internal-review/{lib,scripts,knowledge,...}`（自旧树 rsync + 本机 overlay）, `~/.secrets/vas-internal-review.env`（自旧 `.env` 静默迁入）, `/workspace/projects/value-service/experts`（软链）, `/workspace/projects/AI_EXPERT`（软链）
- 验证: `test-feishu-card` exit=0；`test-reassess-loop` exit=0（补 experts 软链后）；unit 仍 disabled/inactive；旧 tmux irc-poll/listen 仍 up；树内无 `.env`
- 部署: 已同步40(新路径) / 未 enable / 未切流
- 说明: 未跑 `poll --once`（避免与现网双写）；未停旧进程。

### 2 · 2026-09-24 · chore · P2 建壳（40 create-only，未 enable）

- 文件: `/workspace/projects/value-service/`（新建域目录）, `/workspace/projects/value-service/vas-internal-review/`（壳）, `~/.secrets/vas-internal-review.env`（空壳 0600）, `~/.config/systemd/user/vas-internal-review-*.service`, `agent-governance/changelog/2026-09.jsonl`
- 验证: `is-enabled=disabled` ×2；`is-active=inactive` ×2；树内无 `.env`；旧 `~/.agents/services/internal-review-copilot` 未动
- 部署: 已同步40(壳) / 未 enable / 未切流
- 说明: 仅目录+文档+run 脚本+deploy 样板+40-*.sh；业务代码与真实密钥留 P3。

### 1 · 2026-09-23 · chore · 方案 A 落位准备（P1，未上 40）

- 文件: `_workflow/20260923_vas_internal_review_40_layout/README.md`, `manifest.yaml`, `AGENTS.md`, `CHANGELOG.md`, `deploy/vas-internal-review-poll.service`, `deploy/vas-internal-review-listen.service`, `run-poll.sh`, `run-listen.sh`, `scripts/40-deploy.sh`, `scripts/40-snapshot-code.sh`, `scripts/40-rollback.sh`, `.env.example`, `lib/env.ts`, `README.md`
- 验证: 未验证（本机文档与脚本准备；未在 40 建目录/enable）
- 部署: 本机
- 说明: 锁定产品工作台模式；40 目标 `/workspace/projects/value-service/vas-internal-review`；两 unit；密钥 `~/.secrets/vas-internal-review.env`。旧 `~/.agents/services/...` + tmux 待 P4 切流后冻结。
