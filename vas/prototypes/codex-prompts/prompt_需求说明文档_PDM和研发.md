## §0 角色与仓库

你是执行者（Codex），负责产出上下游需求说明文档。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：
  - `requirements/需求说明_PDM.md`（给产品/PDM）
  - `requirements/需求说明_研发.md`（给前端/后端研发）

## §1 任务

基于仓库中的 PRD 和 Spec 文档，分别产出给 PDM 和研发的精简需求说明。

目标：让上下游看完文档后知道「我需要配合做什么」「验收标准是什么」「时间节点是什么」。

## §2 前置阅读

- `design/Agent_PRD_库内增值AI指引_九模块迭代版_v2.md`：完整 PRD（九模块）
- `contracts/tool-calling-spec.md`：Tool Calling 规格书（含数据流+存储方案）
- `contracts/tool-calling-schema.md`：接口 Schema
- `references/库内增值_交叉验证表_知识库×VASC.md`：A/B/C 分类路由
- `references/库内增值_系统事实_VASC清单.md`：VASC 命名服务列表
- `prototypes/demo-content/库内良品转不良品-演示对话.md`：演示 case（B 类场景）
- `prototypes/demo-content/免审直选-货权转移-演示对话.md`：演示 case（A 类场景）
- `design/讨论结论记录_20260801.md`：所有确认的设计决策

## §3 文档一：给 PDM 的需求说明

### 文件：`requirements/需求说明_PDM.md`

### 受众

产品经理/PDM，负责增值单下单页面和 TOM 审核页面的产品设计。

### 结构要求

```markdown
# AI 增值指引 — PDM 配合事项

> 项目：库内增值 AI 指引助手（一期）
> 交付日期：[待填]
> 对接人：[待填]

## 一句话说明

AI 侧栏在库内增值下单页面自动弹出，帮客户选服务+生成SOP+填表单。
需要 PDM 确认页面交互逻辑和审核端回填方案。

## PDM 需要确认/配合的事项

### 1. 客户端页面（库内增值下单页）

[列出所有需要 PDM 确认的交互点：
- AI 侧栏弹出时机和位置
- "库内其他服务需求"的表单字段（需求背景说明+需求描述是否保持现状）
- 一键填入后客户是否可以修改
- 客户确认SOP的交互方式（确认/修改两个按钮）
- 偏好设置（"不自动弹出"）
]

### 2. 审核端页面（TOM 增值单审核）

[列出审核端的需求：
- SOP 自动回填到"操作SOP"字段的时机
- "场景概述"下拉框自动选中
- AI 生成标注（审核人员知道这是 AI 填的）
- 审核人员可编辑
- 评价组件（可选）
]

### 3. 需要 PDM 产出的东西

[明确产出物：
- 确认库内增值下单页面的表单字段清单（哪些 AI 可以填）
- 确认审核端回填字段和时机
- 排期和优先级
]

## 演示效果

参考文件：`prototypes/B_侧边栏演示_原始页面版.html`（本地打开即可看效果）

## 分支逻辑（PDM 需知）

[简述 A/B/C 三类分支，PDM 需要知道什么场景走哪条路：
- A 类（已有命名服务）：AI 帮选，不填需求描述
- B 类（有模板）：AI 生成 SOP + 填入需求描述
- C 类（无模板）：转人工
]
```

---

## §4 文档二：给研发的需求说明

### 文件：`requirements/需求说明_研发.md`

### 受众

前端研发 + 后端研发，负责实现 AI 侧栏与页面的联动。

### 结构要求

