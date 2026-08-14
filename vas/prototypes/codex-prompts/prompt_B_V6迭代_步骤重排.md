## §0 角色与仓库

你是执行者（Codex），负责调整演示控制台步骤顺序。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`

## §1 改动

### 重排演示控制台步骤

当前：
```
主流程：[1 AI对话] → [2 确认SOP] → [3 一键回填] → [4 提交校验]
独立演示：[校验A] [选中非标→自动弹侧栏] [审核视角] [重置]
```

改为：
```
主流程：[1 选中非标→弹侧栏] → [2 AI对话] → [3 确认SOP] → [4 一键回填] → [5 提交校验]
独立演示：[校验A：标准可替代拦截] [审核视角] [重置]
```

### HTML 改动

```html
<div class="demo-console">
  <div class="demo-console-title">🎬 原型演示控制台（仅开发/评审可见，非线上真实界面）</div>
  <div class="demo-console-steps">
    <span class="demo-row-label">主流程：</span>
    <button id="demoStep1" class="demo-step-btn active" onclick="demoStep1()">
      <span class="step-badge">1</span> 选中非标→弹侧栏
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep2" class="demo-step-btn" onclick="demoStep2()" disabled>
      <span class="step-badge">2</span> AI 对话
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep3" class="demo-step-btn" onclick="demoStep3()" disabled>
      <span class="step-badge">3</span> 确认 SOP
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep4" class="demo-step-btn" onclick="demoStep4()" disabled>
      <span class="step-badge">4</span> 一键回填
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep5" class="demo-step-btn" onclick="demoStep5()" disabled>
      <span class="step-badge">5</span> 提交校验
    </button>
  </div>
  <div class="demo-console-steps" style="margin-top:6px;">
    <span class="demo-row-label">独立演示：</span>
    <button class="demo-step-btn demo-extra" onclick="demoValidationA()">校验A：标准可替代拦截</button>
    <button class="demo-step-btn demo-extra" onclick="openAuditModal()">审核视角</button>
    <button class="demo-step-btn demo-extra" onclick="resetDemo()">重置</button>
  </div>
</div>
```

### JS 逻辑改动

```javascript
function demoStep1() {
  // 模拟客户选中"入库其他服务需求" → 侧栏强制弹出
  const sidebar = document.getElementById('aiSidebar');
  sidebar.classList.remove('open');
  
  // 模拟选中非标原子卡片
  setTimeout(() => {
    const atomCards = document.querySelectorAll('#atomCards .card-item');
    const target = Array.from(atomCards).find(c => c.textContent.includes('其他服务需求'));
    if (target) target.click(); // 这会触发自动弹出侧栏的逻辑
    
    // 弹出后标记 step1 完成，激活 step2
    setTimeout(() => {
      markStepDone('demoStep1');
      enableStep('demoStep2');
    }, 800);
  }, 300);
}

function demoStep2() {
  // 侧栏已经打开了（step1 触发的），直接注入对话
  // 不再调 toggleAiSidebar，侧栏已 open
  runDemo(); // 复用现有对话注入逻辑
  const totalDelay = DEMO_DIALOG.length * 1500 + 500;
  setTimeout(() => {
    markStepDone('demoStep2');
    enableStep('demoStep3');
  }, totalDelay);
}

function demoStep3() {
  confirmSop();
  markStepDone('demoStep3');
  enableStep('demoStep4');
}

function demoStep4() {
  fillForm();
  markStepDone('demoStep4');
  enableStep('demoStep5');
}

function demoStep5() {
  showValidationB();
}
```

**关键**：`runDemo()` 函数中如果有 `toggleAiSidebar(true)` 的调用，改为只在侧栏未打开时才打开（避免重复切换）：

```javascript
// runDemo 中打开侧栏的逻辑改为：
const sidebar = document.getElementById('aiSidebar');
if (!sidebar.classList.contains('open')) {
  sidebar.classList.add('open');
}
```

### 重置逻辑

`resetDemo()` 中把所有 5 个步骤恢复初始态：step1 active，其余 disabled + 移除 done。

## §2 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 如有歧义标记 `[AMBIGUITY]`

## §3 Git 规范

- commit message：`fix(prototype-B-V6): reorder demo - "select nonstandard" as step 1 trigger`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
