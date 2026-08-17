# shipping-label Coze 节点说明

本 Expert 无 LLM 节点。可执行代码节点均为 `main({ params })` 单文件闭环；两个 OpenAPI 插件节点由 `coze.config.yml` 在导出时注入。

| 节点文件 | 主要输出 |
|----------|----------|
| `validate-input.ts` | `valid`、错误信息、规范后的输入 |
| `build-order-resolution-actions.ts` | 定位 `actions`、`actionPlans`、直接 WO |
| `merge-order-resolution.ts` | 输入到 WO 的映射、未解析标识、20 单保护 |
| `build-label-actions.ts` | 面单 `actions`、`actionPlans` |
| `merge-label-results.ts` | `orderResults`、`unresolvedIdentifiers` |
| `format-output.ts` | `structured`、`analysis`、`outputContext`、`enrichedContext` |
| `winit-openapi-plugin.ts` | 两个导出插件节点的占位说明，不作为代码节点执行 |
