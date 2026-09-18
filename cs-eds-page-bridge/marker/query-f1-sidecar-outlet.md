# Coze UI：在副本 Query F_1 加 sidecar 出口

只改 **副本** Query `cs_Default_Query_v4_staging_F_1`。  
**现网** Query `cs_Default_Query_v4_staging_F` / staging_D、共享 recaller D，都不要动。

卖家页气泡只给人话。机器包走 Query 结束的 `sidecar` → Bot Client 插件。Coze 预览/调试里可以看到 sidecar JSON，这是允许的。

打开 F_1：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7686361673971695625

粘贴代码：[`../nodes/extract-sidecar.ts`](../nodes/extract-sidecar.ts)（到 `main` 函数结束即可，不必带文件末尾 `--stdin`）。

---

## 1. 在 F_1 里加拆包节点

1. 找到子流程 **`experts_recaller_v2_staging_D`**（真正连线的那张 D，不要去改没连线的 A / F）。
2. 在它右边加一个 **代码** 节点，标题写成 `extract_sidecar`，语言 **TypeScript**，把 `extract-sidecar.ts` 全文贴进去。
3. 代码节点输入两根线：
   - `reply_to_user` ← D 的 `reply_to_user`
   - `handoff_log_markdown` ← D 的 `handoff_log_markdown`
4. 代码节点输出三个：`sidecar`（字符串）、`reply_clean`（字符串）、`has_sidecar`（布尔）。
5. 连线：D 先到 `extract_sidecar`。原来 D 右边连着谁，改成从 `extract_sidecar` 再连过去（插在中间，不要把 D 那条主线掐断后不管）。

## 2. A1 只吃洗过的人话

找到 LLM **`A1.拼装问题资料并组织回答`**。

- 输入 **`summary`**：现在是 D 的 `reply_to_user`。改成 `extract_sidecar` 的 **`reply_clean`**。
- `handoff_log_markdown` / `key_points` 可以仍接 D，不用改。
- **不要**把 `sidecar` 接到 A1 的任何输入。
- **不要**把 `sidecar` 接到 Query 里任何名叫「输出」的节点（那是写进聊天气泡的）。

可选（防漏）：在 A1 系统提示的「限制」里加一句：`不要把 SIDECAR、HTML 注释或 JSON 指令写进对客回复。`

## 3. Query 结束把 sidecar 交回对话流

点画布最右边 **结束**。

1. 返回变量里新增 **`sidecar`**（字符串）。
2. 引用 `extract_sidecar.sidecar`。
3. 默认值填空字符串 `""`。没走专家那条线时，结束节点才不会因为「变量不存在」报错。

保存草稿。不要导出再导入去覆盖现网那张 Query。

---

## 4. 对话流 v2p_1：把 Query 的 sidecar 接到封口节点

打开：https://www.coze.cn/work_flow?space_id=7417755373999767571&workflow_id=7685975376836739124

1. 点 **Query** 子流程。若还是 `cs_Default_Query_v4_staging_F`（id `7681286672969678888`），换成 **F_1**（`7686361673971695625`）。现网旧对话流不要换。
2. 刷新子流程输出，应出现 **`sidecar`**。
3. 点 `page_intent_emit`：把输入 **`sidecar`** 从「开始节点的 sidecar」改成 **Query 的 sidecar**。
4. `user_input` 仍接 `USER_INPUT`（短句「出卡测试」「读页测试」还要用）。
5. 不要把 Query 的 `sidecar` 接到任何「输出」节点。

保存，只发布给测试 Bot `7680824665929056310`。

---

## 5. 选中对齐 catalog 的 selectOption

卡片确认后要选中的，不是「点第 0 个元素」，也不是 PRD 里的 `fieldKey + valueCode`。

和前端 catalog 对齐：

- 单次：`operatePage` → `method: "selectOption"`，`args: [index, optionText]`
- 一组产品 + 原子：用 **`actions` 数组**，每一项仍是 `selectOption`

样例：[`../fixtures/sidecar-select-option.json`](../fixtures/sidecar-select-option.json)

`optionText` 用页面下拉里能看见的字（通常等于方案里的产品名 / 原子名）。  
`index` 是该下拉在读页结果 `interactiveElements` 里的编号。样例里的 `0` / `1` 是占位，真页联调要用读页结果替换。

---

## 6. 怎么验收

| 测什么 | 在哪看 | 过 |
|---|---|---|
| 拆包节点自己 | F_1 试运行，展开 `extract_sidecar` | `has_sidecar=true`；`reply_clean` 没有 `SIDECAR`；`sidecar` 是 JSON |
| 卖家页不露包 | A1 输出 / 测试 Bot 气泡 | 只有人话，没有 `<!--SIDECAR`，没有 `selectOption` JSON |
| 预览可以露 | Coze 预览与调试 / `extract_sidecar` / `page_intent_emit` | 能看到 sidecar 或 `renderA2UI` |
| 插件仍转发 | 对话流调试，发「出卡测试」 | 仍会发 `renderA2UI`（这是短句冒烟，和专家出口是两件事） |

若 D 的 `reply_to_user` 里已经没有起止标记：出口再拆也是空的。那是 recaller 把标识吃了，**这次不要改共享 D**；先确认出口接线是通的。

## 明确不要做

- 不要改现网 Query `7681286672969678888`
- 不要改共享 recaller `7656806829235077126`
- 不要用导入 zip 覆盖现网 Query
- 不要把 sidecar 写进 A1 或「输出」节点
- 不要把测试 Bot 绑到现网旧对话流 `7685663589169381391`
