# 导入 Query 副本，接到测试对话流

用**新打的包**（`stage_thinking` / `stage_verifying` 已写成 `thinking` / `verifying` 这几个字，不再引用会丢的格子）。

文件：

`D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\coze-import\cs_Default_Query_v4_staging_F_1_sidecar.zip`

**覆盖 F_1，不要建成新流。** 新流没有 `_answer_stage`，那两个格子会空，发布不了。

覆盖目标：**`cs_Default_Query_v4_staging_F_1`**（id `7686361673971695625`，名字带 `_1`）。

之前建成、发不了的那张 sidecar 新流不要再用，也不要用它来覆盖。

**禁止覆盖**没有 `_1` 的现网 Query（`cs_Default_Query_v4_staging_F` / staging_D）。

recaller 这份没有改、也不要导入覆盖。Query 里仍会调用现网那张 D，只是不改它。测试 Bot 也不用重新导入。

---

## 1. 导入：覆盖 F_1（对话流，不是工作流）

1. 打开 Coze 空间。
2. 进 **对话流**（不要进「工作流」那个入口）。
3. 点 **导入**，选上面那个 zip。
4. 若问覆盖哪一张：
   - 覆盖 **`cs_Default_Query_v4_staging_F_1`**（带 `_1` 的）→ **可以**
   - 覆盖 `cs_Default_Query_v4_staging_F` 或 staging_D（没有 `_1`）→ **取消**
5. 打开 F_1。底部「错误列表」里每一条「变量赋值 / 请选择需要赋值的变量」都点进去：左边下拉选 **`_answer_stage`**，右边的值已经有了（`verifying` / `thinking` / `answering`）不要改。错误列表清空后保存并发布。
6. 测试对话流里 Query 换成 F_1：`7686361673971695625`（不用新 id）。

---

## 2. 接到测试对话流（就改这一张）

打开测试对话流：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7685975376836739124

地址栏必须是 `7685975376836739124`。

1. 点画布上的 **Query** 子流程。
2. 换成 **`cs_Default_Query_v4_staging_F_1`**（id `7686361673971695625`）。不要换到现网那张没有 `_1` 的 F。
3. **换完立刻检查输入**：`USER_INPUT` 必须引用开始节点的 `USER_INPUT`，`CONVERSATION_NAME` 引用开始节点的 `CONVERSATION_NAME`。扣子换子流程时这两根线经常被清空，空了就会报「未接收到具体的用户问题」。
4. 点 Query 节点的 **输出**：若写着「未配置输出」，添加 / 勾选 **`sidecar`**。
5. 点 **`page_intent_emit`**：`sidecar` 引用 Query 的 `sidecar`。`user_input` 仍是 USER_INPUT。
6. **先发布 F_1，再发布这张 Bot Client。** 子流程只保存不发布，外层还是旧的，或者外层发了内层没发，都会识别不到意图。
7. 不要把 Query 的 sidecar 接到任何「输出」节点。

测试 Bot 确认绑的是这张对话流：https://www.coze.cn/space/7417755373999767571/bot/7680824665929056310  
不要绑「客服-全场景-Default」。

---

## 3. 测通了没有

测试 Bot 右边 **预览与调试**：

1. 发 `出卡测试` → 思考后面应出现 `renderA2UI`（这里看到 JSON 可以）。
2. 发 `你好，帮我看一下增值单` → 不应再出 `renderA2UI`。
3. 发 `我有一批包裹需要换标签上架，应该选哪个增值产品？` → 点开运行详情：
   - `extract_sidecar` 有跑
   - A1 的话里没有 `<!--SIDECAR`
   - 若 `extract_sidecar.has_sidecar` 为假：是专家/D 没带出标识，不是导入失败。先把这格截图发我。

卖家页出卡还要前端的 EDS 测试网址。Coze 预览里没有卡片。

---

## 已经建成新流、发布被卡住时

zip 不含用户变量 `_answer_stage`。`stage_thinking` / `stage_answering` 是在给这个变量赋值，新流上没有它，格子就是空的，扣子不允许发布。

1. 这张新流可以不发布，也可以删掉。
2. 重新导入 zip，这次 **覆盖 F_1**（带 `_1` 的那张），再发布。
3. 若必须留新流：打开画布 **变量 → 用户变量**，新增 `_answer_stage`（文本，默认空）。然后点 `stage_thinking`：赋值对象选 `_answer_stage`，值引用 `global_params` → `enum_stages` → `thinking`。`stage_answering` 同样，值选 `answering`。`stage_start` / `stage_verifying` / `stage_answering_1` 等也是写同一个变量，有红点就同样补。补完再发布。
