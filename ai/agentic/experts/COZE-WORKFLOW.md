# Coze 工作流导出：说明、操作与规范

本文档总结**本地专家工程**（`manifest.json`、`workflow.json`、`nodes/`、`prompts/`）与 **Coze 平台工作流包**之间的映射关系，说明如何生成可导入的导出文件，并列出已踩坑的**格式与命名规范**，供各专家项目复用与维护。

---

## 1. 背景与目标

- 专家在仓库内以 JSON、TypeScript、Markdown 等形式维护，由 `scripts/run-expert.ts` 按 `workflow.json` 顺序执行。
- Coze 侧需要**独立的工作流包**（YAML）：含画布节点、连线、`node_inputs` 的 `ref_node` / `path` 等，与本地简化的 `workflow.json` **并非一一同构**。
- 仓库提供 **`expert-to-coze-cli`**，将某专家目录转换为 Coze 可导入的目录结构，减少手工在画布上重复配置。

参考实现与完整示例：**[`experts/_template/arithmetic-formula/`](experts/_template/arithmetic-formula/)**（含 `coze.config.yml` 与可选的 `workflow/original` 官方导出样本对照）。

---

## 2. 导出产物目录结构

执行导出后，在指定的 `--out` 目录下会生成（注意多一层 `workflow/`）：

```text
<out>/workflow/
  MANIFEST.yml                 # 工作流包索引
  workflow/
    <yamlBasename>             # 默认如 e_template-draft.yaml（slug 用 _，与 draft 用 - 连接），见 coze.config.yml
```

- **`MANIFEST.yml`**：`type: Workflow`、`main`（`id`、`name`、`desc`、`icon`、`flowMode` 等）与 `sub`。
- **`<draft>.yaml`**：画布 DSL：`schema_version`、`name`、`id`、`nodes[]`、`edges[]` 等。

导入 Coze 时，通常以 **`MANIFEST.yml` 所在目录**作为包根（即 `<out>/workflow/`），具体以平台当前导入说明为准。

**专家目录下的 `workflow/`** 应保持与上述一致：**仅** `MANIFEST.yml` 与内层 **`workflow/*.yaml`**，**不要**再建 `reference/` 等与包无关的子目录——否则若将整个 `workflow/` 打成 zip 或按目录导入，易混入多余路径；独立参考草稿请放在仓库 **[`docs/coze-reference/`](docs/coze-reference/)**（例如万邑通代理 draft）。

---

## 3. 命令行用法

依赖：`npm install`（已包含 `yaml`、`ts-node`）。

```bash
# 写入 <专家目录>/workflow/（默认）
npm run export:coze -- experts/<领域>/<专家id>

# 指定输出根目录（会在其下创建 workflow/MANIFEST.yml 与 workflow/workflow/*.yaml）
npm run export:coze -- experts/<领域>/<专家id> --out tmp

# 与专家目录内已有 draft 样本做结构校验（节点数、边集、各 code 节点正文）
npm run export:coze -- experts/_template/arithmetic-formula --validate
```

等价调用：

```bash
npx ts-node -P scripts/tsconfig.json scripts/expert-to-coze-cli.ts <专家目录> [--out <目录>] [--validate]
```

实现入口：**[`scripts/expert-to-coze-cli.ts`](scripts/expert-to-coze-cli.ts)**；核心逻辑：**[`scripts/coze-export/`](scripts/coze-export/)**。

### 3.1 线上编排 `experts_recaller`

- **`npm run export:coze`** 仅面向 **`experts/<领域>/<专家id>/`** 标准专家包（含 `manifest.json`、`workflow.json`）。
- **线上专家编排**源码在 **[`experts_recaller/`](experts_recaller/)**：`nodes/`、`prompts/` 与 Coze 代码/LLM 节点正文保持一致；**[`experts_recaller/coze_workflow/`](experts_recaller/coze_workflow/)** 提供可导入包形态参考（`MANIFEST.yml` 与内层 `workflow/*.yaml`）。画布调整后可将平台导出与仓库对照同步。
- 历史目录 **`experts_queue`** 及 npm 脚本 **`export:coze:queue`** 已移除，请勿再按旧路径检索。

### 3.2 万邑通 OpenAPI 代理包（独立工作流）

