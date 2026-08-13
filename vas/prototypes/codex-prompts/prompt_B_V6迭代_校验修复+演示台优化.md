## §0 角色与仓库

你是执行者（Codex），负责修复校验逻辑并优化演示控制台。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`（在现有文件基础上修改）

## §1 问题

1. **校验触发逻辑有 bug**：`handleSubmit()` 依赖 `state.combo` 判断是否触发校验，但走"演示→一键填入"路径时 `state.combo` 为 null，导致校验被跳过
2. **演示控制台不清晰**：业务方看不懂哪些按钮对应什么步骤、当前走到哪一步了

## §2 修改内容

### 2.1 修复校验触发逻辑

将 `handleSubmit()` 改为：**只要提交时检测到"需求背景说明"或"需求描述"有内容（说明走了非标路径），就触发 AI 校验模态框**。不再依赖 `state.combo`。

```javascript
function handleSubmit() {
  const bg = document.getElementById('requirementBackground');
  const desc = document.getElementById('requirementDescription');
  // 只要非标字段有内容就触发校验（无论是 AI 填的还是客户手写的）
  if ((bg && bg.value.trim()) || (desc && desc.value.trim())) {
    document.getElementById('validationModal').classList.add('show');
    return;
  }
  showToast('增值单提交成功（模拟）', 3000);
}
```

### 2.2 重做演示控制台（步骤化、带状态提示）

当前演示控制台只有几个独立按钮，业务方不知道操作顺序。改为**步骤式引导**，每个按钮标注步骤序号和当前状态。

替换整个 `.demo-console` 的内容为：

```html
<div class="demo-console">
  <div class="demo-console-title">🎬 原型演示控制台（仅开发/评审可见，非线上真实界面）</div>
  <div class="demo-console-steps">
    <button id="demoStep1" class="demo-step-btn active" onclick="demoStep1()">
      <span class="step-badge">1</span> 打开 AI 侧栏 + 对话
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep2" class="demo-step-btn" onclick="demoStep2()" disabled>
      <span class="step-badge">2</span> 确认 SOP
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep3" class="demo-step-btn" onclick="demoStep3()" disabled>
      <span class="step-badge">3</span> 一键回填表单
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep4" class="demo-step-btn" onclick="demoStep4()" disabled>
      <span class="step-badge">4</span> 提交 + AI 校验
    </button>
    <span class="demo-sep">|</span>
    <button class="demo-step-btn demo-extra" onclick="openAuditModal()">审核视角</button>
    <button class="demo-step-btn demo-extra" onclick="resetDemo()">重置</button>
  </div>
</div>
```

**样式**：

```css
.demo-console-steps { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.demo-step-btn {
  display: inline-flex; align-items: center; gap: 5px;
  background: #4a4a4a; color: #fff; border: 1px solid #666; border-radius: 4px;
  padding: 5px 12px; font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all 0.2s;
}
.demo-step-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.demo-step-btn.active { background: #A0792A; border-color: #C9952E; }
.demo-step-btn.done { background: #52c41a; border-color: #73d13d; }
.demo-step-btn.demo-extra { background: #333; border-color: #555; }
.demo-arrow { color: #999; font-size: 14px; }
.demo-sep { color: #666; margin: 0 4px; }
.step-badge {
  width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.2);
  display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600;
}
.demo-step-btn.done .step-badge { background: rgba(255,255,255,0.3); }
```

### 2.3 步骤化演示逻辑

每个步骤按钮触发对应动作，并自动激活下一步按钮：

```javascript
function demoStep1() {
  // 打开侧栏 + 注入对话
  runDemo(); // 复用现有 runDemo()
  // 对话注入完成后（最后一条消息延迟后），激活 step2
  const totalDelay = DEMO_DIALOG.length * 1500 + 500;
  setTimeout(() => {
    document.getElementById('demoStep1').classList.replace('active', 'done');
    document.getElementById('demoStep2').disabled = false;
    document.getElementById('demoStep2').classList.add('active');
  }, totalDelay);
}

function demoStep2() {
  // 模拟点击 SOP 卡片的"确认并使用"
  confirmSop();
  document.getElementById('demoStep2').classList.replace('active', 'done');
  document.getElementById('demoStep3').disabled = false;
  document.getElementById('demoStep3').classList.add('active');
}

function demoStep3() {
  // 触发一键填入
  fillForm();
  document.getElementById('demoStep3').classList.replace('active', 'done');
  document.getElementById('demoStep4').disabled = false;
  document.getElementById('demoStep4').classList.add('active');
}

function demoStep4() {
  // 触发提交校验
  handleSubmit();
  document.getElementById('demoStep4').classList.replace('active', 'done');
}
```

重置时：所有步骤按钮恢复初始状态（step1 active，其余 disabled）。

### 2.4 保留旧按钮的功能函数

`runDemo()`、`fillForm()`、`confirmSop()`、`handleSubmit()` 这些函数保留不变（步骤按钮调用它们）。只是不再把它们直接暴露在演示控制台上作为独立按钮。

## §3 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## §4 Git 规范

- commit message：`fix(prototype-B-V6): fix validation trigger + step-based demo console`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
