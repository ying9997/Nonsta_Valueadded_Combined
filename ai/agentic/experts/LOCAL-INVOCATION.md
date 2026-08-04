# 本地调用说明

本文说明如何在**本机**安装依赖、配置环境并**串联执行**各专家目录下的 `workflow.json`（代码节点 + LLM 节点）。与 **Coze 线上工作流**、**experts_recaller 编排**的关系见文末。

---

## 1. 环境准备

1. **Node.js**：建议 LTS；需带 `npm`。
2. **安装依赖**（仓库根目录）：

   ```bash
   npm install
   ```

3. **环境变量**（可选，视专家而定）  
   - 复制根目录 **`.env.example`** 为 **`.env`**，按需填写。  
   - `npm run dev:expert` 会通过 `dotenv/config` 加载根目录 `.env`。

---

## 2. 运行单个专家（主路径）

使用 **`manifest.json` 中的 `id`** 作为专家标识（不是目录路径）。CLI 会在 `experts/*/<子目录>/` 下按 `manifest.id` 查找目录。

```bash
npm run dev:expert <expert-id> [--coze-winit-customer-code <code>] [--coze-winit-username <user>] -- [--参数名 参数值 ...]
```

- **`--coze-winit-customer-code` / `--coze-winit-username`**（可选）：在 `npm run ... --` **之后**紧跟 `<expert-id>`，再写这两个标志（及其取值）；它们会设置 **`COZE_WINIT_CUSTOMER_CODE`**、**`COZE_WINIT_USERNAME`**，覆盖根目录 `.env`。若后面还有专家入参且需要与标志区分，可在标志后再写一个 **`--`**，其后才是 `--trackingIds` 等专家参数。
- **`--`** 之后为传给专家的初始入参；参数名与 **工作流节点 `params` 键名**一致（见各专家 `workflow.json` 的 `inputs` 与 [设计规格](docs/design-spec.md) §6）。
- 参数值会尝试 **`JSON.parse`**；失败则按**原始字符串**使用。复杂对象请传 **单行 JSON 字符串**。

**示例**（出库单状态专家）：

```bash
npm run dev:expert outbound-order-status -- --outboundOrderNos '["WO001"]' --customerIntent "查状态"
```

**示例**（模板专家，算式）：

```bash
npm run dev:expert arithmetic-formula -- --expression "1+2"
```

**示例**（`npm` 的第一个 `--` 仅用于把参数交给脚本；脚本内可选的第二个 `--` 用于分隔 runner 标志与专家入参，若专家参数不会误解析为 runner 标志则可省略）：

```bash
npm run dev:expert delivery-status -- --coze-winit-customer-code OTHER_CODE --coze-winit-username other.user -- --trackingIds '["TRK001"]'
```

若 PowerShell 对引号/JSON 不友好，可直接：

```bash
npx ts-node -P scripts/tsconfig.json -r dotenv/config scripts/run-expert-cli.ts <expert-id> [--coze-winit-customer-code CODE] [--coze-winit-username USER] -- --expression "1+2"
```

实现入口：**[`scripts/run-expert-cli.ts`](scripts/run-expert-cli.ts)**；核心逻辑：**[`scripts/run-expert.ts`](scripts/run-expert.ts)**。

---

## 3. 调用 JSON 形状与 CLI 映射

专家对外约定为：**框架顶层字段** + **`inputs` 业务对象**（见 [设计规格](docs/design-spec.md) §6）。

本地 Runner 使用 **`normalizeExpertInvokeParams`**（[`scripts/expert-invoke-params.ts`](scripts/expert-invoke-params.ts)）：

- 若在 CLI 中传入 **`inputs`** 且为对象，会将其中的业务字段展开到工作流上下文。
- 顶层 **`query`、`customerIntent`、`inputContext`、`customerCode`、`customerName`、`username`、`language`** 与业务字段可同时传入；与 `inputs` 重叠时，**显式顶层字段优先**。
- 仍支持**旧式全扁平**：业务字段全在顶层且无 `inputs` 时，也会进入同一扁平 `params` 供节点消费。

