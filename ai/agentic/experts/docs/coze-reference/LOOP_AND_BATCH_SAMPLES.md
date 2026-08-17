# Coze 循环与批处理工作流 YAML 参照

出库等多单、多页万邑通调用需在画布上使用**循环**或**批处理**节点；本仓库的 `expert-to-coze` 当前仍主要生成线性链 + 条件分支，复杂重复调用可对照下列 **Coze 平台导出包** 中的 draft YAML 手工编排或扩展 emitter。

| 能力 | 工作流显示名（导入包内可见） | 说明 |
|------|------------------------------|------|
| 循环 | `Workflow-e_sample_loop-draft-486` | 适用于按数组逐项执行（如多单 `queryOutboundOrder`、列表翻页） |
| 批处理 | `Workflow-e_sample_batch-draft-686` | 适用于批式子步骤编排；与循环二选一或组合 |

建议将上述工作流从 Coze 导出后，把包内 `workflow/workflow/e_sample_*-draft.yaml` 复制到本目录旁，便于与 [`winit_openapi_call-draft.yaml`](winit_openapi_call-draft.yaml) 一起做 diff。
