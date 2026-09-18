# 把页面指令接到 cs_Bot_Client_v2p_1

改完后的主对话线：

```
Query（cs_Default_Query_v4_staging_F）
  → page_intent_emit（代码，TypeScript）
  → if_should_send（选择器）
       真 → tool_call_send_page（插件，和 Query 里「函数调用」同一个）
       假 → 直接结束
  → 结束
```

**不要动**「新增数据 → 结束」那条绑用户的线。  
**不要**用 `page_intent_emit_smoke` 覆盖 Bot Client。  
**不要**用 `Workflow-cobra_api_1`（那是查 OMS 的）。

## 优先：导入改好的包（和 smoke 同一套目录）

文件（已按扣子能导入的格式重打，不要用旧的）：

`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\coze-import\cs_Bot_Client_v2p_1-page-bridge.zip`

zip 里面必须是：

- `workflow/MANIFEST.yml`
- `workflow/workflow/cs_Bot_Client_v2p_1-draft.yaml`

Coze → **对话流**（这张是 chatflow，不要进「工作流」那个入口）→ 导入 → 选这个 zip。

- 若提示覆盖已有 `cs_Bot_Client_v2p_1`：可以覆盖（这就是你点名要改的那张 staging 画布）。
- 若导入成了新副本：把**测试 Bot** 绑到新副本。现网其它 Bot 不要动。
- 若仍报「文件格式错误」：不要再试这个 zip，改走下面「手加 3 格」。

线上已导入并发布（新副本，不是覆盖旧 id）：

- 名称：`cs_Bot_Client_v2p_1`
- id：**`7685975376836739124`**
- 打开：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7685975376836739124

导入后打开画布，确认 Query 右边是：代码 `page_intent_emit` → 选择器 `if_should_send` → 插件 `tool_call_send_page`。插件 5 根线：

| 插件字段 | 接到哪 |
|---|---|
| `function_name` | 代码节点的 `function_name` |
| `arguments` | 代码节点的 `arguments` |
| `conversation_id` | 用户变量 `_conversation_id` |
| `user_id` | 用户变量 `_user_id` |
| `username` | 用户变量 `_username` |

语言必须是 **TypeScript**。

## 你已经打开旧画布时：手加 3 格（不必再导入）

1. 找到 **Query → 结束** 这条线（不是新增数据那条）。
2. 若还没有代码节点：加代码，标题 `page_intent_emit`，语言 TypeScript，把 `nodes/page-intent-emit.ts` **全文**贴进去（到 `main` 函数结束即可，不必带文件末尾 `--stdin`）。
   - 输入：`sidecar` ← **Query 子流程的 sidecar**（F_1 结束后才有；没有就暂时空着，短句「出卡测试」仍走 `user_input`）、`user_input` ← `USER_INPUT`、`dehydrated_dom` ← `USER_INPUT`
   - 不要接开始节点上那个空的 sidecar；也不要把 Query.sidecar 接到「输出」节点（卖家页会露 JSON）
   - 输出 6 个：`should_send`（布尔）、`function_name`、`arguments`、`skip_reason`、`sidecar_intact`、`turn_kind`
3. 代码和结束之间加 **选择器**，标题 `if_should_send`：`should_send` 等于 真。
   - 真：去插件
   - 否则：去结束
4. 从 Query 画布 **复制一个「函数调用」** 到 Bot Client（插件仍是 `cobra_agent_http` / `tool_call_send`）。标题改成 `tool_call_send_page`。5 根线同上。
5. Query 改接到代码节点，不要再直连结束。
6. 保存。先不要发布到现网其它 Bot；这张本身就是 staging 的 `v2p_1`。

## 怎么测（导入或手加之后）

就在 Bot 右边「预览与调试」输入框发消息。

先把 `page_intent_emit` 代码换成最新的 `nodes/page-intent-emit.ts`（到 `main` 结束），保存并**再发布**。然后只发这四个字：

`出卡测试`

不要发「点击第 0 个元素」「请确认是否可以进行」这种人话，也不要发空消息。Query 仍会先刷 thinking，这是正常的；看 thinking **后面**有没有 `renderA2UI`。

测读页发：`读页测试`

（仍可用 JSON 文件，预览框经常把 JSON 吃成空输入，短句更稳。）

JSON 备用：

- 出卡：`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\fixtures\chat-message-render-a2ui.txt`
- 读页：`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\fixtures\chat-message-page-read.txt`

这个 Coze 预览窗 **不会画出卡片**，只会看到 thinking / 函数调用原文（预览里露 JSON 可以）。卡片要到 EDS 页侧栏才有。**卖家页气泡不要出现 sidecar JSON。**

Query 副本 F_1 加出口、选中用 catalog `selectOption`：[`../marker/query-f1-sidecar-outlet.md`](../marker/query-f1-sidecar-outlet.md)。现网 Query 不要改。

测普通问答：发「你好，帮我看一下增值单」，**不应**再发 `renderA2UI` / `pageRead`。