```markdown
# AI 增值指引 — 研发配合事项

> 项目：库内增值 AI 指引助手（一期）
> 交付日期：[待填]
> 对接人：[待填]
> 技术 Spec：`contracts/tool-calling-spec.md`（完整规格书）

## 一句话说明

AI 通过 Coze SDK 侧栏与客户对话，对话完成后通过结构化 JSON 驱动页面表单操作。
需要前端实现 SDK 回调解析 + DOM 操作；后端提供审核回填接口。

## 研发需要做的事

### 前端（客户端页面）

#### 必须做
1. **Coze SDK 集成**
   - 升级 `@coze/chat-sdk` 至支持 `afterMessageReceivedFinish` 的版本
   - Bot ID：[待填]
   - 集成位置：库内增值下单页面

2. **Tool Call 回调解析**
   - 监听 `afterMessageReceivedFinish`
   - 从 `message.content` 中提取 `vas_form_action` JSON
   - 详见 `contracts/tool-calling-spec.md` §4.1-§4.3

3. **表单操作执行**
   - 4 个 target：product / service / requirementBackground / requirementDescription
   - 实现 Target→DOM 映射层
   - 详见 `contracts/tool-calling-spec.md` §4.4

4. **降级处理**
   - 解析失败→静默
   - 填入失败→toast 提示"请手动填写"
   - 详见 `contracts/tool-calling-spec.md` §6

5. **日志上报**
   - 每次 Tool Call 执行结果上报
   - 详见 `contracts/tool-calling-spec.md` §4.6

#### 可选（一期建议有）
- 偏好设置 localStorage（"不自动弹出"）
- 填入后字段高亮提示

### 后端（审核回填 + 数据存储）

#### 必须做
1. **审核回填接口**
   - 增值单状态变为"待审核"时，将 AI 生成的 SOP 回填到 TOM 的"操作SOP"字段
   - 需要一个接口支持写入：传增值单号 + SOP 内容 → 填入审核信息
   - 或确认现有 OpenAPI 是否已支持

2. **AI 原文存储字段**（隐式反馈用）
   - 增值单关联一个 `ai_original_sop` 字段（或等价存储位置）
   - 用于后续对比 AI 原文 vs 审核最终版计算修改率
   - 详见 `contracts/tool-calling-spec.md` §11

#### 可选（一期可降级）
- TOM 审核页面增加"AI 质量评价"组件
- 审核驳回原因结构化字段

### 接口契约

| 接口 | 方向 | 用途 | 规格 |
|------|------|------|------|
| `vas_form_action` | AI → 前端 | 驱动页面表单操作 | `contracts/tool-calling-schema.md` |
| `vas_trace_store` | AI → 飞书多维表格 | 存储 AI 原文 | `contracts/tool-calling-spec.md` §11.3 |
| 审核回填 | 后端 → TOM | SOP 写入审核页面 | 待确认 OpenAPI |
| 增值单详情查询 | 后端 → AI 评测 | 拉取客户提交版本 | 待确认 tom-relay |

## 验收标准

前端：
- [ ] Coze 侧栏正常弹出
- [ ] AI 返回 JSON → 页面表单正确联动
- [ ] 填入失败不阻塞正常下单
- [ ] 日志正常上报

后端：
- [ ] 增值单待审核时 SOP 已回填到 TOM
- [ ] AI 原文可查（存储位置确认）

## 排期建议

| 项 | 工作量估算 | 优先级 |
|----|-----------|--------|
| 前端 Coze SDK 集成 | 2-3 天 | P0 |
| 前端 Tool Call 解析+执行 | 2-3 天 | P0 |
| 前端降级+日志 | 1 天 | P1 |
| 后端审核回填 | 2 天 | P0 |
| 后端 AI 原文存储 | 1 天 | P1 |

## 参考文件

| 文件 | 用途 |
|------|------|
| `contracts/tool-calling-spec.md` | 完整技术规格书（前端直接参照实现） |
| `contracts/tool-calling-schema.md` | 接口 JSON Schema |
| `prototypes/B_侧边栏演示_原始页面版.html` | 演示原型（看效果） |
| `design/Agent_PRD_库内增值AI指引_九模块迭代版_v2.md` | 完整产品方案 |
```

---

## §5 写作要求

1. **精简**：PDM 文档控制在 2 页 A4 以内，研发文档控制在 3 页以内
2. **明确"你需要做什么"**：每个配合方看完立刻知道自己的 action item
3. **不重复 spec 内容**：技术细节引用 spec 文件路径，不复制粘贴
4. **标注待确认项**：需要对方回答的问题用 `[待确认]` 标注
5. **可操作**：有验收标准、有排期建议、有参考文件路径

## §6 约束

- 产出 2 个文件到 `requirements/` 目录（需新建该目录）
- 不修改任何已有文件
- 内容基于 PRD 和 Spec 提炼，不编造新需求
- 如有歧义标记 `[AMBIGUITY]`

## §7 Git 规范

- commit message：`feat(requirements): add requirement docs for PDM and engineering`
- push 到 main 分支
- 如果 push 失败，直接输出两个文件完整内容
