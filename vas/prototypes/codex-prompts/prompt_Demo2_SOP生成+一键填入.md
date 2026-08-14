## §0 角色与仓库

你是执行者（Codex），负责产出一个独立的 HTML 原型文件。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/Demo2_AI生成SOP.html`

---

## §1 总体目标

产出一个独立、自包含的 HTML 原型，演示 **B 类场景：AI 多轮追问 → 匹配知识库模板 → 生成 SOP → 客户确认 → 一键填入表单**。

这是整个 AI 指引的核心能力展示，完整呈现从"客户模糊描述"到"表单规范填写完成"的全链路。打开即能看懂，不需要操作指南。

页面加载后自动播放完整对话流，播放结束后 UI 停留在最终态。

**核心信息传达**：AI 替代客服追问关键信息、替代审核人员写 SOP、一键回填表单消除手动填写。

---

## §2 页面外壳（Winit 品牌）

### 2.1 顶部导航栏

```html
<div class="top-bar">
  <div class="top-bar-left">
    <span class="logo">WINIT</span>
    <nav class="top-nav">
      <a href="#">首页</a>
      <a href="#">异常单</a>
      <a class="active">创建增值订单</a>
    </nav>
  </div>
  <div class="top-bar-right">
    <span class="avatar">K</span>
    <span class="username">kenghong.huang</span>
  </div>
