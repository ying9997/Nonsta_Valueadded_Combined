# internal-review-copilot：方案 A 确认与本机↔40 对照（未部署）

- 日期：2026-09-09
- 状态：已确认 slug / 试点群 / 方案 A；**未**在 40 落盘；secret 待用户提供

## 已确认

| 项 | 值 |
| --- | --- |
| slug | `internal-review-copilot` |
| domain（将来 40） | `value-service` |
| 飞书 App ID | `cli_aa2a76198a7adcb3` |
| 试点群 | `oc_80b07f38ed6833df3787a97a496f1097` |
| 推进路径 | 方案 A → 本机 E2E →（可选）方案 B staging → 40 仅新建 |

## 临时飞书应用切换（2026-09-09）

- **正式目标应用**：`cli_aa2a76198a7adcb3`（增值咨询）
- **当前本机**：已于 2026-09-09 切回正式应用（此前短暂用过综合方案 `cli_a95f653304f95bcd` 做冒烟）
- `.env` 中 `FEISHU_APP_ID_PENDING` / `FEISHU_APP_SECRET_PENDING` 仍保留正式应用备份字段（可与当前值一致）
- **未**改 40 上任何服务或 secrets

## 本机（真源）

| 用途 | 路径 |
| --- | --- |
| 代码 / 脚本 | `Nonsta_Valueadded_Combined/internal-review-copilot/` |
| 本机环境变量 | `internal-review-copilot/.env`（gitignore；从 `.env.example` 复制） |
| 用户代发 token | `internal-review-copilot/.feishu-user-token.json`（gitignore） |
| 运行 / 评测产物 | `Nonsta_Valueadded_Combined/_runs/YYYYMMDD_<task>/` |

## 将来 40（仅新建，需过门禁 + 点名授权）

| 用途 | 路径 |
| --- | --- |
| secrets | `~/.secrets/internal-review-copilot/`（`app.env` / `llm.env` / …） |
| 工作副本 | `~/work/projects/value-service/internal-review-copilot/` |
| 发布 | `/workspace/projects/value-service/internal-review-copilot/`（`releases` + `current`） |
| systemd | `~/.config/systemd/user/internal-review-copilot-*.service|.timer` |
| lark-cli | 首期可不建；需要时再 `~/.lark-cli/internal-review-copilot/` |

禁止：改 ai-consult / 综合方案 / 小白007 等现有 unit 或 secrets。
