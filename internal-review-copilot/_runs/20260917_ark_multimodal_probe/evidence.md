# 信息是否完整：现状证据（只探测，未改代码）

时间：2026-09-17。流水线代码未改。

## 我对你意图的理解

你要的不是再发一张橙卡，而是这条链路：

1. 橙卡已经请销售/客服补信息（可能是文字，也可能是图片、Excel、PDF）。
2. 他们在话题里直接回复就行，**不必 @ 智能体**。
3. 系统要能收到这些补充（含图片/附件内容）。
4. **L2.5「信息是否完整」** 重新判断；齐全了就自动进下一节点（生成 SOP / 写 OMS），不要卡死在橙卡。

下面是对照现网代码和 40 配置的证据，不是方案。

## 结论先看

| 你以为的 | 现在实际 |
|---|---|
| 可能做了监听，或做了轮询 | **主路径是轮询**。`poll-and-assess` 每约 10 分钟扫话题 |
| 不用 @ 也能收到 | **轮询这条：不用 @**。实时 IM 监听反而要求 @，而且 40 上关着 |
| 补完就进下一节点 | 会重跑 pipeline，但 **重跑的是 OMS 原文**，飞书里刚回的字默认 **没有喂进 L2.5** |
| 图片/附件要识别内容 | **现在只看「有没有这个附件名」**，不读图、不读 Excel/PDF 正文 |

## 1. 节点本身：L2.5 `check-scene-completeness`

位置：`lib/check-scene-completeness.ts`，在 `match-template` 之后。

它做两件事：

1. **关键信息**：把客户需求**文字** + 「已上传附件名单」+ 单据上的仓/EB/WI 丢给现在的文本 LLM，问缺不缺。
2. **附件**：走规则 `check-completeness.ts`，只看 OMS 字段是 `uploaded` 还是 `missing`。

证据：提示词写的是「客户已上传以下附件：标签文件、操作说明…」，并写明 **不解析 Excel 内容**（`docs/tool-contracts.md`）。知识库假说 H14 仍是 P3：图片 Vision、文本附件解析都还没做。

所以现在的「完整」= 文字里能推断 + 附件**槽位已上传**，不是「打开图片看清了标签」。

## 2. 销售/客服补充：轮询，不是实时监听

40 上 `LISTEN_IM=0`。`listen-card-actions.ts` 明确写了：飞书同一应用只能有一条事件总线，开 IM 会把卡片按钮顶掉，所以现网 **只听卡片按钮**。

真正收「话题里有人回了」的是 `poll-and-assess.ts`：

- `refreshReplies`：对状态 `needs_clarification` / `needs_attachment` / `clarification_sent` / `awaiting_reply` 的单，拉话题消息。
- 过滤掉机器人自己的话；**不检查是否 @ 了 Bot**。
- 有人回了字 → 标成 `reply_received` → `reassessReplies` 再跑一遍 pipeline。

listen 进程里另有 **12 秒轮询**，但只服务 `sop_editing`（改 SOP 意见），**不管橙卡补信息**。

SOP 修改提示文案写过「请在本话题直接回复（不必艾特）」——那是改 SOP 路径。橙卡补信息走的是上面 10 分钟一轮的 poll。

## 3. 实时 IM 如果打开，反而要 @

`handleBotMessage`：没有 @ Bot 就 `return`。  
40 没开 `LISTEN_IM`，这条现在不生效。

## 4. 「齐全了流转下一节点」卡在哪

`reassessReplies` 再次调用 `runPipeline(detail)`。`detail` 来自 **OMS 拉单**，不是飞书回复。

飞书回复只进 `summarizeReply`，写成 `reviewRemark`（审核备注风格的文字），**没有拼进客户需求再交给 L2.5**。

因此：

- 销售在话题里打字补充 → poll 看得到有回复 → 但完整性仍按 OMS 旧需求判，**容易继续判不完整**。
- 他们把文件传到 **OMS 附件区**，下一轮拉单能看到 `uploaded`，这条规则路径是通的。
- 只把图片丢在飞书话题里 → `extractText` 往往拿不到字；空文本会被丢掉，**等于没补充**。

## 5. 图片/附件现在会丢在哪

| 来源 | 现在怎么处理 |
|---|---|
| OMS `vaAtomFiles` | 只记文件名/类型 → `attachmentStatus=uploaded` |
| 飞书话题纯文字 | poll 能收到（不用 @） |
| 飞书话题图片/文件 | 没有下载，没有 Vision，空文本则忽略 |
| Excel/PDF 正文 | 假说 H14，未做 |

## 和本次模型探测的关系

要把「话题里的图/附件」真正用于 L2.5，需要一个会看图的模型。密钥探测结果见同目录 `ark-call-guide.md`。本回合 **没有** 把这个模型接到 pipeline。