</div>
```

样式：`background: linear-gradient(135deg, #6B4F0A, #8B6914)`，白色文字，高度 48px。

### 2.2 左侧菜单栏

窄菜单（width 72px），深色背景 `#2c2216`，图标+文字纵向排列：
- 商品管理、库存管理、**海外仓**（active）、国际送仓、退货管理、我的钱包

Active 项：金色左边框 `border-left: 3px solid #C9952E`。

### 2.3 页面标题区

```html
<div class="page-header">
  <h1>新建入库增值订单</h1>
  <div class="page-steps">
    <span class="step done">基本信息 ✓</span>
    <span class="step active">增值产品信息</span>
  </div>
  <button class="ai-guide-btn">🤖 AI 指引</button>
</div>
```

---

## §3 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏 (Winit 品牌)                                      │
├──────┬──────────────────────────────────────────────────────┤
│ 左侧  │  页面标题 + 步骤条                                    │
│ 菜单  │  ┌─────────────────────────────┬───────────────────┐ │
│      │  │  表单区域                     │  AI 侧栏 (380px)  │ │
│      │  │  - 增值产品下拉               │  - 对话区          │ │
│      │  │  - 增值服务卡片（已选中非标）   │  - SOP 卡片       │ │
│      │  │  - 一键回填按钮               │  - 附件提示        │ │
│      │  │  - 需求背景说明 textarea      │  - 费用预估        │ │
│      │  │  - 需求描述 textarea          │  - 输入框          │ │
│      │  │  - 增值文件上传区             │                    │ │
│      │  │  - 费用明细                   │                    │ │
│      │  │  - 提交按钮                   │                    │ │
│      │  └─────────────────────────────┴───────────────────┘ │
│      │  底部说明条 + 审核视角入口                              │
├──────┴──────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

底部说明条文字：`"B 类场景：客户需求未上线为命名服务，但知识库有 SOP 模板 → AI 追问+生成+填入"`

---

## §4 左侧表单

### 4.1 增值产品

```html
<div class="form-section">
  <label>增值产品 <span class="required">*</span></label>
  <div class="select-box" id="productSelect">请选择增值产品</div>
</div>
```

### 4.2 增值服务卡片

沿用入库段 10 个服务（与 Demo1 §4.1 相同数据）。"入库其他服务需求"初始为 `.selected` 状态（本场景已锁定此服务）。

### 4.3 一键回填按钮

```html
<div class="fill-btn-row">
  <button class="fill-btn" id="fillBtn" disabled onclick="fillForm()">📝 一键回填 AI 结果</button>
  <span class="fill-hint" id="fillHint">请先在侧栏确认 SOP</span>
</div>
```

状态流转：
- 初始：`disabled` + 灰色 + 提示"请先在侧栏确认 SOP"
- SOP 确认后：`enabled` + 金色可点击 + 提示变为"✅ SOP 已确认，可以回填"
- 回填完成后：按钮变为"✅ 已回填" disabled 绿色态

### 4.4 需求背景说明

```html
<div class="form-section">
  <label>需求背景说明</label>
  <div class="textarea-wrap">
    <textarea id="requirementBackground" rows="4" placeholder="请描述为什么需要该增值服务..."></textarea>
    <span class="ai-badge" id="bgBadge" style="display:none;">AI 生成</span>
  </div>
</div>
```

"AI 生成"紫色徽章在 textarea 右上角，回填后显示。

### 4.5 需求描述

```html
<div class="form-section">
  <label>需求描述 <span class="required">*</span></label>
  <div class="textarea-wrap">
    <textarea id="requirementDescription" rows="10" placeholder="请描述具体操作要求..."></textarea>
    <span class="ai-badge" id="descBadge" style="display:none;">AI 生成</span>
  </div>
</div>
```

### 4.6 增值文件上传区

```html
<div class="form-section" id="vasFilesSection">
  <label>增值文件</label>
  <div class="upload-item" id="upload1">
    <div class="upload-left">
      <span class="upload-icon">📎</span>
      <div class="upload-info">
        <span class="upload-name">操作说明附件 <span class="required">*</span></span>
        <span class="upload-format">支持 .DOC / .DOCX / .PDF / .XLS / .XLSX</span>
      </div>
    </div>
    <div class="upload-right">
      <button class="upload-btn">上传文件</button>
      <a class="template-link" href="#">下载模板</a>
    </div>
    <span class="upload-status" id="upload1Status">未上传</span>
  </div>
  <div class="upload-item" id="upload2">
    <div class="upload-left">
      <span class="upload-icon">📎</span>
      <div class="upload-info">
        <span class="upload-name">商品和标签的对应关系 <span class="required">*</span></span>
        <span class="upload-format">支持 .XLS / .XLSX</span>
      </div>
    </div>
    <div class="upload-right">
      <button class="upload-btn">上传文件</button>
      <a class="template-link" href="#">下载模板</a>
    </div>
    <span class="upload-status" id="upload2Status">未上传</span>
  </div>
  <div class="upload-item" id="upload3">
    <div class="upload-left">
      <span class="upload-icon">📎</span>
      <div class="upload-info">
        <span class="upload-name">标签文件 <span class="required">*</span></span>
        <span class="upload-format">支持 .7Z / .JPEG / .JPG / .PDF / .PNG / .RAR / .ZIP</span>
      </div>
    </div>
    <div class="upload-right">
      <button class="upload-btn">上传文件</button>
    </div>
    <span class="upload-status" id="upload3Status">未上传</span>
  </div>
</div>
```

### 4.7 费用明细区

```html
<div class="form-section" id="feeSection" style="display:none;">
  <label>费用明细（AI 预估）</label>
  <table class="fee-table">
    <thead>
      <tr><th>费用名称</th><th>单价</th><th>数量</th><th>金额(USD)</th></tr>
    </thead>
    <tbody>
      <tr><td>上下架处理费</td><td>-</td><td>-</td><td>$8.50</td></tr>
      <tr><td>标签处理费</td><td>$2.00/件</td><td>86</td><td>$172.00</td></tr>
      <tr><td>非标操作工时费</td><td>-</td><td>-</td><td>$15.00</td></tr>
    </tbody>
    <tfoot>
      <tr class="total-row"><td colspan="3">合计预估</td><td><strong>$195.50</strong></td></tr>
    </tfoot>
  </table>
  <div class="fee-tip">⚠️ 以上为 AI 预估，最终以审核后正式报价为准。如合计低于 $20.00 将补足最低收费差额。</div>
</div>
```

### 4.8 提交按钮

```html
<div class="form-section form-footer">
  <button class="btn-secondary">上一步</button>
  <button class="btn-secondary">保存草稿</button>
  <button class="submit-btn" id="submitBtn">提交</button>
</div>
```

---

## §5 AI 侧栏

### 结构

```html
<div class="ai-sidebar" id="aiSidebar">
  <div class="sidebar-header">AI 增值指引</div>
  <div class="chat-area" id="chatArea"></div>
  <div class="chat-input">
    <input type="text" placeholder="描述您的需求..." disabled />
    <button disabled>发送</button>
  </div>
</div>
```

Push 模式并排（flex），width 380px。侧栏默认展开。

---

## §6 自动播放流程（页面加载 1s 后开始）

每条对话间隔 1200ms。播放到特定节点触发 DOM 动作。全部播完 UI 停留在最终态。

---

## §7 对话内容

```javascript
const DEMO_FLOW = [
  // Step 1: AI 开场（侧栏弹出后首条）
  {
    role: 'assistant',
    text: '您选择了非标特批服务，请先描述您的具体需求，我来帮您评估并生成 SOP。',
    action: null
  },
  // Step 2: 客户模糊描述
  {
    role: 'user',
    text: '我有一批货跟马上要退仓入库的新货用了同一个三方条码，系统里没法区分，想把老的那批转成不良品存着',
    action: null
  },
  // Step 3: AI 追问
  {
    role: 'assistant',
    text: '收到，您这个需求看起来是"良品转不良品上架"方向，主要目的是把当前在库老货和后续退仓入库的新货区分开。\n\n为了生成可给仓库执行的操作说明，还需要您补充几项关键信息：\n1. 需要处理的 SKU 和数量分别是多少？\n2. 当前库存所在仓库是哪个？\n3. 退仓新货是否已经创建无箱单预报入库单？如有请提供单号。\n4. 在库老货是否需要先创建下架出库单？如有请提供单号。\n5. 这批老货转不良品的原因是为了区分库存，还是商品本身存在破损？',
    action: null
  },
  // Step 4: 客户补充完整信息
  {
    role: 'user',
    text: 'SKU 是 SKU-DE-15908221，数量 86 件，在 DEBR2 Warehouse。新货已经建了无箱单预报入库单，单号 WI51339338。老货需要先下架，出库单 WO12120399145 已经创建。转不良品不是因为破损，主要是老货和亚马逊退仓的新货三方条码一样，系统里没法同时绑定两个 SKU。需要仓库按新入库单补贴包裹标签后上架到不良品库位。',
    action: null
  },
  // Step 5: AI 确认 + SOP 卡片出现
  {
    role: 'assistant',
    text: '已确认：您的需求为【良品转不良品上架】。\n\n建议填入：\n· 增值产品：入库非标增值（特批）\n· 增值服务：入库其他服务需求\n\n以上仅为 AI 对您需求的理解和 SOP 拆解，是否审核通过由审核人员决定。\n请确认下方 SOP 后再一键回填。',
    action: 'showSopCard'
  },
  // Step 6: 模拟客户点"确认并使用"
  {
    role: 'system',
    text: null,
    action: 'confirmSop'
  },
  // Step 7: 模拟点击"一键回填"
  {
    role: 'system',
    text: null,
    action: 'fillFormAndShowCost'
  }
];
```

---

## §8 SOP 卡片

Step 5 的 AI 消息之后，对话区追加 SOP 卡片 DOM：

```html
<div class="sop-card" id="sopCard">
  <div class="sop-header">📋 操作 SOP — 良品转不良品上架</div>
  <div class="sop-body">
    <div class="sop-meta">
      <span>🏭 仓库：DEBR2 Warehouse</span>
      <span>📦 SKU：SKU-DE-15908221 × 86 件</span>
    </div>
    <ol class="sop-steps">
      <li>按出库单 WO12120399145 将当前在库老货下架</li>
      <li>下架后核对 SKU、数量、三方条码，确认与客户提供信息一致</li>
      <li>按无箱单预报入库单 WI51339338 对该批货物进行重新入库处理</li>
      <li>按入库单信息补贴对应包裹标签</li>
      <li>将该批货物按不良品属性上架至不良品库位</li>
      <li>上架完成后反馈实际处理数量、异常差异及最终库位信息</li>
    </ol>
  </div>
  <div class="sop-footer">
    <button class="sop-btn-confirm" id="sopConfirmBtn" onclick="confirmSop()">✓ 确认并使用</button>
    <button class="sop-btn-revise" onclick="reviseSop()">让 AI 再改一版</button>
  </div>
</div>
```

SOP 卡片出现时有脉冲边框动画（`animation: pulse 1s ease 2`）。

---

## §9 确认 SOP 后的动作（Step 6）

1. "✓ 确认并使用"按钮变为 `✅ 已确认` 绿色 disabled
2. "让 AI 再改一版"隐藏
3. 对话区追加 AI 附件提示消息：

```
根据【良品转不良品上架】场景，您还需要上传以下文件：

📎 必须上传：
1. 操作说明附件（.DOC/.DOCX/.PDF/.XLS/.XLSX）
2. 商品和标签的对应关系（.XLS/.XLSX）
3. 标签文件（.7Z/.JPEG/.JPG/.PDF/.PNG/.RAR/.ZIP）

请在表单"增值文件"处上传后再提交。
```

4. 左侧"📝 一键回填 AI 结果"按钮变为 enabled 金色
5. 提示变为"✅ SOP 已确认，可以回填"

---

## §10 一键回填动作（Step 7）

1. 增值产品下拉显示"入库非标增值（特批）" + 选中态
2. 需求背景说明 textarea 填入（逐字打字效果 30ms/字符）：

```
客户有一批老货当前存放在 DEBR2 Warehouse，SKU 绑定了第三方条码。后续会有一批亚马逊退仓新货入库，新货使用同一个三方条码，系统里无法用同一个三方条码同时区分两批 SKU。客户希望先把当前在库老货从良品库存转为不良品库存存放，主要是为了区分老货和新退仓货，不是因为商品实际破损。后续老货可能返修或安排人员进一步处理。
```

3. 需求描述 textarea 填入（逐字打字效果 30ms/字符）：

```
操作需求：良品转不良品上架

仓库：DEBR2 Warehouse
SKU/数量：SKU-DE-15908221，86 件
新入库单：WI51339338
下架出库单：WO12120399145
转不良品原因：用于区分当前在库老货与后续同三方条码的亚马逊退仓新货，不是商品实际破损或质量不良

具体要求：
1. 仓库先按出库单 WO12120399145 将当前在库老货下架
2. 下架后核对 SKU、数量、三方条码及实物状态，确认与客户提供信息一致
3. 按无箱单预报入库单 WI51339338 对该批货物进行重新入库处理
4. 如操作过程中需要补贴包裹标签，请按入库单信息补贴对应包裹标签
5. 将该批货物按不良品属性上架至不良品库位
6. 上架完成后反馈实际处理数量、异常差异及最终库位信息
7. 如发现实物破损、数量差异、标签无法识别或无法匹配入库单，请暂停异常部分并反馈确认
8. 费用以仓库实际操作项目和系统报价为准
```

4. 两个 textarea 填入完成后：绿色边框 + "AI 生成"紫色徽章显示
5. 回填按钮变为"✅ 已回填" disabled 绿色态
6. 左侧费用明细区显示（`#feeSection` show）
7. 对话区追加费用预估气泡（浅黄背景 `#fffbe6`，虚线边框）：

```
💰 预估费用：

费用名称          价格
上下架处理费       $8.50
标签处理费         $172.00（$2.00/件×86件）
非标操作工时费     $15.00
合计预估          $195.50

⚠️ 以上为 AI 预估，最终以审核后正式报价为准。
```

8. 对话区追加系统动作卡片：

```html
<div class="action-card success">
  ✅ 已回填：增值产品 + 增值服务 + 需求背景说明 + 需求描述
</div>
```

---

## §11 审核视角入口

底部说明条右侧有一个小按钮"👁️ 审核视角预览"，点击打开审核模态框。

### 审核模态框

```html
<div class="modal-overlay" id="auditModal">
  <div class="modal-box" style="max-width:700px;">
    <div class="modal-header" style="background:#e6f7ff;border-bottom:1px solid #91d5ff;">
      👁️ 审核端预览 — AI 生成 SOP 回填效果
    </div>
    <div class="modal-body">
      <div class="audit-tip">💡 以下由 AI 生成并经客户确认，审核人员可修改后执行</div>
      <div class="audit-field">
        <label>场景概述</label>
        <select disabled>
          <option selected>【库内】良品转不良品上架</option>
        </select>
      </div>
      <div class="audit-field">
        <label>操作 SOP（中英双语）</label>
        <textarea disabled rows="18" style="font-size:12px;">
操作目标：将在库老货 SKU-DE-15908221 从良品库存下架，并按不良品重新上架。
仓库：DEBR2 Warehouse | SKU/数量：SKU-DE-15908221 × 86件

操作步骤：
1. 按出库单 WO12120399145 下架指定商品（86件）
2. 核对下架货物的 SKU、数量和三方条码
3. 按入库单 WI51339338 补贴包裹标签
4. 使用新入库单做不良品上架
5. 上架完成后反馈处理数量、异常差异和最终库位信息

Operation Steps:
1. Remove 86 units of SKU-DE-15908221 per outbound order WO12120399145
2. Verify SKU, quantity, and third-party barcode match customer info
3. Apply parcel labels per inbound order WI51339338
4. Re-shelve as defective inventory using the new inbound order
5. Report actual quantity, discrepancies, and final bin location

备注：转不良品原因为区分库存（非商品破损），后续可能返修处理。
        </textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-secondary" onclick="closeAuditModal()">关闭预览</button>
    </div>
  </div>
</div>
```

---

## §12 样式要求

| # | 要求 |
|---|------|
| 1 | 所有 CSS/JS 内联，单文件自包含 |
| 2 | 主色系：Winit 金棕 `#A0792A` 主色 / `#C9952E` 高亮 / `#6B4F0A` 深色 / `#FFF8E8` 浅底 |
| 3 | 辅助色：AI 紫 `#722ed1`（徽章），成功 `#52c41a`，警告 `#faad14` |
| 4 | 字体：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| 5 | 顶部导航栏金色渐变 48px |
| 6 | 左侧菜单栏 72px 深棕色 |
| 7 | 侧栏 push 模式 380px（flex 并排） |
| 8 | 对话气泡逐条 slideUp 动画 |
| 9 | SOP 卡片 pulse 边框动画 |
| 10 | textarea 填入时打字效果（30ms/字符） + 完成后绿色边框渐变 |
| 11 | "AI 生成"紫色徽章 `position: absolute; top: 4px; right: 8px` |
| 12 | 费用表格 zebra 行 + 合计行加粗 |
| 13 | 移动端 < 768px：隐藏左菜单，左右改上下 |
| 14 | 页面标题：`AI 增值指引 — SOP 生成与一键填入` |
| 15 | SOP 卡片内步骤只用中文 |

---

## §13 约束

- 产出 1 个文件：`prototypes/Demo2_AI生成SOP.html`
- 单文件自包含，所有 CSS/JS 内联
- 不改其他文件
- 以本 prompt 为准
- 如有歧义标记 `[AMBIGUITY]`

## §14 Git 规范

- commit message：`feat(prototype): Demo2 - AI生成SOP+一键填入（B类场景）`
- push 到 main 分支
