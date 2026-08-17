/**
 * Coze 插件节点占位说明：`type: plugin` · **cobra_winit_openapi_request**（万邑通 OpenAPI 透传）。
 * **请勿**将本文件配置为 `workflow.json` 的代码节点 `file`；无 `main` 入口。
 *
 * - **默认 `action`（网关）**：`tail.claim.ai.v1.gateway`（与 `coze.config.yml` 的 `openapiAction` 一致；实现前与开放平台核对现网 action 字符串）
 * - **请求体 `data`**：来自上游 **`build-tail-trace-request.winitRequestData`**（JSON 字符串，内含 `service":"TailTrace.getList"` 与分页、筛选字段）
 * - **响应**：插件 `data` 字段由 **`fetch-tail-trace-list`** 消费；先做宽容解析，待真实样例后收紧字段映射
 *
 * 对照：[`scripts/test-winit-openapi-call.ts`](../../../scripts/test-winit-openapi-call.ts)、[`experts/last-mile/tracking-inquiry/design.md`](../design.md)。
 */

export {};
