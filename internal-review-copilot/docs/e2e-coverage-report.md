# E2E 测试覆盖报告

> 生成时间：2026-09-10
> 基于代码 review：listen-card-actions.ts / demo-e2e.ts / poll-and-assess.ts / feishu-card.ts / oms-draft-write.ts

---

## 一、状态机全景

```
pending
  → first_assessed
      ├─ [L4 sop_generated] → sop_ready
      │     ├─ 点"确认写入 OMS" → written_back（终态）
      │     ├─ 点"SOP 需修改" → sop_editing → 话题回复 → 修订绿卡 → sop_ready（最多 3 次）
      │     └─ （超时未点）→ 留在 sop_ready
      │
      ├─ [L3 needs_field_clarification] → clarification_sent → awaiting_reply
      │     ├─ 客户/销售回复 → reply_received → reassessed → sop_ready / transferred
      │     └─ 4 小时无回复 → 催办
      │
      ├─ [L1 needs_requirement_clarification] → clarification_sent → awaiting_reply（同上）
      │
      └─ [L2 transfer_human] → awaiting_scene_confirm
            ├─ 审核员点场景按钮 → scene_confirmed → 重跑 pipeline
            │     → sop_ready / awaiting_reply / transferred
            ├─ 审核员点"人工处理" → transferred（终态）
            └─ 4 小时无回复 → 催办
```

终态：`written_back` / `transferred`（`sop_ready` 等人点按钮，不是终态）

---

## 二、卡片按钮覆盖状态

| 按钮 | 卡片类型 | 定义 | 事件监听 handler | OMS 交互 | E2E 测试 |
|------|---------|------|----------------|---------|---------|
| 场景选择（各场景名） | 蓝色卡片 | ✅ feishu-card.ts | ✅ handleConfirmScene | 无 | ✅ 326061 测过（但按钮点击曾不响应） |
| "以上都不是，人工处理" | 蓝色卡片 | ✅ feishu-card.ts | ✅ handleConfirmScene (sceneKey=transfer_human) | 无 | ✅ 326061 测过 |
| "确认 SOP 正确，写入 OMS" | 绿色卡片 | ✅ feishu-card.ts | ✅ handleConfirmSopWrite | ✅ writeDraft | ✅ 315774 + 360654 测过 |
| **"SOP 需修改"** | 绿色卡片 | ✅ feishu-card.ts | ✅ handleSopNeedsEdit → sop_editing | 无（重生成后仍可写入） | 常驻 listen + 12s 话题轮询 + 流式进度 |

---

## 三、已覆盖的链路（✅）

### 链路 1：L4 直通 → SOP → 写入 OMS

```
pipeline → sop_generated → 绿色卡片 → 点"确认写入 OMS" → writeDraft → written_back
```

| 测试单号 | 结果 |
|---------|------|
| VASC000000315774 | ✅ SOP 写入成功，OMS 回读验证通过 |
| VASC000000360654 | ✅ 写入成功（海运整柜场景，附件为空直接放行） |

### 链路 2：L2 → 场景确认 → SOP → 写入 OMS

```
pipeline → transfer_human → 蓝色卡片 → 审核员选场景 → 重跑 pipeline → 绿色卡片 → 写入 OMS
```

| 测试单号 | 结果 |
|---------|------|
| VASC000000326061 | ⚠ 按钮曾不响应（token 过期），重发后审核员选了"人工处理" → transferred |
| VASC000000360654 | ✅ 选了"海运整柜" → SOP 生成 → 写入 OMS |

### 链路 3：L3 → 追问 → 等待回复

```
pipeline → needs_field_clarification → 橙色卡片 → @销售补材料
```

| 测试单号 | 结果 |
|---------|------|
| VASC000000298617 | ✅ 橙色卡片发出，@人正确 |

### 链路 4：L2 → 审核员选"人工处理"

```
pipeline → transfer_human → 蓝色卡片 → 点"人工处理" → transferred（终态）
```

| 测试单号 | 结果 |
|---------|------|
| VASC000000326061 | ✅ 卡片更新为"已转人工" |

---

## 四、未覆盖的链路（❌）

### ✅ 链路 5：SOP 需修改 → 审核员话题回复 → 流式改写 → 修订绿卡 → 确认写入 OMS

```
绿色卡片 → 点"SOP 需修改" → 卡片变橙色 + 话题提示「不必艾特」
  → 审核员在话题直接打字
  → 常驻 listen 12s 内拉到意见
  → 立刻发「正在改写」并流式更新
  → 改完发修订绿卡
  → 点「确认写入 OMS」才真写
```

**当前状态：**
- 按钮定义：✅ 有
- 事件监听 handler：✅ handleSopNeedsEdit → `sop_editing` + badcase
- 常驻轮询：✅ `listen-card-actions` 每 12s 调 `refreshSopEdits`（不必艾特、不必回 Cursor）
- 流式进度：✅ 先发「正在改写」文本，LLM `onDelta` 节流 PATCH 同一条消息
- 改完发卡：✅ 修订绿卡；点确认才 `writeDraft`
- 最多 3 次，第 4 次转人工；`sop_ready` 已从 TERMINAL 移除
- E2E：360654 本轮重发可点绿卡，走完整闭环

### ❌ 链路 6：L3 追问 → 客户补材料 → 重新评估 → SOP 生成

