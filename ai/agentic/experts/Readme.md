# Agent 专家系统

专注于**专家本身的实现**，不包含上游调度层。定义专家需暴露的元数据、输入输出 Schema 与上下文结构，使专家可被任意上游系统发现、校验与链式调用。

**→ [项目要求 (REQUIREMENTS.md)](REQUIREMENTS.md)** — 核心约束与规范，供开发与 AI 参考

## 核心思路

- 多个不同的专家，由上游系统调度到哪个专家执行
- 每个专家有自己的说明，用来描述自己的作用和使用方法
- 上游 Agent 根据说明判断使用该 Agent 是否合适当前场景
- 每个专家自定义自己的输入 Schema，上游 Agent 根据 Schema 判断是否缺少关键参数
- Schema 中需包含参数的充分描述：是否必填、类型、默认值、取值范围等
- 每个专家的输入输出有默认结构承载上下文，用于从其他 Agent 承接上文、为后续 Agent 提供下文
- 专家中不能调用别的专家，如果需要其他专家的数据，应当由上游传入
- 如果运行时候发现缺少关键参数，可以在返回的信息中用文本提示的方式声明由哪些专家来补充，planner将协调所需的专家完成任务

## 编排速查（enrichedContext）

- 专家若需要 recaller 自动透传 `enrichedContext`，在 `manifest.json` 开启 `x_recaller_propagate_previous_enriched_context: true`。
- 可选配置 `x_recaller_enriched_context_preferred_source_experts: ["delivery-status"]` 指定优先来源专家列表。
- recaller 会从 `sessionHandoff.steps` 逆序挑选 `enrichedContext`：优先命中配置来源；未命中则回退到最近可用项。详见 `docs/design-spec.md` 与 `experts_recaller/readme.md`。

## 设计文档

- [如何设计专家](docs/how-to-design-expert.md) - 规划与设计：场景拆分、域划分、边界、API 矩阵、`design.md`
- [如何创建专家](docs/how-to-create-expert.md) - 实现与交付：模板、节点、导出 Coze、登记
- [设计规格](docs/design-spec.md) - 专家元数据、Schema、上下文规范
- [万邑通 OpenAPI 集成](docs/winit-openapi-integration.md) - 经 Coze 调用万邑通、环境变量、新建 expert 参考清单
- [项目结构](docs/project-structure.md) - 目录说明与 Coze 对接方式
- [本地调用 (LOCAL-INVOCATION.md)](LOCAL-INVOCATION.md) - 安装依赖、`npm run dev:expert`、环境变量与 Runner 说明
- [experts_recaller/readme.md](experts_recaller/readme.md) - 线上实际使用的专家编排工作流（源码在 `experts_recaller/`）
- [Coze 工作流导出](COZE-WORKFLOW.md) - 生成可导入包、操作步骤、格式与命名规范（各专家可参考）
