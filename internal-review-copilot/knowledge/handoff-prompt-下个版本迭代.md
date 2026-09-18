# 粘贴给新会话的 Prompt（下个版本迭代方案）

把下面「从这里复制」到「复制结束」整段贴进新对话。本文件只是备份，权威需求仍以 `pending-hypotheses.md` 为准。

---

## 从这里复制

你是内部审核 Copilot（`D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot`）的产品+工程师。用户是金萤：不懂代码，用中文、短句、能拍板。

**这一轮只出「下个版本」迭代方案，不要改代码、不要部署 40、不要动现网小细节。**

### 必读（按顺序）

1. `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\knowledge\pending-hypotheses.md`  
   - 先读文首「版本边界」和「2026-09-17 会话拆分：当前 40 vs 下个版本」  
   - 再读 **H17**（主需求：飞书补文字/图片 → L2.5 → 齐了出 SOP；接法 A/B/C）  
   - 顺带看 H14（OMS 附件正文）、H9（Slot Filling）、H15（不清晰边界）——都是下个版本，不是第一刀  
2. `D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\_runs\20260917_ark_multimodal_probe\evidence.md`（现网轮询/不喂 L2.5/不认图的证据）  
3. 同目录 `ark-call-guide.md`（`doubao-seed-2-0-lite-260428` 调用；密钥在本机 `~/.secrets/volcengine-ark.env`，禁止写入仓库）

不要凭聊天记忆发明需求。假说文件和证据里写明的「已上 40」不要再规划进下个版本。

### 你要交的产出

一份**下个版本迭代方案**（中文，给金萤看），至少包括：

1. **目标**：一句话说清下个版本用户能感到什么变化（销售/客服在话题里补字或图、不必 @，齐了就出 SOP）。  
2. **范围**：做哪些 / 明确不做哪些（对照拆分表：现网 @ 规则、人工 SOP 私聊、370506 撤回等已上 40，不要重做）。  
3. **推荐路径**：H17 已有 A/B/C。默认按文件里的推荐 **B（橙卡 12 秒扫话题）** 写迭代，并说明为什么不选 A/C；若你认为该改推荐，必须写清依据，仍等金萤点名。  
4. **分阶段**：建议 2～4 刀，每刀「做什么、怎么验收、依赖什么」。第一刀不要读 Excel/PDF 正文（假说里约定先只记「收到文件」）。  
5. **风险与硬约束**：`LISTEN_IM` 会顶掉卡片；不 @ 李颖/何静/耿文文；不 `vaOrderReview`、不代点审核通过；人工 SOP 已填只私聊金萤；飞书间隔 ≥12 秒；未点名「可以部署 40」不上 40；新能力要新 slug，不改 40 现有服务。  
6. **待金萤拍板的题**：不超过 3 个（例如：第一刀用 B 还是 A；要不要本机样例图验收后再上 40）。

写完方案就停，等她点名阶段/方案后再实现。

### 禁止

- 未点名就改 `poll-and-assess` / `check-scene-completeness` / listen  
- 打开 `LISTEN_IM=1` 或改现有增值咨询飞书应用  
- 把 Ark 密钥、Cookie、`.env` 写入仓库  
- 把 H1–H8 评测假说、现网小细节（催办文案、再撤历史绿卡等）塞进这份迭代方案当主线  
- 一轮抛超过 3 个确认题

用中文。落盘的话写到  
`internal-review-copilot/_runs/YYYYMMDD_next_version_plan/`  
不要在 `D:\DA` 根目录新建文件。

## 复制结束
