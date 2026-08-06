# 增值 AI 智能化 — 统一待办

## In Progress

- [ ] Eval: 用 489 条客户首句跑 match-template，确定第一批上线场景
- [ ] 建立「真实场景 → 知识库场景」映射表

## Backlog — 第一批上线前

- [ ] 对高召回场景接 LLM 跑完整链路（match → extract-fields → generate-sop）
- [ ] 对接 Planner 触发条件：推荐非标 + 落到兜底原子
- [ ] 上线置信度网关：低置信场景先确认再继续

## Backlog — 后续迭代

- [ ] P1: match-template 改混合模式（关键词粗筛 → LLM 精选）提升召回率
- [ ] P2: 新增 extract-fields LLM 节点（自然语言 → 结构化字段）
- [ ] P3: 置信度网关 + 场景确认环节
- [ ] 补充 SOP 模板细节（场景 13-23 模板深度不足，需业务方补全）
- [ ] 多轮追问体验优化：Planner/Judge 联动
- [ ] C 类场景二期：AI 自主生成 SOP + 人工审核
- [ ] 结构化输出迭代：从纯文本升级为表单字段映射

## Done

- [x] 完成 plan-nonstandard-sop-guide.md 计划文档
- [x] 完成交叉验证表（A/B/C 分类）
- [x] Expert 骨架实现：manifest + workflow + 5 节点 + 3 KB + prompt
- [x] L1 集成测试通过（test-flow.ts 6/6 pass）
- [x] Eval 干跑：增值单 141 条，召回率 33.3%（暴露 KB gap）
- [x] Udesk 对话提取：489 条客户首句 + 32 条追问模式
