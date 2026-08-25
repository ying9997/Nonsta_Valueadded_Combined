## §0 角色与仓库

你是执行者（Codex），负责产出一个独立的 HTML 原型文件。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/Demo1_AI帮选服务.html`

---

## §1 总体目标

产出一个独立、自包含的 HTML 原型，演示 **AI 帮客户选对增值服务 — 推荐标准增值"直接上架"**。

两个场景 tab 切换：
- 场景 1：客户点 AI 指引描述需求 → AI 主动推荐走标准增值"直接上架"
- 场景 2：客户误选了非标"入库其他服务需求" → AI 检测后拦截 → 切回标准"直接上架"

**核心信息传达**：AI 能识别"不需要走非标"的需求，帮客户走更快的标准通道，减少审核团队无效工作量。

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
- 商品管理
- 库存管理
- **海外仓**（active 高亮）
- 国际送仓
- 退货管理
- 我的钱包

Active 项用金色左边框 `border-left: 3px solid #C9952E`。

### 2.3 页面标题区

```html
<div class="page-header">
  <h1>新建入库增值订单</h1>
  <div class="page-steps">
    <span class="step done">基本信息 ✓</span>
    <span class="step active">增值产品信息</span>
  </div>
  <button class="ai-guide-btn" onclick="openSidebar()">🤖 AI 指引</button>
</div>
```

---

## §3 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏 (Winit 品牌)                                      │
├──────┬──────────────────────────────────────────────────────┤
│ 左侧  │  页面标题 + 步骤条 + AI 指引按钮                       │
│ 菜单  │  ┌─────────────────────────────┐                     │
│      │  │  场景切换 tab                  │                     │
│      │  ├─────────────────┬─────────────┤                     │
│      │  │  表单区域        │  AI 侧栏    │                     │
│      │  │  - 增值服务卡片   │  - 对话区   │                     │
│      │  │  - 表单字段展示   │             │                     │
│      │  └─────────────────┴─────────────┘                     │
│      │  底部说明条                                             │
├──────┴──────────────────────────────────────────────────────┤
└─────────────────────────────────────────────────────────────┘
```

### 3.1 场景切换 tab

在表单区域上方，两个 tab：

```html
<div class="scene-tabs">
  <button class="scene-tab active" onclick="showScene('proactive')">场景 1：AI 主动推荐标准增值</button>
  <button class="scene-tab" onclick="showScene('intercept')">场景 2：误选非标 → AI 拦截纠正</button>
</div>
```

### 3.2 底部说明条

固定底部，随 tab 切换更新：
- 场景 1：`"客户需求可被标准增值覆盖 → AI 主动推荐，免审核、更快处理"`
- 场景 2：`"客户误选非标 → AI 检测后弹窗拦截 → 自动切换到标准增值"`

---

## §4 增值服务卡片区

### 4.1 服务数据（沿用入库段，与线上一致）

```javascript
const ATOM_META = [
  { code: 'direct', name: '直接上架', price: '$0.00', icon: '📦' },
  { code: 'destroy', name: '上架前包裹销毁', price: '$5.00', icon: '🗑️' },
  { code: 'self-pickup-pallet', name: '上架前自提(需WINIT打托)', price: '$0.00', icon: '🚚' },
  { code: 'self-pickup', name: '上架前自提(无需WINIT打托)', price: '$0.00', icon: '📤' },
  { code: 'photo', name: '入库-异常包裹开箱拍照', price: '$1.50', icon: '📷' },
  { code: 'barcode-new', name: '入库-补贴包裹条码', price: '$0.75', icon: '🏷️' },
  { code: 'barcode-replace', name: '入库-更换新商品条码', price: '$0.75', icon: '🔄' },
  { code: 'barcode-original', name: '入库-补贴原商品条码', price: '$0.75', icon: '📋' },
  { code: 'repack', name: '入库-更换商品包装', price: '$2.00', icon: '📦' },
  { code: 'nonstandard', name: '入库其他服务需求', price: '按报价', icon: '⚙️' },
];
```

### 4.2 卡片布局

5 列 grid，每个卡片：图标 + 名称 + 价格。支持三种状态：
- 默认：白底 + 浅边框
- 选中 `.selected`：金色边框 `#C9952E` + 浅金背景 `#FFF8E8` + ✅ 角标
- AI 推荐 `.recommended`：绿色边框 `#52c41a` + "AI 推荐" 紫色标签

