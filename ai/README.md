# AI Customer Service — Multi-Expert 系统学习与分析

面向万邑通 AI 智能客服的 Multi-Expert Agent 架构，用于：
1. 理解线上 Orchestration Loop 如何调度各 Expert
2. 面对业务需求时，判断应该在哪个层次做变更

## 项目结构

```
├── agentic/          线上代码只读快照（experts、recaller、分类、工具链）
└── study/            学习笔记、术语表、实验记录
```

## 决策框架

当收到业务需求（如"客户问 X 问题没有得到正确回答"），按以下层次逐级判断：

| 层次 | 判断问题 | 动作 |
|------|---------|------|
| **1. 新增 Expert** | 现有 expert 都无法处理这类问题？ | 创建新的 manifest + nodes + prompts + workflow |
| **2. 调整 KB / Prompt** | expert 存在但知识不够或不准确？ | 修改对应 expert 的 `prompts/*.md` |
| **3. 调整编排** | expert 间的调用顺序或条件需要变化？ | 修改 recaller 的 planner/judge prompt |
| **4. 调整 QID 绑定** | 问题能匹配到 expert 但没被触发？ | 修改 `qa-gen_base.csv` 中的 `sys_experts` |
| **5. 调整 Schema** | expert 需要新的输入参数或输出字段？ | 修改 `manifest.json` 的 inputSchema/outputSchema |
| **6. 调整 Node 逻辑** | 数据获取或处理逻辑需要变化？ | 修改 `nodes/*.ts` 代码 |

## 系统架构概览

```
用户提问 → 主 Bot (cs_Default_Query_v4)
  → Intent Classification (24类意图分类)
  → QID 匹配 (qa-gen_base.csv)
  → sys_experts 触发 experts_recaller
    → Planner (生成任务队列)
    → Loop:
        call-expert → post-output → llm-judge
        → continue / replan / abort
    → user-facing-summary (汇总回复)
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

完整列表见 `agentic/qa-gen_expert_system_experts.csv`。

## 快速导航

- 术语表：[study/terminology.md](study/terminology.md)
- 编排器源码：[agentic/experts/experts_recaller/](agentic/experts/experts_recaller/)
- Expert 实现：[agentic/experts/experts/](agentic/experts/experts/)
- Planner Prompt：[agentic/experts/experts_recaller/prompts/queue-planner-initial.md](agentic/experts/experts_recaller/prompts/queue-planner-initial.md)
- Judge Prompt：[agentic/experts/experts_recaller/prompts/queue-llm-judge.md](agentic/experts/experts_recaller/prompts/queue-llm-judge.md)
