## §0 角色与仓库

你是执行者（Codex），负责对原型进行一次性终版整合修改。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件（两个）：
  - `prototypes/B_侧边栏演示_V6版.html` — **演示版**：带演示控制台+旁白+场景按钮，用于给业务方做引导演示
  - `prototypes/B_侧边栏真实体验版.html` — **真实版**：无任何演示控制台/旁白，还原真实产品交互，业务方自己上手点击验收

## §1 总体目标

根据以下完整验收清单，一次性修改到位。本 prompt 覆盖所有之前零散提出的修复点，以本文为准，之前的迭代 prompt 作废。

**重要**：本文件中如有残留的旧"Step 1~Step 5"步骤式逻辑（标记为 ~~废弃~~），请直接忽略/删除。以 §4 的场景播放逻辑为准。

---

## §2 演示控制台布局（场景化+旁白）

### 2.1 控制台 HTML

```html
<div class="demo-console">
  <div class="demo-console-title">🎬 原型演示（点击场景自动播放完整交互）</div>
  <div class="demo-console-steps">
    <span class="demo-row-label">入口对比：</span>
    <button class="demo-step-btn" onclick="demoEntry1()">点"AI指引"触发</button>
    <button class="demo-step-btn" onclick="demoEntry2()">选中非标触发</button>
  </div>
  <div class="demo-console-steps" style="margin-top:6px;">
    <span class="demo-row-label">场景演示：</span>
    <button class="demo-step-btn" onclick="demoA1()">A1 AI完整下单✅</button>
    <button class="demo-step-btn" onclick="demoA2()">A2 附件拦截❌</button>
    <button class="demo-step-btn" onclick="demoB()">B 跳过AI自己填✅</button>
    <button class="demo-step-btn" onclick="demoC()">C 填不好拦回AI</button>
    <button class="demo-step-btn" onclick="demoD()">D 误选非标→纠正</button>
  </div>
  <div class="demo-console-steps" style="margin-top:6px;">
    <span class="demo-row-label">其他：</span>
    <button class="demo-step-btn demo-extra" onclick="openAuditModal()">审核视角</button>
    <button class="demo-step-btn demo-extra" onclick="resetDemo()">重置</button>
  </div>
</div>
```

### 2.2 旁白条 + 播放控制（幻灯片模式）

在页面底部固定一个旁白条，带"上一步/下一步"控制和进度指示：

```html
<div class="demo-narrator" id="narrator">
  <div class="narrator-text" id="narratorText">💬 点击上方场景按钮开始演示</div>
  <div class="narrator-controls" id="narratorControls" style="display:none;">
    <button class="narrator-btn" onclick="prevStep()">◀ 上一步</button>
    <span class="narrator-progress" id="narratorProgress">步骤 1/10</span>
    <button class="narrator-btn narrator-btn-primary" onclick="nextStep()">▶ 下一步</button>
  </div>
</div>
```

```css
.demo-narrator {
  position: fixed; bottom: 0; left: 0; right: 0;
  background: #1a1a2e; color: #fff; padding: 10px 20px;
  font-size: 13px; z-index: 9998;
  border-top: 1px solid #333;
  display: flex; align-items: center; justify-content: space-between;
}
.narrator-text { flex: 1; }
.narrator-controls { display: flex; align-items: center; gap: 12px; }
.narrator-btn {
  padding: 5px 14px; border: 1px solid #555; border-radius: 4px;
  background: #333; color: #fff; font-size: 12px; cursor: pointer;
}
.narrator-btn:hover { background: #444; border-color: #777; }
.narrator-btn-primary { background: #A0792A; border-color: #C9952E; }
.narrator-btn-primary:hover { background: #8B6914; }
.narrator-progress { font-size: 11px; color: #999; min-width: 70px; text-align: center; }
```

### 2.3 播放控制逻辑（幻灯片模式）

**核心机制**：每个场景是一个 steps 数组。点场景按钮后执行第 1 步并暂停，每点"▶ 下一步"执行下一步。