### 4.3 场景 1 最终态

"直接上架"卡片为 `.selected` + `.recommended` 状态。

### 4.4 场景 2 初始态

"入库其他服务需求"卡片为 `.selected`，AI 拦截后切为"直接上架" `.selected` + `.recommended`。

---

## §5 表单字段区

### 场景 1/2 最终态：选中"直接上架"后的表单

"直接上架"是标准增值，表单极简（与 V6 一致）：

```html
<div class="form-fields" id="standardFields">
  <div class="field-row">
    <label>增值产品</label>
    <div class="field-value selected">标准增值</div>
  </div>
  <div class="field-row">
    <label>增值服务</label>
    <div class="field-value selected">直接上架</div>
  </div>
  <div class="field-row">
    <label>价格</label>
    <div class="field-value">$0.00 / 件</div>
  </div>
  <div class="info-tip">
    💡 标准增值服务免审核，提交后仓库直接按标准流程处理。
  </div>
</div>
```

### 场景 2 初始态：选中"入库其他服务需求"后的表单

```html
<div class="form-fields" id="nonstandardFields">
  <div class="field-row">
    <label>增值产品</label>
    <div class="field-value selected">入库非标增值（特批）</div>
  </div>
  <div class="field-row">
    <label>增值服务</label>
    <div class="field-value selected">入库其他服务需求</div>
  </div>
  <div class="field-row">
    <label>需求背景说明</label>
    <textarea disabled placeholder="需描述为什么需要该增值服务..."></textarea>
  </div>
  <div class="field-row">
    <label>需求描述 *</label>
    <textarea disabled placeholder="需描述具体操作要求..."></textarea>
  </div>
  <div class="info-tip warn">
    ⚠️ 非标特批需要审核，处理周期 3-5 个工作日。
  </div>
</div>
```

---

## §6 AI 侧栏

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

Push 模式并排（flex），width 380px。对话区背景渐变 `#fff` → `#f9f8f5`。

### 气泡样式

- AI 气泡：左对齐，浅灰 `#f5f5f5`，圆角 12px
- 客户气泡：右对齐，浅金 `#FFF8E8`，圆角 12px
- 系统动作卡片：居中，虚线边框，浅绿背景 `#f6ffed`

---

## §7 场景 1：AI 主动推荐标准增值

### 入口

页面加载 → 侧栏默认打开 → 自动播放对话。
此场景下左侧卡片无任何初始选中态（客户是点"AI 指引"按钮进来的）。

### 对话内容（3 条消息 + DOM 动作）

```javascript
const SCENE_PROACTIVE = [
  {
    role: 'assistant',
    text: '您好，请告诉我您想如何处理这批货物，我来帮您选择增值服务并生成操作说明。'
  },
  {
    role: 'user',
    text: '帮我把到货的那批直接上架就行'
  },
  {
    role: 'assistant',
    text: '您描述的需求是将到货商品直接上架。\n\n这个操作可以使用标准增值服务【直接上架】覆盖，无需走非标特批流程。标准增值免审核、处理更快。\n\n已帮您选中：\n· 增值产品：标准增值\n· 增值服务：直接上架\n· 费用：$0.00/件\n\n请确认后直接提交即可。'
  }
];
```

### 最后一条消息显示后的 DOM 动作

1. "直接上架"卡片高亮（`.selected` + `.recommended` + "AI 推荐"标签）
2. 表单切换为标准增值字段（`#standardFields` 显示）
3. 对话区追加系统动作卡片：

```html
<div class="action-card">
  ✅ 已选中：标准增值 → 直接上架（免审核·$0.00/件）
</div>
```

---

## §8 场景 2：误选非标 → AI 拦截纠正

### 入口

页面加载 → "入库其他服务需求"卡片预选中 → 侧栏强制弹出 → 自动播放对话。

### 对话内容（3 条消息 + 拦截弹窗）

