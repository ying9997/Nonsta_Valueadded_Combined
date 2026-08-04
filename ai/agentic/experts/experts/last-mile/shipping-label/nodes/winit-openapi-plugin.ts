/**
 * Coze 万邑通 OpenAPI 插件节点占位说明（非可执行代码节点）。
 *
 * `coze.config.yml` 导出两个批处理插件：
 * 1. `winit_shipping_label_resolution_batch`：actions 来自
 *    `build-order-resolution-actions`，action 为 `queryOutboundOrderList`。
 * 2. `winit_shipping_label_fetch_batch`：actions 来自
 *    `build-label-actions`，action 为 `wh.outbound.getMaskedLabelUrl`。
 *
 * customerCode、customerName、username、language 均来自工作流开始节点的框架顶层；
 * action/data 不属于 manifest.inputSchema。
 */

