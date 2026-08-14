## §0 角色与仓库

你是执行者（Codex），负责迭代修改已有原型 HTML。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_V6版.html`（在现有文件基础上修改）

## §1 修改清单（8 项）

### 修复 1：校验 B 去掉"仍然提交"，附件错误态

**问题**：校验 B 检测到附件未上传时，不应该让客户跳过，应该强制返回补充。

**改为**：
- 移除"仍然提交（附件可后补）"按钮
- 只保留"返回补充附件"按钮
- 点击后关闭模态框，同时把页面上"增值文件"上传区域标记为错误态：
  - 上传区域加红色边框 `border: 1px solid #ff4d4f`
  - 上传区域下方加红色提示文字 `<span class="upload-error-tip">请上传此附件</span>`
  - 样式：`.upload-error-tip { color: #ff4d4f; font-size: 12px; margin-top: 4px; display: block; }`

### 修复 2：SOP 卡片只展示中文步骤

**问题**：当前 SOP 卡片在侧栏对话中包含英文步骤（Steps in English），客户不需要看英文。

**改为**：
- 侧栏中的 SOP 卡片**只展示中文操作步骤**
- 英文步骤**只在"审核视角"模态框中展示**（审核端需要中英双语，保持不变）

### 修复 3：去掉 AI 侧栏标题的图标

**问题**：`.ai-sidebar-title` 里有一个 SVG 图标。

**改为**：删除 SVG 元素，标题栏只保留文字"AI 增值指引"。

### 修复 4："原型V6"标识移到左下角

**问题**：当前页面右上角有一个红色 badge "原型V6 - 两步塌缩版"，挡住了 AI 指引按钮。

**改为**：将该 badge 移到页面**左下角**（`position: fixed; bottom: 12px; left: 12px;`），不挡住任何交互元素。

### 修复 5：校验 A 逻辑改为"拦截非标→推荐标准"

**问题**：当前校验 A 演示的是"不可替代，继续非标"。但正确的演示应该是：AI 检测到客户可以走标准增值，**拦截客户不让继续非标**，引导选标准。

**改为**：

校验 A 模态框内容改为：

```html
<div class="validation-header" style="background:linear-gradient(135deg,#fa8c16,#faad14);">
  🔍 校验 A：标准增值可替代性检查
</div>
<div class="validation-body">
  <div class="validation-item warn" style="border-color:#ffe58f;background:#fffbe6;color:#ad6800;">
    ⚠️ 检测结果：<strong>可以走标准增值</strong><br>
    <span style="font-size:12px;">AI 检测到您描述的需求可以使用标准增值服务【直接上架】覆盖，无需走非标特批流程。</span>
  </div>
  <p style="margin-top:12px;font-size:13px;color:#333;">建议选择标准增值服务，提交后无需审核即可直接执行。</p>
</div>
<div class="validation-footer">
  <button class="validation-btn-ok" onclick="closeValidationA_useStandard()">确认，切换到标准增值</button>
</div>
```

**注意**：没有"继续非标"的按钮，强制客户切回标准。

`closeValidationA_useStandard()` 逻辑：
1. 关闭模态框
2. 在页面左侧表单中自动选中标准增值路径（选中"直接上架"相关的卡片/选项）
3. 清空之前填入的需求背景+需求描述（因为标准增值不需要这些）
4. toast "已切换到标准增值【直接上架】"
5. 标记 step4 done → **不激活 step5**（因为标准增值不需要完整性校验，直接可提交）

**额外**：新增"强制弹出 AI 侧栏"逻辑：
- 当客户在表单中选中"入库其他服务需求"（非标兜底服务）时，**自动弹出 AI 侧栏**（即使客户没有点"AI 指引"按钮）
- 侧栏弹出后显示一条 AI 消息："您选择了非标特批服务，请先告诉我您想如何处理这批货物，我来帮您评估是否需要走非标流程。"
- 这个逻辑加在选中"入库其他服务需求"原子卡片的事件回调中

### 修复 6：预估费用展示

**问题**：当前没有费用预估展示。

**改为**：在侧栏 SOP 确认后、一键回填成功后（步骤 3 完成后），在侧栏对话区追加一条 AI 费用预估消息：

```
💰 预估费用：

| 费用名称 | 价格 |
|---------|------|
| 上下架处理费 | $8.50 |
| 标签处理费 | $2.00/件 × 86件 = $172.00 |
| 非标操作工时费 | $15.00 |
| **合计预估** | **$195.50** |

⚠️ 以上为 AI 预估，最终费用以审核后正式报价为准。
```

用一个简单的表格气泡样式展示（不需要真正的 HTML table，用 pre-wrap 文本即可）。背景用浅黄 `#fffbe6` + 虚线边框表示"预估/参考"。

### 修复 7：对话注入时自动滚动 + 最后一条视觉指示

**问题**：5 轮对话一口气注入，业务方来不及看。

**改为**：
- 每条消息注入后，侧栏对话区自动 scrollTop 到最新消息
- 最后一条消息（SOP 卡片）注入后，加一个脉冲动画边框 `animation: pulse 1s ease 2`（提示"到这了"）

```css
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(160,121,42,0.4); }
  50% { box-shadow: 0 0 0 8px rgba(160,121,42,0); }
}
```

### 修复 8：AI 侧栏固定跟随视口，不随页面滚动消失

**问题**：当前侧栏是 flex 布局的一部分，页面内容滚动时侧栏也跟着滚走，导致一键回填等下方内容区域看不到侧栏。

**改为**：AI 侧栏改为 **position: sticky; top: 0; height: 100vh;**，始终固定在视口右侧可见。

具体 CSS：

```css
.ai-sidebar {
  /* 保持原有 width/transition/border 等属性 */
  position: sticky;
  top: 0;
  height: 100vh;
  align-self: flex-start; /* 在 flex 父容器中 sticky 生效 */
}
```

这样：
- 左侧主内容区正常页面滚动
- 右侧 AI 侧栏始终粘在视口顶部，两个主视觉窗口不会断层
- 侧栏内部的对话区有自己的 `overflow-y: auto` 滚动（保持不变）

## §2 约束

- **只修改** `prototypes/B_侧边栏演示_V6版.html`
- 所有 CSS/JS 内联
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## §3 Git 规范

- commit message：`fix(prototype-B-V6): 8 fixes - validation, SOP zh-only, sticky sidebar, fee, etc`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
