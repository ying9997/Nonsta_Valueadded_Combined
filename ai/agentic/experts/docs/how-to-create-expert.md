# 如何创建专家（手把手手册）

本文面向**第一次**在本仓库新增 `experts/{domain}/{expert-id}/` 的开发者，按顺序说明从复制模板到本地试跑、导出 Coze 包与登记的全流程。

**前置**：若专家尚未完成场景拆分、边界与 API 设计，请先读 **[how-to-design-expert.md](how-to-design-expert.md)**（规划与设计手册），再按本文实现。

**建议阅读顺序（规范原文）**

1. [how-to-design-expert.md](how-to-design-expert.md) — 场景聚类、域拆分、边界卡、API 矩阵、`design.md`（新专家或新域）  
2. [REQUIREMENTS.md](../REQUIREMENTS.md) — 项目定位、FaaS 约束、目录约定、manifest 摘要  
3. [design-spec.md](design-spec.md) — 上下文、`inputSchema` 与调用 JSON 的完整约定（尤其 §5、§6）  
4. [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) — `export:coze`、`coze.config.yml`、字段映射与命名  
5. 需要接万邑通 OpenAPI 时：[winit-openapi-integration.md](winit-openapi-integration.md)  

**路径说明**：本仓库的规范与集成说明在**仓库根目录下的** `docs/`，**不是** `experts/` 子目录里的 `docs/`（部分旧图中若出现 `experts/docs/`，以本句为准）。

---

## 0. 在本仓库里「专家」是什么

- 专家运行在 **FaaS（Coze）**；源码以 **manifest + 工作流编排 + 代码节点 + Prompt** 形式放在本仓库，通过 `npm run export:coze` 生成可导入 Coze 的工作流包。详见 [REQUIREMENTS.md](../REQUIREMENTS.md) §1。  
- **必读硬约束**：  
  - **Coze 单脚本**：Coze 运行时不得含 `import`/`export`。**本地**节点可 `import` 仓库根 **`shared/`** 复用逻辑；`npm run export:coze` 会内联为单文件。禁止 import 其他节点或 npm 包。检查：`npm run check:coze-node-code`。  
  - **`manifest.json` 的 `inputSchema`** 只描述**业务字段**（即最终会出现在调用方 `inputs` 对象里的键）；框架顶层字段见 [design-spec.md](design-spec.md) §6，**禁止**写进 `inputSchema.properties`。
  - **Coze 变量命名**：所有会展开为节点变量的 Schema `properties` 键只允许字母、数字、下划线，且以字母或下划线开头。`last-mile/delivery-status` 等域索引键只能作为 opaque object 的运行时内容，不能声明为展开的子属性。

---

## 准备

1. 安装依赖：在仓库根目录执行 `npm install`。  
2. **选定领域目录** `domain`：例如 `last-mile`、`outbound`，与现有 [`experts/`](../experts/) 下子目录风格一致。  
3. **选定专家 ID** `expert-id`：  
   - 正则：`[a-z0-9-]+`，长度不超过 64（见 [REQUIREMENTS.md](../REQUIREMENTS.md) §6）。  
   - **目录名**建议与 `manifest.json` 里的 **`id`** 一致，例如 `experts/outbound/outbound-order-status/`、`experts/inbound/inbound-order-status/`。  
   - **飞书 `expert_id` 防混淆**：`outbound`、`inbound` 等旅程域的 `manifest.id` 宜带域前缀（见 [domain-taxonomy.md](plan/domain-taxonomy.md) §二），避免 `order-status` 这类短名在登记表中与异域专家撞名。  

---

## 步骤 1：从模板复制整目录

1. 将 **[`experts/_template/arithmetic-formula/`](../experts/_template/arithmetic-formula/)** 整份复制到：  
   `experts/{domain}/{expert-id}/`  
2. 模板自带（复制后按需在「步骤 2」起逐项改名/改写）：  
   - `manifest.json`、`design.md`  
   - `workflow.json`（节点 DAG 与 `inputs`/`outputs`）  
   - `nodes/*.ts`（Coze 形态代码节点）  
   - `prompts/`（如 `main.md`）  
   - `coze.config.yml`（导出 Coze 包用）  
   - `workflow/`：可为历史导出物或空结构；需要**干净包**时以 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §2 为准重新 `export:coze` 生成  

模板索引与简要说明：[experts/_template/README.md](../experts/_template/README.md)。

---

## 步骤 2：编写 `manifest.json`

