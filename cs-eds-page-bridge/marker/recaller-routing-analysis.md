# recaller 怎么调用增值推荐 expert

解压来源（只读分析，未改现网画布）：

- Query：`Nonsta_Valueadded_Combined/Chatflow-cs_Default_Query_v4_staging_F_1-draft-605.zip`
- Expert：`Nonsta_Valueadded_Combined/Workflow-value_add_product_recommendation_20260630_1-draft-721.zip`
- 解压副本：`cs-eds-page-bridge/_runs/20260917_marker_test/_unzip/`

结论先说：**按 `coze_workflow_id` 调用，不按专家名称匹配。** 改哪张专家、要不要动登记表，取决于表里填的那个 id。

---

## 1. Query 画布上有三个 recaller，真正接线的只有 D

这张导出是 `cs_Default_Query_v4_staging_F_1`（MANIFEST id `7686361673971695625`），空间 `7417755373999767571`。

| 画布标题 | 节点 id | 子流程 workflowId | 版本 | 有没有连线 |
|---|---|---|---|---|
| `experts_recaller_v2_staging_A_1` | `177338` | `7649758025938485283` | v0.0.2 | **没有**（空挂） |
| `experts_recaller_v2_staging_D` | `195168` | `7656806829235077126` | v0.0.12 | **有** |
| `experts_recaller_v2_staging_F` | `146564` | `7681305318780944411` | v0.0.2 | **没有**（空挂） |

连线：`post_get_solution`（`191670`）→ `experts_recaller_v2_staging_D`（`195168`）→ 后面拼装 / A1。

A1「拼装问题资料并组织回答」的 `summary` / `key_points` / `handoff_log_markdown` 全部引用 **`195168`（staging_D）** 的输出，不是 F。

所以：名字带 staging_F 的 Query 副本，专家编排仍走 **staging_D 那张 recaller**。试运行时请展开 D，不要找没连线的 F。

三个 recaller 的 `spaceId` 都是测试空间 `7417755373999767571`。这只说明 **recaller 子流程本身在测试空间**，不说明它调的 expert 也在测试空间。

---

## 2. 专家 id 从哪来（Query 侧）

`post_get_solution` 把 qa-gen 召回行的 `sys_experts` 拆开、去重，得到 `expert_ids` 字符串数组（例如 `value-add-product-recommendation`）。

这是 **expert_id 名称**，还不是 Coze 工作流 id。

---

## 3. recaller 怎么变成一次真正的专家调用

recaller 源码与 D 导出一致，两步：

1. **`get-expert-registry`**：用 `expert_ids` + `release_id` 查飞书多维表  
   - 表：`appToken=Oup1bQvrJabY24sOyphcQ0C1nic` / `tableId=tbl9O8hbznssef7v`  
   - 取出该行的 **`coze_workflow_id`**
2. **`call-expert`**：`POST https://api.coze.cn/v1/workflow/run`，body 只有 `workflow_id` + 专家入参。  
   **没有**按工作流名称搜索，**没有**写死空间 id。哪个空间的专家，完全取决于表里这个 id 属于哪张工作流。

本地 CSV 快照 `qa-gen_expert_system_experts.csv`：

```
value-add-product-recommendation  →  coze_workflow_id = 7657143181591642112
```

这次解压的 expert zip：

```
name: value_add_product_recommendation_20260630_1
id:   7686362193743085631
```

**登记表 id ≠ 这次 zip id。** zip 是带 `_1` 的导出副本。只改副本、不改登记表，对话流仍会打到 `7657143181591642112`。

---

## 4. 专家结束节点吐什么，下游能看见什么

专家结束节点四个输出：`structured`、`analysis`、`outputContext`、`enrichedContext`，都引用 `format-output`。

recaller 拿到后：

| 字段 | 还会不会出现在聊天气泡路上 |
|---|---|
| `analysis` | 会进 handoff，再被 **总结 LLM** 收成一句 `reply_to_user` |
| `structured` | 留在 recaller 内部步骤记录；**A1 看不到整包** |
| `reply_to_user` | 这是 Query 往下唯一当「专家意见」用的字符串 |

D 导出里，总结节点的系统提示明确要求：输出 JSON `{ reply_to_user, key_points }`，并且是「给下游模型用的事实摘要，不是对客原话」。它 **没有**「原样保留 HTML 注释 / 原样保留 JSON」的指令。

因此第 0 步最可能掉标识的地方：

1. **recaller 总结 LLM**（`analysis` 里的 `<!--SIDECAR_...-->` 被改写成摘要）
2. **A1**（提示词写了「解读专家 json，重写成对客句子」）
3. `tools_msg_cleaner`（清的是对话历史里的程序符号；当前句是否被清，要看调试页，不要事先当成主因）

---

## 5. 和测试 Bot 的关系（避免测错画布）

本地 Bot Client 接线包里，Query 子流程仍是：

- 标题：`cs_Default_Query_v4_staging_F`
- workflowId：`7681286672969678888`

这次分析的 zip 是 **`staging_F_1`**（`7686361673971695625`）。可能是另一份副本。

打测试 Bot 前，在 `cs_Bot_Client_v2p_1`（`7685975376836739124`）画布上确认 Query 子流程的 id：

- 若仍是 `7681286672969678888`：逐节点请打开 **那张 F**，不要只看 F_1 zip
- 结构应同族（同样有 recaller D + A1）；F_1 的结论（按 id 调用、A1 接 D、structured 出不去）仍然适用

---

## 6. 帮你判断走路径 A 还是路径 B

在 Coze 打开 recaller D 某次成功调用的专家子运行，看专家 `workflow_id`：

| 你看到的专家 id | 含义 | 贴标识走哪条 |
|---|---|---|
| 测试空间里的副本（例如 `7686362193743085631`） | recaller 已经在打测试副本 | **路径 A**：直接改测试空间这张，CSV 不动 |
| `7657143181591642112`（登记表现值） | 打的是登记表那张（多半是正式专家） | **路径 B**：改那张的草稿且不发布现网，或点名后把登记表改到测试副本 |

**第 0 步在你确认之前，不要改飞书登记表，不要发布现网专家。**

---

## 7. 对第 0 步的含义（不是猜测通道结果）

- 标识必须写在专家 **`analysis`**（结束节点那个人话字段），写在 `structured` 里测气泡没有意义。
- 即使结束节点原样吐出标识，**也不能**假设气泡里还有：中间至少隔着 recaller 总结 LLM 和 A1 两层改写。
- 第 0 步就是把这两层（再加上 cleaner / 输出节点）逐格记下来，看标识在哪一格消失。