```javascript
const SCENE_INTERCEPT = [
  {
    role: 'assistant',
    text: '您选择了非标特批服务，请先描述您的具体需求，我来帮您评估并生成 SOP。'
  },
  {
    role: 'user',
    text: '帮我把到货的那批直接上架就行'
  },
  {
    role: 'assistant',
    text: '您描述的需求是将到货商品直接上架，这个操作可以使用标准增值服务【直接上架】覆盖，无需走非标特批流程。\n\n标准增值服务免审核、处理更快，建议您直接使用。'
  }
];
```

### 第 3 条消息显示后的 DOM 动作

延迟 500ms 弹出拦截模态框：

```html
<div class="modal-overlay" id="interceptModal">
  <div class="modal-box">
    <div class="modal-header" style="background:#fff7e6;border-bottom:1px solid #ffe58f;">
      ⚠️ AI 建议：使用标准增值服务
    </div>
    <div class="modal-body">
      <p>AI 检测到您的需求可以使用标准增值服务覆盖：</p>
      <div class="recommend-card">
        <strong>直接上架</strong>
        <span class="tag-standard">标准增值 · 免审核 · $0.00/件 · 更快处理</span>
      </div>
      <p style="color:#666;font-size:13px;margin-top:12px;">
        非标特批流程需要审核（3-5 个工作日），如果标准服务能满足需求，建议优先选择。
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn-primary" onclick="useStandard()">确认，切换到标准增值</button>
      <button class="btn-secondary" onclick="keepNonstandard()">我确实需要非标</button>
    </div>
  </div>
</div>
```

### 点击"确认，切换到标准增值"

1. 关闭模态框
2. "入库其他服务需求"卡片取消选中
3. "直接上架"卡片高亮（`.selected` + `.recommended`）
4. 表单从非标字段切为标准字段
5. 对话区追加系统动作卡片：

```html
<div class="action-card">
  ↩️ 已切换：标准增值 → 直接上架（免审核）
</div>
```

### 点击"我确实需要非标"

1. 关闭模态框
2. "入库其他服务需求"保持选中
3. 表单保持非标字段
4. 对话区追加 AI 消息：

```
好的，如果您确认需要走非标流程，请继续描述具体操作要求，我来帮您生成 SOP。
```

---

## §9 样式要求

| # | 要求 |
|---|------|
| 1 | 所有 CSS/JS 内联，单文件自包含，不引用第三方库 |
| 2 | 主色系：Winit 金棕 `#A0792A` 主色 / `#C9952E` 高亮 / `#6B4F0A` 深色 / `#FFF8E8` 浅底 |
| 3 | 辅助色：成功 `#52c41a`，警告 `#faad14`，信息 `#1890ff` |
| 4 | 字体：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| 5 | 顶部导航栏金色渐变 48px |
| 6 | 左侧菜单栏 72px 深棕色 |
| 7 | 服务卡片 5 列 grid，间距 12px |
| 8 | 场景 tab 切换时 300ms fade 过渡 |
| 9 | 对话气泡逐条 slideUp 动画，每条间隔 800ms |
| 10 | 服务卡片被选中时 0.3s 边框高亮动画 |
| 11 | 模态框半透明遮罩 + 居中弹出 scaleIn 动画 |
| 12 | 移动端 < 768px：隐藏左菜单，左右改上下 |
| 13 | 页面标题：`AI 增值指引 — 帮客户选对服务` |

---

## §10 自动播放逻辑

```javascript
function showScene(sceneId) {
  // 1. 切换 tab 高亮
  // 2. 重置：卡片选中态 + 表单字段 + 对话区 + 隐藏模态框
  // 3. 场景 2 时预选中"入库其他服务需求"卡片
  // 4. 更新底部说明条
  // 5. 逐条播放对话（每条间隔 800ms）
  // 6. 最后一条播放完后执行 DOM 动作
  // 7. 播放期间 tab 按钮 disabled
}
```

页面加载后默认展示场景 1。

---

## §11 约束

- 产出 1 个文件：`prototypes/Demo1_AI帮选服务.html`
- 单文件自包含，所有 CSS/JS 内联
- 不改其他文件
- 以本 prompt 为准
- 如有歧义标记 `[AMBIGUITY]`

## §12 Git 规范

- commit message：`feat(prototype): Demo1 - AI帮选服务（推荐标准增值+误选非标拦截）`
- push 到 main 分支