按专家真实能力修改下列字段（详见 [REQUIREMENTS.md](../REQUIREMENTS.md) §6 与 [design-spec.md](design-spec.md) §3、§4、§6）：

| 字段 | 注意 |
|------|------|
| `id` | 与目录名一致，仅小写、数字、连字符 |
| `name` | 中文或英文名称均可，便于人读 |
| `description` | 第三人称，**含 WHAT + WHEN**，并包含 **`Use when …`** 触发场景句 |
| `capabilities` | 能力标签数组，供上游粗筛 |
| `version` | 语义化版本，如 `1.0.0` |
| `inputSchema` | **仅**业务参数（如单号、表达式）；`required` / `properties` / `default` 等与 JSON Schema 一致 |
| `outputSchema` | 结构化 + 非结构化并存时，保留 `analysis` 等自然语言字段的说明（见 [design-spec.md](design-spec.md) §4） |

**禁止**在 `inputSchema.properties` 中声明：`query`、`customerIntent`、`inputContext`、`inputs`、`customerCode`、`customerName`、`username`、`language`、`data` 等框架保留键（导出会自动校验，见 [design-spec.md](design-spec.md) §6）。

**可选扩展**（按需，见 [REQUIREMENTS.md](../REQUIREMENTS.md) §6）：  
- 根级 `x_framework_input_required`、`x_framework_require_previous_output`  
- 根级 `x_recaller_propagate_previous_enriched_context`（开启 recaller 透传 enrichedContext）  
- 根级 `x_recaller_enriched_context_preferred_source_experts`（可选数组，指定优先来源专家，如 `["delivery-status"]`）  
- `inputSchema` 上的 `x_invoke_contract`（人类可读 IO 说明，同步登记用）

---

## 步骤 3：更新 `design.md`（强烈推荐）

用**自然语言**写清：业务输入、主分支、依赖的外部接口、最终对客话术原则。  
对客可见的 `analysis` 等：**不要**把飞书多维表、内部 Wiki、员工专用链接写成「规则依据」；见 [REQUIREMENTS.md](../REQUIREMENTS.md) §4 与 [design-spec.md](design-spec.md) §4。

---

## 步骤 4：实现 `nodes/*.ts` 代码节点

每个节点**一个文件**，形态与 Coze 代码节点一致（摘自 [REQUIREMENTS.md](../REQUIREMENTS.md) §3）：

```ts
async function main({ params }: { params: Record<string, unknown> }) {
  const input = params.xxx;
  // ...
  const ret = {
    key0: "value",
    key1: ["hello", "world"],
    key2: { nested: true },
  };
  return ret;
}
```

- 通过 **`params`** 读取上游与工作流注入的变量名（须与 `workflow.json` 中的 `inputs` 及 Coze 画布一致）。  
- 返回值必须是**对象**；键为字符串，值为 string/number/boolean/array/object。  
- **不要**从其他节点的 `.ts` 文件 `import`（维护「单文件闭环」，便于单独复制到 Coze）。  
- **`workflow.json` 的 `file` 所指向的可执行节点**中**禁止** ES 模块语法：**不要**写 `export`（含 `export {}`）、`import … from`。Coze FaaS 代码节点不承认这些写法，会直接报错；需要本地调试时保留文件末尾可选的 `process.argv` 块即可，勿用 `export {}` 把文件标成模块。仓库根 `tsconfig.json` 已设 **`moduleDetection: "force"`**，本地 `npm run typecheck` 仍按「每文件一模块」解析，**不依赖** `export {}`。

`workflow.json` 里每个代码节点的 `"file": "nodes/xxx.ts"` 必须指向实际存在的文件。

### `format-output` 节点的强制输出形状

每个专家**必须**有一个 `format-output` 节点作为最后一个代码节点，且**必须**在 `return` 根级严格返回与 [`call-expert.ts`](../experts_recaller/nodes/call-expert.ts) 一致的四字段（详见 [design-spec.md](design-spec.md) §7）：

```ts
return {
  structured: { /* 业务字段，与 manifest.outputSchema.structured 对齐 */ },
  analysis: "对客自然语言结论",
  outputContext: {
    expertId: "当前专家 id（字面量硬编码）",
    resultSummary: analysis.slice(0, 200) || "默认摘要",
    chainId: inputContext?.chainId ?? "",  // 空串合法，但不可为 undefined/null
  },
  enrichedContext: { /* 编排用手交事实；无则 {} */ },
};
```

**常见错误**：