当专家在 Coze 侧需经 **`cobra_winit_openapi_request`** 插件透传万邑通 OpenAPI 时，画布应为：**开始 `100001` → 插件节点 → 结束 `900001`**，`edges` 为 `100001 → 插件 → 900001`。开始节点 `node_outputs` 与 `POST /v1/workflow/run` 的 `parameters` 对齐：`action`、`customerCode`、`customerName`、`data`、`username`、`language`；插件的 `apiParam`（`apiID` / `apiName` / `pluginID` / `pluginName` / `pluginVersion` 等）与 `node_inputs` 从 `100001` 拉线；结束节点从插件拉 `code`、`data`、`msg`（与平台导出一致）。**参考样本**（仓库内对照）：[`docs/coze-reference/winit_openapi_call-draft.yaml`](docs/coze-reference/winit_openapi_call-draft.yaml)（与 `npm run export:coze:winit-openapi-proxy` 生成形态一致；本地另有 Coze 导出时可与 `tmp/Workflow-…` 自行 diff）。

**专家草稿内嵌插件**：若 `coze.config.yml` 设置 **`winitOpenapiPlugin.enabled: true`** 与 **`insertBefore`**，`npm run export:coze` 会在该节点**之前**插入 **`type: plugin`**。开始节点仅含框架顶层 **`customerCode` / `customerName` / `username` / `language`**（不经 `inputs`）；插件入参 **`data`** 从 **`insertBefore` 前一档代码节点**拉线（默认产出字段 **`winitRequestData`**，可用 **`requestDataFrom`** 覆盖）。**`action`** 可为插件入参**字面量**（**`openapiAction`**），或由指定代码节点拉线（**`requestActionFrom`**，默认路径 **`winitOpenapiAction`**）。自动为 `fetch-sku-inventory` 绑定 **`skuUsableQty` ← 插件响应 `data`**；详见 §7。规约见 [`docs/design-spec.md`](docs/design-spec.md) §6。

本仓库提供**专用生成器**（仅生成独立代理包，与 `expert-to-coze` 并行）：

```bash
npm run export:coze:winit-openapi-proxy

# 指定输出目录、工作流 ID（须与线上一致）、仅写目录不打 zip
npm run export:coze:winit-openapi-proxy -- --out tmp/my_proxy --workflow-id 7623329033350168611 --no-zip
```

- 默认写出 `tmp/coze_winit_openapi_proxy/workflow/`，并额外生成 **`experts_coze_output/winit_openapi_call.zip`**（除非 `--no-zip`）。在 **PowerShell** 下若 `npm run … -- --no-zip` 仍打出 zip，可改用 **`cmd /c "npm run export:coze:winit-openapi-proxy -- --no-zip"`**，或直接 **`npx ts-node -P scripts/tsconfig.json scripts/export-winit-openapi-proxy-cli.ts --no-zip`**。
- 实现：**[`scripts/export-winit-openapi-proxy-cli.ts`](scripts/export-winit-openapi-proxy-cli.ts)**、**[`scripts/coze-export/winit-openapi-proxy-emit.ts`](scripts/coze-export/winit-openapi-proxy-emit.ts)**。插件 **`apiParam` 等常量**以 **[`scripts/coze-export/winit-openapi-plugin-shared.ts`](scripts/coze-export/winit-openapi-plugin-shared.ts)** 为唯一来源（独立包与专家内嵌共用）；平台升级后在该文件修改再导出。

---

## 4. 操作步骤（给其他专家复用）

1. **保证专家目录齐全**  
   `manifest.json`、`workflow.json`、代码节点对应的 `nodes/*.ts`、`prompts/main.md`（LLM 节点）等。

2. **在专家根目录新增 `coze.config.yml`（推荐）**  
   至少配置：`workflowId`、`yamlBasename`、`packageMainName`、与线上一致的 **`nodeIds`**（若需稳定导入）、**`inputBindings`**（解决「本地参数名」与「Coze 占位符 / 画布拉线」不一致，例如 `result` → `computationResult`、`inputContext` ← 前序节点的 `outputContext`）。  
   可选：**`textNodes`**（如 Few-shot 文本节点）、**`positions`**、`endOutputs` 覆盖。  
   若该专家要用 **DeepSeek** 而非默认豆包，在同文件加 **`llmNode.model: deepseek`**（见 **§7.1**）；若 LLM 需要承接较长记录，可配置 **`llmNode.maxTokens`**。

