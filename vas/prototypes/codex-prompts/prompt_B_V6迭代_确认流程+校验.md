## §0 角色与仓库

你是执行者（Codex），负责迭代修改已有原型 HTML。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`（在现有文件基础上修改）

## §1 任务

在现有 V6 侧边栏演示原型基础上，补充 6 项交互：

1. SOP 确认流程（确认+再改两个按钮）
2. 未确认前一键回填按钮 disabled
3. AI 生成徽章
4. 非标校验拦截（B5）
5. 附件提示（B6）
6. 去掉 AI 侧栏标题栏的 SVG robot icon

## §2 前置阅读

- 当前 `prototypes/B_侧边栏演示_V6版.html`：已有 V6+侧栏的基础版
- `tmp/ai-drafts/PRD-AI增值指引侧栏助手.md`：功能模块 4（SOP 卡片确认）和模块 5（一键回填）的详细规格

## §3 具体改动

### 3.1 去掉侧栏标题 SVG icon

当前侧栏标题栏（`.ai-sidebar-title`）有一个 SVG icon。**直接删除这个 SVG 元素**，只保留文字"AI 增值指引"。

### 3.2 SOP 确认流程

当前：演示对话最后一条 AI 消息直接展示 SOP 内容作为文本。

改为：最后一条 AI 消息中的 SOP 部分用一个**卡片样式**展示，卡片底部有两个按钮：

```html
<div class="sop-card-v6">
  <div class="sop-card-header">操作 SOP — 良品转不良品上架</div>
  <div class="sop-card-body">
    <!-- SOP 步骤内容 -->
  </div>
  <div class="sop-card-footer">
    <button class="sop-btn-confirm" id="sopConfirmBtn" onclick="confirmSop()">✓ 确认并使用</button>
    <button class="sop-btn-revise" onclick="reviseSop()">让 AI 再改一版</button>
  </div>
