/**
 * Coze 插件节点占位说明：`type: plugin` · **cobra_winit_openapi_request**（万邑通 OpenAPI 透传）。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` 入口。
 *
 * - **默认 `action`（OpenAPI 方法名）**：`afs.customer.compensate.pageList`（与 `coze.config.yml` 的 `openapiAction` 一致）
 * - **请求体 `data`**：来自上游 **`build-compensate-list-data.winitRequestData`**（JSON 字符串，含 `pageVo`、`source:"CUSTOMER"`、各筛选字段）
 * - **响应**：插件 `data` 字段由 **`fetch-compensate-list`** 消费；先做宽容解析，待真实样例后收紧字段映射
 *
 * 对照：[`docs/coze-reference/winit_openapi_call-draft.yaml`](../../../docs/coze-reference/winit_openapi_call-draft.yaml)、[`docs/design-spec.md`](../../../docs/design-spec.md) §6。
 */

export {};