3. **执行导出**  
   `npm run export:coze -- <专家目录> --out <临时目录>`，检查生成的 `MANIFEST.yml` 与 draft YAML。

4. **在 Coze 中导入**  
   使用平台支持的压缩包或目录形式上传；若报错，对照本文第 6 节「格式与平台约束」排查。

5. **（可选）放置官方导出作对照**  
   将 Coze 导出的正确包放在例如 `workflow/original/` **仅作 diff 参考，不要覆盖为生成结果**。

---

## 5. 本地源与 Coze 字段的对应关系（规范摘要）

| 本地 | Coze 导出中的体现 |
|------|-------------------|
| `manifest.json` 的 `inputSchema`（仅业务字段）及根级扩展 | `start` 节点的 `parameters.node_outputs` = 框架顶层 `query` / `customerIntent` / `inputContext` + **`inputs`** + **`customerCode` / `customerName` / `username` / `language`**（全体专家默认）。内嵌万邑通插件时**请求体 `data` 不在开始节点**，由前置代码节点产出并由插件拉线。由 `scripts/coze-export/manifest-io.ts` 的 **`expertStartNodeOutputs(manifest)`** 合成；个别专家可用根级 **`x_framework_input_required`** / **`x_framework_require_previous_output`** 将框架顶层字段标为必填 |
| `manifest.json` 的 `outputSchema`（及 `coze.config.yml` 的 `endOutputs`） | `end` 节点的 `parameters.node_inputs`（从 **format-output** 根级拉 **`structured` / `analysis` / `outputContext` / `enrichedContext`** 四字段，与 [`call-expert.ts`](experts_recaller/nodes/call-expert.ts) 一致，见 [design-spec.md](docs/design-spec.md) §7） |
| `workflow.json` 中带 `file` 的节点 | `type: code`，`parameters.code` 为文件全文；**导出前自动内联 `shared/` 并移除 `import`/`export`**（见 [`bundle-coze-node-code.ts`](scripts/coze-export/bundle-coze-node-code.ts)） |
| `workflow.json` 中 `type: llm` | `type: llm`，`llmParam`（含从 `prompts/main.md` 读入的 `systemPrompt`；**模型**由 `coze.config.yml` 的 `llmNode.model` 决定，最大回复长度可由 `llmNode.maxTokens` 覆盖，见 §7.1） |
| `workflow.json` 的 `inputs` / `outputs` | 结合执行顺序与 **`inputBindings`** 生成 `node_inputs`、`edges` |
| `workflow.json` 的 **`cozeIo`**（可选） | 节点级 **JSON Schema 子集**：`cozeIo.inputs` / `cozeIo.outputs` 的键与对应节点的 `inputs` / `outputs` 名字对齐。导出时 **优先** 用于生成 code / LLM 节点的 `node_inputs` / `node_outputs` 的 `type`（及 `list.items`、`object.properties` 等，与 `manifest-io` 中 `cozePropertyToNodeOutput` 一致） |
| `workflow.json` 的 **`outputSchema`**（可选，代码节点） | 与 `manifest.json` 同形的 **`outputSchema.properties`**：按 **输出字段名** 声明该代码节点各 `outputs` 的类型。与 `cozeIo.outputs` 可并存；**同一键以 `cozeIo.outputs` 为准**。解析顺序见下节。未命中 `cozeIo`、`outputSchema` 时，仍尝试 **`manifest.inputSchema` / `outputSchema` 中同名键** 及内置特例（`outputContext`、`result`）；**再无匹配则导出报错**（不再按字段名猜测） |
| 可选 `prompts/examples.md` + `coze.config.yml` 的 `textNodes` | `type: text` 拼接节点，供 Few-shot 接入 LLM |

### 代码节点 `node_outputs` 的解析顺序（`manifest-io`）

1. `cozeIo.outputs.<键>`
2. `outputSchema.properties.<键>`
3. 内置：`outputContext`、`result`（按 manifest 的 `outputSchema` 等）
4. `manifest.inputSchema.properties.<键>`、`manifest.outputSchema.properties.<键>`
5. 以上皆无 → **`npm run export:coze` 失败**，提示补充 `cozeIo` 或 `outputSchema` 或 manifest

