## §0 角色与仓库

你是执行者（Codex），负责产出一个独立的 HTML 原型文件。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/Demo3_提交拦截.html`

---

## §1 总体目标

产出一个独立、自包含的 HTML 原型，演示 **提交前智能校验（校验 B）：描述清晰度 + 附件完整性两个维度独立判断**。

场景：客户没用 AI 对话，自己手动填表后点提交，AI 在后台做质量校验。三个 tab 展示三种不同结果。

打开即能看懂，不需要操作指南。

**核心信息传达**：就算客户不用 AI 对话，提交质量也有保底。会填的不强制对话，填不好的被拦住。

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
</div>
```

---

## §3 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  顶部导航栏 (Winit 品牌)                                      │
├──────┬──────────────────────────────────────────────────────┤
│ 左侧  │  页面标题 + 步骤条                                    │
│ 菜单  │  结果切换 tab                                         │
│      │  ┌──────────────────────────────────────────────────┐ │
│      │  │  表单区域（居中 720px，已填状态）                    │ │
│      │  │  - 增值产品 / 增值服务（固定选中）                   │ │
│      │  │  - 需求背景说明（根据 tab 切换内容）                 │ │
│      │  │  - 需求描述（根据 tab 切换内容）                    │ │
│      │  │  - 增值文件上传区（根据 tab 切换状态）               │ │
│      │  │  - [提交增值单] 按钮                                │ │
│      │  │                                                    │ │
│      │  │  校验结果卡片（点提交后出现）                         │ │
│      │  └──────────────────────────────────────────────────┘ │
│      │  对比表（始终可见）                                      │
│      │  底部说明条                                             │
├──────┴──────────────────────────────────────────────────────┤
│  AI 侧栏（仅结果 2 弹出，右侧 slide in）                       │
└─────────────────────────────────────────────────────────────┘
```

---

## §4 结果切换 tab

```html
<div class="scene-tabs">
  <button class="scene-tab active" onclick="showResult('pass')">结果 1：通过 ✅</button>
  <button class="scene-tab" onclick="showResult('unclear')">结果 2：描述不清 ❌</button>
  <button class="scene-tab" onclick="showResult('missing')">结果 3：附件缺失 ⚠️</button>
</div>
```

切换 tab 时：更新表单填充内容 + 重置校验结果区 + 关闭侧栏 + 恢复提交按钮。

---

## §5 表单区域

### 5.1 固定内容（三个 tab 共用）

```html
<div class="form-section">
  <label>增值产品</label>
  <div class="select-box selected">入库非标增值（特批）</div>
</div>
<div class="form-section">
  <label>增值服务</label>
  <div class="service-card selected">入库其他服务需求</div>
</div>
```

### 5.2 需求背景说明

| Tab | 内容 | 视觉状态 |
|-----|------|---------|
| 结果 1（通过） | 完整清晰描述（见 §8） | 正常态 |
| 结果 2（描述不清） | "帮我处理下库里那批货" | 正常态 → 提交后标红 |
| 结果 3（附件缺失） | 完整清晰描述（同结果 1） | 正常态 |

### 5.3 需求描述

| Tab | 内容 | 视觉状态 |
|-----|------|---------|
| 结果 1（通过） | 完整规范描述（见 §8） | 正常态 |
| 结果 2（描述不清） | "帮我把那批货转一下不良品" | 正常态 → 提交后标红 |
| 结果 3（附件缺失） | 完整规范描述（同结果 1） | 正常态 |

### 5.4 增值文件上传区

```html
<div class="form-section" id="vasFilesSection">
  <label>增值文件</label>
  <div class="upload-item" id="upload1">
    <span class="upload-icon">📎</span>
    <div class="upload-info">
      <span class="upload-name">操作说明附件 <span class="required">*</span></span>
      <span class="upload-format">支持 .DOC / .DOCX / .PDF / .XLS / .XLSX</span>
    </div>
    <span class="upload-status" id="upload1Status"></span>
  </div>
  <div class="upload-item" id="upload2">
    <span class="upload-icon">📎</span>
    <div class="upload-info">
      <span class="upload-name">商品和标签的对应关系 <span class="required">*</span></span>
      <span class="upload-format">支持 .XLS / .XLSX</span>
    </div>
    <span class="upload-status" id="upload2Status"></span>
  </div>
  <div class="upload-item" id="upload3">
    <span class="upload-icon">📎</span>
    <div class="upload-info">
      <span class="upload-name">标签文件 <span class="required">*</span></span>
      <span class="upload-format">支持 .7Z / .JPEG / .JPG / .PDF / .PNG / .RAR / .ZIP</span>
    </div>
    <span class="upload-status" id="upload3Status"></span>
  </div>
