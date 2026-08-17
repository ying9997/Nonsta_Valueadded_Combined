# 项目目录结构

本项目以 FaaS 方式运行，专家工作流在 Coze 中配置，代码节点与 LLM Prompt 存放在本仓库。

## 目录结构

```
experts/
├── docs/                    # 设计文档
│   ├── design-spec.md       # 专家设计规格
│   └── project-structure.md # 本文件
│
├── experts/                 # 各专家实现（按领域分子目录）
│   ├── _template/           # 新建专家模板
│   │   ├── README.md        # 复制步骤与规范索引
│   │   └── arithmetic-formula/ # 可运行参考专家（四则运算），复制整目录到新 experts/{域}/{id}/
│   │       ├── manifest.json
│   │       ├── design.md
│   │       ├── workflow.json
│   │       ├── nodes/
│   │       └── prompts/
│   │
│   └── last-mile/           # 尾程/物流领域
│       └── delivery-status/ # 物流轨迹专家
│           ├── manifest.json
│           ├── design.md    # 专家设计（输入、上下文丰富、工作流）
│           ├── nodes/
│           ├── code/
│           └── prompts/     # Prompt 模板 + expert.md（异常识别知识库）
│
├── experts_recaller/        # 线上编排工作流源码（非 experts/ 下标准专家包）
│   ├── nodes/               # 编排用代码节点（与 Coze 单文件节点对齐）
│   ├── prompts/             # 编排用 LLM Prompt
│   └── coze_workflow/       # 可导入包形态参考：MANIFEST.yml + workflow/*.yaml
│
├── shared/                  # 共享代码与类型（可选）
│   ├── types.ts             # 上下文、输入输出类型定义
│   └── utils.ts             # 通用工具函数
│
├── Readme.md
└── package.json
```

## 目录说明

### experts/{domain}/{expert-id}/

专家按领域分子目录（如 `last-mile/`），每个专家一个独立目录，目录名建议与 `manifest.json` 中的 `id` 一致。

| 文件/目录 | 说明 |
|-----------|------|
| `manifest.json` | 专家元数据、`inputSchema`（仅业务字段）、`outputSchema`；完整调用形状见 [design-spec](../design-spec.md) §6 |
| `design.md` | 可选，专家设计（输入、输出、工作流编排） |
| `nodes/` | Coze 代码节点，单文件闭环，输出为 Object 键值对 |
| `prompts/` | LLM 节点 Prompt 模板，支持 main.md、examples.md、expert.md（领域知识库）等 |

### experts_recaller/

线上 **专家编排** 工作流：按计划调用 `experts/` 下各专家子工作流。**不要求** `manifest.json` / `workflow.json`（与 `npm run export:coze` 针对的专家包不同）。维护方式：代码与 Prompt 以本目录 `nodes/`、`prompts/` 为源码；`coze_workflow/` 存放与线上一致的 Coze 包结构，画布变更后可将平台导出与仓库对照同步。详见 [experts_recaller/readme.md](../../experts_recaller/readme.md)、[COZE-WORKFLOW.md](../../COZE-WORKFLOW.md) §3.1。

### shared/

跨专家复用的类型定义与工具函数。**代码节点源文件**可 `import shared/`；**Coze 导出**时由 `bundle-coze-node-code.ts` 自动内联，画布正文不得保留 `import`。见 [REQUIREMENTS.md](../REQUIREMENTS.md) §2、[COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §6.9。

## 万邑通 OpenAPI

经 Coze 插件或 `workflow/run` 访问万邑通时，**勿直连**万邑通 HTTP；环境变量、两种编排模式与新建 expert 清单见 **[winit-openapi-integration.md](winit-openapi-integration.md)**。

## 与 Coze 的对接方式

- **专家工作流包导出**：根目录 **[COZE-WORKFLOW.md](../COZE-WORKFLOW.md)**（`npm run export:coze`，面向 `experts/...`）。`packageMainName` 与 draft 文件名中的 **slug**（`-draft` 之前）**不得含 `-`**，须用 `_`；**slug 与 `draft` 之间用 `-` 连接**（如 `my_expert-draft.yaml`）。工具会规范化 `coze.config.yml` 中的写法。
- **编排工作流**：`experts_recaller/` 见上文；**不**使用已移除的 `experts_queue` 与 `export:coze:queue`。
- **代码节点**：`npm run export:coze` 将 `nodes/*.ts` 内联 `shared/` 后写入 draft YAML；Coze 上为 `main({ params })` 脚本。**禁止**在画布使用仍含 `import` 的源文件。规范见 [REQUIREMENTS.md](../REQUIREMENTS.md) §2、`npm run check:coze-node-code`。
- **LLM 节点**：将 `experts/{domain}/{id}/prompts/*.md` 内容复制到 Coze LLM 节点的 Prompt 配置
- **manifest.json**：用于本地开发与文档；Coze 起始变量 = 框架三字段 + `inputs` + 业务子字段（导出工具合成），见 [COZE-WORKFLOW.md](../COZE-WORKFLOW.md) §5

## 新增专家步骤

**规划与设计**（新域或新专家）：见 [how-to-design-expert.md](how-to-design-expert.md)（域 plan、边界卡、API 矩阵、`docs/experts/` 参考、`design.md`）。

**实现与交付**（设计评审通过后）：见 [how-to-create-expert.md](how-to-create-expert.md)。摘要：

1. 复制 `experts/_template/arithmetic-formula/` 至 `experts/{领域}/{新专家id}/`（如 `experts/last-mile/{新专家id}/`），见 `_template/README.md`
2. 修改 `manifest.json` 中的 id、description、inputSchema、outputSchema
3. 在 `nodes/` 中实现代码节点（Coze 格式：`main({ params })`，输出 `const ret = { "key": value }; return ret;`；**可执行** `file` 节点内禁止 `export` / `import`，见 [REQUIREMENTS.md](../REQUIREMENTS.md) 第 2 节）
4. 编写 `prompts/main.md`（若该专家包含 LLM 节点）
5. 从设计稿完善 `design.md`、`prompts/examples.md`
