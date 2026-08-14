## 任务

修复 `prototypes/B_侧边栏真实体验版.html` 的两个 AI 对话交互问题。

## 前置阅读

- 当前 `prototypes/B_侧边栏真实体验版.html`

## 修复 1：AI 侧栏应有多轮对话模拟（不是一来就出 SOP）

**问题**：客户输入需求后，AI 直接就出结论了。应该模拟真实的多轮追问→客户回复→AI 再出结论的过程。

**改为**：客户发送消息后，AI 的回复按以下逻辑：

```javascript
const AI_FIRST_RESPONSE = '收到，您这个需求我来帮您评估。为了生成准确的操作说明，需要您补充几项信息：\n\n1. 需要处理的 SKU 和数量？\n2. 当前库存所在仓库？\n3. 关联的单据号（入库单/出库单）？\n4. 有无特殊要求（时间、包材等）？\n\n请逐一补充，或一次性说明。';

const AI_SECOND_RESPONSE = '已确认：您的需求为【良品转不良品上架】。\n\n建议填入：\n· 增值产品：入库非标增值（特批）\n· 增值服务：入库其他服务需求\n\n请确认下方 SOP 后再一键回填。';
```

**实现逻辑**：

```javascript
let userMessageCount = 0;

function sendMessage() {
  const input = document.getElementById('aiUserInput');
  const text = input.value.trim();
  if (!text) return;
  
  appendAiBubble('user', text);
  input.value = '';
  userMessageCount++;
  
  // 先检测校验 D（标准可替代）
  const STANDARD_KEYWORDS = ['直接上架', '不用换标', '原单上架不贴标', '不需要贴标', '直接入库'];
  if (STANDARD_KEYWORDS.some(kw => text.includes(kw))) {
    setTimeout(() => {
      appendAiBubble('assistant', 'AI 识别到您的需求推荐选择标准增值服务【原单上架 - 直接上架】，无需走非标特批流程。');
      setTimeout(() => {
        document.getElementById('validationModalD').classList.add('show');
      }, 1000);
    }, 1000);
    return;
  }
  
  // 非标流程：多轮对话
  if (userMessageCount === 1) {
    setTimeout(() => {
      appendAiBubble('assistant', AI_FIRST_RESPONSE);
    }, 1000);
  } else if (userMessageCount >= 2) {
    setTimeout(() => {
      appendAiBubble('assistant', AI_SECOND_RESPONSE);
      setTimeout(() => appendSopCard(), 500);
    }, 1200);
  }
}
```

## 修复 2：校验 D 触发时 AI 的回复文案

**问题**：客户输入"我要直接上架"后，AI 回复"已收到..."再弹校验。应该改为 AI 直接说出推荐。

**改为**：触发校验 D 时，AI 的气泡内容改为：

```
AI 识别到您的需求推荐选择标准增值服务【原单上架 - 直接上架】，无需走非标特批流程。
```

然后延迟 1s 弹出校验 D 模态框。

不要先回复"已收到"再弹窗，直接一条消息说明推荐+原因，然后弹窗确认切换。

## 约束

- 只修改 `prototypes/B_侧边栏真实体验版.html`
- 不改其他文件
- 如有歧义标记 `[AMBIGUITY]`

## Git

- commit: `fix(prototype): add multi-turn dialog + fix validation D AI response`
- push main
- 如果 push 失败，直接输出文件完整内容
