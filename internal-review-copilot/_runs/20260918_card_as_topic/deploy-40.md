# 40 部署：话题根直接发卡片

日期：2026-09-18  
授权：用户看过测试群预览后点名「没问题，部署到40」。

## 门禁

| 项 | 结果 |
|---|---|
| 本机连飞书 E2E | 测试群已发橙/绿预览，话题内各 1 张交互卡片，无「已创建审核话题」外套 |
| 现网隔离 | 预览只进测试群；正式群未发预览 |
| 覆盖方式 | `40-deploy.sh`：先 snapshot，再解包；冒烟 `test-feishu-card.ts` 通过后才重启 |
| `.env` / 密钥 / 其它 systemd | 未改 |
| 飞书应用 | 仍用增值咨询 `cli_aa2a76198a7adcb3` |

## 40 现状

| 项 | 值 |
|---|---|
| 目录 | `~/.agents/services/internal-review-copilot/` |
| tmux | `irc-poll` + `irc-listen`（18:33 重启） |
| 新话题群 | **【增值】异常沟通** `oc_6566160ccb2def51937469fe8144efdb` |
| OMS 真写 | `OMS_WRITE_ENABLED=1`，不点审核通过 |
| 放量 | `MAX_PER_POLL=2`、`MAX_PER_HOUR=10` |
| 回滚包 | `~/.agents/backups/internal-review-copilot/irc-code-20260918_183311.tgz` |

代码核对：`sendCardInNewTopic` 已改为直接发卡片，不再先 `createThreadInner`。

下一张 Copilot 新发卡会进异常沟通，左侧话题名是卡片标题。已经发出去的旧话题不会改格式。
