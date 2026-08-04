# AI Customer Service — Multi-Expert 系统学习与分析

面向万邑通 AI 智能客服的 Multi-Expert Agent 架构，用于：
1. 理解线上 Orchestration Loop 如何调度各 Expert
2. 面对业务需求时，判断应该在哪个层次做变更

## 项目结构

```
├── agentic/                    线上代码只读快照
│   ├── experts/                核心专家系统（实现 + 编排 + 工具链）
│   ├── ai_agent_classification/ 意图分类 prompt 与问题清单
│   ├── Coze工作流导出/          导出的 Coze 工作流包（可导入）
│   ├── Coze离线快照/            线上工作流 HTML 快照
│   ├── cs-kb/                  知识库工具（摘要/分类/打包）
│   ├── qid-recall/             QID 数据提取与同步
│   └── winit-tom-relay/        TOM 订单查询中继服务
└── study/                      学习笔记、术语表、实验记录
```

## 决策框架

当收到业务需求（如"客户问 X 问题没有得到正确回答"），按以下层次逐级判断：

| 层次 | 判断问题 | 动作 | 参考文档 |
|------|---------|------|---------|
| **1. 新增 Expert** | 现有 expert 都无法处理这类问题？ | 设计 → 实现 → 导出 Coze → 注册 | [如何设计专家](agentic/experts/docs/how-to-design-expert.md) / [如何创建专家](agentic/experts/docs/how-to-create-expert.md) |
| **2. 调整 KB / Prompt** | expert 存在但知识不够或不准确？ | 修改对应 expert 的 `prompts/*.md` | 各 expert 目录下 `prompts/` |
| **3. 调整编排** | expert 间的调用顺序或条件需要变化？ | 修改 recaller 的 planner/judge prompt | [experts_recaller](agentic/experts/experts_recaller/readme.md) |
| **4. 调整 QID 绑定** | 问题能匹配到 expert 但没被触发？ | 修改 `qa-gen_base.csv` 中的 `sys_experts` | `agentic/qa-gen_base.csv` |
| **5. 调整 Schema** | expert 需要新的输入参数或输出字段？ | 修改 `manifest.json` | [设计规格](agentic/experts/docs/design-spec.md) |
| **6. 调整 Node 逻辑** | 数据获取或处理逻辑需要变化？ | 修改 `nodes/*.ts` 代码 | [万邑通 OpenAPI 集成](agentic/experts/docs/winit-openapi-integration.md) |

## 系统架构概览

```
用户提问 → 主 Bot (cs_Default_Query_v4)
  → Intent Classification (24类意图分类)
  → QID 匹配 (qa-gen_base.csv)
  → sys_experts 触发 experts_recaller
    → Planner (生成线性任务队列)
    → Loop:
        resolve-next-job → prepare-params → call-expert
        → post-output → llm-judge
        → continue / replan / abort
    → finalize → user-facing-summary (汇总回复)
```

每个 Expert 内部结构：
```
{expert-id}/
├── manifest.json       注册合约（ID、描述、inputSchema、outputSchema）
├── nodes/              代码节点（数据获取、LLM 分析、格式化输出）
├── prompts/            领域知识 & 指令（Knowledge Base）
├── workflow/           Coze workflow YAML 定义
├── design.md           设计说明
└── coze.config.yml     Coze 导出配置
```

## 线上 Expert 列表 (6 domains, ~35 个)

| Domain | 代表 Expert |
|--------|------------|
| last-mile (尾程) | delivery-status, tracking-inquiry, carrier-contact, delivered-not-received |
| inbound (入库) | inbound-order-status, inbound-process-guide, inbound-putaway-status |
| outbound (出库) | outbound-order-status |
| value-add (增值) | value-add-guide, value-add-exception-diagnosis, value-add-order-status |
| sku (商品) | profile, registration-guide, barcode-guide |
| customer (客户) | human-service-records |

完整列表见 [`agentic/qa-gen_expert_system_experts.csv`](agentic/qa-gen_expert_system_experts.csv)。

## 专家系统文档导航

### 设计与规范
- [如何设计专家](agentic/experts/docs/how-to-design-expert.md) — 场景拆分、域划分、边界、API 矩阵、design.md
- [如何创建专家](agentic/experts/docs/how-to-create-expert.md) — 模板、节点、导出 Coze、登记
- [设计规格](agentic/experts/docs/design-spec.md) — 专家元数据、Schema、上下文规范
- [项目结构](agentic/experts/docs/project-structure.md) — 目录说明与 Coze 对接方式
- [项目要求](agentic/experts/REQUIREMENTS.md) — 核心约束与规范

### 编排与运行
- [experts_recaller](agentic/experts/experts_recaller/readme.md) — 线上 Orchestration Loop 源码与说明
- [本地调用](agentic/experts/LOCAL-INVOCATION.md) — 安装依赖、`npm run dev:expert`、环境变量
- [Coze 工作流导出](agentic/experts/COZE-WORKFLOW.md) — 生成可导入包、格式与命名规范

### 集成与工具
- [万邑通 OpenAPI 集成](agentic/experts/docs/winit-openapi-integration.md) — 经 Coze 调用万邑通 API、环境变量
- [意图分类 Prompt](agentic/ai_agent_classification/classification/classfication.md) — 24 类分类器

### 学习资料
- [术语表](study/terminology.md) — 项目核心概念对齐
- [系统事实基线](study/current-baseline.md) — 链路、QID、expert 注册等
