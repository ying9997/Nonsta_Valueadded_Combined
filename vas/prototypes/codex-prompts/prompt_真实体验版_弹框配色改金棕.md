## 任务

将 `prototypes/B_侧边栏真实体验版.html` 中所有校验弹框/模态框的蓝色配色统一改为金棕色（与页面主题色一致）。

## 前置阅读

- 当前 `prototypes/B_侧边栏真实体验版.html`

## 改动

### 涉及的弹框

所有 `.validation-header` 和 `.validation-btn-ok` 的蓝色都改为金棕色：

| 原色值 | 改为 |
|--------|------|
| `#1677ff` | `#A0792A` |
| `#4096ff` | `#C9952E` |
| `linear-gradient(135deg, #1677ff, #4096ff)` | `linear-gradient(135deg, #8B6914, #A0792A)` |

### 具体修改

1. **所有 `.validation-header`** 的 `background` 从蓝色渐变改为：
```css
background: linear-gradient(135deg, #8B6914, #A0792A);
```

2. **所有 `.validation-btn-ok`** 的 `background` 从 `#1677ff` 改为：
```css
background: #A0792A;
```
hover 态：
```css
background: #8B6914;
```

3. **校验 A（标准可替代）的 header** 保持橙色不变（`#fa8c16 → #faad14`），因为它是"警告/拦截"语义，用橙色区分。

4. **审核模态框 header**（如果也是蓝色）同样改为金棕色。

5. **`提交前智能校验`文字图标**：如果有 📋 保留，颜色跟随 header 自动适配（白色文字在金棕背景上）。

### 总结

| 弹框 | header 配色 |
|------|------------|
| 校验 B（描述不清晰） | 金棕 `#8B6914 → #A0792A` |
| 校验 B（附件缺失） | 金棕 `#8B6914 → #A0792A` |
| 校验 D（标准可替代） | 橙色 `#fa8c16 → #faad14`（保持不变） |
| 审核模态框 | 金棕 `#8B6914 → #A0792A` |

## 约束

- 只修改 `prototypes/B_侧边栏真实体验版.html`
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## Git

- commit: `style(prototype): change modal headers from blue to gold-brown theme color`
- push main
- 如果 push 失败，直接输出文件完整内容