</div>
```

上传状态根据 tab 切换：

| Tab | upload1 | upload2 | upload3 |
|-----|---------|---------|---------|
| 结果 1 | ✅ 操作说明.docx | ✅ SKU对应关系.xlsx | ✅ 标签文件.zip |
| 结果 2 | ✅ 操作说明.docx | ✅ SKU对应关系.xlsx | ✅ 标签文件.zip |
| 结果 3 | 未上传 | 未上传 | 未上传 |

已上传态：绿色文字 + 文件名显示。未上传态：灰色"未上传"。

### 5.5 提交按钮

```html
<div class="form-footer">
  <button class="submit-btn" id="submitBtn" onclick="handleSubmit()">提交增值单</button>
</div>
```

---

## §6 校验逻辑（给 Codex 理解判定规则）

### isDescriptionClear() 判定规则

```javascript
function isDescriptionClear(bgText, descText) {
  const combined = bgText + descText;
  const hasSku = /SKU[-\w]*/i.test(combined);
  const hasQuantity = /\d+\s*件/.test(combined);
  const hasOrderNo = /(WI|WO)\w{5,}/.test(combined);
  const hasLength = combined.length > 80;
  // 至少满足 SKU + 数量 + 长度，或 SKU + 单据号 + 长度
  return hasLength && hasSku && (hasQuantity || hasOrderNo);
}
```

### isAttachmentComplete() 判定规则

```javascript
function isAttachmentComplete() {
  // 3 个必传文件全部已上传
  return upload1Uploaded && upload2Uploaded && upload3Uploaded;
}
```

### 组合判定

```javascript
function handleSubmit() {
  const descClear = isDescriptionClear(bgText, descText);
  const attachOk = isAttachmentComplete();
  
  if (descClear && attachOk) → 结果 1：通过
  if (!descClear && attachOk) → 结果 2：描述不清，强制弹侧栏
  if (descClear && !attachOk) → 结果 3：附件缺失，标红上传区
  if (!descClear && !attachOk) → 结果 2+3 组合：弹侧栏 + 标红
}
```

---

## §7 校验结果展示

点击"提交增值单"后，按钮变为 loading 态 1s，然后展示对应结果。

### 7.1 结果 1：通过 ✅

表单下方出现绿色结果卡片：

```html
<div class="validation-result pass">
  <div class="result-header">📋 提交前智能校验</div>
  <div class="result-body">
    <div class="check-item pass">✅ 增值产品：已选择</div>
    <div class="check-item pass">✅ 增值服务：已选择</div>
    <div class="check-item pass">✅ 需求描述清晰度：通过 — 包含 SKU、数量、单据号、具体操作要求</div>
    <div class="check-item pass">✅ 附件完整性：通过 — 3/3 已上传</div>
  </div>
  <div class="result-footer">
    <div class="result-summary pass">🎉 校验全部通过，增值单已提交成功！</div>
  </div>
</div>
```

顶部绿色 toast："✅ 增值单提交成功！"

**说明文字**：

```html
<div class="key-point">
  💡 客户没有和 AI 对话，但自己填写得足够清晰、附件完整 → 直接通过，不强制对话。