**检查脚本**：`scripts/check-coze-io.ts` 会提示未在 `cozeIo.outputs` 或 `outputSchema.properties` 中声明的出参键；`--strict` 时失败。`result` / `outputContext` 不要求重复声明。仅依赖 manifest 的其余键亦会告警（可忽略或把类型下沉到上列之一）。

### `workflow.json` 的 `cozeIo`（节点端口类型）

- **形态**：与 [`scripts/coze-export/types.ts`](scripts/coze-export/types.ts) 中 **`CozeNodeIoSpec`** 一致；属性值使用与 **`manifest.json`** 相同的 **`JsonSchemaProperty`** 子集（`type`、`description`、`properties`、`required`、`items`、`array`→导出为 `list` 等）。
- **出参**：每个需要精准类型的 **`outputs`** 键建议在 **`cozeIo.outputs.<键>`** 写明类型；或在节点根级使用 **`outputSchema.properties`**（与 `manifest.json` 的 JSON Schema 子集相同），例如：

```json
"outputSchema": {
  "properties": {
    "routeType": { "type": "string", "description": "single | batch" },
    "outboundOrderNos": { "type": "array", "items": { "type": "string" } }
  }
}
```

- **出参（与 `outputSchema` 关系）**：二者二选一或并存；**同一键优先 `cozeIo.outputs`**。
- **入参**：在 **`cozeIo.inputs.<入参名>`** 声明 **`type` 即可**（导出时 **不会** 把 `properties` 展开到 `node_inputs`，避免 Coze 为子字段生成独立入参）；拉线仍为整对象 `value: { path, ref_node }`。详见 [design-spec.md](docs/design-spec.md) §7.6。
- **LLM 节点**：若配置 **`cozeIo.outputs`**，会与默认的 `analysisResult` / `reasoning_content` **合并覆盖**（同名键以 `cozeIo` 为准）。

**LLM 输出与 Prompt 对齐**：导出器为 LLM 节点默认生成 `node_outputs.analysisResult`（子字段 `structured`、`analysis`）。**`prompts/main.md`（或 `promptFile`）中的 JSON 示例须使用同名外层键**，例如 `{ "analysisResult": { "structured": …, "analysis": … } }`，勿仅写扁平 `{ structured, analysis }`，以免部分模型跟 Prompt、部分跟 Coze schema 产生双层或漏字段。多阶段 LLM 按 `workflow.json` 的 `outputs[0]`（如 `classificationResult`）类推。详见 [design-spec.md](docs/design-spec.md) §LLM 输出 JSON 契约。

**LLM 与 Runner：** `workflow.json` 中 LLM 节点的 `inputs` 必须与 **`nodes/<id>.ts` 契约说明**、**`prompts/main.md` 占位符**一致；`scripts/llm-openai.ts` 负责占位符替换（如 `{{examplesMd}}`、`{{computationResult}}`）。本地可在 `inputs` 中声明 **`examplesMd`**，由 `run-expert` / `runLlmNode` 在未注入时读取 `prompts/examples.md`。

---

## 6. 格式与平台约束（已验证）

以下项违反时，Coze 可能出现**格式错误**或变量不生效：

1. **YAML 标量风格**  
   导出必须使用以 **PLAIN** 为主的序列化：短字符串、空串为常规标量；**仅多行内容**（如代码、`systemPrompt`）使用 **`|` 块**。不得默认把全部字段写成 `|-` 块标量。

2. **draft `nodes` 顺序与开始/结束 id**  
   **`nodes` 数组第 1、2 项**必须是 **开始**、**结束** 节点；其 **`id` 固定为 `"100001"`、`"900001"`**（工具强制，勿在 `coze.config.yml` 的 `nodeIds` 中改）。其余节点按工作流执行链顺序排在后面；**`edges` 仍表示真实数据流连线**。

