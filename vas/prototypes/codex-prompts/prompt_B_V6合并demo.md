## §0 角色与仓库

你是执行者（Codex），负责合并产出一个完整的演示原型 HTML。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/B_侧边栏演示_V6版.html`

## §1 任务

基于 V6 底座页面，合并 AI 侧边栏（push 模式），产出可本地打开的演示原型。

## §2 前置阅读

- `tmp/ai-drafts/demo-vas-order-page-v6(9).html`：V6 底座页面（两步版）
- `prototypes/B_侧边栏演示_原始页面版.html`：现有侧边栏演示（参考 AI 对话逻辑、演示控制台、审核模态框）
- `prototypes/demo-content/库内良品转不良品-演示对话.md`：演示对话内容

## §3 核心要求

### 3.1 底座页面（V6）

将 `demo-vas-order-page-v6(9).html` 的完整内容作为底座。在此基础上做以下补充：

#### 补充表单字段

当前 V6 的"入库其他服务需求"只有一个"服务描述"字段。需要改为：

```html
<!-- 替换原来的"服务描述"单字段 -->
<div class="form-group">
  <label>需求背景说明 <span class="req">*</span></label>
  <textarea id="requirementBackground" placeholder="请描述您的需求背景（客户端提交后审核人员将看到此内容）" rows="3"></textarea>
</div>
<div class="form-group">
  <label>需求描述 <span class="req">*</span></label>
  <textarea id="requirementDescription" placeholder="请描述具体操作要求（越详细越好，减少审核退回）" rows="5"></textarea>
</div>
```

样式与 V6 现有 textarea 保持一致（`.order-input-box textarea` 的样式）。

### 3.2 AI 侧边栏（Push 模式，非 Overlay）

**关键：不是浮层覆盖，是并排挤压。**

#### 布局结构

```html
<div class="layout">
  <div class="sidebar">...</div>          <!-- 左侧菜单，不变 -->
  <div class="main" id="mainContent">     <!-- 主内容区，宽度随侧栏状态变化 -->
    <div class="page-header">...</div>
    <div class="body-wrap">...</div>
    <div class="page-footer">...</div>
  </div>
  <aside class="ai-sidebar" id="aiSidebar"> <!-- AI 侧栏，push 模式 -->
    <!-- 侧栏内容 -->
  </aside>
</div>
```

#### CSS（Push 模式核心）

```css
.layout {
  display: flex;
  min-height: calc(100vh - 50px); /* 减去顶栏高度 */
}

.main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  transition: flex-basis 0.3s ease;
}

.ai-sidebar {
  width: 0;
  overflow: hidden;
  transition: width 0.3s ease;
  border-left: 0 solid #e0e0e0;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.ai-sidebar.open {
  width: 380px;
  border-left-width: 1px;
}
```

**关键约束**：
- **不用** `position: fixed/absolute`
- **不用** `z-index` 覆盖
- 侧栏是 flex 布局中 `.main` 的同级兄弟
- 打开侧栏 = `.ai-sidebar` width 从 0 → 380px，`.main` 自动被挤窄
- 关闭侧栏 = `.ai-sidebar` width 从 380px → 0，`.main` 恢复满宽

#### 页面滚动

- **页面级滚动**（body 或 `.layout` 滚动），不是 `.main` 和 `.ai-sidebar` 各自独立滚动
- 去掉 V6 原有的 `.page-body { overflow-y: auto }` 和 `.body-wrap { overflow: hidden }`
- 侧栏内的对话区可以有独立滚动（`.ai-chat-area { overflow-y: auto; max-height: calc(100vh - 200px) }`）

### 3.3 侧栏内部结构

```html
<aside class="ai-sidebar" id="aiSidebar">
  <!-- 标题栏 -->
  <div class="ai-sidebar-header">
    <div class="ai-sidebar-title">
      <svg ...><!-- AI icon --></svg>
      <span>AI 增值指引</span>
    </div>
    <div class="ai-sidebar-actions">
      <label class="pref-label"><input type="checkbox" id="prefCheckbox"> 不自动弹出</label>
      <button class="ai-sidebar-close" onclick="toggleAiSidebar()">×</button>
    </div>
  </div>

  <!-- 对话区（侧栏内可独立滚动） -->
  <div class="ai-chat-area" id="aiChatArea">
    <!-- 对话气泡 -->
  </div>

  <!-- 底部输入区 -->
  <div class="ai-sidebar-footer">
    <div class="ai-input-box">
      <textarea id="aiUserInput" placeholder="描述您的增值需求..."></textarea>
      <button class="ai-send-btn" onclick="sendMessage()">发送</button>
    </div>
  </div>
