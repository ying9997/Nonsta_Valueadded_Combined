# 标识通道诊断报告

状态：**模板**（节点原文待你从 Coze 调试页粘贴；Chat API 气泡待跑 `run-marker-test.js`）

## 测试配置

- 测试 Bot: （填 BotID，必须绑 `cs_Bot_Client_v2p_1` / `7685975376836739124`）
- 对话流: `cs_Bot_Client_v2p_1`（`7685975376836739124`）
- Query 副本: 打开 Bot Client 画布确认子流程 id。分析用的 zip 是 `cs_Default_Query_v4_staging_F_1`（`7686361673971695625`）；接线包里旧绑定是 `cs_Default_Query_v4_staging_F`（`7681286672969678888`）
- Recaller（这张 F_1 真正接线）: `experts_recaller_v2_staging_D`（`7656806829235077126`）
- Expert: `value-add-product-recommendation`
  - 登记表 id（CSV 快照）: `7657143181591642112`
  - 本次 zip 副本 id: `7686362193743085631`
  - 实际改的是哪张: （填）
- 标识格式: `<!--SIDECAR_BEGIN-->` ... `<!--SIDECAR_END-->`
- 测试问题: 「我有一批包裹需要换标签上架，应该选哪个增值产品？」
- 本步要求: **不需要标识内容正确，只需要标识还在。不改现网 Query / Bot / recaller。**

## 逐节点结果

过关 = 文本里同时有 `<!--SIDECAR_BEGIN-->` 和 `<!--SIDECAR_END-->`，且中间还能 `JSON.parse`。

| # | 节点 | 标识在不在 | 被改了什么 | 粘贴文件 |
|---|------|-----------|-----------|---------|
| 1 | expert 结束节点 `analysis` | ✓/✗ | | `node-1-expert-output.txt` |
| 2 | experts_recaller 的 `reply_to_user`（展开 staging_D，不要看没连线的 F） | ✓/✗ | | `node-2-recaller-output.txt` |
| 3 | A1「拼装问题资料并组织回答」 | ✓/✗ | | `node-3-a1-output.txt` |
| 4 | tools_msg_cleaner（看它清的是不是当前这句；多数情况清的是历史） | ✓/✗ / 未经过 | | `node-4-cleaner-output.txt` |
| 5 | Query 输出节点（用户已经能看见的那句） | ✓/✗ | | `node-5-query-output.txt` |
| 6 | 聊天气泡（测试 Bot 预览 或 `run-marker-test.js` → `chat-bubble-output.txt`） | ✓/✗ | | `chat-bubble-output.txt` |

## 怎么填节点原文

1. 打开 Query（Bot 实际绑定的那张）→ 试运行 → 贴测试问题。
2. 按上表逐格展开，把该节点完整输出复制进对应 txt（不要只截前两行）。
3. 气泡用 Bot 预览，或：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined\cs-eds-page-bridge\_runs\20260917_marker_test
$env:COZE_BOT_ID = "<测试BotID>"
node run-marker-test.js
```

## 结论

- 标识在第 N 步被破坏：（填 1–6；若全程还在，写「未被破坏」）
- 破坏方式：（勾一个）
  - [ ] 被 recaller 总结大模型改写（最常见预期：`analysis` 有，`reply_to_user` 没了）
  - [ ] 被 A1 改写 / 拆碎
  - [ ] 被 cleaner 清除
  - [ ] 字段没传出去（标识只在 `structured`，不在 `analysis`）
  - [ ] 测错了专家（改的是 zip 副本，登记表仍打 `7657143181591642112`）
  - [ ] 全程还在（意外绿灯）
- 下一步应选候选（第 0 步之后只点名一条，不要三条一起做）：

| 候选 | 何时选 | 做法 |
|---|---|---|
| **A（推荐先想）** | 专家结束节点有标识，但 recaller / A1 / 气泡没了 | 标识放 expert `structured`；Query 结束或会话变量**原样**带到对话流出口；人话仍走 A1。要改 Query 出口，需另一次点名授权 |
| **B** | 希望本专家完全不经过 A1 | 本专家走 Query 旁路，结束节点直接吐 expert 原文。气泡里可能出现机器字 |
| **C** | 标识通道证明走不通，且前端仍按口令收 | 继续用已接好的 `tool_call_send`（对话流 `7685975376836739124`），标识通道放弃 |

未做第 0 步对照之前，不要改 Query 画布。

## 已知结构（分析已完成，不是跑测结果）

详见 `cs-eds-page-bridge/marker/recaller-routing-analysis.md`。

- recaller 用飞书表 `coze_workflow_id` 调专家，不按名称。
- 这张 F_1 画布真正连线的是 recaller D。
- A1 提示词要求「解读专家 json 再对人说话」——标识很难指望它手下留情。