</div>
```

### 7.2 结果 2：描述不清 ❌

```html
<div class="validation-result fail">
  <div class="result-header">📋 提交前智能校验</div>
  <div class="result-body">
    <div class="check-item pass">✅ 增值产品：已选择</div>
    <div class="check-item pass">✅ 增值服务：已选择</div>
    <div class="check-item fail">
      ❌ 需求描述清晰度：不通过<br>
      <span class="fail-detail">缺少关键信息：SKU 编号、处理数量、关联单据号（WI/WO开头）。描述总长度不足 80 字。</span>
    </div>
    <div class="check-item pass">✅ 附件完整性：通过 — 3/3 已上传</div>
  </div>
  <div class="result-footer">
    <button class="btn-primary" onclick="showSidebarForce()">与 AI 对话补充信息</button>
  </div>
</div>
```

同时：需求背景说明和需求描述的 textarea 标红边框 + shake 动画。

点击按钮后 AI 侧栏 slide in，AI 代发消息：

```
您的需求描述信息不够完整，无法直接提交。请补充以下关键信息：
1. 具体 SKU 编号（如 SKU-XX-12345678）
2. 处理数量（X 件）
3. 关联单据号（入库单 WI... / 出库单 WO...）
4. 具体操作要求（仓库需要做什么）

补充完整后我帮您重新整理并回填。
```

**说明文字**：

```html
<div class="key-point">
  💡 描述不清晰 → 强制打开 AI 侧栏，客户必须补充信息后才能再次提交。不是红框提示，是拉回 AI 对话。
</div>
```

### 7.3 结果 3：附件缺失 ⚠️

```html
<div class="validation-result warn">
  <div class="result-header">📋 提交前智能校验</div>
  <div class="result-body">
    <div class="check-item pass">✅ 增值产品：已选择</div>
    <div class="check-item pass">✅ 增值服务：已选择</div>
    <div class="check-item pass">✅ 需求描述清晰度：通过 — 包含 SKU、数量、单据号、具体操作要求</div>
    <div class="check-item warn">
      ⚠️ 附件完整性：未通过<br>
      <span class="warn-detail">缺少：操作说明附件、商品和标签的对应关系、标签文件（共 3 项未上传）</span>
    </div>
  </div>
  <div class="result-footer">
    <div class="result-summary warn">请上传缺失附件后重新提交</div>
  </div>
</div>
```

同时：
1. 3 个上传项标红边框 + 状态变为 `❌ 必须上传` 红色文字 + shake 动画
2. 页面自动滚动到文件上传区
3. **不弹出 AI 侧栏**

每个上传项标红后的 per-item 错误提示：

```html
<span class="upload-error">❌ 必须上传 — 操作说明附件</span>
<span class="upload-error">❌ 必须上传 — 商品和标签的对应关系</span>
<span class="upload-error">❌ 必须上传 — 标签文件</span>
```

**说明文字**：

```html
<div class="key-point">
  💡 附件缺失 → 只标红提示，不强制 AI 对话。客户自己补传即可，不需要和 AI 聊。
</div>
```

---

## §8 填充内容

### 结果 1 & 3 的完整需求背景说明

```
客户有一批老货当前存放在 DEBR2 Warehouse，SKU 绑定了第三方条码。后续会有一批亚马逊退仓新货入库，新货使用同一个三方条码，系统里无法用同一个三方条码同时区分两批 SKU。客户希望先把当前在库老货从良品库存转为不良品库存存放，主要是为了区分老货和新退仓货，不是因为商品实际破损。
```

### 结果 1 & 3 的完整需求描述

```
操作需求：良品转不良品上架

仓库：DEBR2 Warehouse
SKU/数量：SKU-DE-15908221，86 件
新入库单：WI51339338
下架出库单：WO12120399145
转不良品原因：用于区分当前在库老货与后续同三方条码的亚马逊退仓新货

具体要求：
1. 按出库单 WO12120399145 将当前在库老货下架
2. 核对 SKU、数量、三方条码，确认一致
3. 按入库单 WI51339338 重新入库处理
4. 补贴包裹标签
5. 按不良品属性上架至不良品库位
6. 上架完成后反馈处理数量及库位信息
```

### 结果 2 的模糊内容

需求背景说明：`帮我处理下库里那批货`
需求描述：`帮我把那批货转一下不良品`

---

## §9 AI 侧栏（仅结果 2 使用）

```html
<div class="ai-sidebar" id="aiSidebar">
  <div class="sidebar-header">
    <span>AI 增值指引</span>
    <button class="close-btn" onclick="closeSidebar()">✕</button>
  </div>
  <div class="chat-area" id="chatArea"></div>
  <div class="chat-input">
    <input type="text" placeholder="补充您的需求信息..." />
    <button>发送</button>
  </div>