</aside>
```

#### 侧栏样式

- 标题栏：高 48px，白底，底部 border
- 对话区：`background: linear-gradient(180deg, #fff 0%, #f3f2ff 100%)`（紫色渐变）
- AI 气泡：白色 + `border: 1px solid #f0f0f0` + `border-radius: 8px 8px 8px 0`
- 用户气泡：紫色渐变 `background: linear-gradient(270deg, #f1e6ff, #dde0ff)` + `border-radius: 8px 8px 0 8px`
- 底部输入区：白底，`border-top: 1px solid #f0f0f0`

### 3.4 触发按钮

在 V6 页面主内容区的适当位置（如页面标题旁或表单区顶部），加一个触发按钮：

```html
<button class="ai-guide-btn" onclick="toggleAiSidebar()">🤖 AI 指引</button>
```

### 3.5 演示控制台

参考 `B_侧边栏演示_原始页面版.html` 的演示控制台，在页面最顶部加固定横条：

```html
<div class="demo-console">
  <span class="demo-console-title">🎬 原型演示控制台（仅开发/评审可见）</span>
  <div class="demo-console-actions">
    <button onclick="runDemo()">演示：非标特批场景（良品转不良品）</button>
    <button onclick="fillForm()">模拟：一键填入表单</button>
    <button onclick="openAuditModal()">模拟：审核视角</button>
    <button onclick="resetDemo()">重置</button>
  </div>
</div>
```

body 加 `padding-top: 44px` 给控制台腾空间。

### 3.6 演示逻辑（JS）

从 `B_侧边栏演示_原始页面版.html` 复制以下逻辑：

- `DEMO_DIALOG` 数组（良品转不良品的 5 轮对话）
- `FORM_VALUES` 对象（填入的产品/服务/背景/描述内容）
- `runDemo()`：打开侧栏 + 逐条注入对话气泡（每条 1.5s 间隔）
- `fillForm()`：选中增值产品/增值服务 + 填入 textarea + 高亮
- `openAuditModal()`：弹出审核模态框
- `resetDemo()`：清除注入的气泡 + 清空表单

**区别**：不再用 `getIframeDoc()`（没有 iframe 了），直接操作 `document`。

### 3.7 审核模态框

从 `B_侧边栏演示_原始页面版.html` 复制审核模态框 HTML（场景概述=良品转不良品，SOP=中英双语）。

### 3.8 一键填入的目标

```javascript
const FORM_VALUES = {
  product: '入库非标增值（特批）',   // 或 '库内非标增值（特批）'，以 V6 页面实际选项为准
  service: '入库其他服务需求',       // 以 V6 页面实际选项为准
  background: '客户有一批在库商品...',  // 来自 demo-content
  description: '操作需求：良品转不良品上架...'  // 来自 demo-content
};
```

填入时：
- product/service：在 V6 的选择流程中找到对应选项并触发选中
- requirementBackground：填入新增的 `#requirementBackground` textarea
- requirementDescription：填入新增的 `#requirementDescription` textarea
- 填入后字段高亮 `outline: 3px solid #52c41a; background: #f6ffed`

## §4 约束

- **产出一个文件**：`prototypes/B_侧边栏演示_V6版.html`
- 单 HTML 文件，所有 CSS/JS 内联
- 不修改 V6 底座原文件
- 不使用 iframe
- 侧栏必须是 **push 模式**（并排，非浮层）
- 页面使用**页面级滚动**，不使用局部 overflow-y: auto（侧栏对话区除外）
- 如有歧义标记 `[AMBIGUITY]`

## §5 Git 规范

- commit message：`feat(prototype): merge V6 base + AI push-sidebar demo (良品转不良品)`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