| 错误形态 | 正确做法 |
|----------|----------|
| `return { result: { structured, analysis }, outputContext }` | 去掉 `result` 包装，四字段均在根级 |
| `outputContext.enrichedContext` | 改为根级 `enrichedContext` |
| `result` 直接等于 LLM 的 `analysisResult` | 先 coerce 提取 `structured` 和 `analysis` |
| `outputContext.chainId` 赋值 `undefined` | 改为 `inputContext?.chainId ?? ""` |
| `outputContext` 放进 `manifest.outputSchema` | `outputContext` 是框架字段，只属于 [design-spec.md §7.5](design-spec.md) |
| 结束节点从非 format 节点拉线 | `endOutputs` 四项均 `ref: format-output` |

---

## 步骤 5：编排 `workflow.json`

`workflow.json` 定义节点顺序与数据流（本地 `run-expert` 与导出器共用）：

- **代码节点**：`id`、`file`、`inputs`（字符串数组，表意「本节点需要哪些上游键名」）、`outputs`（本节点产出键名）。  
- **LLM 节点**：`"type": "llm"`，`inputs` / `outputs` 与 Prompt 占位符一致；正文来自 `prompts/main.md` 等（见导出说明 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §5）。  
- **`cozeIo`（建议保留/补全）**：为各输入输出提供 JSON Schema 形态，供 `export:coze` 生成 Coze 的 `node_inputs` / `node_outputs` 类型。缺漏时导出可能报错（「无法再猜测类型」），见 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §5–§6 与 `manifest-io` 解析顺序。

若新专家比模板简单，可**删除**多余节点，但必须同时：

- 删掉或替换不再使用的 `nodes/*.ts`；  
- 保证从「隐含的开始」到结束节点间，`inputs` 均有来源（前序 `outputs` 或框架注入字段如 `query`、`inputContext`）。

复杂范例可参考模板：[experts/_template/arithmetic-formula/workflow.json](../experts/_template/arithmetic-formula/workflow.json)。

---

## 步骤 6：维护 `prompts/`

- 若工作流中仍有 LLM 节点：至少维护 **`prompts/main.md`**（系统/主提示词）。  
- **LLM 输出 JSON**：顶层键名须与 `workflow.json` 中该 LLM 节点的 **`outputs[0]`** 一致（通常为 `analysisResult`），其内包含 `structured` 与 `analysis`。示例：

```json
{
  "analysisResult": {
    "structured": { },
    "analysis": "..."
  }
}
```

详见 [design-spec.md §LLM 输出 JSON 契约](design-spec.md)。
- **Few-shot**：可选用 `prompts/examples.md`，并在 `coze.config.yml` 里用 `textNodes` 或节点读文件方式接入（见 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §5）。  
- 模板中分析与合规要求：对齐 [REQUIREMENTS.md](../REQUIREMENTS.md) §4，避免引导客户查阅内部文档。

---

## 步骤 7：配置 `coze.config.yml`

在专家目录下编辑 **`coze.config.yml`**（模板示例：[experts/_template/arithmetic-formula/coze.config.yml](../experts/_template/arithmetic-formula/coze.config.yml)）。常用项：

| 配置块 | 作用 |
|--------|------|
| `workflowId` | Coze 🎯工作流 ID，与线上一致时导入稳定 |
| `yamlBasename` | 生成的 draft 文件名，如 `my_expert-draft.yaml` |
| `packageMainName` | 包内主名称；**仅使用字母数字下划线，slug 中不要用 `-`** |
| `nodeIds` | 各逻辑节点 ID 与 Coze 画布对齐，便于重复导入 |
| `inputBindings` | 本地键名与 Coze 占位符/拉线别名不一致时做映射 |
| `branching` | 条件分支（若与模板一样有多出口） |
| `positions` | 画布坐标（可选，便于 diff） |
| `winitOpenapiPlugin` | 在专家主工作流内**嵌入**万邑通插件时使用 |
| `endOutputs` | 覆盖结束节点字段映射，**必须**包含 `structured`、`analysis`、`outputContext`、`enrichedContext` 四项（见下） |

**`endOutputs` 必填配置**（⚠️ 固定四字段，与 `call-expert.ts` 一致，见 [design-spec.md §7.3](design-spec.md)）：

```yaml
endOutputs:
  structured:
    ref: format-output
    path: structured
  analysis:
    ref: format-output
    path: analysis
  outputContext:
    ref: format-output
    path: outputContext
  enrichedContext:
    ref: format-output
    path: enrichedContext
```

