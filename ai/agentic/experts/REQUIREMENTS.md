# 项目要求（AI 参考）

> 本文档汇总项目核心约束与规范，供后续开发与 AI 参考。详细说明见 `docs/`。

---

## 1. 项目定位

- **专注专家实现**，不包含上游调度层
- 专家通过 manifest、Schema、上下文结构，供任意上游发现、校验与链式调用
- 运行环境：**FaaS（Coze）**，工作流在 Coze 中配置，代码与 Prompt 存于本仓库
- **本地生成 Coze 工作流包**：见根目录 **[COZE-WORKFLOW.md](COZE-WORKFLOW.md)**（命令、`coze.config.yml`、导入格式约束）
- **线上专家编排**：线上实际使用的编排工作流源码在 **`experts_recaller/`**（`nodes/`、`prompts/`、与 Coze 对齐的 `coze_workflow/`），负责按计划调用各 **`experts/{domain}/{id}/`** 子工作流；代码节点仍须遵守本节「单文件闭环」等 FaaS 约束。说明见 [experts_recaller/readme.md](experts_recaller/readme.md)；与专家包导出流程的差异见 [COZE-WORKFLOW.md](COZE-WORKFLOW.md) §3.1。

---

## 2. FaaS / Serverless 约束

- **单文件闭环（Coze 运行时）**：每个代码节点在 Coze 上必须是**无 `import` / `export` 的独立脚本**；`npm run export:coze` 写入 YAML 前会自动处理（见下条）。
- **`shared/` 复用（仅本地源码）**：`workflow.json` 里 **`"file"` 指向的** 节点 `.ts` **可** `import` 仓库根目录 **`shared/`** 下的模块（禁止 import 其他节点文件、npm 包、或 `shared/` 以外路径）。导出时 **`scripts/coze-export/bundle-coze-node-code.ts`** 会递归内联 `shared/` 并剥离 `import`/`export`，生成 Coze 可执行正文；**禁止**在 Coze 画布上直接粘贴仍含 `import` 的源码。
- **禁止 ES 模块语法（Coze 最终脚本）**：导出产物与 Coze 节点正文中不得出现 `export`（含 `export {}`）、`import … from` 等。本地节点源文件亦**不得**写 `export`（可用 `import` 仅限 `shared/`）。根目录 **`tsconfig.json`** 使用 **`moduleDetection: "force"`**，节点文件参与 `tsc` 时按模块解析。
- **规约检查**：`npm run check:coze-node-code`（或 `export:coze:all` / `check:experts:manifest` 前置检查）会校验 import 来源与内联结果；非法 import 则导出失败。
- **单任务单文件**：不同分支/任务可拆成独立文件，工作流按上一节点结果分流
- **节点独立部署**：每个节点可单独复制到 Coze 代码节点使用（须使用 **export:coze 生成** 的内联后正文，而非仓库源文件中的 `import` 形态）

---

## 3. Coze 代码节点格式

```ts
async function main({ params }: { params: Record<string, unknown> }) {
  const input = params.xxx;  // 通过 params 获取输入变量
  // ...
  const ret = {
    "key0": params.input + params.input,  // 字符串
    "key1": ["hello", "world"],           // 数组
    "key2": { "key21": "hi" },            // 对象
  };
  return ret;
}
```

- **输入**：`params` 由 Coze 注入，变量名与工作流配置一致
- **输出**：必须是 Object 键值对形式，键为字符串，值可为 string/number/boolean/array/object
- **语法**：Coze 侧为脚本形态（如顶层 `async function main`、可选的文件末尾 `process.argv` 调试块）。**源文件**可 `import` **`shared/`**（导出时内联）；**不得**写 `export`；**禁止** import 节点文件或 npm 包（见第 2 节）

---

## 4. 输出设计：结构化与非结构化

输出不宜全部强制结构化，否则会限制 Agent 表达灵活性：

| 类型 | 适用内容 | 说明 |
|------|----------|------|
| **结构化** | 订单号、单据 ID、运单号等标识符 | 供下游解析、链接、查询，需严格 Schema |
| **非结构化** | 分析结论、异常描述、建议、逻辑呈现 | 自然语言自由呈现，保留 Agent 灵活性 |

### 对客可读输出（`analysis` 等）

面向卖家、终端用户或任何对外可读渠道的自然语言（含 `analysis`、`resultSummary` 中面向客户的一段）**不得**将飞书多维表、内部 Wiki、仅供员工访问的在线表或 winitlink 知识库等表述为规则依据或「以何为准」的来源；**不得**引导客户去查阅上述内部文档。权威表述应使用**合同、价卡、订单生效政策、本专家内置条款摘要**等客户可理解的措辞。飞书与内部表仅作仓库内维护溯源（`design.md`、维护说明、代码注释），**不要**写入「须在 analysis 末尾提醒客户查飞书/以飞书为准」类指令。详见 [设计规格](docs/design-spec.md) §「输出 Schema 设计原则」。

---

## 5. 专家目录结构

```
experts/{domain}/           # 按领域分子目录，如 last-mile
└── {expert-id}/
    ├── manifest.json       # 元数据、inputSchema、outputSchema
    ├── design.md           # 可选：专家设计、输入、上下文丰富流程
    ├── nodes/              # 代码节点（每文件一任务，Coze 格式）
    └── prompts/            # LLM Prompt（main.md、examples.md、expert.md 等）
```

---

## 6. 专家元数据规范

- **description**：第三人称，含 WHAT + WHEN，格式：`{能力描述}。Use when {触发场景}`  
- **id**：`[a-z0-9-]+`，最大 64 字符  
- **capabilities**：能力标签数组，便于粗粒度筛选  
- **inputSchema**：**仅**声明业务字段（如单号、算式等），**不得**包含框架保留顶层键 `query`、`customerIntent`、`inputContext`、`inputs`、`customerCode`、`customerName`、`username`、`language`、`data`。框架字段与 `inputs` 对象由仓库统一约定，见 [设计规格](docs/design-spec.md) §6  
- **manifest 根级扩展（可选）**：若某专家须让编排器/Coze 开始节点将框架顶层字段标为必填，可使用 **`x_framework_input_required`**（字符串数组，键须为开始节点已有顶层项，如 `inputContext`）、**`x_framework_require_previous_output`**（布尔，在已要求 `inputContext` 时强化 `previousOutput` 必填说明）。**`inputSchema` 上**可使用 **`x_invoke_contract`**（多行字符串），由 `sync-expert-register` 写入多维表 **`io` 列**，便于人类与 Planner 阅读（不进入 `inputSchema.properties`）

---

## 7. 上下文结构

- **inputContext**：sourceExpertId、previousOutput、chainId  
- **outputContext**：expertId、resultSummary、chainId（透传）  

---

## 8. 文档索引

- [设计规格](docs/design-spec.md) - 专家元数据、Schema、上下文规范
- [项目结构](docs/project-structure.md) - 目录说明与 Coze 对接方式
- [experts_recaller/readme.md](experts_recaller/readme.md) - 线上编排工作流（队列完成、交接摘要等）
