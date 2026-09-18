# 你现在去 Coze 点这些

**优先走导入包，不要手加节点。** 步骤见：[`../coze-import/导入Query副本.md`](../coze-import/导入Query副本.md)

zip：`cs-eds-page-bridge/coze-import/cs_Default_Query_v4_staging_F_1_sidecar.zip`

下面是手改画布的备份（导入失败才用）。

---

只改下面两个副本。名字里**没有** `_1`、标题是「客服-全场景-Default」的，一律不要点进去改。

要复制的两段文字在电脑里：

- 拆包代码：用 Cursor 打开 `Nonsta_Valueadded_Combined/cs-eds-page-bridge/nodes/extract-sidecar.ts`，**全选复制**
- 专家测试回复：打开 `Nonsta_Valueadded_Combined/cs-eds-page-bridge/marker/test-marker-recommend.txt`，**全选复制**

---

## 第一步：改副本 Query（F_1）

打开：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7686361673971695625

地址栏必须有 `workflow_id=7686361673971695625`。不是这个 id 就关掉。

### 1. 加一个代码格子

1. 在画布上找到标题 **`experts_recaller_v2_staging_D`**（只要带 `staging_D` 且有连线的那张；旁边如果还有 A、F 且没连线，不要动）。
2. 从左边拖一个 **代码** 到它右边，标题改成：`extract_sidecar`。
3. 语言选 **TypeScript**。
4. 把 `extract-sidecar.ts` 全文贴进去，点确定。
5. 输入（引用）：
   - `reply_to_user` = D 的 `reply_to_user`
   - `handoff_log_markdown` = D 的 `handoff_log_markdown`
6. 输出三个：`sidecar`（文本）、`reply_clean`（文本）、`has_sidecar`（是/否）。
7. D 原来连到右边的那根线：**先改成 D → extract_sidecar，再 extract_sidecar → 原来右边那个格子**。不要把线掐断后不管。

### 2. 改 A1 吃的那句话

1. 找到 **`A1.拼装问题资料并组织回答`**。
2. 输入里叫 **`summary`** 的那根：现在是 D 的 `reply_to_user`，改成 **`extract_sidecar` 的 `reply_clean`**。
3. 不要把 `sidecar` 接到 A1，也不要接到任何名叫「输出」的格子。

### 3. 结束节点交回 sidecar

1. 点画布最右边 **结束**。
2. 增加返回变量 `sidecar`（文本），引用 `extract_sidecar.sidecar`。
3. 默认值填空（什么都不写，或 `""`）。
4. 点 **保存**，再点 **发布**（只发这张 F_1，不要发到现网那张 Query）。

---

## 第二步：改测试对话流（v2p_1）

打开：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7685975376836739124

地址栏必须有 `workflow_id=7685975376836739124`。

1. 点中间那个 **Query** 子流程。
2. 看它绑的是哪张：
   - 如果是 `cs_Default_Query_v4_staging_F`（id 以 `7681286672969678888` 结尾）→ **换成** `cs_Default_Query_v4_staging_F_1`（`7686361673971695625`）
   - 如果已经是 F_1，不用换
3. 刷新子流程输出，应出现 **`sidecar`**。没有的话：回到第一步确认结束节点已经发布。
4. 点 **`page_intent_emit`**：
   - `sidecar` 改成引用 **Query 的 sidecar**（不要再用开始节点那个空的 sidecar）
   - `user_input` 仍引用 **USER_INPUT**
5. 点 **保存**，再点 **发布**。

然后打开测试 Bot：https://www.coze.cn/space/7417755373999767571/bot/7680824665929056310

确认它绑的对话流是 **`cs_Bot_Client_v2p_1` / `7685975376836739124`**。绑成「客服-全场景-Default」就测错了。

---

## 第三步：专家结束节点贴测试回复（可选，但推荐问句要测出口就必须贴）

打开你准备测的那张增值推荐专家（地址栏 `workflow_id` 自己对一下，不要改现网正在用的那张就去点发布）。

