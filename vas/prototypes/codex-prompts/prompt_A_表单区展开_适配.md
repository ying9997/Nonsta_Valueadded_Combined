## §0 角色与仓库

你是执行者（Codex）。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/A_特批指引-表单区展开.html`（覆盖现有）

## §1 任务

参照 `prototypes/B_特批指引-客服栏对话.html` 的最新实现，产出版本 A。版本 A 的 AI 容器是 inline 面板（嵌在页面内），其余逻辑与 C 完全一致。

## §2 前置阅读

- 先读 `prototypes/B_特批指引-客服栏对话.html` 理解完整实现（V4 底座 + AI 对话 + 多轮追问 + 联动 + 费用占位 + 审核模态框 + 演示控制台）
- 读 `prototypes/demo-vas-order-page-v4(2).html` 理解 V4 底座原始结构
- 读 `prototypes/demo-vas-exception-config.html` 理解推荐数据

## §3 版本 A 与 B 的差异

### AI 容器形式
- B 是右侧 360px 侧边栏（线上客服风格）
- A 是 **inline 面板**，嵌在 V4 页面 question-title 下方、处理方式卡片上方
- inline 面板样式：`background:#fffaf3; border:1px solid #f0e4c0; border-radius:8px; padding:16px; margin:16px 0`
- 面板内部结构与 C 的弹窗对话区完全一致（对话气泡 + 输入框）

### 主动展开
- 页面加载后 inline 面板自动展开（display:block）
- 偏好 checkbox 放在面板标题栏右侧
- 标题栏有收起按钮（▽），点击可折叠面板

### SVG AI Icon
- 同 B，用金色渐变 SVG inline icon

### 其他
- V4 底座、数据补充、演示控制台、多轮对话流、自动联动 select 链路、费用占位、SOP 卡片（只保留一键填入）、审核模态框 — 全部与 B 一致
- 唯一区别是 AI 面板的位置从"右侧侧边栏"变为"页面内嵌展开"

## §4 约束

- **产出一个文件**：`prototypes/A_特批指引-表单区展开.html`
- 单 HTML，所有 CSS/JS 内联，不引入第三方库
- 底座基于 V4，叠加 inline AI 面板
- 如有歧义标记 `[AMBIGUITY]`

## §5 Git 规范

- commit message：`feat(prototype-A): rebuild on V4 base with inline AI panel`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