</div>
```

- 默认隐藏（`transform: translateX(100%)`）
- 结果 2 点击按钮后 slide in（`transform: translateX(0)`，transition 300ms ease）
- width 380px，position fixed 右侧，top 48px（避开顶部导航）
- 表单区域不位移（侧栏是 overlay 在右侧）

---

## §10 对比表（始终可见）

校验结果展示区下方，固定显示：

```html
<div class="comparison-table">
  <h3>校验 B 逻辑：两个维度独立判断</h3>
  <table>
    <thead>
      <tr>
        <th>描述清晰度</th>
        <th>附件完整性</th>
        <th>结果</th>
        <th>处理方式</th>
      </tr>
    </thead>
    <tbody>
      <tr class="row-pass" id="compareRow1">
        <td>✅ 清晰（含SKU+数量/单据号，>80字）</td>
        <td>✅ 完整（3/3）</td>
        <td>直接提交成功</td>
        <td>无需 AI 对话</td>
      </tr>
      <tr class="row-fail" id="compareRow2">
        <td>❌ 不清晰（缺SKU/数量/单据号，或<80字）</td>
        <td>✅ 完整</td>
        <td>拦截</td>
        <td>强制弹 AI 侧栏补充</td>
      </tr>
      <tr class="row-warn" id="compareRow3">
        <td>✅ 清晰</td>
        <td>⚠️ 缺失</td>
        <td>拦截</td>
        <td>红框标注，客户自传</td>
      </tr>
      <tr class="row-fail" id="compareRow4">
        <td>❌ 不清晰</td>
        <td>⚠️ 缺失</td>
        <td>拦截</td>
        <td>弹侧栏 + 红框（双重）</td>
      </tr>
    </tbody>
  </table>
</div>
```

当前 tab 对应的行高亮（金色左边框 + 浅金背景）：
- 结果 1 → compareRow1 高亮
- 结果 2 → compareRow2 高亮
- 结果 3 → compareRow3 高亮

---

## §11 底部说明条

固定底部：`"校验 B：提交时 AI 校验两个维度（描述清晰度 + 附件完整性），独立判断，独立处理"`

---

## §12 样式要求

| # | 要求 |
|---|------|
| 1 | 所有 CSS/JS 内联，单文件自包含 |
| 2 | 主色系：Winit 金棕 `#A0792A` 主色 / `#C9952E` 高亮 / `#6B4F0A` 深色 / `#FFF8E8` 浅底 |
| 3 | 校验色：通过 `#52c41a`（绿），不通过 `#ff4d4f`（红），警告 `#faad14`（橙） |
| 4 | 字体：`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| 5 | 顶部导航栏金色渐变 48px |
| 6 | 左侧菜单栏 72px 深棕色 |
| 7 | 表单居中 max-width 720px |
| 8 | 校验结果卡片 slideDown 出现动画 |
| 9 | 标红 textarea 和上传项 shake 动画（`translateX` 抖动 2 次） |
| 10 | toast 顶部 slideDown + 3s fadeOut |
| 11 | 侧栏从右侧 slideIn（300ms ease），overlay 模式 |
| 12 | 对比表 zebra 行 + 当前 tab 行金色高亮 |
| 13 | 移动端 < 768px：隐藏左菜单，侧栏变全屏 overlay |
| 14 | 页面标题：`AI 增值指引 — 提交前智能校验` |

---

## §13 约束

- 产出 1 个文件：`prototypes/Demo3_提交拦截.html`
- 单文件自包含，所有 CSS/JS 内联
- 不改其他文件
- 以本 prompt 为准
- 如有歧义标记 `[AMBIGUITY]`

## §14 Git 规范

- commit message：`feat(prototype): Demo3 - 提交前智能校验（描述清晰度+附件完整性）`
- push 到 main 分支
