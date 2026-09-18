# Coze UI：把测试标识贴进增值推荐 expert

隔离靠 **测试 Bot + 副本画布**，不靠另开一个 Coze 空间。`7417755373999767571` 是空间号，测试 Bot 是 `7680824665929056310`。不要发布到现网 Bot「客服-全场景-Default」。现网正在嵌套的 Query staging_D / recaller D / 登记表那一行专家，不要改。

整条复制接到测试 Bot 的接法（以及为什么不能只改 expert 的 `release_id`）见：[`../../ai/study/客服嵌套链路与出卡联调.md`](../../ai/study/客服嵌套链路与出卡联调.md)。

第 0 步如果只**观察**标识会不会被吃掉：可以不改 Query、不改共享 recaller；只改**副本专家**的结束节点。一旦要改 recaller 或它调用哪张专家，必须先导入 recaller 副本并在 Query 里换子流程 id。

粘贴文本：同目录 [`test-marker-recommend.txt`](test-marker-recommend.txt)（全文复制）。

## 先确认你改的是哪张 expert（必读）

recaller **不是按名字找专家**，而是拿飞书专家登记表里的 `coze_workflow_id`，再 `POST /v1/workflow/run`。本地 CSV 快照是：

| 项 | 值 |
|---|---|
| expert_id | `value-add-product-recommendation` |
| 登记表里的 coze_workflow_id | `7657143181591642112` |
| 这次解压的 zip 工作流 id | `7686362193743085631`（名字带 `_1`，是副本） |

**这两个 id 不一样。** 你在副本上贴标识，如果登记表仍指向 `7657143181591642112`，真实对话走的还是旧专家，气泡里不会出现标识。

打开专家工作流后，看浏览器地址栏的 `workflow_id=`，和上面两行对一下。

分析依据：[`recaller-routing-analysis.md`](recaller-routing-analysis.md)。

---

## 路径 A — recaller 读的是测试空间这张 expert

适用：地址栏 `workflow_id` 已经是测试空间里你准备改的那张（例如这次 zip 的 `7686362193743085631`，或登记表已被人改成测试副本）。

CSV / 飞书登记表 **不用动**。

### 操作

1. 打开测试空间 `7417755373999767571` 里的 `value_add_product_recommendation_...` 工作流（草稿即可）。
2. 点画布最右边的 **结束** 节点。
3. 找到输出字段 **`analysis`**（对客可读说明）。它现在是「引用」`format-output.analysis`。
4. 把 `analysis` 改成 **自定义文本**（不要引用），把 [`test-marker-recommend.txt`](test-marker-recommend.txt) **全文粘进去**。
5. `structured` / `outputContext` / `enrichedContext` **保持引用，不要改**。
6. 保存。第 0 步可以只保存草稿；若测试 Bot 只能跑已发布版，就只发布到测试空间，不要绑现网 Bot。
7. 用 Query 试运行或测试 Bot 发 [`test-questions.md`](test-questions.md) 第 1 条。

改完后结束节点吐出的 `analysis` 就是「人话 + 标识」。这正是 recaller 会拿去写 `reply_to_user` 的那一段。

---

## 路径 B — recaller 读的是线上那张 expert（登记表仍是 `7657143181591642112`）

适用：测试 Bot 走 Query → recaller 后，实际打开的专家 id 仍是 `7657143181591642112`。

**不要改现网已发布版本让全部卖家生效。** 两条子路径只选一条：

### B1（推荐，改动面小）

1. 打开 **线上那张** `7657143181591642112` 的 **草稿**（不要点「发布」）。
2. 按路径 A 的第 2–5 步，只改草稿的结束节点 `analysis`。
3. 用 **工作流试运行**（只跑这张专家，不经过 Query）确认结束节点里标识还在。
4. 若要用测试 Bot 走完整对话流：只把这张草稿发布成测试空间能调用的版本，或问清楚当前 PAT 调的是草稿还是线上发布版。**不确定就先停，不要点现网发布。**

### B2（把登记表临时改到测试副本）

1. 在测试空间保留/导入副本（这次 zip 解压后的 id `7686362193743085631`）。
2. 按路径 A 把标识贴进副本结束节点。
3. 改飞书专家登记表（或同步用的 CSV）里 `value-add-product-recommendation` 的 `coze_workflow_id`，改成测试副本 id。
4. 测完必须改回 `7657143181591642112`。第 0 步未点名授权前，不要改这张表。

路径 B 在「要不要动登记表 / 要不要动线上草稿」上需要你点名。没点名就先走路径 A 的「只跑专家工作流试运行」，不要绑现网。

---

## 结束节点为什么改 `analysis`，不改 `structured`

Query 里 A1 拿到的专家内容，来自 recaller 的 **`reply_to_user`**。recaller 的总结模型吃的是专家 `analysis`（再加 handoff 日志），**不会把 `structured` 原样交给 A1 或聊天气泡**。

标识只放 `structured` → 第 0 步会得到「专家里有、气泡里没有」，这不能证明通道通了。

## 测完记得撤

第 0 步是硬编码整段 `analysis`。测完把结束节点改回「引用 `format-output.analysis`」，不要把假推荐人话留在草稿里。

## 明确不要做

- 不改现网 Query 画布（含 A1 提示词、cleaner、输出节点）
- 不改共享 `experts_recaller` 子流程
- 不把测试 Bot 绑到现网旧对话流 `7685663589169381391`
- 不把标识写进 `qa-gen_base.csv`

副本 Query F_1 加 sidecar 出口（现网 Query 不动）的步骤见 [`query-f1-sidecar-outlet.md`](query-f1-sidecar-outlet.md)。选中用 catalog `selectOption`，样例在 [`test-marker-recommend.txt`](test-marker-recommend.txt)。
