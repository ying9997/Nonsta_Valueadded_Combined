# Tool Calling 规格书 — 增值 AI 指引前端操作接口

> 版本：v1.0
> 日期：2026-08-04
> 状态：待评审
> 受众：前端研发、后端研发、AI 产品
> 配套文件：`tool-calling-schema.md`（纯 Schema 定义）

---

## 1. 背景与目标

### 1.1 要解决的问题

AI 增值指引 Bot 运行在 Coze 平台，通过侧边栏与客户对话。当 AI 完成推荐后，需要**自动操作宿主页面的表单控件**（选中下拉框选项、填入 textarea 文本）。

由于 Bot 运行在 iframe 沙箱内，无法直接访问宿主页面 DOM。需要一个标准化的通信接口。

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| **语义化** | target 用业务语义 key，不用 DOM selector |
| **解耦** | AI 侧和前端侧独立演进，只要 Schema 不变 |
| **可审计** | 每次操作可追溯（谁触发、什么指令、什么结果） |
| **可降级** | 执行失败不阻塞用户手动操作 |

---

## 2. 系统架构

```
┌─────────────────────────────────────────────────────────┐
│  宿主页面（增值下单页）                                    │
│                                                          │
│  ┌──────────────────┐    ┌────────────────────────────┐ │
│  │ 增值表单区域      │    │ AI 侧边栏（Coze SDK iframe）│ │
│  │                  │    │                            │ │
│  │ [增值产品 ▼]     │◄───│  AI 对话 → 结构化 JSON     │ │
│  │ [增值服务 ▼]     │    │                            │ │
│  │ [需求背景 ___]   │    │  afterMessageReceivedFinish│ │
│  │ [需求描述 ___]   │    │         ↓                  │ │
│  │                  │    │  parseVasAction(content)    │ │
│  └──────────────────┘    └────────────────────────────┘ │
│           ↑                          ↓                   │
│           └──── executeVasAction(action) ────────────────┘
└─────────────────────────────────────────────────────────┘
```

---

## 3. 通信协议

### 3.1 一期实现（前端直解）

**触发时机**：AI Bot 每条消息返回后

**检测方式**：在 `message.content` 中检测是否包含 `"function_name": "vas_form_action"` 的 JSON 块

**消息格式**：AI 的 `message.content` 分两部分：
1. 自然语言回复（客户可见）
2. 结构化 JSON 指令（前端解析执行，不展示给客户）

```
好的，为您推荐【原单上架 - 补贴原商品条码】。已帮您选中。

```json
{"function_name":"vas_form_action","arguments":{"actions":[{"action":"select","target":"product","value":"原单上架"},{"action":"select","target":"service","value":"补贴原商品条码"}]}}
```　
```

### 3.2 二期升级路径（后端中继）

后端在 Coze 工作流中调用 `cobra_agent_http.tool_call_send`：

```yaml
function_name: "vas_form_action"
arguments: '{"actions":[...]}'  # 同一期 JSON 结构
conversation_id: {{conversation_id}}
user_id: {{user_id}}
username: {{username}}
```

前端从 SDK 的 tool_call 事件中接收，解析 `arguments`，执行逻辑不变。

---

## 4. 前端实现规格

### 4.1 SDK 初始化

```javascript
import { WebChatClient } from '@coze/chat-sdk';

const client = new WebChatClient({
  config: { bot_id: 'YOUR_BOT_ID' },
  componentProps: { title: '在线咨询', width: '360px' },
  eventCallbacks: {
    message: {
      afterMessageReceivedFinish: (props) => {
        const content = props.message?.content;
        if (content) {
          const vasAction = parseVasAction(content);
          if (vasAction) {
            executeVasAction(vasAction);
          }
        }
      }
    }
  }
});
```

### 4.2 JSON 解析函数

```javascript
/**
 * 从 AI 消息内容中提取 vas_form_action JSON
 * @param {string} content - AI 消息完整内容
 * @returns {object|null} - 解析后的 action 对象，或 null
 */
function parseVasAction(content) {
  try {
    // 方式1：尝试从 code block 中提取
    const codeBlockMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      const parsed = JSON.parse(codeBlockMatch[1]);
      if (parsed.function_name === 'vas_form_action') {
        return parsed.arguments;
      }
    }
    
    // 方式2：尝试从末尾 JSON 提取（无 code block 包裹）
    const jsonMatch = content.match(/\{"function_name"\s*:\s*"vas_form_action"[\s\S]*\}$/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.arguments;
    }
    
    return null;
  } catch (e) {
    console.warn('[VAS AI] JSON 解析失败:', e.message);
    return null;
  }
}
```

