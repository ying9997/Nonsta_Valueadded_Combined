## §0 角色与仓库

你是执行者（Codex），负责修复 3 个 UI 问题。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`

## §1 修复清单

### 修复 1：选中非标自动弹侧栏演示太慢

**问题**：点击"选中非标→自动弹侧栏"按钮后，当前有 2 秒延迟才弹出侧栏，体验太慢。

**改为**：将 `demoForceOpenSidebar()` 中的延迟从 2000ms 改为 500ms。toast 提示也缩短：

```javascript
function demoForceOpenSidebar() {
  const sidebar = document.getElementById('aiSidebar');
  sidebar.classList.remove('open');
  showToast('模拟：关闭侧栏后选中非标...', 1000);
  setTimeout(() => {
    const atomCards = document.querySelectorAll('#atomCards .card-item');
    const target = Array.from(atomCards).find(c => c.textContent.includes('其他服务需求'));
    if (target) target.click();
  }, 500);
}
```

### 修复 2：演示控制台遮住页面内容

**问题**：演示控制台 `position: fixed; top: 0` 遮住了底座页面顶部内容。虽然 body 有 `padding-top: 44px`，但控制台现在是两行，高度超过 44px。

**改为**：
1. 计算控制台实际高度（两行约 80px），将 body 的 `padding-top` 改为 `80px`
2. 或者更稳妥：给演示控制台一个固定 `height`，然后 body padding-top 匹配：

```css
.demo-console {
  position: fixed; top: 0; left: 0; right: 0;
  height: auto; /* 允许两行自适应 */
  padding: 8px 16px;
  z-index: 9999;
  background: #2d2d2d;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
```

在 JS 中 DOMContentLoaded 时动态设置 body padding-top = 控制台实际高度：

```javascript
window.addEventListener('DOMContentLoaded', () => {
  const console = document.querySelector('.demo-console');
  if (console) {
    document.body.style.paddingTop = console.offsetHeight + 'px';
  }
});
```

### 修复 3：AI 指引按钮移到页面头部"增值产品信息"右边

**问题**：当前"🤖 AI 指引"按钮在页面标题行，左侧还有一个图标。图标要去掉，按钮位置要移到步骤条中"增值产品信息"文字的右侧。

**改为**：

1. 删除 AI 指引按钮旁的任何图标/SVG
2. 将 `.ai-guide-btn` 从当前的 `.page-title` 中移出
3. 放到 `.steps` 区域中，紧跟在"增值产品信息"的 `.step-text.active` 后面：

```html
<div class="steps">
  <div class="step"><span class="step-circle done">✓</span><span class="step-text">基本信息</span></div>
  <div class="step-line"></div>
  <div class="step"><span class="step-circle active">2</span><span class="step-text active">增值产品信息</span></div>
  <button class="ai-guide-btn" onclick="toggleAiSidebar()">🤖 AI 指引</button>
</div>
```

按钮样式微调使其与步骤条视觉协调：
```css
.ai-guide-btn {
  margin-left: 12px;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #f0e4c0;
  border-radius: 14px;
  background: #fffaf3;
  color: #8B6914;
  cursor: pointer;
  white-space: nowrap;
}
.ai-guide-btn:hover { border-color: #A0792A; background: #fff7e6; }
```

## §2 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 如有歧义标记 `[AMBIGUITY]`

## §3 Git 规范

- commit message：`fix(prototype-B-V6): faster sidebar demo, fix console overlap, move AI btn to steps`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