3. **`node_outputs` 类型枚举**  
   须符合 Coze 支持的 **`type`**（如 `string`、`integer`、`float`、`boolean`、`time`、`object`、`list` 等）。**`list` 必须包含 `items`**，结构与官方导出一致。专家工作流：`manifest.json` 的业务 `inputSchema` 经 **`expertStartNodeOutputs`** 与框架字段合并后写入 `start`（`array`→`list` 且生成 `items`，`number`→`float`），见 **`scripts/coze-export/manifest-io.ts`**。

4. **`MANIFEST.yml` 中 `main.id`**  
   须为**无引号的整数形态**（如 `id: 7621923795871957002`），不能写成 `id: "7621923795871957002"`。工具在 **`stringifyManifestYml`** 中对该行做了后处理以符合平台要求。

5. **草稿根级 `id`**  
   须为**无引号**整数形态（与 `MANIFEST` 的 `main.id` 一致）。工具在 **`stringifyDraftWorkflowYml`** 中将行首的 `id: "…"` 改为 `id: …`；画布节点 `id`（如 `"100001"`）仍为带引号字符串。

6. **Coze 变量名不能含英文句点 `.`**  
   Prompt 中 Few-shot 占位符使用 **`{{examplesMd}}`**，与 `workflow.json` 入参 **`examplesMd`** 一致；不要使用 `{{examples.md}}` 作为变量名。

7. **工作流 `name` 与 draft 文件名的 slug 段不能含连字符 `-`**  
   **`packageMainName`** 与 **`yamlBasename` 里 `-draft` 之前的 slug** 须为下划线 **`_`**；slug 中的 `-` 在加载配置时会被规范为 `_`。**`draft` 字面量与 slug 之间必须用单个 `-` 连接**，例如 **`e_template-draft.yaml`**、**`outbound_order_status-draft.yaml`**（勿写成 `e_template_draft.yaml` 作为规范形态，工具会把 `_draft` 规范为 `-draft`）。

8. **换行**  
   嵌入 YAML 的 TypeScript / Markdown 建议统一为 **LF**，避免 Windows CRLF 进入 YAML 后被写成异常的双引号转义长串。

9. **代码节点禁止裸 `import`（Coze 画布）**  
   Coze FaaS **不支持** `import … from "…"`。仓库内节点源文件**仅允许** `import` 仓库根 **`shared/`**；`npm run export:coze` 会内联为单脚本。若 YAML / 画布正文仍出现 `import`，说明未走导出或手工粘贴了源文件。检查：`npm run check:coze-node-code --strict`。

---

## 7. `coze.config.yml` 配置项（参考）

文件名可为 **`coze.config.yml`** 或 **`coze.config.yaml`**，放在**专家根目录**。

| 配置项 | 说明 |
|--------|------|
| `workflowId` | 与线上一致的工作流 ID；缺省则按专家 `id` 生成稳定数字串 |
| `yamlBasename` | draft 文件名：`<slug>-draft.yaml`，slug 仅 `_`；如 `e_template-draft.yaml` |
| `packageMainName` / `packageDescription` / `icon` | 写入 MANIFEST 与 draft 顶层 |
| `nodeIds` | 中间节点逻辑键 → Coze 字符串 ID；**`__start__` / `__end__` 固定 100001 / 900001，勿配** |
| `textNodes` | `logicalId`、`insertAfter`、`sourceFile`、`title` |
| `inputBindings` | `节点id.入参名: { ref, path, aliasAs? }`；`ref` 可为 `__start__` 或其它节点 id |
| `endOutputs` | 覆盖结束节点对外映射 |
| `positions` | 画布坐标（可选） |
| `winitOpenapiPlugin` | 可选（legacy 单块）。`enabled`、`insertBefore`、`logicalId`、`openapiAction` / `requestActionFrom`、`requestDataFrom`、`fetchSkuBindings`；语义见下 |
| `winitOpenapiPlugins` | 可选。**多个**万邑通插件槽位（YAML 数组）；每项字段同单块（`enabled` 缺省视为启用）。与 `winitOpenapiPlugin` 并存时：若数组非空则**仅**使用数组项，否则回退单块。同一 `insertBefore` 可配置多项，**顺序与数组一致**；**`logicalId` 须全局唯一** |
| `omitCodeNodeInputs` | 可选。`节点id: [入参名…]`：无 `inputBindings` 时从导出的 code 节点 `node_inputs` 中省略；含 `fetch-sku-inventory` 时工具会按是否启用插件合并默认省略项 |
| `llmNode.model` | 可选。LLM 模型预设名（见 **§7.1**）。缺省 `doubao`；非法值导出 fail-fast |
| `llmNode.maxTokens` | 可选。覆盖 Coze LLM 节点 `maxTokens`；不配置时默认 `4096` |
| `llmNode.version` / `llmNode.settingOnError` | 可选。覆盖 LLM 节点 `version` 与错误/超时设置 |

