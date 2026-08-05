# AI 客服 Multi-Expert 系统 — 学习笔记

> 学习目标：掌握 AI 智能客服 Multi-Expert 架构的核心链路，能独立判断业务需求应新增 expert 还是调整现有 expert 的知识库/编排。

## 目录结构

| 路径 | 说明 |
|------|------|
| [terminology.md](terminology.md) | 术语表 — 项目核心概念对齐 |
| [current-baseline.md](current-baseline.md) | 系统事实基线（链路、QID、expert 注册等） |
| [sessions/](sessions/) | 系统化学习会话（10次，每次2小时） |
| [agent-collaboration/](agent-collaboration/) | 与 Agent 协作方法论、复盘、可复制口令 |
| [computer-science-foundation/](computer-science-foundation/) | 用项目学 CS 基础（数据结构、网络等） |
| [experiment/](experiment/) | 个人服务器验证实验 |
| [working-habits/](working-habits/) | 工作习惯与交付节奏 |
| [rag-learning-plan.md](rag-learning-plan.md) | RAG 学习计划 — 对比当前 Context Stuffing 方案，分阶段学习检索增强生成 |

## 学习进度

| 会话 | 主题 | 状态 |
|-----|------|------|
| Pre | 预考测评 | 待开始 |
| 01 | 主链路与边界 | 待开始 |
| 02 | QID 与 sys_experts | 待开始 |
| 03 | 知识库打包机制 | 待开始 |
| 04 | DWS vs 实时库 | 待开始 |
| 05 | workflow 血缘分析 | 待开始 |
| 06 | 增值相关 experts | 待开始 |
| 07 | 注册表与 KB 映射 | 待开始 |
| 08 | 问题定位 | 待开始 |
| 09 | 方案设计 | 待开始 |
| 10 | 端到端交付 | 待开始 |

## 最终目标能力

- 30分钟内定位"客户没走到正确 expert"的根因
- 判断 QID、sys_experts、注册表、workflow 哪一层出问题
- 独立验证 expert 的输入/输出 schema 和线上导入链路
- 基于业务需求输出完整方案（新增 expert vs 调整现有 KB/编排）