```javascript
let currentScenarioSteps = [];
let currentStepIndex = 0;

function startScenario(steps) {
  resetDemo();
  currentScenarioSteps = steps;
  currentStepIndex = 0;
  document.getElementById('narratorControls').style.display = 'flex';
  executeCurrentStep();
}

function executeCurrentStep() {
  if (currentStepIndex >= currentScenarioSteps.length) return;
  const step = currentScenarioSteps[currentStepIndex];
  document.getElementById('narratorText').textContent = '💬 ' + step.narrate;
  document.getElementById('narratorProgress').textContent = 
    '步骤 ' + (currentStepIndex + 1) + '/' + currentScenarioSteps.length;
  step.exec();
  
  // 自动滚动到该步骤操作的目标元素，让业务方看到变化
  if (step.scrollTo) {
    const target = document.querySelector(step.scrollTo);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 短暂高亮闪烁，引导视线
      target.classList.add('demo-highlight');
      setTimeout(() => target.classList.remove('demo-highlight'), 2000);
    }
  }
}
```

高亮闪烁样式：
```css
.demo-highlight {
  animation: demoFlash 0.6s ease 2;
}
@keyframes demoFlash {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 4px rgba(160,121,42,0.5); }
}
```

### 每步的 scrollTo 字段说明

每个步骤可选填 `scrollTo`（CSS 选择器），指定该步执行后页面应滚动到哪个元素并高亮：

| 动作类型 | scrollTo 值 |
|---------|------------|
| 选中卡片 | `'#atomCards'` 或具体卡片选择器 |
| AI 侧栏弹出/对话 | `'#aiSidebar'` 或 `'.ai-chat-area'` |
| SOP 卡片出现 | `'.sop-card-v6'` |
| 一键回填 | `'#requirementBackground'` |
| 附件标红 | `'#vasFilesSection'` |
| 校验模态框 | 不需要 scrollTo（模态框 fixed 居中，自动可见） |

示例（场景 A1 中某步）：
```javascript
{ narrate: 'AI 自动填入表单', exec: fillForm, scrollTo: '#requirementBackground' },
```

function nextStep() {
  if (currentStepIndex < currentScenarioSteps.length - 1) {
    currentStepIndex++;
    executeCurrentStep();
  } else {
    document.getElementById('narratorText').textContent = '💬 ✅ 场景演示完成';
  }
}

function prevStep() {
  // 不回退操作（DOM 变化不可逆），只回退旁白让业务方重看说明
  if (currentStepIndex > 0) {
    currentStepIndex--;
    const step = currentScenarioSteps[currentStepIndex];
    document.getElementById('narratorText').textContent = '💬 [回看] ' + step.narrate;
    document.getElementById('narratorProgress').textContent = 
      '步骤 ' + (currentStepIndex + 1) + '/' + currentScenarioSteps.length;
  }
}
```

**每个场景按钮改为调用 `startScenario(steps)`**，不再用 `playSequence`（取消自动延迟播放）。

### 2.3 控制台不遮内容

DOMContentLoaded 时动态设置：
```javascript
const consoleHeight = document.querySelector('.demo-console').offsetHeight;
const narratorHeight = document.querySelector('.demo-narrator').offsetHeight;
document.body.style.paddingTop = consoleHeight + 'px';
document.body.style.paddingBottom = narratorHeight + 'px';
```

---

## §3 两种入口触发

### 3.1 入口 1a：客户点击"🤖 AI 指引"按钮

- 触发：点击步骤条旁的"🤖 AI 指引"按钮
- 效果：
  - 侧栏打开（如果未打开）
  - **页面无任何卡片选中**（不联动左侧表单）
  - AI 自动代发首条消息（气泡）：

```
您好，请告诉我您想如何处理这批货物，我来帮您选择增值服务并生成操作说明。
```

- 函数：`toggleAiSidebar()` 改为：打开侧栏 + 如果对话区为空则自动追加上述 AI 代发消息

### 3.2 入口 1b：客户选中"入库其他服务需求"

- 触发：在增值服务原子卡片中点击/选中"入库其他服务需求"
- 效果：
  - 左侧"入库其他服务需求"卡片**有选中态**（高亮）
  - 侧栏**强制**打开
  - AI 自动代发首条消息（气泡，不同于 1a）：

```
您选择了非标特批服务，请先描述您的具体需求，我来帮您评估并生成 SOP。
```

- 实现：在原子卡片点击逻辑中，检测选中的原子是否为"入库其他服务需求"，如果是，调用 `forceOpenSidebarWithMessage()`

### 3.3 两种入口的区别总结

| | 1a 点击 AI 指引 | 1b 选中非标 |
|---|---|---|
| 左侧卡片 | 无选中 | "入库其他服务需求"高亮 |
| AI 代发话术 | "请告诉我您想如何处理..." | "您选择了非标特批服务，请先描述..." |
| 是否强制 | 客户主动，可关闭 | 强制弹出 |

---

## §4 场景播放逻辑（替代步骤式）

**整体模式**：每个场景按钮触发一个自动播放序列。每步有延迟+旁白更新。业务方只需点一个按钮即可看完整链路。

### 4.0 说明

每个场景函数调用 `startScenario(steps)`，传入步骤数组。每步包含 `{ narrate, exec }` — narrate 是旁白文字，exec 是该步执行的 DOM 操作。

**不再自动播放**。点场景按钮 → 执行第 1 步 → 暂停等"▶ 下一步" → 执行第 2 步 → ... 直到结束。

### 4.1 入口对比（快速展示两种触发差异）

```javascript
function demoEntry1() {
  resetDemo();
  narrate('客户主动点击"AI指引"按钮，页面无任何选中态');
  setTimeout(() => {
    toggleAiSidebar(true);
    appendAiBubble('assistant', '您好，请告诉我您想如何处理这批货物，我来帮您选择增值服务并生成操作说明。');
    narrate('AI 侧栏打开，AI 主动问客户需求。此时 AI 需帮判断走标准还是非标');
  }, 1000);
}

