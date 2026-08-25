## 任务

在 `prototypes/B_侧边栏真实体验版.html` 中完善提交校验逻辑，使"客户不用AI对话、自己填写清楚也能通过提交"这个路径可验证。

## 前置阅读

- 当前 `prototypes/B_侧边栏真实体验版.html`

## 问题

当前提交校验无法区分"客户填得清楚"和"客户填得模糊"，导致无法验证"不用AI也能过"的路径。

## 改动

### 1. 新增描述清晰度判定函数

```javascript
function isDescriptionClear() {
  const desc = (document.getElementById('requirementDescription') || {}).value || '';
  const bg = (document.getElementById('requirementBackground') || {}).value || '';
  
  // 两个字段都必须有内容
  if (!desc.trim() || !bg.trim()) return false;
  
  // 检测是否包含关键要素（至少命中 3 项才算清晰）
  const checks = [
    /SKU|sku|商品编码|产品编码|货物/.test(desc),     // 有提到处理对象
    /\d+\s*(件|个|pcs|箱|PCS)/.test(desc),           // 有数量
    /WI|WO|IH|RT|EB|单号|入库单|出库单/.test(desc),  // 有单据号
    desc.length >= 50,                                 // 描述够长（不是一句话）
    /步骤|操作|要求|需要|处理|上架|下架|贴标|换标|销毁|拍照/.test(desc), // 有操作意图
  ];
  
  const score = checks.filter(Boolean).length;
  return score >= 3; // 命中 3 项以上 = 清晰
}
```

### 2. 新增附件上传状态检测函数

```javascript
function checkAttachmentsUploaded() {
  // 检测附件区是否有"已上传"状态
  // 真实体验版中，模拟方式：附件上传按钮被点击后标记为已上传
  const uploadItems = document.querySelectorAll('.upload-item');
  if (uploadItems.length === 0) return true; // 没有附件区则不校验
  
  const allUploaded = Array.from(uploadItems).every(item => item.classList.contains('uploaded'));
  return allUploaded;
}
```

### 3. 附件上传按钮点击模拟"已上传"

给每个 `.upload-btn` 加点击事件，点击后标记该附件项为"已上传"状态：

```javascript
document.querySelectorAll('.upload-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const item = this.closest('.upload-item');
    if (item) {
      item.classList.add('uploaded');
      item.classList.remove('error');
      // 按钮文字改为已上传状态
      this.innerHTML = '<span style="color:#52c41a;">✅ 已上传</span>';
      // 清除错误提示
      const errorTip = item.querySelector('.upload-error-tip');
      if (errorTip) errorTip.textContent = '';
    }
  });
});
```

样式：
```css
.upload-item.uploaded { border-color: #52c41a; background: #f6ffed; }
.upload-item.uploaded .upload-btn { border-color: #52c41a; cursor: default; }
```

### 4. 提交按钮逻辑改为智能校验

替换现有的提交按钮事件为：

```javascript
document.getElementById('submitBtn').addEventListener('click', function() {
  const clear = isDescriptionClear();
  const attachmentsOk = checkAttachmentsUploaded();
  
  if (clear && attachmentsOk) {
    // ✅ 两项都通过 → 直接提交成功
    showToast('✅ 增值单提交成功！描述清晰且附件完整，无需 AI 对话也可提交', 4000);
  } else if (!clear && !attachmentsOk) {
    // ❌ 两项都不通过 → 弹描述不清晰校验（优先处理描述问题）+ 附件标红
    showValidationB_unclear();
    markUploadErrors();
  } else if (!clear) {
    // ❌ 描述不清晰 → 强制弹侧栏追问
    showValidationB_unclear();
  } else if (!attachmentsOk) {
    // ❌ 只有附件缺失 → 弹附件校验 + 标红
    showValidationB_attachment();
  }
});
```

### 5. showValidationB_unclear() — 描述不清晰校验弹窗

```html
<div class="validation-modal" id="validationModalB_unclear">
  <div class="validation-box">
    <div class="validation-header" style="background:linear-gradient(135deg,#1677ff,#4096ff);color:#fff;">
      📋 提交前智能校验
    </div>
    <div class="validation-body">
      <div class="validation-item" style="border-color:#ff4d4f;background:#fff2f0;color:#a8071a;">
        ❌ 需求描述清晰度：不通过<br>
        <span style="font-size:12px;">描述中缺少关键信息（需包含：SKU/商品编码、数量、单据号、具体操作要求），请与 AI 对话补充完善。</span>
      </div>
    </div>
    <div class="validation-footer">
      <button class="validation-btn-ok" onclick="closeValidationB_unclear()">与 AI 对话补充</button>
    </div>
  </div>
</div>
```

```javascript
function showValidationB_unclear() {
  document.getElementById('validationModalB_unclear').classList.add('show');
}

function closeValidationB_unclear() {
  document.getElementById('validationModalB_unclear').classList.remove('show');
  // 强制打开 AI 侧栏
  const sidebar = document.getElementById('aiSidebar');
  if (sidebar && !sidebar.classList.contains('open')) {
    sidebar.classList.add('open');
  }
  // AI 追问
  appendAiBubble('assistant', '您的需求描述信息不够完整，请补充以下关键信息：\n1. 具体 SKU 编号\n2. 处理数量\n3. 关联单据号\n4. 具体操作要求\n\n补充后我帮您生成规范的操作说明。');
}
```

### 6. showValidationB_attachment() — 附件校验弹窗

```html
<div class="validation-modal" id="validationModalB_attachment">
  <div class="validation-box">
    <div class="validation-header" style="background:linear-gradient(135deg,#1677ff,#4096ff);color:#fff;">
      📋 提交前智能校验
    </div>
    <div class="validation-body">
      <div class="validation-item" style="border-color:#52c41a;background:#f6ffed;color:#237804;">
        ✅ 需求描述清晰度：通过
      </div>
      <div class="validation-item" style="border-color:#ffe58f;background:#fffbe6;color:#ad6800;">
        ⚠️ 附件完整性：未上传<br>
        <span style="font-size:12px;">操作说明附件、商品标签对应关系、标签文件未上传完整。</span>
      </div>
    </div>
    <div class="validation-footer">
      <button class="validation-btn-cancel" onclick="closeValidationB_attachment()">返回补充附件</button>
    </div>
  </div>
</div>
```

```javascript
function showValidationB_attachment() {
  document.getElementById('validationModalB_attachment').classList.add('show');
}

function closeValidationB_attachment() {
  document.getElementById('validationModalB_attachment').classList.remove('show');
  markUploadErrors();
  const filesSection = document.getElementById('vasFilesSection');
  if (filesSection) filesSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
```

## 业务方验证路径说明

在页面底部或侧栏关闭时，加一个小提示条（仅提示，不影响交互）：

```html
<div class="verify-hint" style="position:fixed;bottom:40px;right:20px;background:#e6f7ff;border:1px solid #91d5ff;border-radius:6px;padding:8px 12px;font-size:11px;color:#0050b3;max-width:280px;z-index:50;">
  💡 验证提示：关闭侧栏后手动填写需求描述（含SKU+数量+单据号+操作要求，≥50字），上传附件后点提交可直接成功
</div>
```

## 约束

- 只修改 `prototypes/B_侧边栏真实体验版.html`
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## Git

- commit: `feat(prototype): add description clarity check + manual-fill-pass path`
- push main
- 如果 push 失败，直接输出文件完整内容