完整样例：**[`experts/_template/arithmetic-formula/coze.config.yml`](experts/_template/arithmetic-formula/coze.config.yml)**。DeepSeek 示例：**[`experts/last-mile/tracking-no-scan/coze.config.yml`](experts/last-mile/tracking-no-scan/coze.config.yml)**。

### 7.1 切换 LLM 模型（豆包 / DeepSeek）

导出时所有 `type: llm` 节点共用同一套 `llmParam` 预设（由 [`scripts/coze-export/defaults.ts`](scripts/coze-export/defaults.ts) 的 `LLM_MODEL_PRESETS` 定义）。**本地 `workflow.json` 不写模型名**；模型只通过专家目录的 `coze.config.yml` 选择，再 `export:coze` 写入 draft YAML。

| 预设 `llmNode.model` | Coze `modelName` | `modelType` | temperature | 备注 |
|----------------------|------------------|-------------|-------------|------|
| `doubao`（**缺省**；不写该字段等同） | `豆包·2.0·pro` | `1772700462` | `0.5` | 现有专家默认 |
| `deepseek` | `deepseek-v4-pro-260425` | `961437672` | `0.8` | 与线上 DeepSeek 稿对齐；`parameters` 仅 `reasoning_effort: minimal` |

**已有专家切到 DeepSeek（三步）：**

1. 编辑该专家根目录 **`coze.config.yml`**，增加或改写：

```yaml
llmNode:
  model: deepseek
```

2. 重新导出（写入专家目录下 `workflow/`，并更新 zip）：

```bash
npm run export:coze -- experts/<领域>/<专家id>
```

3. 打开生成的 `workflow/workflow/*-draft.yaml`，确认每个 LLM 节点的 `llmParam` 中：
   - `modelName` = `deepseek-v4-pro-260425`
   - `modelType` = `961437672`
   - `temperature` = `0.8`  
   再按团队流程导入/同步 Coze。

**新专家从一开始用 DeepSeek：** 建目录与 `coze.config.yml` 时就把上面的 `llmNode.model: deepseek` 写上，再按 §4 导出即可；不配则仍走豆包。

**切回豆包：** 删掉 `llmNode.model`，或显式写 `model: doubao`，再执行一次 `export:coze`。

**注意：**

- 非法预设名（例如 `gpt`）会在导出时报错退出，不会静默回落豆包。
- 当前预设作用于该专家导出包内**全部** LLM 节点；若同一专家内不同 LLM 节点要不同模型，导出管线尚不支持，需在 Coze 画布上单独改，或后续扩展配置。
- 本地 `npm run dev:expert` / `OPENAI_*` 与 Coze 模型无关，不在此配置范围内。

---

## 8. 校验与排错

- **`npm run check:coze-io -- experts/<领域>/<专家id>`**：遍历 **`workflow.json`** 中带 **`file`** 的节点，检查每个 **`outputs`** 键是否在 **`cozeIo.outputs`** 中有声明；默认 **warning**，加 **`--strict`**（或环境变量 **`COZE_IO_STRICT=1`**）时缺失则 **非零退出**。
- **`npm run check:coze-port-wiring`**：检查每个节点的 **`inputs`** 是否能在上游 **`outputs`** 或 **`inputBindings`** 中找到显式同名键（Coze 拉线前提）。
- **`npm run check:format-output-contract`**：检查 **`format-output` / `endOutputs`** 四字段合约。
- **`npm run check:coze-node-code`**（可加 `--strict`）：检查代码节点 **`import` 是否仅来自 `shared/`**，且导出内联后无 **`import`/`export` 残留**；`export:coze:all` / `check:experts:manifest` 已包含同等校验。
- **`--validate`**：将生成的 draft 与专家目录下 **`workflow/workflow/<yamlBasename>`** 对比（若文件存在）：节点数量、边集合、各 **code** 节点正文（含换行归一化）。**不**校验 LLM 全文是否与线上一致。
- **人工对照**：将导出结果与 Coze 官方导出的 **`MANIFEST.yml` / draft** 做 diff，重点检查 `main.id`、YAML 标量形态、`code:` 块、`llmParam.systemPrompt` 体积与转义。