四项均从 **`format-output` 根级**拉线（path 无 `result.` 前缀）。缺任一项时 `call-expert.ts` 可能无法解析或编排器收不到 `enrichedContext`。

**命名硬约束**（避免导入失败）：`packageMainName` 与 draft 文件名里 **`-draft` 之前的那段（slug）不得含连字符 `-`**，应使用 **`_`**；**slug 与 `draft` 之间**才用 **`-`** 连接，例如 `my_expert-draft.yaml`。详见 [docs/project-structure.md](project-structure.md)「与 Coze 的对接方式」与 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md)。

**万邑通**：先读 [winit-openapi-integration.md](winit-openapi-integration.md)，在「独立代理包」与「专家内嵌插件」两种模式间二选一，再改 `coze.config.yml` 与节点。

---

## 步骤 8：本地试跑

仓库根目录执行（专家 ID 为 `manifest` 中的 `id`，与目录名一致）：

```bash
npm run dev:expert <expert-id> -- --<业务字段名> <值> ... --customerIntent "说明意图" --query "可选任务描述"
```

- 业务字段名与 **`manifest.inputSchema.properties`** 的键一致，会进入 Runner 的初始参数。  
- **LLM**：未配置 `OPENAI_API_KEY` 时为 Mock；配置后走真实模型。环境变量见 [scripts/README.md](../scripts/README.md)「dev:expert」「LLM 节点」。  
- **万邑通相关本地调试**：见 [scripts/README.md](../scripts/README.md)「万邑通」各表；CLI 支持在第一个 `--` 前使用 `--coze-winit-customer-code`、`--coze-winit-username` 覆盖 `.env`。  
- **Windows PowerShell** 若传参被吞，可用 `npx ts-node -P scripts/tsconfig.json scripts/run-expert-cli.ts <expert-id> -- --expression "1+2"`（同 README 说明）。

模板示例命令（算术模板）亦在 [experts/_template/README.md](../experts/_template/README.md)。

---

## 步骤 9：导出 Coze 包并校验

```bash
# 默认写入该专家目录下的 workflow/
npm run export:coze -- experts/{domain}/{expert-id}

# 指定输出目录
npm run export:coze -- experts/{domain}/{expert-id} --out tmp

# 与仓库内已有 draft 样本做结构校验（可选）
npm run export:coze -- experts/{domain}/{expert-id} --validate
```