```
橙色卡片 → @销售补材料 → 客户在 OMS 上传附件 → ??? → pipeline 重跑 → sop_generated
```

**当前状态：**
- 追问卡片发出：✅
- **但之后断了**：
  - ❌ 没有监听 OMS 附件状态变化（客户什么时候补了附件）
  - ❌ poll-and-assess 的 `refreshReplies` 只监听飞书话题的文本回复，不监听 OMS 附件变化
  - ❌ 客户在 OMS 补了附件后，pipeline 不会自动重跑
  - 当前只能：客户补完后销售在飞书话题回复"已补齐" → poll 检测到 → reassess → 但 reassess 跑 pipeline 时如果不重新读 OMS 附件状态，还是会判缺附件

**需要设计的：**
- 方案 A：定时轮询 OMS 附件状态（poll-and-assess 增加 refreshAttachmentStatus 步骤）
- 方案 B：飞书话题回复"已补齐"触发重跑（当前 reassess 逻辑需要确认是否重新读 OMS）
- 方案 C：附件通过 TOM API 上传（任务 C 探测中）

### ❌ 链路 7：OMS 写入失败 → 重试

```
点"确认写入 OMS" → writeDraft 失败（Cookie 过期 / 网络错误）→ ??? → 重试
```

**当前状态：**
- writeDraft 失败时：卡片更新为红色"写入失败：{error}"
- **但之后断了**：
  - ❌ 没有重试按钮（卡片按钮已消失，因为 token 用来更新过了）
  - ❌ 状态停在 `sop_ready`（没变成 written_back），但也没有触发重试的机制
  - 审核员只能等开发人工修 Cookie 后重跑

**需要设计的：**
- 写入失败后发一条新消息（不是更新卡片）："写入失败，点此重试"带新按钮
- 或：自动刷新 Cookie 后重试一次

### ❌ 链路 8：审核员在非卡片渠道操作（直接去 OMS 操作）

```
AI 发了卡片 → 审核员没点按钮，直接去 OMS 手动审核通过了 → pipeline 不知道
```

**当前状态：**
- ❌ 没有监听 OMS 侧的状态变化
- case-store 会一直停在 `awaiting_scene_confirm` 或 `sop_ready`
- 4 小时后发催办，但实际已经审完了

**需要设计的：**
- poll-and-assess 增加 OMS 状态同步：定期查 OMS 订单状态，如果变成"已审核"，自动标记 case 为 `written_back`

---

## 五、OMS 交互覆盖状态

| OMS 操作 | 代码实现 | E2E 测试 | 说明 |
|---------|---------|---------|------|
| 读取增值单详情 | ✅ oms-tom-client.ts | ✅ | Cookie + CSRF |
| 写入场景概述码 | ✅ oms-draft-write.ts | ✅ 360654 | updateAtomDetails |
| 写入操作 SOP | ✅ oms-draft-write.ts | ✅ 360654 | updateAtomDetails |
| 追加 AI 总结到需求描述 | ✅ oms-draft-write.ts | ⚠ 待验证 | 只追加 requirementDescription |
| 追加 AI 总结到需求背景(BEOR) | ✅ oms-draft-write.ts | ⚠ 待验证 | 只追加 requirementBackground |
| 写入仓库动作费用明细 | ✅ oms-draft-write.ts | ❌ 未测 | createdVaActionFeeDetail |
| 读取附件状态 | ✅ pipeline 已有 | ✅ | 从 OMS 字段读 |
| **下载附件文件内容** | ❌ 未实现 | ❌ | 任务 B 探测中 |
| **上传附件到 OMS** | ❌ 未实现 | ❌ | 任务 C 探测中 |
| **审核通过（vaOrderReview）** | ⛔ 硬编码拦截 | ✅ 已验证拦截 | 永不自动审核 |
| **监听 OMS 状态变化** | ❌ 未实现 | ❌ | 链路 8 需要 |

---

## 六、优先级排序

| 优先级 | 链路 | 影响 | 工作量 |
|--------|------|------|--------|
| **P0** | 链路 5：SOP 需修改 | 常驻 listen + 流式 + 确认写 OMS | 本轮 E2E 打通 |
| **P1** | 链路 6：L3 附件补齐后重跑 | 追问链路断在"客户补了但 pipeline 不知道" | 1 天 |
| **P1** | 链路 7：OMS 写入失败重试 | 写入失败后无法恢复 | 0.5 天 |
| **P2** | 链路 8：OMS 状态同步 | 审核员绕过 AI 直接操作时状态不同步 | 1 天 |
| **后续** | 附件下载进 LLM | SOP 质量提升 | 2-3 天 |
| **后续** | 附件上传（飞书→OMS） | 减少客户手动操作 | 1-2 天 |

---

## 七、已知 Bug 状态

| Bug | 状态 | 说明 |
|-----|------|------|
| 298617 @错人 | ✅ 已修复 | 改用 demo-personnel.json |
| Bot 自回复污染 | ✅ 已修复 | 改用卡片按钮 + sender 过滤 |
| 326061 按钮不响应 | ⚠ 疑似 token 过期 | 重发新卡后需重测 |
| 确认人显示 open_id 而不是真名 | ⚠ 待修复 | operator_id → 姓名查询 |
| "处理方式：暂时"显示 | ✅ 已从卡片去掉 | case-store 仍保留，不影响展示 |
| AI 总结追加到需求描述 | ⚠ 待验证 | 刚加的功能 |
