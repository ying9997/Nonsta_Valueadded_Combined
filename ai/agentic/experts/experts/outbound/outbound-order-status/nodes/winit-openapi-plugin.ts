/**
 * 占位声明：`cobra_winit_openapi_request`（万邑通 OpenAPI 插件）
 *
 * 由 `coze.config.yml` 的 **`winitOpenapiPlugins`** 在 `npm run export:coze` 时写入画布。
 * 当前专家为 **单节点批处理** `winit_outbound_primary_batch`（与 `e_sample_batch` 一致）：
 * `parameters.batch` + **`actions`** 列表（来自 `build-outbound-primary-winit`），**`node_outputs.outputList`**。
 * 合并节点消费 `outputList` 后交给 `fetch-outbound-order`。
 *
 * 超过 `batchSize`、未齐套或可选费用/轨迹等仍可能经 `workflow/run`，见 `nodes/README.md` 与
 * `docs/coze-reference/LOOP_AND_BATCH_SAMPLES.md`。
 *
 * 本文件**不是**可执行代码节点，不得配置为 `workflow.json` 的 `file` 字段。
 */

export {};
