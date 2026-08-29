# nonstandard-sop-guide

非标增值需求描述与 SOP 生成引导 expert。

目标是接入线上 AI 客服主链路，在上游推荐非标增值且落到兜底服务时，完成场景匹配、缺失字段追问、SOP 生成和客户确认。

## 当前状态（2026-08-28）

- **试点**：仅 Top1 `【入库】尺重/标签辨识后换标上架`（F-001），见 [`tests/pilot-f001/`](tests/pilot-f001/)
- **旧 38 场景库内资产**：已标记废弃，见 [`DEPRECATED.md`](DEPRECATED.md)
- 本地 nodes / Coze 旧 KB **尚未**按 2.1 重写；先跑通规则补丁与试点用例，再接工程

## 目录约定

- `manifest.json`：expert 注册合约。
- `design.md`：expert 内部设计。
- `workflow/`：Coze workflow 定义。
- `nodes/`：Coze code node 源码。
- `prompts/`：运行时 prompt 与 KB 切片。
- `tests/`：节点/流程集成测试；**试点用 `tests/pilot-f001/`**。
- `eval/`：expert 专属评测脚本、数据和报告（多场景旧基线已废弃）。
- `debug/`：Coze 节点调试手册和问题排查（旧推演已废弃）。
- `deploy/`：Coze package/import/final 等部署包。

