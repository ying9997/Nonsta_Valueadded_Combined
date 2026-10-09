# AGENTS.md · vas-internal-review（内部智能审核助手）

> 动这个仓库之前先读完本文件。人和 AI 同一份规则。
> **本文件只写规则，不写事实。** 路径/基线/怎么跑去 `README.md`；改动 why 去 `CHANGELOG.md`。

## 0. 三份文档

| 我想知道 | 去哪 |
|---|---|
| 这是什么、现在怎么跑 | `README.md` |
| 某次改为什么这么做 | `CHANGELOG.md` |
| 什么不能碰、要不要授权 | **本文件** |
| 40 落位与阶段门禁 | `_workflow/20260923_vas_internal_review_40_layout/README.md` |

`CLAUDE.md` 若存在且仅软链到本文件，勿另写一份。

## 1. 永久红线（P）

| # | 红线 |
|---|---|
| P1 | **不放任何凭据**进仓（含注释掉的、示例里的真 secret）。40 只用 `~/.secrets/vas-internal-review.env` |
| P2 | **不提交** `_runs/`、`logs/`、`node_modules/`、Cookie、认证截图 |
| P3 | **迭代用 git**，禁 `_v1` / `.bak` / 就地 `cp -r` 变体目录 |
| P4 | **不改** 40 上既有 unit / 其它项目的 `EnvironmentFile` / 小白·007·综合方案等飞书 profile |
| P5 | **部署 40** 必须先过本机 unit / integration / E2E（能跑的全跑）并出验证报告给用户人工查验；只有用户明确点名授权部署 40 后才能动 40。覆盖现网代码必须先 `40-snapshot-code.sh` |
| P6 | **不用** `git add -A`；显式列路径 |

## 2. 当前状态红线（C）

| # | 当前禁止 | 解除条件 |
|---|---|---|
| C1 | 不在 40 enable 新 unit、不切流停旧路径 | 用户点名「P4 / 切流」且 P3 冒烟绿 |
| C2 | 不改 `/srv/gateway/apps.yaml`、不 render/reload | 质量看板正式挂网关且网关变更闸授权 |
| C3 | 不往生产业务群做未授权广播测试 | 金丝雀/试点配置 + 点名授权 |

## 3. 改动五步

1. 读 README + CHANGELOG 顶部 + 本文件  
2. 小步改（一事一提交）  
3. 能跑的本机 unit / integration / E2E 全跑  
4. 出验证报告给用户人工查验；未获明确授权不得部署 40  
5. commit 写 why；显式列文件  
6. CHANGELOG 顶部加一条  

## 4. Owner 与授权

- 本仓库 owner：见 `manifest.yaml`  
- AI 授权**不跨会话扩张**：授权 P1 ≠ 授权 P2/P4  
- 在 40 动手前再读 `/home/winit/AGENTS.md`
