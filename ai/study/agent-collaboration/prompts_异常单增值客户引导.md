# 协作话术包 — 异常单增值客户引导

> 配合 [playbook.md](playbook.md)。  
> 主线真源：`_workflow/20260720_增值预配置和客户引导助手规划/module_异常单增值客户引导/HANDOFF.md`  
> 更新：2026-07-24（按 HANDOFF：非标 2.1 本地已通；下一步优先线上导入或标准矩阵）

---

## 0. 会话怎么开（拓扑）

| 窗口 | 角色 | 模式 | 干什么 |
|------|------|------|--------|
| **A 答疑** | GPT | ASK | 只搞懂概念/路径/截图/为何失败 |
| **B 交付** | GPT | DO / FIX | 只推进 HANDOFF §1 一条 + 回填 §5 |
| **C 验收** | Opus | 只审 | PASS/FAIL；不改代码 |

规则：搞懂了用 A；动手用 B；B 收工后开 C。A 里得出的结论，**复制一句进 B**，不要让 B 自己「顺便解释」。

当前合法下一步（二选一，B 一次只开一条）：

1. **非标**：export v2 → 导入 Coze → 固定代发句起测 2.1 线上 E0→E2→E3  
2. **标准**：B0102E23 禁推/模糊/越权 + B03E03 最小 2 条进测试矩阵  

优先建议：先 **1**（关掉非标「本地通、线上未通」缺口），再 **2**。

---

## 1. 窗口 A — GPT 答疑（ASK）

开场粘贴：

```text
【模式=ASK｜答疑助手｜只解释不改任何文件｜不要跑写盘命令｜不要 export/git】

项目：异常单增值客户引导。主线只认 HANDOFF：
`_workflow/20260720_增值预配置和客户引导助手规划/module_异常单增值客户引导/HANDOFF.md`

我只想搞懂：________（一句话）
对照 HANDOFF：§0 / §1 / §2 里的 ________

可选背景（只读，你可打开核对，但禁止修改）：
- 决策层：`增值配置AI化/增值单ai指引助手/value-add-recommendation-rules/`
- v2：`agentic/experts/experts/value-add/value-add-product-recommendation-v2/`
- 非标金标：`…/deliverables/非标连通_2.1_换标上架/`
- 协作规矩：`learn(xuexi)/agent_collaboration/playbook.md`

回答要求：
1. ≤5 条要点
2. 用我能听懂的话；路径给绝对路径或 HANDOFF §2 层名（A/B/C/D）
3. 不要给「下一步你去改哪些文件」的执行清单；若必须提到动作，写成「建议你到【窗口B-DO】再下的一句话指令」
4. 结束用一行：【可带回 DO 的结论】：……
```

追问仍用同一窗口；一旦要改文件 → 停，开窗口 B。

---

## 2. 窗口 B — GPT 交付（DO）主推：非标 2.1 线上通

开场粘贴：

```text
【模式=DO｜交付执行｜归属：非标】

必读（按序）：
1. `_workflow/20260720_增值预配置和客户引导助手规划/module_异常单增值客户引导/HANDOFF.md`（§0→§1→§2→§5 最近 5 行）
2. `deliverables/非标连通_2.1_换标上架/`（已有金标，勿推翻重写）
3. `agentic/experts/experts/value-add/value-add-product-recommendation-v2/WHERE_TO_PUT_WHAT.md` + `IMPORT_AND_TEST.md`
4. （可选）窗口 A 结论一句：________

唯一目标：
把 2.1 非标连通从「本地节点通」推进到「Coze 可导入 + 固定代发句线上可演示 E0→E2→E3」。
够用即停：能按金标跑通或写清唯一阻塞；不要扩 2.1 以外 SOP。

硬约束：
- 测试第一句 = HANDOFF §0 固定代发句（`{eventNo}`），禁止 Udesk 当入口
- 确认用 SOP 摘要；确认≠审核通过；不对客甩仓内细步骤全文
- 只改：v2 源码（必要时）、重新 export 的 zip、本模块 deliverables/HANDOFF
- ❌ 不改无 v2 后缀正式包；❌ 不手改 zip 内逻辑（改源码再 export）；❌ 不改 D6；❌ 不物理搬家；❌ 不新建进度总结.md

交付物：
1. 新 zip 路径 + 导入步骤（或确认仍用现有 zip 的条件）
2. 线上/草稿试跑：输入（固定句+上下文）与输出路径证据（可摘关键字段，禁止整包 dump 进 HANDOFF）
3. 更新 HANDOFF §1 非标「已做/未做」+ §5 一行

收工固定输出：
- 归属：非标
- 主线推进：是/否（写清）
- 已改路径列表
- 请 Opus 验收的 3 个检查点
```