---

## 9. 相关文档与脚本索引

| 路径 | 说明 |
|------|------|
| [`scripts/expert-to-coze-cli.ts`](scripts/expert-to-coze-cli.ts) | CLI |
| [`scripts/coze-export/emit.ts`](scripts/coze-export/emit.ts) | 转换与 `stringifyManifestYml` / `stringifyDraftWorkflowYml` / `stringifyCozeYaml` |
| [`scripts/coze-export/config.ts`](scripts/coze-export/config.ts) | 加载 `coze.config.yml` |
| [`scripts/check-coze-node-code.ts`](scripts/check-coze-node-code.ts) | 代码节点 `shared/` import 与内联检查（`npm run check:coze-node-code`） |
| [`scripts/check-coze-io.ts`](scripts/check-coze-io.ts) | 可选：`cozeIo.outputs` 覆盖度检查（`npm run check:coze-io`） |
| [`scripts/export-winit-openapi-proxy-cli.ts`](scripts/export-winit-openapi-proxy-cli.ts) | 万邑通 OpenAPI 代理 Coze 包 CLI |
| [`scripts/coze-export/winit-openapi-proxy-emit.ts`](scripts/coze-export/winit-openapi-proxy-emit.ts) | 上述包的 YAML / MANIFEST 生成 |
| [`scripts/coze-export/winit-openapi-plugin-shared.ts`](scripts/coze-export/winit-openapi-plugin-shared.ts) | 万邑通插件节点与 `apiParam` 共享定义（专家导出与独立包共用） |
| [`scripts/run-expert.ts`](scripts/run-expert.ts) | 本地按 `workflow.json` 执行（含可选 `examplesMd` 注入） |
| [`scripts/llm-openai.ts`](scripts/llm-openai.ts) | LLM 占位符替换 |
| [`docs/project-structure.md`](docs/project-structure.md) | 项目结构与 Coze 对接概述 |
| [`REQUIREMENTS.md`](REQUIREMENTS.md) | 全局需求与约束 |

---

## 10. 修订记录（本任务要点）

- 增加 **本地 → Coze** 的自动化导出与 **`coze.config.yml`** 扩展能力（别名、文本节点、节点 ID、结束节点映射等）。
- 修复导入问题：**YAML 默认块标量**、**`main.id` 双引号**、**LF/CRLF** 与 **Coze 变量名无点号**（`examplesMd` / `{{examplesMd}}`）。
- **工作流 `name` / draft 的 slug 禁止 `-`**：slug 统一为 `_`；**`-draft`** 固定用 **`-`** 连接；默认 `<slug>-draft.yaml`。
- **nodes 顺序与开始/结束 id**：`nodes[0]`/`[1]` 为开始/结束且 id 为 100001/900001；**`node_outputs`** 按 Coze 枚举与 `list.items` 规则生成（见 `manifest-io.ts`）。
- **万邑通 OpenAPI 代理包**：`export:coze:winit-openapi-proxy` + `winit-openapi-proxy-emit.ts`，画布与 `cobra_winit_openapi_request` 插件配置对齐官方导出样本（见 §3.2）。
- **专家草稿内嵌插件**：`coze.config.yml` 的 `winitOpenapiPlugin` + `winit-openapi-plugin-shared.ts`；`omitCodeNodeInputs` 与 `fetch-sku-inventory` 可选入参导出对齐。
- **LLM 模型预设与长度**：`coze.config.yml` 的 `llmNode.model` 可选 `doubao` / `deepseek`（见 §7）；`llmNode.maxTokens` 可覆盖 Coze LLM 最大回复长度；缺省仍为豆包与 `4096`。

后续若 Coze 导出格式升级，建议以**平台最新导出样本**为准更新 `stringifyManifestYml` 与序列化选项，并在此文档第 6 节补充新约束。