1. 点最右边 **结束**。
2. 输出 **`analysis`** 改成「自定义文本」，把 `test-marker-recommend.txt` **全文粘进去**。
3. 保存。能只存草稿就先存草稿；测试 Bot 若只能跑已发布版，再只发测试用，**不要绑现网 Bot**。

测完把 `analysis` 改回原来的引用。

---

## 第四步：在 Coze 里测（不用卖家页）

打开测试 Bot 右边的 **预览与调试**。

这里**不会画出卡片**，只会看到思考过程、函数调用原文。预览里看到 JSON **算过**。

### 测 A：管道还在不在（先做这个）

输入（只这四个字）：

```
出卡测试
```

| 看到什么 | 通了没有 |
|---|---|
| 思考后面出现 `renderA2UI` 或函数调用原文 | **通了**（预览里露 JSON 可以） |
| 只有普通回话，没有任何 `renderA2UI` | 没通：检查对话流是不是 v2p_1、有没有 `page_intent_emit` |
| 气泡里整段 JSON 当给人看的话 | 接错了：sidecar 接到了「输出」节点，立刻改掉 |

再发：`读页测试`，应出现 `pageRead`。  
再发：`你好，帮我看一下增值单`，**不应**再出 `renderA2UI` / `pageRead`。

### 测 B：专家出口通没通

输入：

```
我有一批包裹需要换标签上架，应该选哪个增值产品？
```

跑完后打开 **这次运行的节点**（预览里点开详情 / 调试）：

| 格子 | 通了 |
|---|---|
| `experts_recaller_v2_staging_D` | 有跑起来 |
| `extract_sidecar` | `has_sidecar` 为真；`reply_clean` 里没有 `SIDECAR`；`sidecar` 是一包 JSON |
| `A1.拼装问题资料并组织回答` | 给卖家的话里没有 `<!--SIDECAR`，没有 `selectOption` |
| `page_intent_emit` | `should_send` 为真，`function_name` 是 `renderA2UI` |

如果 D 的 `reply_to_user` 里已经没有 `<!--SIDECAR`：出口是空的。先不要改共享 D，回来告诉我。

---

## 第五步：去测试环境卖家页测（才能看见卡）

Coze 预览**没有卡**。卡只出现在卖家后台那张填增值单的页面侧栏。

后台转发地址是：https://cobratest-agent.winit.com  
这不是卖家填单页。填单页 URL **要问前端**，缺这一条就进不了第五步。

问前端三句话（原样转发）：

1. 测试环境 EDS 增值下单页完整网址是什么？
2. 这一页的聊天窗是不是已经能画卡、读页、点页？
3. 这一页绑的是不是 Coze 测试 Bot `7680824665929056310`（对话流 `7685975376836739124`）？不要绑现网客服 Bot。

拿到网址后：

1. 浏览器打开那个 URL，登录测试卖家。
2. 打开侧栏客服。
3. 先发 `出卡测试`。
4. 再发 `我有一批包裹需要换标签上架，应该选哪个增值产品？`

| 看到什么 | 通了没有 |
|---|---|
| 侧栏出现卡片；聊天气泡只有人话，没有 `<!--SIDECAR`、没有一大段 JSON | **卖家页通了** |
| 有人话、没有卡 | Coze 可能已发令，但这一页聊天窗还没接画卡；把网址和截图给前端 |
| 气泡里出现 JSON / `SIDECAR` | 没通：卖家看见了机器包，回来找我 |
| 点「确认选中这组服务」后页上选中了对应下拉 | 选中也通了（样例里编号 0/1 是占位，选不中先截图，不必自己改编号） |

---

## 不要做

- 不要改现网 Query（id `7681286672969678888`）
- 不要改共享 recaller（id `7656806829235077126`）
- 不要把测试 Bot 绑到旧对话流 `7685663589169381391`
- 不要把 sidecar 接到「输出」节点
