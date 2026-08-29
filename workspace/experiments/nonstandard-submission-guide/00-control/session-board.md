# Session Board

状态枚举：`NOT_STARTED` / `IN_PROGRESS` / `DONE` / `BLOCKED` / `ACCEPTED`

| 阶段 | 名称 | 状态 | 目录 | 验收摘要 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| S1 | 业务参考 | NOT_STARTED | `01-business-reference/` | 待子会话产出 `completion-summary.md` | 等待启动 |
| S2 | 域 plan delta | NOT_STARTED | `02-domain-plan/` | 待 S1 ACCEPTED 后启动 | 等待 S1 |
| S3 | API/KB/GAP delta | NOT_STARTED | `03-api-kb-gap/` | 待 S2 ACCEPTED 后启动 | 等待 S2 |
| S4 | 实现准入 checklist delta | NOT_STARTED | `04-implementation-review/` | 待 S3 ACCEPTED 后启动 | 等待 S3 |
| S5 | 实现 design 草案 | NOT_STARTED | `05-implementation-design/` | 待 S4 ACCEPTED 后启动 | 等待 S4 |
| S6 | 总评审 | NOT_STARTED | `06-review/` | 待 S5 ACCEPTED 后启动 | 等待 S5 |

## 总控记录

- 2026-08-18：初始化实验包目录和总控文件。

## 当前准入结论

- 当前可启动阶段：S1 业务参考
- 上游依赖状态：无上游阶段依赖
- 正式项目同步状态：未同步
