# 加在 `cs_Bot_Client_v2p_3`（更新更近）

按更新时间：

| 对话流 | 上次保存 | 结论 |
|---|---|---|
| `cs_Bot_Client_v2p_3` / [7686800546686418959](https://www.coze.cn/work_flow?workflow_id=7686800546686418959&space_id=7417755373999767571) | 2026-09-21 18:15 | **加在这张** |
| `cs_Bot_Client_v2p_1` / 7685975376836739124 | 2026-09-18 18:03 | 先不动 |
| `cs_Bot_Client_page_link_probe` | 21:12 导入的独立画布 | 沙盒，不必嵌进 v2p_3 |

Cursor 改不了扣子画布。打开 v2p_3，按下面 6 步加。**不要改 Query 子流程内部，不要动「新增数据 → 结束」那条绑用户的线。**

目标：

```
（原来进 Query 的那根线）
  → page_link_probe（代码）
  → if_should_send（选择器）
       真 → tool_call_send_page → 结束     ← 「链路测试」或读页回传
       假 → Query → 原来怎么接到结束还怎么接  ← 普通客服
```

---

## 1. 打开画布

打开：https://www.coze.cn/work_flow?workflow_id=7686800546686418959&space_id=7417755373999767571

找到标题类似 **`cs_Default_Query_v4_staging_F`** 的子流程格子（就是 Query）。看清 **谁连到它**、**它连到谁**。后面要剪开「连到它」的那根线。

## 2. 加代码节点 `page_link_probe`

1. 在 Query **左边**加一个 **代码**节点，标题改成 `page_link_probe`
2. 语言选 **JavaScript**（不要 TypeScript）
3. 把 `D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\nodes\page-link-probe.coze.js` **全文贴进去**
4. 输入 2 个，都是文本：

| 名字 | 接到哪 |
|---|---|
| `user_input` | 开始节点的 `USER_INPUT` |
| `dehydrated_dom` | 开始节点的 `USER_INPUT`（前端把读页结果当下一轮用户话） |

5. 输出 6 个（名字必须一样）：`should_send`（布尔）、`function_name`、`arguments`、`skip_reason`、`sidecar_intact`、`turn_kind`

## 3. 加选择器 `if_should_send`

代码右边加 **选择器**：

- 条件：`page_link_probe.should_send` **等于** `真`
- 真：去插件
- 否则：去 **Query**（原来的子流程）

## 4. 加插件 `tool_call_send_page`

不要新建插件种类。从这张画布或 Query 里 **复制一个已有的「函数调用」**（插件名仍是 `cobra_agent_http` / `tool_call_send`），标题改成 `tool_call_send_page`。

5 根线：

| 插件字段 | 接到哪 |
|---|---|
| `function_name` | 代码节点的 `function_name` |
| `arguments` | 代码节点的 `arguments` |
| `conversation_id` | 用户变量 `_conversation_id` |
| `user_id` | 用户变量 `_user_id` |
| `username` | 用户变量 `_username` |

插件后面接到 **结束**。

## 5. 改线（关键）

1. 删掉「某某节点 → Query」那根线（进 Query 的入口）
2. 改成：某某节点 → `page_link_probe`
3. `page_link_probe` → `if_should_send`
4. 选择器 **真** → `tool_call_send_page` → 结束
5. 选择器 **否则** → Query → Query 原来的下游 **不要动**

绑用户那条「新增数据」不要接这三格。

## 6. 保存，绑测试 Bot，发「链路测试」

1. 保存 v2p_3
2. 测试 Bot 绑 **`cs_Bot_Client_v2p_3` / 7686800546686418959**（不要绑独立那张 probe，也不要绑现网 v2p）
3. EDS 侧栏发：`链路测试` → 应 `pageRead`，**Query 这格不应跑**
4. 前端回传后 → 侧栏「读页清单（先不点页）」
5. 再发一句普通客服话（如「你好」）→ 应进 Query，正常回答

代码节点输出全 null：语言改成 JavaScript，重贴 `page-link-probe.coze.js`。