---

## 3. 窗口 B — GPT 交付（DO）备选：标准矩阵

仅当非标线上已通或你明确要先补标准时用：

```text
【模式=DO｜交付执行｜归属：标准】

必读：HANDOFF §0/§1；`value-add-recommendation-rules/`；v2 `IMPORT_AND_TEST.md`

唯一目标：
1) 沉淀 B0102E23 明确意图已通过用例的 I/O 进测试矩阵  
2) 补 B0102E23：禁推 / 模糊 / 越权 各≥1  
3) B03E03 最小 2 条  
入口一律固定代发句。试跑先看 validate-input 是否读到 exceptionCode / customerActionIntent / systemScopedVascList，再看是否 recommendation_ready。

禁止：宣称全异常支持；扩 P0 全表；改正式包。
延后进 BACKLOG。收工回填 HANDOFF §1/§5。
```

---

## 4. 窗口 B — GPT 纠错（FIX）

线上/验收没过、目标仍是当前那一刀时：

```text
【模式=FIX｜不扩 scope｜归属：非标或标准（二选一写死）】

现象：________（1 句；关键字段≤10 行，禁止整包 JSON）
期望：________（1 句，对照金标或 HANDOFF §0）
只改：________
禁止：扩 SOP 场景 / 改正式包 / 手改 zip / 新建进度 md

改完：回填 HANDOFF §5；列出 Opus 再验的 2 点。
```

---

## 5. 窗口 C — Opus 验收（只审）

GPT 的 B 收工后开新窗，粘贴：

```text
【角色=Opus｜只验收｜不执行｜不改代码｜不扩 scope】

必读：
1. HANDOFF 全文（§0 测入口、§1、§3、§5）
2. GPT 已改路径 + 交付物（默认非标：`deliverables/非标连通_2.1_换标上架/` + zip/试跑证据）

验收清单（逐项 ✅/❌ + 一句证据）：
A. 入口是否固定代发句（非 Udesk）
B. 是否锚定 2.1（若本次归属非标）/ 是否越权宣称全异常（若归属标准）
C. 对客是否「确认用 SOP 摘要」；有无暗示已审核通过/静默下发
D. 有无改正式包、手改 zip、新建进度 md、擅自改 D6
E. HANDOFF §1/§5 是否与交付一致；有无把「本地通」写成「线上通」
F. 若仍纯基础设施且主线缺口未动 → FAIL

输出：
1. 总判 PASS / FAIL / PASS-with-nits
2. A–F 逐项
3. 必须返工≤3 条
4. 可进 BACKLOG 的延后项
5. 一句：下一刀开标准矩阵还是继续非标

禁止：自己改 expert / 重写方案 / 因「还能更完美」判 FAIL
```

---

## 6. 你怎么调度（一页纸）

```text
不懂 / 路径乱 / 截图看不懂  → 窗口 A（ASK）
已懂、要推进 HANDOFF      → 窗口 B（DO；一次一条）
B 说做完了               → 窗口 C（Opus）
C 判 FAIL                 → 窗口 B（FIX），不要回 A 里改文件
连续截图/整包 dump 冲动   → 先写熔断三问再发（见 playbook）
```