function demoEntry2() {
  resetDemo();
  narrate('客户在表单中选中"入库其他服务需求"（非标兜底服务）');
  setTimeout(() => {
    selectNonstandardAtom();
    appendAiBubble('assistant', '您选择了非标特批服务，请先描述您的具体需求，我来帮您评估并生成 SOP。');
    narrate('AI 侧栏强制弹出，已知走非标，直接追问需求细节');
  }, 1000);
}
```

### 4.2 场景 A1：AI 完整下单（成功）

动作序列：选非标→弹侧栏→AI对话→确认SOP→一键回填→附件已上传→提交成功

```javascript
function demoA1() {
  startScenario([
    { narrate: '客户选中"入库其他服务需求"，AI 侧栏强制弹出', exec: selectNonstandardAtom },
    { narrate: 'AI 主动询问客户需求', exec: () => appendAiBubble('assistant', '您选择了非标特批服务，请先描述您的具体需求，我来帮您评估并生成 SOP。') },
    { narrate: '客户用口语描述需求（模糊、不完整）', exec: () => appendAiBubble('user', DEMO_DIALOG[0].text) },
    { narrate: 'AI 识别方向，追问关键信息（SKU/数量/单据号）', exec: () => appendAiBubble('assistant', DEMO_DIALOG[1].text) },
    { narrate: '客户补充完整信息', exec: () => appendAiBubble('user', DEMO_DIALOG[2].text) },
    { narrate: 'AI 确认需求，生成 SOP 卡片', exec: () => { appendAiBubble('assistant', DEMO_DIALOG[3].text); appendSopCard(); } },
    { narrate: '客户确认 SOP → AI 提示需上传附件 → 回填按钮激活', exec: confirmSop },
    { narrate: 'AI 自动填入表单（增值产品+增值服务+需求背景+需求描述）', exec: fillForm },
    { narrate: '客户已上传附件（演示中模拟已传）', exec: markAttachmentsUploaded },
    { narrate: '客户点提交 → 描述清晰✅ 附件完整✅ → 提交成功', exec: () => showToast('✅ 增值单提交成功！SOP 已同步至审核后台', 4000) },
    { narrate: '✅ 场景 A1 完成：AI 帮客户从头到尾搞定下单', exec: () => {} }
  ]);
}
```

### 4.3 场景 A2：附件缺失被拦截

动作序列：同A1到一键回填→但未传附件→提交→被拦→红框

```javascript
function demoA2() {
  startScenario([
    { narrate: '客户选中非标，AI 侧栏弹出', exec: selectNonstandardAtom },
    { narrate: 'AI 询问需求', exec: () => appendAiBubble('assistant', '您选择了非标特批服务，请先描述您的具体需求，我来帮您评估并生成 SOP。') },
    { narrate: '客户描述需求', exec: () => appendAiBubble('user', DEMO_DIALOG[0].text) },
    { narrate: 'AI 追问关键信息', exec: () => appendAiBubble('assistant', DEMO_DIALOG[1].text) },
    { narrate: '客户补充', exec: () => appendAiBubble('user', DEMO_DIALOG[2].text) },
    { narrate: 'AI 生成 SOP 卡片', exec: () => { appendAiBubble('assistant', DEMO_DIALOG[3].text); appendSopCard(); } },
    { narrate: '客户确认 SOP', exec: confirmSop },
    { narrate: '一键回填需求描述（但客户未上传附件）', exec: fillForm },
    { narrate: '客户点提交 → 附件校验不通过 ❌', exec: showValidationB },
    { narrate: '❌ 附件缺失拦截，上传区标红。客户必须补充后再提交', exec: closeValidationB },
    { narrate: '❌ 场景 A2 完成：AI 已帮填好描述，但附件未传被拦截', exec: () => {} }
  ]);
}
```

### 4.4 场景 B：跳过 AI 自己填（成功）

动作序列：弹侧栏→关闭→自己填清楚→传附件→提交成功

```javascript
function demoB() {
  startScenario([
    { narrate: '客户选中非标，AI 侧栏弹出建议对话', exec: selectNonstandardAtom },
    { narrate: 'AI 弹出后主动询问', exec: () => appendAiBubble('assistant', '您选择了非标特批服务，请先描述您的具体需求...') },
    { narrate: '客户选择不和 AI 对话，关闭侧栏', exec: () => toggleAiSidebar(false) },
    { narrate: '客户自己手动填写需求背景+需求描述（内容详细完整）', exec: fillFormManuallyGood },
    { narrate: '客户上传了必要附件', exec: markAttachmentsUploaded },
    { narrate: '客户点提交 → 描述清晰✅ 附件完整✅ → 直接提交成功', exec: () => showToast('✅ 增值单提交成功！不用和 AI 对话，填得好一样能过', 4000) },
    { narrate: '✅ 场景 B 完成：会填的客户不强制对话，尊重客户能力', exec: () => {} }
  ]);
}
```

### 4.5 场景 C：填不好被拦回 AI

动作序列：弹侧栏→关闭→随便写→提交→拦截→强制弹侧栏→AI追问

```javascript
function demoC() {
  startScenario([
    { narrate: '客户选中非标，AI 侧栏弹出', exec: selectNonstandardAtom },
    { narrate: 'AI 弹出建议对话', exec: () => appendAiBubble('assistant', '您选择了非标特批服务，请先描述您的具体需求...') },
    { narrate: '客户关闭侧栏，不和 AI 对话', exec: () => toggleAiSidebar(false) },
    { narrate: '客户随便写了"帮我处理下"（信息不完整）', exec: fillFormManuallyBad },
    { narrate: '客户点提交 → 描述不清晰 ❌ 缺少关键信息', exec: showValidationB_unclear },
    { narrate: '❌ 被拦截！AI 侧栏强制重新打开', exec: forceReopenSidebarWithPrompt },
    { narrate: 'AI 告知客户需要补充 SKU/数量/单据号/操作要求', exec: () => {} },
    { narrate: '❌→ 场景 C 完成：填不清楚的被拦回 AI，必须补充后再提交', exec: () => {} }
  ]);
}
```

### 4.6 场景 D：误选非标→纠正标准（入口 1a 触发）

动作序列：点AI指引→无选中→AI问→客户说直接上架→AI检测→弹窗拦截→切标准

```javascript
function demoD() {
  startScenario([
    { narrate: '客户不确定选什么，点击"AI 指引"按钮（页面无选中态）', exec: () => toggleAiSidebar(true) },
    { narrate: 'AI 主动询问客户需求', exec: () => appendAiBubble('assistant', '您好，请告诉我您想如何处理这批货物，我来帮您选择增值服务并生成操作说明。') },
    { narrate: '客户说"帮我直接上架就行"', exec: () => appendAiBubble('user', '帮我直接上架就行') },
    { narrate: 'AI 检测到：这个需求标准增值"直接上架"就能解决', exec: () => appendAiBubble('assistant', '您描述的需求可以使用标准增值服务【直接上架】覆盖，无需走非标特批流程。建议切换到标准增值。') },
    { narrate: '⚠️ 弹窗拦截：提示客户走标准增值即可', exec: showValidationA },
    { narrate: '客户点击"切换到标准增值" → 自动选中直接上架', exec: closeValidationA_useStandard },
    { narrate: '↩️ 场景 D 完成：AI 帮客户纠正路径，避免走错非标流程', exec: () => {} }
  ]);
}
```

### 4.7 辅助函数清单

| 函数 | 作用 |
|------|------|
| `selectNonstandardAtom()` | 选中"入库其他服务需求"卡片高亮 + 强制打开侧栏 |
| `fillFormManuallyGood()` | 模拟手动填写完整清晰的需求背景+需求描述 |
| `fillFormManuallyBad()` | 模拟手动填写"帮我处理下"（模糊不完整） |
| `markAttachmentsUploaded()` | 模拟附件已上传（上传项显示文件名+绿色状态） |
| `showValidationB()` | 弹校验B模态框（附件缺失场景） |
| `showValidationB_unclear()` | 弹校验B模态框（描述不清晰场景） |
| `closeValidationB()` | 关闭校验B + 附件标红 |
| `forceReopenSidebarWithPrompt()` | 强制打开侧栏 + AI 追问补充信息 |
| `showValidationA()` | 弹校验A模态框（标准可替代） |
| `closeValidationA_useStandard()` | 关闭校验A + 切换到标准增值 |
| `appendSopCard()` | 在对话区追加 SOP 卡片 DOM |
| `appendAiBubble(role, text)` | 追加对话气泡 |
| `toggleAiSidebar(forceState)` | 开关侧栏 |

---

## §5 SOP 卡片交互

> 注意：以下 §5 开始为保留的 UI 规格部分，§4 的旧步骤逻辑已被上面的场景播放逻辑完全替代，以下如有残留的 Step 1~5 代码请 Codex 直接删除。

~~以下旧步骤逻辑已废弃，Codex 请删除到下一个 `---` 分隔符为止~~

### Step 1：选中非标→弹侧栏

```javascript
function demoStep1() {
  // 模拟入口 1b：选中非标原子 → 强制弹侧栏
  const atomCards = document.querySelectorAll('#atomCards .card-item');
  const target = Array.from(atomCards).find(c => c.textContent.includes('其他服务需求'));
  if (target) target.click(); // 触发选中态 + 自动弹侧栏 + AI 代发 1b 话术
  
  setTimeout(() => {
    markStepDone('demoStep1');
    enableStep('demoStep2');
  }, 800);
}
```

### Step 2：AI 对话

```javascript
function demoStep2() {
  // 侧栏已打开（step1 触发），直接注入多轮对话
  // 不重复打开侧栏，不重复代发首条消息
  injectDemoDialog(); // 从第二条消息开始注入（客户输入 → AI追问 → 客户补充 → AI生成SOP）
  const totalDelay = (DEMO_DIALOG.length - 1) * 1500 + 500; // 减1因为首条已有
  setTimeout(() => {
    markStepDone('demoStep2');
    enableStep('demoStep3');
  }, totalDelay);
}
```

**DEMO_DIALOG 内容调整**：
- 第一条（AI 开场）**不在 DEMO_DIALOG 数组中**，由 step1 的 `forceOpenSidebarWithMessage()` 处理
- DEMO_DIALOG 从客户第一句话开始：

```javascript
const DEMO_DIALOG = [
  { role: 'user', text: '我有一批货跟马上要退仓入库的新货用了同一个三方条码，系统里没法区分，想把老的那批转成不良品存着' },
  { role: 'assistant', text: '收到，您这个需求看起来是...(追问)' },
  { role: 'user', text: 'SKU 是 SKU-DE-15908221...(补充信息)' },
  { role: 'assistant', text: '已确认：您的需求为【良品转不良品上架】...(确认摘要，不含内部术语)' }
  // 注意：最后一条 AI 消息不含"已匹配知识库模板3.41"等内部信息
];
```

最后一条 AI 消息之后，额外追加 SOP 卡片 DOM（非文本气泡）。

### Step 3：确认 SOP

```javascript
function demoStep3() {
  confirmSop(); // SOP 卡片按钮变绿 + 追加附件提示 + 激活回填按钮
  markStepDone('demoStep3');
  enableStep('demoStep4');
}
```

### Step 4：一键回填

```javascript
function demoStep4() {
  fillForm(); // 选中产品/服务 + 填入背景/描述 + 高亮 + AI徽章 + 追加费用预估
  markStepDone('demoStep4');
  enableStep('demoStep5');
}
```

### Step 5：提交校验

```javascript
function demoStep5() {
  showValidationB(); // 弹校验B模态框
}
```

---

## §5 SOP 卡片交互

最后一条 AI 消息注入后，追加 SOP 卡片 DOM：

```html
<div class="sop-card-v6">
  <div class="sop-card-header">操作 SOP — 良品转不良品上架</div>
  <div class="sop-card-body">
    1. 按出库单 WO12120399145 下架指定商品（86 件）
    2. 按新入库单 WI51339338 补贴包裹标签
    3. 使用新入库单做不良品上架
    4. 上架后登记"单品包装破损"异常，复核时确认为不良品
    5. 操作完成后拍照留存
  </div>
  <div class="sop-card-footer">
    <button class="sop-btn-confirm" id="sopConfirmBtn" onclick="confirmSop()">✓ 确认并使用</button>
    <button class="sop-btn-revise" onclick="reviseSop()">让 AI 再改一版</button>
  </div>
