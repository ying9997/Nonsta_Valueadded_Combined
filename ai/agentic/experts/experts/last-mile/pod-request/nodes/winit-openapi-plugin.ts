/**
 * Coze 插件节点占位说明：`type: plugin` · **cobra_winit_openapi_request**（万邑通 OpenAPI 透传）。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` 入口。
 *
 * - **默认 `action`（OpenAPI 方法名）**：`wh.outbound.exportOutboundPod`（与 `coze.config.yml` 的 `openapiAction` 一致）
 * - **请求体 `data`**：来自上游 **`build-export-pod-winit-data.winitRequestData`**（JSON 字符串，含 `outboundOrderNoList`）
 * - **响应**：插件 `data` 字段由 **`fetch-export-pod`** 消费；成功形态含 `data.fileUrl`、`status`、`info`、`errorCode`
 *
 * 对照：[`docs/coze-reference/winit_openapi_call-draft.yaml`](../../../docs/coze-reference/winit_openapi_call-draft.yaml)、[`docs/design-spec.md`](../../../docs/design-spec.md) §6。
 */

export {};