**示例**（带 `inputContext` 的 JSON 片段，需整段作为一行 JSON 传参时可写在文件里再粘贴，或在外层 shell 中正确转义）：

```bash
npm run dev:expert delivered-not-received -- --outboundOrderNos '["OB001"]' --customerIntent "妥投未收到" --inputContext "{\"chainId\":\"c1\"}"
```

具体必填与推荐字段以各专家 **`manifest.json`**、**`design.md`「调用说明」** 为准。

---

## 4. LLM 节点行为

- **未设置 `OPENAI_API_KEY`**：LLM 节点使用 **Mock**，返回固定的 `analysisResult` 结构，便于打通流水线。
- **已设置 `OPENAI_API_KEY`**：通过 **`scripts/llm-openai.ts`** 调用 OpenAI 兼容接口，读取专家 **`prompts/main.md`**（及约定占位符）。

常用变量：

| 变量 | 说明 |
|------|------|
| `OPENAI_API_KEY` | 使用真实 LLM 时必填 |
| `OPENAI_MODEL` | 默认 `gpt-4o-mini` |
| `OPENAI_BASE_URL` | 可选，自定义网关 |

快速试 LLM 连接：**`npm run test:llm`**（见 `package.json`）。

---

## 5. 万邑通 / Coze `workflow/run` 代理（部分专家需要）

依赖 OpenAPI 的专家在本地往往通过 **Coze 工作流代理**转发请求，需配置 **`COZE_API_TOKEN`**（或 `COZE_WORKFLOW_PAT`）、**`COZE_WINIT_*`** 等工作流 ID 与租户字段。不同专家使用的代理工作流 ID 可能不同（出库 id/54、id/55 与库存 id/58 等）。

**完整变量表、算术模板与出库专家的差异**见 **[`scripts/README.md`](scripts/README.md)**，请按正在调试的专家对照配置。

---

## 6. 其他常用 npm 脚本

| 脚本 | 作用 |
|------|------|
| `npm run export:coze -- experts/<领域>/<专家id>` | 导出该专家 Coze 可导入包（见 [COZE-WORKFLOW.md](COZE-WORKFLOW.md)） |
| `npm run export:coze:all` | 批量导出（实现见脚本） |
| `npm run check:experts:manifest` | 仅校验专家 manifest / 导出相关约束 |
| `npm run check:coze-io -- <专家目录>` | 检查 `workflow.json` 中 `cozeIo.outputs` 覆盖（可选 `--strict`） |
| `npm run test:refund-standard` / `test:tracking-no-scan` | 针对特定专家的带环境集成试跑 |

---

## 7. 与「编排工作流」的区别

| 内容 | 位置 | 说明 |
|------|------|------|
| **单专家串联** | `npm run dev:expert` + `experts/<domain>/<id>/` | 按该专家 **`workflow.json`** 顺序执行节点 |
| **线上编排（队列 / 多专家）** | **`experts_recaller/`** | 另有 `nodes/`、`prompts/`、`coze_workflow/`；说明见 [experts_recaller/readme.md](experts_recaller/readme.md) |
| **Coze 画布包** | 各专家下 `workflow/` 或由 `export:coze` 生成 | 导入平台运行，与本地 Runner 非同一执行引擎 |

本地调试**单专家**时，不必启动 `experts_recaller`；若要模拟「先 delivery-status 再 delivered-not-received」，需在 CLI 中自行拼好 **`inputs` / `inputContext`** 再调用后者。

---

## 8. 文档索引

- [设计规格](docs/design-spec.md) — 调用边界、Schema、`inputContext` / `outputContext`
- [项目结构](docs/project-structure.md) — 目录与 Coze 产物关系
- [scripts/README.md](scripts/README.md) — 环境变量细节、万邑通代理、PowerShell 注意点
- [COZE-WORKFLOW.md](COZE-WORKFLOW.md) — 导出与导入 Coze 包
- [REQUIREMENTS.md](REQUIREMENTS.md) — 仓库级约束摘要
