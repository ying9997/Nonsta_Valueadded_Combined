## §0 角色与仓库

你是执行者（Codex）。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/A_特批指引-表单区展开.html`

## §1 任务

参照 `prototypes/C_特批指引-独立弹窗.html` 的最新实现，对版本 A 做相同逻辑的适配。版本 A 的 AI 容器是 inline 面板（非弹窗），差异见 §3。

## §2 前置阅读

- 先读 `prototypes/C_特批指引-独立弹窗.html` 理解已实现的完整逻辑（演示控制台、AI 对话流、费用占位、审核模态框）
- 再读 `prototypes/A_特批指引-表单区展开.html` 作为修改对象
- 读 `prototypes/demo-vas-exception-config.html` 理解推荐数据来源

## §3 版本 A 的差异适配

### 演示控制台
- 同 C：页面顶部 `position:fixed` 独立横条，深灰背景，场景按钮 + 重置
- A 的 AI inline 面板内移除所有演示按钮（preset-row）

### AI 容器形式
- A 的 AI 面板是 inline 嵌在表单区（class `ai-panel`），不是弹窗
- 主动弹出 = 页面加载后 AI 面板自动添加 `show` class 展开
- 偏好设置 checkbox 放在面板标题栏右侧

### 对话内容
- AI 首条消息内容与 C 完全一致（基于异常配置推荐增值服务原子）
- 演示场景流程与 C 一致
- 费用预估占位与 C 一致
- "模拟审核视角"按钮和模态框与 C 一致（展示审核表单 + SOP textarea 预填）

### 推荐选中逻辑
- A 的卡片选中通过 `selectFirstLevelCard()` / `selectQ2()` / `selectQ3()` 函数
- AI 推荐后自动调用这些函数选中对应卡片

## §4 约束

- **只修改** `prototypes/A_特批指引-表单区展开.html`
- 其他约束同版本 C prompt

## §5 Git 规范

- commit message：`feat(prototype-A): unified AI dialog, demo console, fee placeholder, audit SOP preview`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