</div>
```

**只有中文步骤**，英文只在审核视角模态框中。

SOP 卡片注入后加脉冲动画 `animation: pulse 1s ease 2` 提示"到这了"。

---

## §6 一键回填按钮

在"需求背景说明" textarea 上方，有一个按钮：

```html
<div class="fill-btn-row">
  <button class="fill-btn" id="fillBtn" disabled onclick="fillForm()">📝 一键回填 AI 结果</button>
  <span class="fill-hint" id="fillHint">请先在侧栏确认 SOP 卡片</span>
</div>
```

- SOP 确认前：disabled + 红色提示
- SOP 确认后：enabled + 提示隐藏
- 点击后：产品/服务选中 + 背景/描述填入 + 绿色高亮 + "AI 生成"紫色徽章

---

## §7 费用预估

一键回填成功后，侧栏追加一条费用预估气泡（浅黄背景+虚线边框）：

```
💰 预估费用：

费用名称          价格
上下架处理费       $8.50
标签处理费         $172.00（$2.00/件×86件）
非标操作工时费     $15.00
合计预估          $195.50

⚠️ 以上为 AI 预估，最终以审核后正式报价为准。
```

---

## §8 附件提示

SOP 确认后（`confirmSop()` 中），延迟 1s 侧栏追加：

```
根据【良品转不良品上架】场景，您还需要上传以下文件：

