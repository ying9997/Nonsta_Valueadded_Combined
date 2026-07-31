## §0 角色与仓库

你是执行者（Codex）。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/B_特批指引-客服栏对话.html`（覆盖现有）

## §1 任务

参照 `prototypes/C_特批指引-独立弹窗.html` 的最新实现，产出版本 B。版本 B 的 AI 容器是右侧在线客服侧栏（360px），其余逻辑与 C 完全一致。

## §2 前置阅读

- 先读 `prototypes/C_特批指引-独立弹窗.html` 理解完整实现
- 读 `prototypes/demo-vas-order-page-v4(2).html` 理解 V4 底座
- 读 `prototypes/demo-vas-exception-config.html` 理解推荐数据
- 读 `prototypes/references/prototype_侧栏参考.html` 理解侧栏视觉风格

## §3 版本 B 与 C 的差异

### AI 容器形式
- C 是独立悬浮弹窗
- B 是 **右侧 360px 侧栏**，从右侧滑入
- 打开时 V4 主内容区收窄为 `calc(100% - 360px)`
- 侧栏视觉风格模拟线上在线客服：
  - 标题栏：高 48px，白色背景，文字"在线咨询"+ SVG AI icon，右侧关闭按钮
  - 对话区背景：`linear-gradient(180deg, #fff 0%, #f3f2ff 100%)`（紫色渐变）
  - 底部输入框区域：白色 + 圆角输入框

### 气泡样式（线上客服风格）
- AI 气泡：白色背景 + `border: 1px solid #f0f0f0` + `border-radius: 8px 8px 8px 0`
- 用户气泡：紫色渐变 `linear-gradient(270deg, #f1e6ff 0%, #dde0ff 100%)` + `border-radius: 8px 8px 0 8px`
- 费用预估占位：虚线边框 + 浅灰背景
- SOP 卡片适配 320px 宽度，垂直堆叠，保留金色边框做视觉区分

### 主动滑出
- 页面加载后延迟 800ms 侧栏自动滑出
- 偏好 checkbox 在标题栏下方

### SVG AI Icon
- 同 C，但可改为紫色渐变配色以适配客服栏风格

### 其他
- V4 底座、数据补充、演示控制台、多轮对话流、自动联动 select 链路、费用占位、SOP 卡片（只保留一键填入）、审核模态框 — 全部与 C 一致

## §4 约束

- **产出一个文件**：`prototypes/B_特批指引-客服栏对话.html`
- 单 HTML，所有 CSS/JS 内联，不引入第三方库
- 底座基于 V4 + 右侧侧栏
- 如有歧义标记 `[AMBIGUITY]`

## §5 Git 规范

- commit message：`feat(prototype-B): rebuild on V4 base with customer service sidebar`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
