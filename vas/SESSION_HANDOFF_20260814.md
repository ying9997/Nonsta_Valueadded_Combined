---
artifact_contract: "ce-handoff/v1"
created_at: "2026-08-14T16:00:00Z"
title: "库内增值AI指引 - 原型+PRD+Spec 多日迭代会话"
summary: "从入库段原型到库内段落地的完整设计迭代，含PRD九模块、Tool Calling Spec、场景化演示原型、评测体系、上下游需求文档"
keywords: ["库内增值", "AI指引", "非标特批", "SOP生成", "Tool Calling", "原型演示", "PRD九模块"]
cwd: "D:\\da\\vas-nonstandard-guide"
resume_focus: "Codex执行终版prompt产出两个HTML(演示版+真实体验版)，然后验收；之后推进Track A(AI能力独立验证)"
repository: "ying9997/Vas-Nonstandard-Guide"
repo_root_sha: "6861829f1e275227d502157935d7cfe020cf17d4"
branch: "main"
head: "dc9d04d"
---

# 会话交接 — 库内增值 AI 指引

## 项目目标

在万邑联 seller 端的增值下单页面（库内/入库），嵌入 AI 侧边栏助手，帮客户：
1. 选对增值服务（标准 vs 免审非标 vs 特批非标）
2. 生成规范操作 SOP（基于知识库模板）
3. 一键填入表单字段（需求背景+需求描述）
4. 提交前智能校验（描述清晰度+附件完整性+标准可替代性）
5. SOP 自动回填审核后台

## 关键决策

| 决策 | 结论 | 日期 |
|------|------|------|
| 交互形态 | 方案 B 自动弹出侧边栏（push 模式，非 overlay） | 2026-08-01 |
| 前端技术 | 自建 React 组件 + 后台代理（非 Coze SDK） | 2026-08-12 |
| 一期场景 | 库内先上线，入库暂停等异常重构 | 2026-07-31 |
| 分支路由 | A类(命名服务直选) / B类(有模板SOP生成) / C类(无模板转人工) | 2026-08-04 |
| 校验逻辑 | 描述清晰+附件齐全=不用AI也能提交；描述不清=强制弹侧栏 | 2026-08-14 |
| 演示demo | 场景化+幻灯片模式+旁白条；产出演示版+真实体验版 | 2026-08-14 |
| 数据存储 | 飞书多维表格存AI原文(首版+终版)；隐式反馈=diff修改率 | 2026-08-04 |
| 评测集 | 金标15-30条(人工理想态) + 历史数据验证(跑量) | 2026-08-04 |

## 已完成产出

### 设计文档
- `design/Agent_PRD_库内增值AI指引_九模块迭代版_v2.md` — 完整架构PRD
- `design/讨论结论记录_20260801.md` — 所有确认决策的溯源
- `design/交接文档-AI增值一致性校验（非标特批引导二期）.md` — 二期方向
- `tmp/ai-drafts/PRD-AI增值指引侧栏助手.md` — 功能级PRD（更详细）

### 接口契约
- `contracts/tool-calling-spec.md` — 完整规格书（含数据流+存储方案+React hook）
- `contracts/tool-calling-schema.md` — JSON Schema 定义

### 参考数据
- `references/库内增值_交叉验证表_知识库×VASC.md` — A/B/C 分类路由（核心）
- `references/库内增值_系统事实_VASC清单.md` — 4产品7服务
- `references/库内增值_知识库_SOP模板场景清单.md` — 43个知识库场景

### 演示原型
- `prototypes/B_侧边栏演示_V6版.html` — 当前主演示文件（待Codex终版执行）
- `prototypes/demo-content/库内良品转不良品-演示对话.md` — B类场景演示内容
- `prototypes/demo-content/免审直选-货权转移-演示对话.md` — A类场景演示内容
- `prototypes/AI指引逻辑说明.md` — AI介入+拦截逻辑说明
- `prototypes/演示操作指南.md` — 业务方验收步骤（需随终版更新）
- `prototypes/原型能力概述_业务方评审.md` — 业务价值说明

### 评测数据
- `eval/库内良品转不良品_真实对话候选.md` — P1搜索产出
- `eval/库内货权转移-拆分SKU-真实对话候选.md` — P1搜索产出
- `eval/飞书群聊_非标增值讨论_20260421-20260801.xlsx` — 原始群聊数据

### 上下游需求
- `requirements/需求说明_PDM.md` — 给PDM确认的交互需求
- `requirements/需求说明_研发.md` — 给前端研发的接入需求（已更新为React hook）

### Codex Prompts
- `prototypes/codex-prompts/prompt_B_V6_终版整合.md` — **当前待执行的终版**（场景化+幻灯片+两版本产出）

## 当前阻塞/待执行

| 项 | 状态 | 说明 |
|---|------|------|
| **Codex 执行终版 prompt** | 待发 | 产出演示版+真实体验版两个HTML |
| Track A: AI 能力独立验证 | 待开始 | prompt+知识库在LLM中单独测试SOP生成质量 |
| 研发确认 React hook 注入位置 | 待确认 | 需前端告知消息回调在哪个生命周期 |
| TOM OpenAPI 确认 | 待确认 | 审核SOP字段是否可通过API回填 |
| Coze Tool `vas_trace_store` 配置 | 待做 | 写AI原文到飞书多维表格 |

## TODO 文件

完整待办在 `TODO_库内增值AI指引.md`，按 Track A（AI能力，不依赖研发）和 Track B（页面联动，依赖研发）拆分。

## 重要注意事项

1. **不要混淆命名服务和兜底服务**：货权转移/审计盘点是命名服务（A类，不填需求描述），只有"库内其他服务需求"才需要AI生成SOP+填入需求描述
2. **前端是自建React，不是Coze SDK**：spec已更新，不要用`afterMessageReceivedFinish`
3. **校验B是两维度独立**：描述清晰度（不通过→弹侧栏）和附件完整性（不通过→红框），不是一个判断
4. **入库段暂停**：仓库中入库相关产出保留但不执行，等异常重构完再继续
5. **知识库场景会变**：系统新增命名服务后需更新交叉验证表（B→A），定期check

## 建议下一步

1. 发Codex执行 `prompt_B_V6_终版整合.md` → 产出两个HTML → 验收
2. 开始 Track A：设计测试prompt，在Coze/LLM中独立验证SOP生成质量
3. 拿到研发反馈后更新spec中的hook注入位置
4. 演示操作指南需随终版HTML更新后重写
