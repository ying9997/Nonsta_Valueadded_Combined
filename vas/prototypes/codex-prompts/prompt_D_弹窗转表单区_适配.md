## §0 角色与仓库

你是执行者（Codex）。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/D_特批指引-弹窗转表单区.html`（覆盖现有）

## §1 任务

参照 `prototypes/C_特批指引-独立弹窗.html` 的最新实现，产出版本 D。版本 D 的 AI 容器分两阶段：决策阶段用悬浮弹窗，非标 SOP 填写阶段切换到页面内 inline 面板。

## §2 前置阅读

- 先读 `prototypes/C_特批指引-独立弹窗.html` 理解完整实现
- 读 `prototypes/demo-vas-order-page-v4(2).html` 理解 V4 底座
- 读 `prototypes/demo-vas-exception-config.html` 理解推荐数据

## §3 版本 D 与 C 的差异

### AI 容器形式（两阶段）
- **阶段 1（决策 + 标准推荐）**：悬浮弹窗，样式和行为与 C 完全一致
- **阶段 2（非标 SOP 填写）**：弹窗自动关闭，V4 页面"服务要求"表格区域上方展开 inline 面板
- 标准增值/免审路径：全在弹窗内完成，不进入阶段 2
- 非标特批路径：弹窗显示"正在为您准备 SOP，请查看下方表单区域" → 1s 后弹窗关闭 → inline 面板展开 → SOP 生成对话继续

### 阶段切换逻辑
```
弹窗内 AI 判定非标 → 
弹窗显示过渡消息（1s）→ 
弹窗关闭/最小化 → 
inline 面板展开（fadeIn 动画）→ 
inline 面板继续 SOP 对话 + 费用占位 + 一键填入 + 审核模拟
```

### Inline 面板位置
- 在 V4 页面 `#detailSection` 上方插入
- 样式同版本 A 的 inline 面板

### 其他
- V4 底座、数据补充、演示控制台、多轮对话流、自动联动 select 链路、费用占位、SOP 卡片（只保留一键填入）、审核模态框 — 全部与 C 一致
- SVG AI Icon 同 C

## §4 约束

- **产出一个文件**：`prototypes/D_特批指引-弹窗转表单区.html`
- 单 HTML，所有 CSS/JS 内联，不引入第三方库
- 底座基于 V4，叠加弹窗 + 条件性 inline 面板
- 如有歧义标记 `[AMBIGUITY]`

## §5 Git 规范

- commit message：`feat(prototype-D): rebuild on V4 base with popup-to-inline hybrid`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
