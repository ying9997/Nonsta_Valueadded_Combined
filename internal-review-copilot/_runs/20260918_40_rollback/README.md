# 40 代码备份与回滚

固定动作已做成脚本（先 snapshot，再解包）。日常请用这些，不要用本目录里的旧 `snapshot-now.sh` 手工解 tar。

- 上线：`internal-review-copilot/scripts/40-deploy.sh`
- 只打快照：`scripts/40-snapshot-code.sh`
- 回滚：`scripts/40-rollback.sh`

40 备份目录：`/home/winit/.agents/backups/internal-review-copilot/`  
当前整包：`irc-code-20260918_current.tgz`（补备份时打下的）。