### 4.3 操作执行函数

```javascript
/**
 * 执行 AI 推荐的表单操作
 * @param {object} payload - { actions: Array<{action, target, value}> }
 */
function executeVasAction(payload) {
  if (!payload || !payload.actions) return;

  const DELAY_BETWEEN_ACTIONS = 300; // ms，让用户看到联动过程

  payload.actions.forEach((item, index) => {
    setTimeout(() => {
      try {
        switch (item.target) {
          case 'product':
            selectProduct(item.value);
            break;
          case 'service':
            selectService(item.value);
            break;
          case 'requirementBackground':
            fillTextarea('requirementBackground', item.value);
            break;
          case 'requirementDescription':
            fillTextarea('requirementDescription', item.value);
            break;
          default:
            console.warn(`[VAS AI] 未知 target: ${item.target}`);
        }
        
        // 上报执行成功
        logVasActionResult(item, 'success');
      } catch (e) {
        console.error(`[VAS AI] 执行失败: ${item.target}`, e);
        logVasActionResult(item, 'failed', e.message);
        showFallbackTip(item);
      }
    }, index * DELAY_BETWEEN_ACTIONS);
  });
}
```

### 4.4 Target→DOM 映射层（前端维护）

```javascript
/**
 * 前端维护的映射层 — DOM 结构变化时只改这里
 */
function selectProduct(value) {
  const el = document.getElementById('productSelect');
  if (!el) throw new Error('productSelect not found');
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function selectService(value) {
  const el = document.getElementById('serviceSelect');
  if (!el) throw new Error('serviceSelect not found');
  el.value = value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function fillTextarea(target, value) {
  // 前端根据自己的 DOM 结构定位对应 textarea
  const selectorMap = {
    requirementBackground: '[name="requirementBackground"], #reqBackground',
    requirementDescription: '[name="requirementDescription"], #reqDescription'
  };
  const el = document.querySelector(selectorMap[target]);
  if (!el) throw new Error(`${target} textarea not found`);
  el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  
  // 高亮提示（可选）
  el.style.outline = '2px solid rgba(160,121,42,0.5)';
  setTimeout(() => { el.style.outline = ''; }, 2000);
}
```

### 4.5 降级处理

```javascript
/**
 * 操作失败时的降级提示
 */
function showFallbackTip(action) {
  if (action.action === 'fill') {
    // 填入失败 → 提示用户手动复制
    showToast(`自动填入失败，请手动复制以下内容到"${getTargetLabel(action.target)}"：\n${action.value}`);
  } else if (action.action === 'select') {
    // 选择失败 → 提示用户手动选
    showToast(`请手动选择"${getTargetLabel(action.target)}"为：${action.value}`);
  }
}

function getTargetLabel(target) {
  const labels = {
    product: '增值产品',
    service: '增值服务',
    requirementBackground: '需求背景说明',
    requirementDescription: '需求描述'
  };
  return labels[target] || target;
}
```

### 4.6 执行日志上报

```javascript
/**
 * 上报每次 AI 操作的执行结果（用于 Trace 和监控）
 */
function logVasActionResult(action, status, errorMsg) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action: action.action,
    target: action.target,
    value: action.value?.substring(0, 100), // 截断长文本
    status: status, // 'success' | 'failed'
    error: errorMsg || null,
    page: window.location.pathname,
    conversationId: getCurrentConversationId() // 从 SDK 获取
  };
  
  // 发送到监控系统
  navigator.sendBeacon('/api/vas-ai-action-log', JSON.stringify(logEntry));
}
```

---

## 5. AI 侧输出规范（给 Prompt 工程师）

### 5.1 输出规则

1. 仅在**确认推荐且客户同意**后才输出 `vas_form_action` JSON
2. JSON 必须用 ` ```json ``` ` 代码块包裹，放在自然语言回复之后
3. `actions` 数组中的顺序必须是：先 select 后 fill（确保下拉框选中后再填文本）
4. `value` 字段的值必须与页面下拉框中的选项文本**完全一致**（包括括号、空格）
5. 不确定时不输出 JSON，让客户手动操作

