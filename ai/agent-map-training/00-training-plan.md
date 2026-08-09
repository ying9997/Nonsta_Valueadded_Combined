# 训练计划

## 训练目标

从点状学习升级为地图式学习：

- 先学会拆 baseline expert。
- 再迁移到非标增值 SOP expert。
- 训练重点不是记住零散文件，而是建立系统地图、主链路、支线、后置能力和验收标准。

## 方法框架

- 点状学习 vs 地图式学习
- 通用 AI 系统分层建模框架
- AI 项目 10 问
- 节点点亮验收法
- 概念四步法：定义 -> 作用 -> 缺失处理 -> 来源
- 主链路 vs 支线 vs 后置能力

## 阶段

### 阶段 1：baseline 拆解

对象：`../agentic/experts/experts/inbound/inbound-appointment-manage/`

产出：

- source-index
- design-reading-notes
- AI 10 questions
- layered-model
- file-role-map
- mainline-vs-branches
- concept-cards
- node-lighting-board

### 阶段 2：迁移准备

对象：外部参考仓库 `Vas-Nonstandard-Guide`

状态：等待 `_inbox` 出现迁移阶段归档包后再展开。

### 阶段 3：非标增值 SOP expert 迁移

对象：`migration/nonstandard-sop-expert/`

状态：未开始。

## 归档规则

- 只整理教练会话已经输出的 `ARCHIVE_PACKET`。
- 不删除 `_inbox` 原文。
- 每条正式归档保留来源和归档包时间。
- 对缺口做标注，不凭空补全。

## 教练问题提示规则

后续训练问题不能只给抽象题目，需要同时给出阅读定位、回答边界和防发散提醒。标准格式见：`templates/question-prompt-block-template.md`。

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 coaching-format-rule`
