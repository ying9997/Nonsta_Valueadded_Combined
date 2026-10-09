# 导入：Query 前选择器（从 v2p_1 原包改出来）

原包：`D:\DA\Nonsta_Valueadded_Combined\Chatflow-cs_Bot_Client_v2p_1-draft-8069.zip`  
新包：`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\coze-import\cs_Bot_Client_v2p_link.zip`

名字改成了 **`cs_Bot_Client_v2p_link`**，导入时选 **新建**，**不要覆盖** `v2p_1` / `v2p_3`。

画布主对话变成：

```
（原来进 Query 的那几根线）
  → page_link_probe
  → if_should_send
       真 → tool_call_send_page → 结束     ← 强制唤起「我的异常单{EB}应该提交哪个增值产品」/ 读页回传
       假 → Query → 结束                 ← 其它问题走常规 expert
```

绑用户那条线没动。Query 子流程内部没动。

画布上 Query 的标题是 **`cs_Default_Query_v4_staging_F`**（子流程格子），**不会**在对话流列表里再出现一个 `Chatflow-cs_Default_Query_v4_`。它只挂在这张对话流里面。

扣子「新建」导入时，有时会把子流程格子丢掉（zip 里没有把 Query 整张打进去，避免覆盖现网 Query）。包里的线已经是「否则 → Query」；格子没了就按下面「补接 Query」做。

## 导入

1. Coze → **对话流** → 导入 → `cs_Bot_Client_v2p_link.zip`
2. 提示覆盖已有 `cs_Bot_Client_v2p_1` 时：**取消**，新建
3. 打开后确认 Query **左边**有 `page_link_probe` 和选择器
4. 代码节点语言若不是 JavaScript：改成 JavaScript，再贴 `nodes/page-link-probe.coze.js`
5. 测试 Bot 绑这张新对话流（不要绑现网 v2p）

## 补接 Query（画布上找不到子流程时）

1. 确认打开的是 **`cs_Bot_Client_v2p_link`**，不是独立的 `page_link_probe`（那张本来就没有 Query）
2. 左侧加节点 → **工作流**（不是对话流）→ 选空间里已有的 **`cs_Default_Query_v4_staging_F`**（现网那张，不要新建 Query）
3. 输入：`USER_INPUT`、`CONVERSATION_NAME` 接到开始节点（和原来一样）
4. 线：选择器 **`if_should_send` 的「否则」** → 这个 Query → **结束**
5. 选择器的「如果」仍然：插件 → 结束

分支就是这两根，Query 只出现在「否则」上。真分支故意不进 Query。

## 画布现在错在哪（v2p_link / 7687981752618582066）

选择器 `if_should_send` 插在了 A/B 和 Query 中间，`page_link_probe` 晾在下面，**选择器读不到 should_send**。

改成这 4 根（只改线，不要再拖新格子）：

1. 原来从 **A/B** 连到选择器 / Query 的线 → 改接到 **`page_link_probe`**
2. **`page_link_probe` → `if_should_send`**
3. 选择器 **如果（真）** → `tool_call_send_page` → 结束
4. 选择器 **否则** → Query → 结束

`page_link_probe` 不能当断头；它必须在选择器**前面**。

2026-09-21 旧句「怎么处理」试运行曾全绿。2026-09-22 起改成「应该提交哪个增值产品」，须把最新 `page-link-probe.coze.js` 再贴进代码节点。

## 怎么测

试运行输入整句（和强制唤起代发一样）：

`我的异常单EB0126092143应该提交哪个增值产品？`

1. 应走 `pageRead`，Query 这格不应跑
2. 前端读页回来 → 侧栏「读页清单（先不点页）」
3. 发 `你好` 或别的客服问题 → 应进 Query，正常 expert
4. 画布试跑仍可用 `链路测试`（只给开发用）

## 聊天窗没回复，不是结束节点少了输出

原包 `cs_Bot_Client_v2p_1` 的说明就是：**结束节点不负责把客服话打到聊天里**（`terminatePlan: returnVariables`，没有输出字段）。Query 是「节点内置中途输出」。

所以：

| 你发的 | 正确现象 | 不要当成坏了 |
|---|---|---|
| 异常单那句（走插件） | Coze 测试聊天**可以没有气泡**；画布上 `tool_call_send_page` 绿、`function_name=pageRead` | 不要给「结束」补 Output 去对齐工作流导出 |
| `你好`（走 Query） | 应出现正常人话。若只有 `thinkingstart`…`thinkingend`，多半是 Coze 试聊没带 `_user_id`，Query 把思考过程漏出来了 | 不要把思考原文接到结束节点 |

**不要**把工作流导出里的 Output 字段接到对话流结束格。原包就是空结束。人话只从 Query 中途冒出来；读页指令走插件，给 EDS 侧栏，不给 Coze 气泡。

要确认异常单句跑没跑：打开该次画布运行，看插件是不是绿，不要等聊天窗说话。
