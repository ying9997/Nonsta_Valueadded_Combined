# 增值内部审核助手 · 40 落位（方案 A）

- 日期：2026-09-23（P2–P4：2026-09-24）
- 状态：**方案 A 已落地**；**P1–P4 完成**（已切流；旧目录已归档）；现网跑新路径 systemd
- 标杆：产品工作台 `pd-lifecycle`（主）+ SU `su-cost-station`（红线与托管心法）
- 依据：`/home/winit/AGENTS.md`、`domains.yaml` 域 `value-service`

## 1. 已拍板

| 项 | 值 |
|---|---|
| 分层 | **方案 A**（产品工作台：源码=运行目录 + run.sh + 新建 user unit） |
| 域 | `value-service` |
| slug | `vas-internal-review` |
| 中文名 | 内部智能审核助手 |
| 常驻 | **两个** unit：`vas-internal-review-poll` / `vas-internal-review-listen` |
| 网关 | 本阶段 **不改** `apps.yaml` |
| 本机真源 | `Nonsta_Valueadded_Combined/internal-review-copilot/` |

## 2. 40 目标路径（P2 起 create-only）

| 用途 | 路径 |
|---|---|
| 源码/运行 | `/workspace/projects/value-service/vas-internal-review/` |
| 密钥 | `~/.secrets/vas-internal-review.env`（0600；**不**进仓、**不**复用其它 app 的 EnvironmentFile） |
| 日志 | 项目内 `logs/poll.log`、`logs/listen.log`（unit 也可 append） |
| 运行态 | `_runs/live_poll/`（case-store 等；不随代码包覆盖） |
| 代码备份 | `/home/winit/agent-governance/canonical/backups/vas-internal-review/` |
| 旧目录 | 已归档：`/srv/gateway/_archive/internal-review-copilot-legacy-20260924.tar.zst`；冻结副本 `~/.agents/services/_archive/internal-review-copilot-20260924-frozen/` |
| 兼容软链 | `/workspace/projects/value-service/experts` → `~/.agents/services/experts`；`/workspace/projects/AI_EXPERT` → `~/AI_EXPERT`（满足 `projectDir()` 相对引用） |

## 3. 与现状对照

| | 旧（现状） | 新（方案 A） |
|---|---|---|
| 落点 | `~/.agents/services/...`（规范地图外） | `/workspace/projects/value-service/...` |
| 守护 | tmux `irc-poll` / `irc-listen`（已停过） | systemd user + `Restart=always` |
| 密钥 | 树内 `.env` | `~/.secrets/vas-internal-review.env` |
| 归属 | 无 | `manifest.yaml` |
| 文档 | README 为主 | README + AGENTS + CHANGELOG |

## 4. 阶段门禁

| 阶段 | 内容 | 需你点名 |
|---|---|---|
| **P1** | 本机落位说明、三件套、deploy 样板、脚本默认路径改新 | ✅ 已完成 |
| **P2** | 40 建目录 + manifest + secrets 空壳 + unit **install 不 enable** | ✅ 已完成（2026-09-24） |
| **P3** | 同步代码、隔离冒烟 | ✅ 已完成（2026-09-24） |
| **P4** | enable --now、停旧 tmux、观察一轮 poll、归档旧目录 | ✅ 已完成（2026-09-24） |
| **P5** | 质量看板挂网关（若需要再升 SU 式静态根） | 另授权 |

未过「本机或隔离 E2E」门禁 → 禁止 P4。不改任何既有 40 unit / secrets / 飞书 profile。

## 5. 验收（P4 后）

1. `manifest.yaml` 在新路径，domain=`value-service`
2. 两 unit `active`，且进程 cgroup 落在对应 unit（非 `session-*.scope`）
3. poll/listen 能写 `_runs/live_poll`；密钥不在可同步源码树
4. 旧路径已停写；未动 `tom-vas-*` / `vas-monitor-*` / 综合方案等

## 6. 本机产出清单（P1）

- 本文件
- 项目根 `manifest.yaml`、`AGENTS.md`、`CHANGELOG.md`
- `deploy/*.service`、`run-poll.sh`、`run-listen.sh`
- `scripts/40-*.sh` 默认 `IRC_DEST` 指向新路径；重启改为 systemctl（无 unit 时 `--no-restart`）
- `.env.example` / `lib/env.ts` 对齐 secrets 路径说明