</div>
```

**样式**：
```css
.sop-card-v6 { border: 1px solid #f0e4c0; border-radius: 8px; overflow: hidden; margin-top: 10px; background: #fff; }
.sop-card-header { background: #fffaf3; padding: 10px 14px; font-weight: 600; color: #8B6914; border-bottom: 1px solid #f0e4c0; font-size: 13px; }
.sop-card-body { padding: 12px 14px; font-size: 12px; line-height: 1.8; white-space: pre-line; }
.sop-card-footer { padding: 10px 14px; border-top: 1px solid #f0e4c0; display: flex; gap: 10px; }
.sop-btn-confirm { flex: 1; padding: 8px; border: none; border-radius: 6px; background: linear-gradient(135deg, #A0792A, #C9952E); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.sop-btn-confirm:hover { background: linear-gradient(135deg, #8B6914, #A0792A); }
.sop-btn-confirm.confirmed { background: #52c41a; cursor: default; }
.sop-btn-revise { flex: 1; padding: 8px; border: 1px solid #d9d9d9; border-radius: 6px; background: #fff; color: #333; font-size: 13px; cursor: pointer; }
.sop-btn-revise:hover { border-color: #A0792A; color: #A0792A; }
```

**按钮行为**：
- `confirmSop()`：按钮文字变为"✓ 已确认"，变绿（`.confirmed`），同时激活表单区"一键回填"按钮
- `reviseSop()`：在侧栏追加一条 AI 消息："好的，请告诉我您想调整哪部分？"（演示中只做到展示这条消息，不实际重新生成）

### 3.3 一键回填按钮（未确认前 disabled）

在表单区域（`需求背景说明` textarea 上方）新增一个"一键回填 AI 结果"按钮：

```html
<div class="fill-btn-row">
  <button class="fill-btn" id="fillBtn" disabled onclick="fillForm()">📝 一键回填 AI 结果</button>
  <span class="fill-hint" id="fillHint">请先在侧栏确认 SOP 卡片</span>
</div>
```

**样式**：
```css
.fill-btn-row { margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
.fill-btn { padding: 10px 20px; border: none; border-radius: 6px; background: linear-gradient(135deg, #A0792A, #C9952E); color: #fff; font-size: 13px; font-weight: 500; cursor: pointer; }
.fill-btn:disabled { background: #d9d9d9; color: #999; cursor: not-allowed; }
.fill-btn:not(:disabled):hover { background: linear-gradient(135deg, #8B6914, #A0792A); }
.fill-hint { font-size: 12px; color: #ff4d4f; }
.fill-hint.hidden { display: none; }
```

**逻辑**：
- 页面加载时：`#fillBtn` disabled + `#fillHint` 显示
- 客户在侧栏点"✓ 确认并使用"后：`#fillBtn` enabled + `#fillHint` 隐藏
- 点击填入后执行现有 `fillForm()` 逻辑

同时，**移除演示控制台中原来的"模拟：一键填入表单"按钮**（因为现在表单区有正式按钮了）。演示控制台只保留："演示：非标特批场景" + "模拟：审核视角" + "重置"。

### 3.4 AI 生成徽章

一键回填成功后，在每个被填入的字段 label 旁添加紫色"AI 生成"徽章：

```html
<span class="ai-badge">AI 生成</span>
```

**样式**：
```css
.ai-badge { display: none; font-size: 10px; padding: 2px 6px; border-radius: 3px; background: linear-gradient(135deg, #a855f7, #7c3aed); color: #fff; margin-left: 6px; vertical-align: middle; }
.ai-badge.show { display: inline; }
```

**逻辑**：`fillForm()` 执行成功后，找到 `#requirementBackground` 和 `#requirementDescription` 的 label，追加 `.ai-badge.show`。

### 3.5 非标校验拦截（B5）

在页面底部"提交"按钮的 click 事件中增加拦截逻辑：

点击提交时：
1. 检测当前选中的增值服务是否为"入库其他服务需求"（非标特批）
2. 如果是 → 弹出一个轻量模态框（或 toast），模拟 AI 校验结果：

```html
<div class="validation-modal" id="validationModal">
  <div class="validation-box">
    <div class="validation-header">🤖 AI 提交前校验</div>
    <div class="validation-body">
      <div class="validation-item pass">✅ 需求描述完整性：通过（已填写背景说明和操作描述）</div>
      <div class="validation-item pass">✅ 标准增值可替代性检查：不可替代（当前需求无法用标准增值服务覆盖）</div>
      <div class="validation-item pass">✅ 关键字段：SKU/数量/单据号均已填写</div>
    </div>
    <div class="validation-footer">
      <button class="validation-btn-ok" onclick="closeValidation(true)">校验通过，确认提交</button>
      <button class="validation-btn-cancel" onclick="closeValidation(false)">返回修改</button>
    </div>
  </div>
</div>
```

**样式**：模态框样式参考现有审核模态框，但更小（宽 500px）。header 用蓝色背景。

**逻辑**：
- 校验通过 → 显示 toast "增值单提交成功（模拟）"
- 返回修改 → 关闭模态框回到表单

### 3.6 附件提示（B6）

SOP 确认后（`confirmSop()` 执行后），在侧栏对话区追加一条 AI 消息：

```
根据【良品转不良品上架】场景，您还需要上传以下文件：

📎 必须上传：
1. 包裹标签文件（新入库单对应的标签）
2. 下架出库单截图或单号确认

📎 建议上传（加快审核）：
3. 三方条码对应关系说明

请在表单"增值文件"处上传后再提交。
```

**时机**：`confirmSop()` 中，在按钮变绿+激活回填按钮之后，延迟 1s 追加这条消息。

## §4 演示流程更新

完整演示流程变为：

```
1. 点击"演示：非标特批场景" → 侧栏打开 + 逐条注入对话
2. 最后一条 AI 消息中展示 SOP 卡片（带确认/再改按钮）
3. 用户点"✓ 确认并使用" → 按钮变绿 → 附件提示追加 → 表单区"一键回填"按钮激活
4. 用户点"📝 一键回填 AI 结果" → 字段填入+高亮+AI徽章
5. 用户点"提交" → AI 校验模态框弹出 → 点"确认提交" → toast 成功
6. 随时可点"模拟：审核视角" → 审核模态框
```

### DEMO_DIALOG 修改

当前 `DEMO_DIALOG` 数组的最后一条 AI 消息（`role: 'assistant'`）内容太长（包含完整 SOP 文本）。改为：

- 最后一条 AI 文本消息只保留确认摘要部分（到"已匹配知识库模板"为止）
- SOP 卡片作为独立 DOM 元素（非文本气泡）在最后追加

具体：`runDemo()` 在注入最后一条 assistant 消息后，额外追加一个 SOP 卡片 DOM（用 `createSopCard()` 函数生成）。

## §5 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## §6 Git 规范

- commit message：`feat(prototype-B-V6): add SOP confirm flow, validation, attachment prompt, AI badge`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