### 5.2 输出时机

| 场景 | 是否输出 JSON | 说明 |
|------|-------------|------|
| AI 推荐标准增值，客户确认 | ✅ | select product + service |
| AI 推荐免审非标，客户确认 | ✅ | select product + service |
| AI 生成 SOP，客户点"确认 SOP" | ✅ | select + fill 全部 |
| AI 还在追问/澄清中 | ❌ | 等确认后再输出 |
| 客户说"我自己选" | ❌ | 不输出 |
| AI 不确定推荐什么 | ❌ | 不输出 |

### 5.3 禁止输出的情况

- 客户未明确确认意图时
- AI 置信度 < 0.6 时
- 客户表示要自己操作时
- 页面上下文信息不完整时

---

## 6. 错误处理矩阵

| 错误场景 | 前端行为 | 用户感知 |
|---------|---------|---------|
| JSON 解析失败 | 静默忽略，不执行 | 无感知，AI 回复正常展示 |
| target 不存在（DOM 找不到） | 记日志，showFallbackTip | "请手动选择/填写..." |
| value 不在下拉选项中 | 记日志，showFallbackTip | "请手动选择..." |
| 网络断开 | SDK 断连，不触发回调 | 侧栏显示断连提示 |
| AI 返回多条 JSON（异常） | 只执行第一条 | 无感知 |
| 执行后前端校验报错 | 不清除已填内容，让用户看到并修改 | 正常校验提示 |

---

## 7. 监控指标（Trace 埋点）

| 指标 | 计算方式 | 告警阈值 |
|------|---------|---------|
| AI 操作触发率 | 含 JSON 的消息数 / AI 总消息数 | 仅统计，不告警 |
| 操作执行成功率 | success / (success + failed) | < 90% 告警 |
| 各 target 失败分布 | 按 target 聚合失败次数 | 单 target 连续 5 次失败告警 |
| 解析失败率 | JSON 解析异常 / 含 JSON 的消息数 | > 5% 告警 |
| 降级触发率 | showFallbackTip 次数 / 操作总次数 | > 10% 告警 |

---

## 8. 前端接入 Checklist

- [ ] 升级 `@coze/chat-sdk` 至支持 `afterMessageReceivedFinish` 的版本
- [ ] 实现 `parseVasAction()` 函数
- [ ] 实现 `executeVasAction()` 函数
- [ ] 实现 Target→DOM 映射层（`selectProduct` / `selectService` / `fillTextarea`）
- [ ] 实现降级提示 `showFallbackTip()`
- [ ] 接入日志上报 `logVasActionResult()`
- [ ] 确认下拉框选项文本与 Schema 中 `value` 完全一致
- [ ] 测试：AI 返回正常 JSON → 页面正确联动
- [ ] 测试：AI 返回异常内容 → 不影响页面正常使用
- [ ] 测试：手动操作不受 AI 操作影响（两者互不冲突）

---

## 9. 版本演进计划

| 版本 | 变更 | 时间 |
|------|------|------|
| v1.0（当前） | 4 个 target（product/service/background/description） | 一期 |
| v1.1 | 新增 `attachmentHint` target（提示客户上传附件） | 一期后期 |
| v2.0 | 迁移至 `tool_call_send` 后端通道 + 新增 `auditSopFill` target（审核回填） | 二期 |

---

## 10. FAQ

**Q: 前端 DOM 结构改了怎么办？**
A: 只改 §4.4 的 Target→DOM 映射层。AI 侧和 Schema 不变。

**Q: AI 输出了错误的 value（选项不存在）怎么办？**
A: `selectProduct/selectService` 函数检测到 value 不在 options 中时 throw error → 走降级。同时记日志用于 AI prompt 修正。

**Q: 客户手动改了 AI 填入的内容怎么办？**
A: 正常。AI 填入只是预填，客户随时可以覆盖。不锁定表单。

**Q: 侧栏关闭后再打开，之前 AI 填的内容还在吗？**
A: 在。填入的是宿主页面的 DOM，跟侧栏无关。侧栏关闭不影响宿主页面状态。
