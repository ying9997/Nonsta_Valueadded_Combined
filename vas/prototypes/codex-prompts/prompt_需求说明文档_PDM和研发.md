## §0 角色与仓库

你是执行者（Codex），负责基于现有方案文档生成上下游需求说明。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：
  - `requirements/给PDM_库内增值AI指引_页面交互需求.md`
  - `requirements/给研发_库内增值AI指引_前端接入需求.md`

## §1 任务

基于仓库中的 PRD 和 Spec 文档，分别为 PDM 和前端研发产出一份精简的需求说明文档，让他们知道需要配合做什么。

## §2 前置阅读

- `design/Agent_PRD_库内增值AI指引_九模块迭代版_v2.md`：整体方案（重点看模块 1-3）
- `contracts/tool-calling-spec.md`：前端接入技术规格（重点看 §2-4、§11）
- `contracts/tool-calling-schema.md`：接口 JSON Schema
- `references/库内增值_交叉验证表_知识库×VASC.md`：了解 A/B/C 三类路由
- `references/库内增值_系统事实_VASC清单.md`：系统中的增值产品和服务
- `prototypes/demo-content/库内良品转不良品-演示对话.md`：看最终的用户体验流程
- `prototypes/demo-content/免审直选-货权转移-演示对话.md`：看免审直选的交互差异
- `prototypes/原型能力概述_业务方评审.md`：业务价值描述

## §3 文档一：给 PDM

### 文件：`requirements/给PDM_库内增值AI指引_页面交互需求.md`

### 写作要求

- **语言**：业务语言，不用技术术语（不写 JSON、DOM、SDK、Tool Call）
- **重点**：需要 PDM 确认/决策的交互逻辑
- **格式**：简洁，一页能看完，核心用表格

### 内容结构

```markdown
# 库内增值 AI 指引 — 页面交互需求（给 PDM）

> 日期：2026-08-04
> 配合方：PDM
> 说明：以下是 AI 增值指引功能需要 PDM 确认的页面交互设计

## 一句话说明

在"新增库内增值单"页面，右侧在线咨询 AI 侧栏自动弹出，根据客户描述推荐增值服务并帮助填写表单。

## 需要 PDM 确认的交互

### 1. AI 侧栏弹出时机
- 进入页面后自动弹出（延迟约 1 秒）
- 客户可关闭，可设置"下次不自动弹出"
- 关闭后页面右上角保留"AI 指引"入口按钮

**需确认**：自动弹出的时机是否合适？是否需要其他触发条件？

### 2. AI 推荐后的页面联动
- AI 推荐完成后，自动帮客户选中增值产品和增值服务
- 如果是"库内其他服务需求"，还会自动填入需求背景说明和需求描述
- 客户可以修改 AI 填入的内容

**需确认**：自动选中/填入后，是否需要额外的确认提示（如"AI 已帮您填入，请确认"）？

### 3. 两种分支的区别

| 场景 | AI 做什么 | 客户做什么 |
|------|----------|-----------|
| 命名服务（如货权转移） | 帮选中增值产品+增值服务 | 按该服务的专属字段自己填 |
| 兜底服务（库内其他服务需求） | 帮选中+帮生成+帮填入需求描述 | 确认 SOP 后一键填入 |

**需确认**：这两种分支的用户体验区分是否清晰？

### 4. 提交后的审核联动
- 客户提交增值单后，AI 生成的 SOP 自动回填到 TOM 审核页面的"操作SOP"字段
- 审核人员可以在已填内容基础上修改

**需确认**：回填到审核页面的内容需要标注"AI 生成"来源吗？

### 5. 偏好设置
- "下次不自动弹出"存在客户浏览器本地
- 清缓存后恢复默认（自动弹出）

**需确认**：是否需要账号级别的偏好（跟随客户账号，换浏览器也生效）？

## 不需要 PDM 配合的（已确定）

- AI 对话内容和追问逻辑（AI 产品团队负责）
- 侧栏视觉样式（复用在线咨询样式）
- 接口技术细节（研发负责）
```

---

## §4 文档二：给研发

### 文件：`requirements/给研发_库内增值AI指引_前端接入需求.md`

### 写作要求

- **语言**：技术语言，直接可执行
- **重点**：需要前端开发实现的具体功能点 + 接入规格
- **格式**：按功能点拆分，每个点有：做什么、怎么做、验收标准
- 引用 spec 文档作为详细规格

### 内容结构

