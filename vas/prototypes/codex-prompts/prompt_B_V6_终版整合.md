## §0 角色与仓库

你是执行者（Codex），负责对原型进行一次性终版整合修改。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`（在现有文件基础上修改）

## §1 总体目标

根据以下完整验收清单，一次性修改到位。本 prompt 覆盖所有之前零散提出的修复点，以本文为准，之前的迭代 prompt 作废。

---

## §2 演示控制台布局

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

**控制台不遮内容**：DOMContentLoaded 时动态设置 `document.body.style.paddingTop = document.querySelector('.demo-console').offsetHeight + 'px'`。

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

## §4 主流程步骤逻辑

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

## §9 校验 B（提交完整性+附件）

模态框内容：
- 蓝色 header："📋 提交前完整性检查"
- body 逐项展示：增值产品✅、增值服务✅、需求背景✅、需求描述✅、附件⚠️未上传
- footer 只有一个按钮：**「返回补充附件」**（无"仍然提交"）
- 点击后：关闭模态框 + 附件区 3 个上传项标红错误态 + 滚动到附件区

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

## §14 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联，不引入第三方库
- 不改其他文件
- 以本 prompt 为准，之前的零散迭代 prompt 作废
- 如有歧义标记 `[AMBIGUITY]`

## §15 Git 规范

- commit message：`feat(prototype-B-V6): final integration - complete demo flow with all interactions`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
