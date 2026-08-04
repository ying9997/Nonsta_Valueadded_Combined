# delivery-status 代码节点说明

与根目录 `workflow.json` 中各节点 `id` 对应；单文件闭环，无跨文件 import。

| 节点 id | 主要 inputs | 主要 outputs |
|---------|-------------|----------------|
| validate-input | trackingIds, outboundOrderNos, trajectoryText | valid, branch, error?, … |
| build-winit-tracking-data | trackingIds, outboundOrderNos, language | winitRequestData, queryKeys |
| fetch-trajectories | 见 workflow.json（含 winitOpenapiData、winitRequestData、顶层租户字段） | trajectories, fetchMeta, out* 透传 |
| merge-enriched-context | trajectories, fetchMeta, outTrackingIds, … | enrichedContext（含 **carrierHints**、**computedScanFacts**） |
| format-output | analysisResult, inputContext, enrichedContext（可选，用于合并 **carriers** 与 **scanFacts**） | **structured**, **analysis**, **outputContext**；**result** 为 `{ structured, analysis }` 副本（兼容 Coze 导出） |

插件占位说明见 `winit-openapi-plugin.ts`（勿配置为 `workflow.json` 的 `file`）。