```markdown
# 库内增值 AI 指引 — 前端接入需求（给研发）

> 日期：2026-08-04
> 配合方：前端研发
> 详细技术规格：见 `contracts/tool-calling-spec.md`
> 演示原型：见 `prototypes/B_侧边栏演示_原始页面版.html`

## 需求概述

在"新增库内增值单"页面（seller.winit.com.cn），接入 Coze AI 侧栏的结构化输出，实现 AI 推荐后自动选中增值产品/服务 + 填入表单字段。

## 功能点清单

### FE-01：监听 Coze SDK 消息回调

**做什么**：在 `afterMessageReceivedFinish` 回调中解析 AI 消息，提取结构化 JSON 指令

**怎么做**：
- 参考 `contracts/tool-calling-spec.md` §4.1-§4.2
- 检测消息中是否包含 `"function_name": "vas_form_action"` 的 JSON
- 解析后调用 `executeVasAction(payload)`

**验收标准**：
- AI 返回含 JSON 的消息 → 正确解析并执行
- AI 返回纯文本消息 → 不做额外操作
- JSON 解析失败 → 静默忽略，不影响正常使用

### FE-02：实现表单操作映射层

**做什么**：根据 AI 指令选中增值产品/服务下拉框、填入 textarea

**目标字段**：

| target key | 页面控件 | 操作 |
|------------|---------|------|
| product | 增值产品名称 select/radio | 选中"库内非标增值（特批）" |
| service | 增值服务 select/checkbox | 选中"库内其他服务需求" |
| requirementBackground | 需求背景说明 textarea | 填入文本 |
| requirementDescription | 需求描述 textarea | 填入文本 |

**怎么做**：
- 参考 `contracts/tool-calling-spec.md` §4.3-§4.4
- 每个 target 对应一个映射函数
- 选中后触发对应的 change/input 事件（确保页面联动逻辑正常执行）
- 填入后给字段加绿色高亮 2 秒

**验收标准**：
- AI 指令 select product → 页面增值产品被选中 + 后续下拉联动正常
- AI 指令 fill description → textarea 内容被填入 + 字数统计等联动正常
- target 找不到 → 不报错，降级提示

### FE-03：降级处理

**做什么**：当表单操作失败时，给用户文字提示

**怎么做**：
- 参考 `contracts/tool-calling-spec.md` §4.5
- 填入失败 → toast："自动填入失败，请手动复制以下内容"
- 选择失败 → toast："请手动选择XXX"

**验收标准**：
- DOM 结构变化导致找不到字段 → 不崩溃，有友好提示

### FE-04：执行日志上报

**做什么**：每次 AI 操作表单的结果（成功/失败）上报

**怎么做**：
- 参考 `contracts/tool-calling-spec.md` §4.6
- 用 `navigator.sendBeacon` 发送到监控接口

**验收标准**：
- 每次 tool call 执行后有日志上报
- 日志包含 action/target/status/conversationId

### FE-05：侧栏自动弹出 + 偏好

**做什么**：页面加载后自动打开 AI 侧栏，支持"不自动弹出"偏好

**怎么做**：
- 页面加载延迟 800ms 后触发侧栏打开
- localStorage key: `ai-guide-auto-popup`
- 侧栏标题栏加 checkbox "不自动弹出"

**验收标准**：
- 首次进入 → 侧栏自动弹出
- 勾选"不自动弹出" → 下次进入不弹
- 清缓存 → 恢复自动弹出

## 排期建议

| 功能点 | 优先级 | 预估工作量 | 依赖 |
|--------|--------|-----------|------|
| FE-01 | P0 | 0.5 天 | Coze SDK 版本确认 |
| FE-02 | P0 | 1 天 | 页面 DOM 结构确认 |
| FE-03 | P1 | 0.5 天 | FE-02 |
| FE-04 | P1 | 0.5 天 | 监控接口确认 |
| FE-05 | P1 | 0.5 天 | 无 |

## 参考文件

| 文件 | 说明 |
|------|------|
| `contracts/tool-calling-spec.md` | 完整技术规格（必读） |
| `contracts/tool-calling-schema.md` | JSON Schema 定义 |
| `prototypes/B_侧边栏演示_原始页面版.html` | 演示效果原型 |
| `prototypes/demo-content/库内良品转不良品-演示对话.md` | 演示对话内容 |
```

## §5 约束

- 产出 2 个文件到 `requirements/` 目录（如不存在则创建）
- 不修改任何已有文件
- PDM 文档不写技术细节
- 研发文档不写业务决策
- 引用已有 spec/PRD 而非重复内容
- 如有歧义标记 `[AMBIGUITY]`

## §6 Git 规范

- commit message：`docs(requirements): add PDM interaction spec + frontend integration spec`
- push 到 main 分支
- 如果 push 失败，直接输出两个文件完整内容
