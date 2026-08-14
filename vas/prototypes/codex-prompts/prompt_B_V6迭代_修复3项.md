## §0 角色与仓库

你是执行者（Codex），负责修复 3 个问题。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`

## §1 修复清单

### 修复 1：去掉内部信息"已匹配知识库模板"

**问题**：DEMO_DIALOG 最后一条 AI 消息中包含"属于交叉验证表中的 B 类场景：未上线为命名服务，但知识库有 SOP 模板。"和"已匹配知识库模板：3.41【库内】良品转不良品上架。"——这些是内部术语，不应展示给客户。

**改为**：将该条 AI 消息文本改为（去掉内部信息，只保留客户视角的确认）：

```
已确认：您的需求为【良品转不良品上架】。

建议填入：
· 增值产品：入库非标增值（特批）
· 增值服务：入库其他服务需求

以上仅为 AI 对您需求的理解和 SOP 拆解，是否审核通过由审核人员决定。请确认下方 SOP 后再一键回填。
```

### 修复 2：校验 A 后仍可触发校验 B

**问题**：当前校验 A（`closeValidationA_useStandard`）执行后将 step5 设为 disabled，导致提交按钮点击时提示"请先完成步骤 1-4"。但演示需要两条路径都能走通。

**改为**：演示控制台的步骤 4 和步骤 5 改为**两条独立演示路径**，不是串行依赖关系。

具体方案：

1. 将演示控制台改为 **两行**：
   - 第一行（主流程）：`[1 AI对话] → [2 确认SOP] → [3 一键回填] → [5 校验B：完整性提交]`
   - 第二行（独立校验）：`[4 校验A：标准可替代演示]` + `[选中非标自动弹侧栏]`

2. HTML 结构改为：

```html
<div class="demo-console">
  <div class="demo-console-title">🎬 原型演示控制台（仅开发/评审可见，非线上真实界面）</div>
  <div class="demo-console-steps">
    <span class="demo-row-label">主流程：</span>
    <button id="demoStep1" class="demo-step-btn active" onclick="demoStep1()">
      <span class="step-badge">1</span> AI 对话
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep2" class="demo-step-btn" onclick="demoStep2()" disabled>
      <span class="step-badge">2</span> 确认 SOP
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep3" class="demo-step-btn" onclick="demoStep3()" disabled>
      <span class="step-badge">3</span> 一键回填
    </button>
    <span class="demo-arrow">→</span>
    <button id="demoStep5" class="demo-step-btn" onclick="demoStep5()" disabled>
      <span class="step-badge">4</span> 提交校验
    </button>
  </div>
  <div class="demo-console-steps" style="margin-top:6px;">
    <span class="demo-row-label">独立演示：</span>
    <button class="demo-step-btn demo-extra" onclick="demoValidationA()">校验A：标准可替代拦截</button>
    <button class="demo-step-btn demo-extra" onclick="demoForceOpenSidebar()">选中非标→自动弹侧栏</button>
    <button class="demo-step-btn demo-extra" onclick="openAuditModal()">审核视角</button>
    <button class="demo-step-btn demo-extra" onclick="resetDemo()">重置</button>
  </div>
</div>
```

3. 样式补充：
```css
.demo-row-label { color: #ccc; font-size: 11px; margin-right: 6px; white-space: nowrap; }
```

4. 逻辑改动：

主流程变为 1→2→3→5（校验 B 完整性）串行：
- step3 完成后直接激活 step5（原来的校验 B，改编号为步骤 4 显示）
- 删除原来的 `demoStep4()`（校验 A 不在主流程中）

独立演示按钮的逻辑：

```javascript
// 校验 A 独立演示：直接弹出校验 A 模态框（不依赖主流程状态）
function demoValidationA() {
  showValidationA();
}

// 选中非标自动弹侧栏演示
function demoForceOpenSidebar() {
  // 关闭侧栏
  const sidebar = document.getElementById('aiSidebar');
  sidebar.classList.remove('open');
  showToast('侧栏已关闭。现在模拟选中"入库其他服务需求"...', 2000);
  
  // 2 秒后模拟选中非标原子，触发自动弹出
  setTimeout(() => {
    // 找到并点击"入库其他服务需求"原子卡片
    const atomCards = document.querySelectorAll('#atomCards .card-item');
    const target = Array.from(atomCards).find(c => c.textContent.includes('其他服务需求'));
    if (target) target.click();
    // 注：原子卡片点击逻辑中已有"选中非标→自动弹侧栏"的逻辑
  }, 2000);
}
```

5. `closeValidationA_useStandard()` 保持不变（它切标准增值的逻辑是对的），但**不再 disable step5**。改为只是 toast + 选中标准：

```javascript
function closeValidationA_useStandard() {
  document.getElementById('validationModalA').classList.remove('show');
  clearNonstandardFields();
  switchToStandardService();
  showToast('已切换到标准增值【直接上架】', 3000);
}
```

### 修复 3：演示控制台加"选中非标自动弹侧栏"按钮

已在修复 2 中包含（独立演示行的 `demoForceOpenSidebar` 按钮）。

## §2 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## §3 Git 规范

- commit message：`fix(prototype-B-V6): remove internal text, split demo into main flow + independent validations`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
