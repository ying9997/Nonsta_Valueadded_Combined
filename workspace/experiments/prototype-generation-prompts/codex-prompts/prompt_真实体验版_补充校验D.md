## 任务

在 `prototypes/B_侧边栏真实体验版.html` 中补充"标准增值可替代性校验（校验 D）"。

## 前置阅读

- 当前 `prototypes/B_侧边栏真实体验版.html`：已有 a/b/c 三项校验
- `prototypes/B_侧边栏演示_V6版.html`：参考其中 showValidationA / closeValidationA_useStandard 的实现

## 需要补充的校验 D 逻辑

### 触发时机

客户选中"入库其他服务需求"后，AI 侧栏弹出，客户在对话中描述需求。如果客户描述的需求可以被标准增值覆盖（如"帮我直接上架"），AI 检测到后触发校验 D。

**在真实体验版中的简化触发方式**：
- 侧栏打开后，客户在输入框输入内容并发送
- 如果输入内容包含关键词"直接上架""不用换标""原单上架不贴标"等 → 触发校验 D
- 如果不包含这些关键词 → 不触发（走正常非标流程）

### 校验 D 模态框

```html
<div class="validation-modal" id="validationModalD">
  <div class="validation-box">
    <div class="validation-header" style="background:linear-gradient(135deg,#fa8c16,#faad14);color:#fff;">
      🔍 标准增值可替代性检查
    </div>
    <div class="validation-body">
      <div class="validation-item" style="border-color:#ffe58f;background:#fffbe6;color:#ad6800;">
        ⚠️ AI 检测到您的需求可以使用标准增值服务覆盖：<br>
        <strong style="font-size:14px;">【直接上架】</strong><br>
        <span style="font-size:12px;">无需走非标特批流程，选择标准增值即可直接执行，无需审核等待。</span>
      </div>
    </div>
    <div class="validation-footer">
      <button class="validation-btn-ok" onclick="switchToStandard()">确认，切换到标准增值</button>
    </div>
  </div>
</div>
```

**注意**：没有"仍要提交非标"的按钮，只能切到标准。

### switchToStandard() 逻辑

```javascript
function switchToStandard() {
  document.getElementById('validationModalD').classList.remove('show');
  
  // 自动选中标准增值路径（"直接上架"相关的层级元素）
  const methodCards = document.querySelectorAll('.card-item, [data-method], [data-key]');
  const shelfCard = Array.from(methodCards).find(c => 
    c.textContent.includes('上架') && !c.textContent.includes('非标') && !c.textContent.includes('销毁')
  );
  if (shelfCard) shelfCard.click();
  
  // 延迟选中"直接上架"原子
  setTimeout(() => {
    const atomCards = document.querySelectorAll('.card-item, [data-atom]');
    const directCard = Array.from(atomCards).find(c => c.textContent.includes('直接上架'));
    if (directCard) directCard.click();
  }, 500);
  
  // 清空之前填入的非标字段
  const bg = document.getElementById('requirementBackground');
  const desc = document.getElementById('requirementDescription');
  if (bg) bg.value = '';
  if (desc) desc.value = '';
  
  // 关闭 AI 侧栏（标准增值不需要 AI 继续引导）
  const sidebar = document.getElementById('aiSidebar');
  if (sidebar) sidebar.classList.remove('open');
  
  // toast
  showToast('已切换到标准增值【直接上架】，无需审核即可执行', 4000);
}
```

### 在输入框发送逻辑中加入检测

找到真实体验版中客户输入框的发送函数（可能叫 sendMessage 或类似），在其中加入：

```javascript
// 在发送消息后检测是否触发校验 D
const STANDARD_KEYWORDS = ['直接上架', '不用换标', '原单上架不贴标', '不需要贴标', '直接入库'];
const userText = input.value.trim();

// 发送后检测
if (STANDARD_KEYWORDS.some(kw => userText.includes(kw))) {
  // 延迟 1.5s 模拟 AI 思考后弹出校验
  setTimeout(() => {
    document.getElementById('validationModalD').classList.add('show');
  }, 1500);
}
```

## 约束

- 只修改 `prototypes/B_侧边栏真实体验版.html`
- 不改其他文件
- 新增的模态框样式复用现有 .validation-modal 系列样式
- 如有歧义标记 `[AMBIGUITY]`

## Git

- commit: `feat(prototype): add validation D (standard substitution check) to real experience version`
- push main
- 如果 push 失败，直接输出文件完整内容
