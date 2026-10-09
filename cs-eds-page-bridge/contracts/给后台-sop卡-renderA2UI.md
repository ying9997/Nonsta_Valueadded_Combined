# 给后台：SOP 卡 `renderA2UI` 测参（解析，不是长度）

对照原型 `D:\DA\Vas-Nonstandard-Guide\prototypes\B_侧边栏真实体验版.html` 里的 `sop-card-v6`（操作 SOP — 良品转不良品上架）。

插件仍是 `cobra_agent_http` / `tool_call_send`。`arguments` **必须是 JSON 字符串**，不要传对象。

## 插件五个入参

| 字段 | 值 |
|---|---|
| `function_name` | `renderA2UI` |
| `arguments` | 下面这一整段字符串（819 字符 / 1081 字节，含中文） |
| `conversation_id` | 当前会话 id（有值即可） |
| `user_id` | 当前用户 id |
| `username` | 当前用户名 |

`arguments` 原文（一行，可直接贴进插件）：见 [`../fixtures/sidecar-sop-card-a2ui.arguments.txt`](../fixtures/sidecar-sop-card-a2ui.arguments.txt)

结构化样例：[`../fixtures/sidecar-sop-card-a2ui.json`](../fixtures/sidecar-sop-card-a2ui.json)

## 和原型 HTML 怎么对应

| 原型 | A2UI |
|---|---|
| `.sop-card-header` | `Card.title` = `操作 SOP — 良品转不良品上架` |
| `.sop-card-body` 五步 | `Text.text`（用 `\n` 换行） |
| `确认并使用` | `Button` + `operatePage`，选中「原单上架」「入库其他服务需求」（与原型 `FORM_VALUES` 一致，index 0/1 是占位） |
| `让 AI 再改一版` | 只有按钮文案，**没有** `readPage` / `operatePage`（这是改对话，不是点页） |

过关：插件 `code: "0"` / 「操作成功」；前端 `queryToolCall` 里 `name=renderA2UI`，侧栏画出标题 + 五步 + 两个按钮。

对话流发 **`出卡测试`** 时，`page_intent_emit` 已改为发这一包（贴最新 `nodes/page-intent-emit.coze.js` 并发布）。

## 签名原文（不是长度）

扣子插件 `tool_call_send` 的签名必须按这一段拼。旧写法会把 `arguments` 整段塞进 `id`、中文转成 `\uXXXX`、字段顺序和 FastJSON `SortField` 对不上，服务端验签失败。

```
token
+ "action" + action
+ "app_key" + app_key
+ "data" + data_json_str
+ "format" + format
+ "platform" + platform
+ "sign_method" + sign_method
+ "timestamp" + timestamp
+ "version" + version
+ token
```

`data_json_str` = `json.dumps(data, sort_keys=True, separators=(',', ':'), ensure_ascii=False)`  
`toolCall.id` = Base64(`userId + conversationId + timestamp + function_name`)，**不要**拼 dict / arguments。  
`toolCall.arguments` 保持字符串。

本地对照脚本：[`../scripts/tool-call-send.py`](../scripts/tool-call-send.py)（token 走环境变量 `COBRA_TOOL_CALL_TOKEN`，不要写进仓库）。