📎 必须上传：
1. 操作说明附件
2. 商品和标签的对应关系
3. 标签文件

请在表单"增值文件"处上传后再提交。
```

---

## §9 校验 B（提交时智能校验 — 两个维度独立判断）

### 9.1 校验逻辑

提交时 AI 校验两个维度，**独立判断**：

| 维度 | 通过条件 | 不通过时的处理 |
|------|---------|-------------|
| 需求描述清晰度 | 描述中包含 SKU/数量/单据号/具体操作要求 | **强制重新弹出 AI 侧栏**，追问补充 |
| 附件完整性 | 必须上传的附件已上传 | **附件区红框**，不需要弹侧栏 |

**组合结果**：
- 描述清晰 + 附件完整 → ✅ 直接提交成功（**不需要和 AI 对话也能过**）
- 描述清晰 + 附件缺失 → 拦截，只标红附件区
- 描述不清晰 + 附件完整 → 拦截，强制弹侧栏
- 描述不清晰 + 附件缺失 → 拦截，强制弹侧栏 + 标红附件区

### 9.2 演示中展示"描述不清晰+附件缺失"场景

模态框内容：
- 蓝色 header："📋 提交前智能校验"
- body：

```html
<div class="validation-item pass">✅ 增值产品：已选择</div>
<div class="validation-item pass">✅ 增值服务：已选择</div>
<div class="validation-item fail" style="border-color:#ff4d4f;background:#fff2f0;color:#a8071a;">
  ❌ 需求描述清晰度：不通过<br>
  <span style="font-size:12px;">描述中缺少关键信息（SKU/数量/单据号），需要与 AI 对话补充。</span>
