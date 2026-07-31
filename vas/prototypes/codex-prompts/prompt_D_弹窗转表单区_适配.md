## §0 角色与仓库

你是执行者（Codex）。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/D_特批指引-弹窗转表单区.html`

## §1 任务

参照 `prototypes/C_特批指引-独立弹窗.html` 的最新实现，对版本 D 做相同逻辑的适配。版本 D 的 AI 容器分两阶段：决策弹窗 + 表单区 inline 面板。

## §2 前置阅读

- 先读 `prototypes/C_特批指引-独立弹窗.html` 理解已实现的完整逻辑
- 再读 `prototypes/D_特批指引-弹窗转表单区.html` 作为修改对象
- 读 `prototypes/demo-vas-exception-config.html` 理解推荐数据来源

## §3 版本 D 的差异适配

### AI 容器形式（两阶段）
- 阶段 1（决策）：悬浮弹窗，自动弹出，承载 AI 首条推荐消息 + 用户选择
- 阶段 2（非标SOP填写）：弹窗自动关闭后，表单区 inline 面板展开
- 标准增值/免审路径：全在弹窗内完成，弹窗显示结论后自动选中卡片
- 非标SOP路径：弹窗判定后关闭 → inline 面板展开 → SOP + 费用占位 + 一键填入 + 审核模拟

### 费用预估和审核模拟的位置
- 费用预估占位：展示在 inline 面板内（阶段 2）
- "模拟审核视角"按钮：在 inline 面板内一键填入成功后显示

### 其他
- AI 首条消息内容与 C 完全一致
- 偏好设置在弹窗标题栏

## §4 约束

- **只修改** `prototypes/D_特批指引-弹窗转表单区.html`
- 版本 D 特有的弹窗→inline 切换逻辑保持不变
- 其他约束同版本 C prompt

## §5 Git 规范

- commit message：`feat(prototype-D): unified AI dialog, fee estimate placeholder, audit SOP preview`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
