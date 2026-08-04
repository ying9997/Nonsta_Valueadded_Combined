/**
 * Coze 画布节点占位声明：`type: plugin` · **cobra_winit_openapi_request**（万邑通 OpenAPI 透传）。
 *
 * 本文件**不是**可执行代码节点：勿在 `workflow.json` 中配置为 `file`；由 `coze.config.yml` 的
 * **`winitOpenapiPlugin`** 在 `npm run export:coze` 时生成对应 YAML 节点。
 *
 * ## 默认 OpenAPI `action`
 *
 * 与 **`fetch-sku-inventory.ts`** 中经 `workflow/run` 调用时使用的接口名一致，默认：
 * **`queryProductInventoryList4Page`**（万邑通文档 id/58，取 `qtyAvailable`）。
 * 导出时写入插件入参为**字面量**，**不作为**专家调用边界顶层字段；若需覆盖，在 `coze.config.yml`
 * 设置 `winitOpenapiPlugin.openapiAction`。
 *
 * ## 调用边界（顶层约定，不经 `inputs`）
 *
 * 全体专家开始节点已统一暴露 `customerCode`、`customerName`、`username`、`language`。插件入参 **`data`** 由 **`insertBefore` 前一档代码节点**产出（默认 `winitRequestData`），**不从** `100001` 拉线。规约见 **`docs/design-spec.md`** §6。
 */

export {};