</div>
<div class="validation-item warn" style="border-color:#ffe58f;background:#fffbe6;color:#ad6800;">
  ⚠️ 附件完整性：未上传<br>
  <span style="font-size:12px;">操作说明附件、商品标签对应关系、标签文件均未上传。</span>
</div>
```

- footer 按钮：**「与 AI 对话补充」**（只有这一个）
- 点击后：
  1. 关闭模态框
  2. 强制打开 AI 侧栏
  3. AI 代发消息："您的需求描述信息不够完整，请补充以下关键信息：\n1. 具体 SKU 编号\n2. 处理数量\n3. 关联单据号\n4. 具体操作要求"
  4. 附件区 3 个上传项标红错误态
  5. 滚动到附件区

### 9.3 JS 逻辑

```javascript
function showValidationB() {
  document.getElementById('validationModalB').classList.add('show');
}

function closeValidationB() {
  document.getElementById('validationModalB').classList.remove('show');
  // 强制弹侧栏 + AI 追问
  const sidebar = document.getElementById('aiSidebar');
  if (!sidebar.classList.contains('open')) {
    sidebar.classList.add('open');
  }
  appendAiBubble('assistant', '您的需求描述信息不够完整，请补充以下关键信息：\n1. 具体 SKU 编号\n2. 处理数量\n3. 关联单据号\n4. 具体操作要求');
  // 附件标红
  markUploadErrors();
  const filesSection = document.getElementById('vasFilesSection');
  if (filesSection) filesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

### 9.4 关键原则（给业务方理解）

- 客户可以关闭侧栏不和 AI 聊，自己填表 → AI 不阻止
- 但提交时必须过校验：**写得清楚+传了附件 = 不用聊也能过**
- 写不清楚 = 强制拉回 AI 对话（弹侧栏+追问）
- 附件缺 = 红框提示（不强制对话，客户自己传就行）

---

## §10 校验 A（独立演示：标准可替代拦截）

模态框内容：
- 橙色 header："🔍 校验 A：标准增值可替代性检查"
- body："⚠️ 可以走标准增值。AI 检测到您的需求可以使用【直接上架】覆盖，无需走非标。"
- footer 只有一个按钮：**「确认，切换到标准增值」**
- 点击后：关闭模态框 + 自动选中"直接上架" + 清空需求背景/需求描述 + toast

---

## §11 审核视角模态框

- 场景概述下拉：选中"【库内】良品转不良品上架"
- 操作 SOP textarea：中英双语预填
- 上方蓝色提示条："💡 以下由 AI 生成并经客户确认，审核人员可修改"
- 底部只有"关闭预览"

---

## §12 UI/布局要求

| # | 要求 |
|---|------|
| 1 | AI 侧栏 push 模式（flex 并排，width 0↔380px） |
| 2 | 侧栏 `position: sticky; top: 0; height: 100vh; align-self: flex-start` |
| 3 | 侧栏标题**无图标**，只有文字"AI 增值指引" |
| 4 | "🤖 AI 指引"按钮在步骤条"增值产品信息"文字右侧，pill 样式 |
| 5 | V6 标识 badge 在页面**左下角** `position:fixed; bottom:12px; left:12px` |
| 6 | 演示控制台高度自适应，body padding-top 动态匹配 |
| 7 | 增值文件区域 3 个上传项（操作说明附件/商品标签对应关系/标签文件） |
| 8 | ATOM_DETAIL 中 `'入库其他服务需求'` 的 `file: null`（去掉旧 ⬆️ 占位） |
| 9 | 对话注入时侧栏自动 scrollTop 到最新消息 |
| 10 | 最后一条 SOP 卡片有脉冲动画边框 |

---

## §13 DEMO_DIALOG 内容（完整，去掉内部术语）

```javascript
const DEMO_DIALOG = [
  {
    role: 'user',
    text: '我有一批货跟马上要退仓入库的新货用了同一个三方条码，系统里没法区分，想把老的那批转成不良品存着'
  },
  {
    role: 'assistant',
    text: '收到，您这个需求看起来是"良品转不良品上架"方向，主要目的是把当前在库老货和后续退仓入库的新货区分开。\n\n为了生成可给仓库执行的操作说明，还需要您补充几项关键信息：\n1. 需要处理的 SKU 和数量分别是多少？\n2. 当前库存所在仓库是哪个？\n3. 退仓新货是否已经创建无箱单预报入库单？如有请提供单号。\n4. 在库老货是否需要先创建下架出库单？如有请提供单号。\n5. 这批老货转不良品的原因是为了区分库存，还是商品本身存在破损？'
  },
  {
    role: 'user',
    text: 'SKU 是 SKU-DE-15908221，数量 86 件，在 DEBR2 Warehouse。新货已经建了无箱单预报入库单，单号 WI51339338。老货需要先下架，出库单 WO12120399145 已经创建。转不良品不是因为破损，主要是老货和亚马逊退仓的新货三方条码一样，系统里没法同时绑定两个 SKU。需要仓库按新入库单补贴包裹标签后上架到不良品库位。'
  },
  {
    role: 'assistant',
    text: '已确认：您的需求为【良品转不良品上架】。\n\n建议填入：\n· 增值产品：入库非标增值（特批）\n· 增值服务：入库其他服务需求\n\n以上仅为 AI 对您需求的理解和 SOP 拆解，是否审核通过由审核人员决定。\n请确认下方 SOP 后再一键回填。'
  }
];
```

---

## §13b 真实体验版（B_侧边栏真实体验版.html）

基于演示版去掉所有演示专属元素，保留真实产品交互：

**去掉**：
- 演示控制台（`.demo-console` 整个区块）
- 旁白条（`.demo-narrator` 整个区块）
- 场景播放逻辑（`startScenario`、`nextStep`、`prevStep`、`demoA1`~`demoD` 等函数）
- body 的 padding-top/padding-bottom（无控制台/旁白不需要）
- V6 标识 badge
- `demo-highlight` 动画

**保留**：
- AI 侧栏完整交互（push 模式、打开/关闭）
- "🤖 AI 指引"按钮（点击打开侧栏 + AI 代发消息）
- 选中"入库其他服务需求"时强制弹侧栏 + AI 代发消息
- AI 对话区（客户可输入、AI 回复用静态模拟即可——输入后显示"AI 正在思考..."占位）
- SOP 卡片（确认/再改按钮）
- 一键回填按钮（disabled→enabled 逻辑）
- AI 生成徽章
- 提交校验（描述清晰度+附件完整性两维度）
- 校验 A（标准可替代拦截）
- 附件区 3 个上传项 + 错误态
- 费用预估气泡
- 审核模态框（可通过某处隐藏入口打开，如 Ctrl+Shift+A）

**交互逻辑**：
- 业务方自己点"AI 指引"或选中非标 → 侧栏打开
- 侧栏有输入框，输入后显示"AI 正在思考..."（不做真实 AI 调用，只是 UI 占位）
- 如果要看完整 AI 对话效果 → 用演示版
- 如果要自己验证"一键回填是否正确选中字段""附件校验是否标红" → 用真实版

**注意**：真实版中"一键回填"按钮需要有内容可填。解决方案：侧栏打开后自动预置一条 AI 消息（含 SOP 卡片），客户点确认后即可触发回填。不需要走完整多轮对话。

## §14 约束

- **产出两个文件**：`prototypes/B_侧边栏演示_V6版.html`（演示版）+ `prototypes/B_侧边栏真实体验版.html`（真实版）
- 两个文件各自独立，所有 CSS/JS 内联，不引入第三方库
- 不改其他文件
- 以本 prompt 为准，之前的零散迭代 prompt 作废
- 如有歧义标记 `[AMBIGUITY]`

## §15 Git 规范

- commit message：`feat(prototype-B-V6): final integration - demo version + clean experience version`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
