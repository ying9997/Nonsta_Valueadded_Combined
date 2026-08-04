/**
 * Coze 插件节点占位说明：`cobra_winit_openapi_request`（非可执行代码节点）
 * ---
 * 由 `coze.config.yml` 的 **`winitOpenapiPlugin`** 在 `npm run export:coze` 时生成画布节点。
 *
 * - **默认 OpenAPI `action`（字面量）**：`tracking.getOrderVerdorTracking`（万邑通 id/56，出库轨迹库内+派送）
 * - **插件入参 `data`**：来自前置代码节点 **`build-winit-tracking-data`** 的 **`winitRequestData`**（JSON 字符串，含 `trackingnos`、`language`）
 * - **调用边界**：`customerCode` / `customerName` / `username` / `language` 为工作流开始节点顶层字段，**不经** `manifest.json` 的 `inputs`；请求体 **`data`** 亦不经 `inputs`
 *
 * 对照：[`docs/coze-reference/winit_openapi_call-draft.yaml`](../../../docs/coze-reference/winit_openapi_call-draft.yaml)、[`docs/design-spec.md`](../../../docs/design-spec.md) §6。
 */

export {};
