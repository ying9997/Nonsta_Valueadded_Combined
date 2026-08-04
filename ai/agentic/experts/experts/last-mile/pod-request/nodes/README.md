# Coze / 本地 Runner 代码节点

单文件闭环，无跨文件 import。`winit-openapi-plugin.ts` 为**占位声明**（非可执行），勿写入 `workflow.json` 的 `file`。

| 文件 | 说明 |
|------|------|
| `validate-input.ts` | 归一化单号（WO/跟踪号）、`branch`：`export` \| `guidance` |
| `build-verify-outbound-winit-data.ts` | 拼装 `queryOutboundOrder` 批处理 `actions`（归属校验） |
| `verify-outbound-ownership.ts` | 合并插件结果 → `verifiedOutboundOrderNos` / `ownershipStatus` |
| `build-export-pod-winit-data.ts` | 仅用已校验单号拼装 `winitRequestData` → `outboundOrderNoList` |
| `fetch-export-pod.ts` | 归属门闸 + 解析 `exportOutboundPod` → `podExportFacts` |
| `format-output.ts` | 合并 LLM 与确定性 `podExportFacts`（链接以 facts 为准） |
| `llm-analyze.ts` | LLM 节点声明（非可执行） |

## 环境变量（本地 `workflow/run`）

与尾程 OpenAPI 代理一致：`COZE_API_TOKEN`（或 `COZE_WORKFLOW_PAT`）、`COZE_WINIT_OPENAPI_PROXY_WORKFLOW_ID`、`COZE_WINIT_CUSTOMER_CODE`、`COZE_WINIT_CUSTOMER_NAME`、`COZE_WINIT_USERNAME`；可选 `COZE_API_BASE_URL`。

**POD 对客链接**：`podFileUrls` 为 `https://seller.winit.com.cn/User/fmsFileDownload?url=` + `encodeURIComponent(完整FMS地址)`。接口返回**相对路径**时，默认与硬编码根址 **`https://cnfmsstream.winit.com.cn`** 拼接（可被 **`WINIT_POD_FILE_BASE_URL`** 或 **`WINIT_FILE_BASE_URL`** 覆盖）。接口若已返回 **https 完整 FMS URL** 则直接使用。`podRawPaths` 保留接口原始 `fileUrl`（规范化斜杠后）。