等价：`npx ts-node -P scripts/tsconfig.json scripts/expert-to-coze-cli.ts <专家目录> [--out <目录>] [--validate]`。  
产物结构与导入方式：[COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §2–§4。

**全仓库体检**（manifest / 导出前置检查）：

```bash
npm run check:experts:manifest
```

---

## 步骤 10（可选）：同步专家登记

若团队使用飞书多维表等登记专家元数据，在项目根配置好 `.env` 后执行：

```bash
npm run sync:expert-register:dry-run
npm run sync:expert-register
```

实现入口：`scripts/sync-expert-register/cli.ts`。环境变量与调试细节以项目内 `.env.example` 及运维约定为准。

---

## 与 `experts_recaller/` 的区别

- **`npm run export:coze`** 面向的是 **`experts/{domain}/{expert-id}/`** 这种**标准专家包**（含 `manifest.json`、`workflow.json`）。  
- **线上专家编排**源码在 **`experts_recaller/`**，与单独专家包不同，**不要**把两套导出命令混用。详见 [experts_recaller/readme.md](../experts_recaller/readme.md) 与 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §3.1。

---

## 附录 A：验收清单（可复制勾选）

- [ ] 目录为 `experts/{domain}/{expert-id}/`，且与 `manifest.id` 一致  
- [ ] `manifest.json` 的 `description` 含 **Use when**；`inputSchema` **不含**框架保留键  
- [ ] `design.md` 已更新（输入、分支、对客约束）  
- [ ] 每个 `workflow.json` 中的 `file` 均有对应 `nodes/*.ts`，且节点为 **`main({ params })`** 形态  
- [ ] 无跨节点 TS 文件的 `import`；**可执行** `file` 节点内无 `export` / `import`（含 `export {}`，Coze FaaS 不支持）  
- [ ] `prompts/` 与 LLM 节点一致；对客内容符合 [REQUIREMENTS.md](../REQUIREMENTS.md) §4  
- [ ] `coze.config.yml` 中 **`packageMainName` / draft slug 无非法连字符**（仅用 `_`，`-` 仅在 `-draft` 前拼接）  
- [ ] `coze.config.yml` 的 `endOutputs` 包含四字段（见步骤 7 与 [design-spec.md §7.3](design-spec.md)）；`npm run check:format-output-contract` 通过  
- [ ] `format-output` 根级返回 `{ structured, analysis, outputContext, enrichedContext }`；`outputContext` 仅含三键；`outputContext.chainId` 不为 `undefined`/`null`  
- [ ] `manifest.outputSchema` 中**不含** `outputContext`（框架字段，禁止写入 manifest）  
- [ ] `npm run dev:expert <expert-id> -- ...` 能跑通  
- [ ] `npm run export:coze -- experts/{domain}/{expert-id}`（可加 `--validate`）通过  
- [ ] `npm run check:experts:manifest` 通过（提交前建议）  
- [ ] 若接万邑通：已读 [winit-openapi-integration.md](winit-openapi-integration.md) 并选对模式 A/B  

---

## 附录 B：常见问题与排查

| 现象或错误 | 可能原因 | 处理方向 |
|------------|----------|----------|
| 导出报 `inputSchema` 含框架字段 | 把 `query` / `inputContext` / `data` 等写进了 `properties` | 删掉，只保留业务字段（见 [design-spec.md](design-spec.md) §6） |
| `export:coze` 报类型/字段无法解析 | 某代码节点输出键未在 `cozeIo` 或 `outputSchema` 中声明 | 为该节点补全 `cozeIo.outputs` 或节点级 `outputSchema`（见 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §5） |
| Coze 导入失败或包名异常 | slug 含 `-` 或 `packageMainName` 含 `-` | 改为下划线：`my_expert`，文件如 `my_expert-draft.yaml` |
| 本地 Run 找不到专家 | `expert-id` 拼写错误或目录不在 `experts/**/{id}/` | 对齐 `manifest.id` 与路径 |
| LLM 始终是 Mock | 未设置 `OPENAI_API_KEY` | 配置 `.env` 或环境变量（ [scripts/README.md](../scripts/README.md) ） |
| 万邑通无数据 | 混用两种 `WORKFLOW_ID` 或未配 Coze 令牌 | 对照 [winit-openapi-integration.md](winit-openapi-integration.md) §4 与 [scripts/README.md](../scripts/README.md) |
| `call-expert.ts` 抛 `缺少 outputContext` | 结束节点未配置 `endOutputs.outputContext` | 在 `coze.config.yml` 补 `endOutputs.outputContext: { ref: format-output, path: outputContext }`，重新导出并导入 Coze |
| `call-expert.ts` 抛 `缺少 structured` | 结束节点拉的路径不对（如 `result` 而非 `result.structured`）| 检查 `endOutputs.structured.path` 是否为 `result.structured` |
| `outputContext.chainId` 为 `undefined` | `format-output` 中 `chainId` 直接赋了 `inputContext?.chainId` 而未设默认值 | 改为 `inputContext?.chainId ?? ""` |
| `manifest.outputSchema` 含 `outputContext` | 将框架字段误写入 manifest | 删除 `outputSchema.properties.outputContext`，见 [design-spec.md §7.5](design-spec.md) |
| Coze 代码节点报与 `export` / `import` 相关错误 | 可执行节点里写了 ES 模块语法（含 `export {}`） | 删除 `export` / `import`，只保留 `main` 与可选的 `process.argv` 调试块；见 [REQUIREMENTS.md](../REQUIREMENTS.md) 第 2 节 |

---

## 附录 C：文档索引（扩展阅读）

| 文档 | 用途 |
|------|------|
| [how-to-design-expert.md](how-to-design-expert.md) | 规划与设计（本文前置） |
| [REQUIREMENTS.md](../REQUIREMENTS.md) | 项目要求总览 |
| [design-spec.md](design-spec.md) | Schema、上下文、调用 JSON |
| [project-structure.md](project-structure.md) | 目录说明（注意 `docs/` 在仓库根下） |
| [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) | 导出命令与 Coze 映射 |
| [winit-openapi-integration.md](winit-openapi-integration.md) | 万邑通接入 |
| [docs/coze-reference/](../docs/coze-reference/) | YAML 样本与批处理说明 |
| [scripts/README.md](../scripts/README.md) | 本地运行与环境变量 |

---

*维护：新建专家时若流程有变，请同步更新本页与 [experts/_template/README.md](../experts/_template/README.md)。*
