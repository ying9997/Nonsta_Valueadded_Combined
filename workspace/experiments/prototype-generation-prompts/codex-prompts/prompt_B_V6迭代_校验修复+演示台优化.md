## §0 角色与仓库

你是执行者（Codex），负责修复校验逻辑并优化演示控制台。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`（在现有文件基础上修改）

## §1 问题

1. **校验触发逻辑有 bug**：`handleSubmit()` 依赖 `state.combo` 判断是否触发校验，但走"演示→一键填入"路径时 `state.combo` 为 null，导致校验被跳过
2. **演示控制台不清晰**：业务方看不懂哪些按钮对应什么步骤、当前走到哪一步了
3. **两种校验混在一起**：标准可替代性校验 和 提交前完整性校验 是不同时机不同目的，应分开演示

## §2 修改内容

### 2.1 删除旧 handleSubmit()，统一由步骤按钮触发

**最终口径**：删除旧的 `handleSubmit()` 函数及其在提交按钮上的 event listener 绑定。校验只通过演示步骤 4 和步骤 5 触发（即 `showValidationA()` 和 `showValidationB()`）。

页面底部的"提交"按钮改为：点击时直接调用 `demoStep5()`（如果 step5 已激活）或显示 toast "请先完成演示步骤 1-4"（如果未激活）。

```javascript
// 替换原来的 handleSubmit 绑定
document.getElementById('submitBtn').addEventListener('click', function() {
  const step5 = document.getElementById('demoStep5');
  if (step5 && !step5.disabled) {
    demoStep5();
  } else {
    showToast('请先完成演示步骤 1-4（点击控制台按钮）', 3000);
  }
});
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
      <span class="step-badge">4</span> 校验A：标准可替代？
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep5" class="demo-step-btn" onclick="demoStep5()" disabled>
      <span class="step-badge">5</span> 校验B：完整性+提交
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

### 2.3 步骤化演示逻辑（5 步）

每个步骤按钮触发对应动作，并自动激活下一步按钮：

```javascript
function demoStep1() {
  // 打开侧栏 + 注入对话
  runDemo(); // 复用现有 runDemo()
  // 对话注入完成后（最后一条消息延迟后），激活 step2
  const totalDelay = DEMO_DIALOG.length * 1500 + 500;
  setTimeout(() => {
    markStepDone('demoStep1');
    enableStep('demoStep2');
  }, totalDelay);
}

function demoStep2() {
  // 模拟点击 SOP 卡片的"确认并使用"
  confirmSop();
  markStepDone('demoStep2');
  enableStep('demoStep3');
}

function demoStep3() {
  // 触发一键填入
  fillForm();
  markStepDone('demoStep3');
  enableStep('demoStep4');
}

function demoStep4() {
  // 校验 A：标准增值可替代性检查
  showValidationA();
  // 点击"继续非标"后激活 step5（见 closeValidationA）
}

function demoStep5() {
  // 校验 B：提交前填写完整性+附件检查
  showValidationB();
  // 点击"确认提交"后标记完成（见 closeValidationB）
}

function markStepDone(id) {
  const el = document.getElementById(id);
  el.classList.remove('active');
  el.classList.add('done');
  el.disabled = true;
}

function enableStep(id) {
  const el = document.getElementById(id);
  el.disabled = false;
  el.classList.add('active');
}
```

重置时：所有步骤按钮恢复初始状态（step1 active，其余 disabled + 移除 done）。

### 2.4 两种校验的模态框

#### 校验 A：标准增值可替代性检查

**触发时机**：一键回填完成后、提交前
**目的**：检测客户选的非标是否其实标准增值能解决
**展示内容**：

```html
<div class="validation-modal" id="validationModalA">
  <div class="validation-box">
    <div class="validation-header" style="background:linear-gradient(135deg,#fa8c16,#faad14);">
      🔍 校验 A：标准增值可替代性检查
    </div>
    <div class="validation-body">
      <p style="margin-bottom:12px;color:#333;font-size:13px;">AI 正在检测您的需求是否可以用标准增值服务覆盖...</p>
      <div class="validation-item pass">
        ✅ 检测结果：<strong>不可替代</strong><br>
        <span style="color:#666;font-size:12px;">当前需求"良品转不良品上架"不在标准增值服务范围内，需要走非标特批流程。</span>
      </div>
    </div>
    <div class="validation-footer">
      <button class="validation-btn-ok" onclick="closeValidationA()">确认，继续非标流程</button>
    </div>
  </div>
</div>
```

**关闭后**：标记 step4 done → 激活 step5

```javascript
function showValidationA() {
  document.getElementById('validationModalA').classList.add('show');
}

function closeValidationA() {
  document.getElementById('validationModalA').classList.remove('show');
  markStepDone('demoStep4');
  enableStep('demoStep5');
}
```

#### 校验 B：提交前填写完整性+附件检查

**触发时机**：校验 A 通过后，点提交时
**目的**：检查字段填写完整性 + 附件是否上传
**展示内容**：

```html
<div class="validation-modal" id="validationModalB">
  <div class="validation-box">
    <div class="validation-header" style="background:linear-gradient(135deg,#1677ff,#4096ff);">
      📋 校验 B：提交前完整性检查
    </div>
    <div class="validation-body">
      <div class="validation-item pass">✅ 增值产品名称：已选择</div>
      <div class="validation-item pass">✅ 增值服务：已选择</div>
      <div class="validation-item pass">✅ 需求背景说明：已填写（128字）</div>
      <div class="validation-item pass">✅ 需求描述：已填写（包含SKU/数量/单据号）</div>
      <div class="validation-item warn" style="border-color:#ffe58f;background:#fffbe6;color:#ad6800;">
        ⚠️ 附件：未上传<br>
        <span style="font-size:12px;">根据【良品转不良品上架】场景，建议上传：包裹标签文件、下架出库单截图</span>
      </div>
    </div>
    <div class="validation-footer">
      <button class="validation-btn-ok" onclick="closeValidationB(true)">仍然提交（附件可后补）</button>
      <button class="validation-btn-cancel" onclick="closeValidationB(false)">返回补充附件</button>
    </div>
  </div>
</div>
```

**关闭后**：
- 点"仍然提交"→ toast "增值单提交成功（模拟）" + 标记 step5 done
- 点"返回补充"→ 关闭模态框，step5 保持 active

```javascript
function showValidationB() {
  document.getElementById('validationModalB').classList.add('show');
}

function closeValidationB(confirmed) {
  document.getElementById('validationModalB').classList.remove('show');
  if (confirmed) {
    showToast('增值单提交成功（模拟）', 3000);
    markStepDone('demoStep5');
  }
}
```

### 2.5 移除旧的单一校验模态框

删除原来的 `#validationModal`（单一校验模态框），替换为上面的 `#validationModalA` 和 `#validationModalB`。

同时删除旧的 `handleSubmit()` 函数，改为由步骤按钮直接调用 `showValidationA()` / `showValidationB()`。

### 2.6 保留的功能函数

`runDemo()`、`fillForm()`、`confirmSop()` 这三个函数保留不变（步骤按钮调用它们）。`handleSubmit()` 删除，由 `showValidationA()` / `showValidationB()` 替代。

## §3 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## §4 Git 规范

- commit message：`fix(prototype-B-V6): fix validation trigger + step-based demo console`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
