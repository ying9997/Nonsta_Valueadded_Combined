## §0 角色与仓库

你是执行者（Codex）。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_特批指引-客服栏对话.html`

## §1 任务

参照 `prototypes/C_特批指引-独立弹窗.html` 的最新实现，对版本 B 做相同逻辑的适配。版本 B 的 AI 容器是右侧在线客服侧栏，差异如下：

## §2 前置阅读

- 先读 `prototypes/C_特批指引-独立弹窗.html` 理解已实现的完整逻辑
- 再读 `prototypes/B_特批指引-客服栏对话.html` 作为修改对象
- 读 `prototypes/demo-vas-exception-config.html` 理解推荐数据来源

## §3 版本 B 的差异适配

### AI 容器形式
- B 是右侧 360px 侧栏，线上客服风格（紫色渐变背景、白色 AI 气泡）
- 主动弹出 = 页面加载后侧栏自动滑出
- 偏好设置 checkbox 放在侧栏标题栏下方或关闭按钮旁

### 气泡样式
- AI 气泡：白色背景 + `border: 1px solid #f0f0f0` + `border-radius: 8px 8px 8px 0`
- 用户气泡：紫色渐变
- 费用预估占位气泡：用虚线边框 `border: 1px dashed #d9d9d9` + 浅灰背景 `#f9f9f9`
- SOP 卡片在侧栏内需适配 320px 宽度（垂直堆叠）

### 其他
- 对话内容、演示流程、"模拟审核视角"模态框与 C 完全一致
- 推荐选中逻辑：自动选中左侧页面的卡片

## §4 约束

- **只修改** `prototypes/B_特批指引-客服栏对话.html`
- 其他约束同版本 C prompt

## §5 Git 规范

- commit message：`feat(prototype-B): unified AI dialog, fee estimate placeholder, audit SOP preview`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
