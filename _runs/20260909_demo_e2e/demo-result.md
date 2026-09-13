# 飞书 E2E 业务演示记录（真 @ 重发）

- 日期：2026-09-10
- pipeline：`{ skipLlm: false, sceneLlm: true, sceneLlmVersion: 2 }`
- 人员配置：`_runs/20260909_demo_e2e/demo-personnel.json`
- 发送：回放 dry-run + 设计话术（客户脱敏、**飞书原生 at tag**）
- 本轮回执：`_runs/20260909_demo_e2e/live_at/`
- 上一轮文本 @ 回执仍在 `live/`，可忽略

## 人员 / open_id

| 角色 | 姓名 | 企业邮箱 | open_id |
|------|------|----------|---------|
| 销售 | 韩洪涛 | hongtao.han@winit.com | `ou_ca7db67030e3816c9b4c92b668fed784` |
| 审核员 | 耿文文 | wenwen.geng@winit.com | `ou_a59d62e22e542e6689abf3fea1e3d087` |

查询方式：`contact/v3/users/batch_get_id` 在演示 Bot（增值咨询 `cli_aa2a76198a7adcb3`）上仍缺 `contact:user.id:readonly`。改为用金萤 user 身份列【增值】异常沟通群成员，按姓名唯一匹配（各 1 人）。

回拉消息已确认 `mentions[]` 为原生 @（`key=@_user_N`，`name` 分别为韩洪涛 / 耿文文），不是纯文本。

## 拉人入群

测试群 `oc_80b07f38ed6833df3787a97a496f1097`：

- 演示 Bot 缺 `im:chat.members:read`，`ensureMembersInChat` 本轮跳过
- 已用 **综合解决方案 Bot** `im chat.members create` 拉入；`invalid_id_list` 为空
- 拉完后群内用户：金萤、韩洪涛、耿文文

回执：`_runs/20260909_demo_e2e/live_at/ensure-members.json`

## Dry-run（沿用，未再调 SOP LLM）

| Case | 单号 | 预期路径 | 实际路径 | looksInvented | assertNoForbidden |
|------|------|----------|----------|---------------|-------------------|
| L4 | VASC000000315774 | sop_generated | sop_generated | false | pass |
| L3 | VASC000000298617 | needs_field_clarification | needs_field_clarification | false | pass |
| L2 | VASC000000326061 | transfer_human | transfer_human | false | pass |

298617 为演示构造：去掉操作说明 + 仅 demo 进程内给拍照暂存加必填门禁。生产场景卡未改。

298617 仓库为金标真实仓 **USKY3**（设计稿 USWC5 为笔误）。

## Case 1 L4 — VASC000000315774

- topic：`omt_19c7e66bf68fdb86`
- 根消息：`om_x100b6512a4e084acc2ac6e4edb81264`
- 发送：2026-09-10 16:47（增值咨询 tenant）
- 真 @：耿文文

```
📋 增值单 AI 预审结果 — VASC000000315774
客户：DEMO_CUST001 / ××科技有限公司（脱敏）
仓库：USNJ2 Warehouse
异常单：EB0126060330032532
场景识别：【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架

✅ 附件已齐全，SOP 已生成：
【操作要求】
1. 根据异常单 EB0126060330032532 定位待处理的 14 个包裹
2. 根据客户提供的辨识方法（外箱 A+ 包裹标签确认 SKU）做辨识
3. 补贴包裹标签 × 14，并上架到新入库单 WI50734175
4. 将异常单状态变更为已完成，关闭异常单

@耿文文 请确认以上 SOP 是否正确，确认后可下发仓库执行。
处理方式：暂时
```

## Case 2 L3 — VASC000000298617

- topic：`omt_19c7e66cb74e5b88`
- 根消息：`om_x100b6512a49498b4c247603c91b1b1c`
- 真 @：韩洪涛、耿文文

```
📋 增值单 AI 预审结果 — VASC000000298617
客户：DEMO_CUST002 / ××贸易有限公司（脱敏）
仓库：USKY3 Warehouse
异常单：EB0326061230366501, EB0326061230362709
场景识别：【入库】指定商品拍照暂存

⚠ 场景已识别，但以下材料需要补充：
- ❌ 操作说明附件（拍照要求/SOP 说明）

@韩洪涛 请联系客户补充以上材料。补齐后 AI 将自动生成操作 SOP。
@耿文文 待材料补齐后请确认。
处理方式：暂时
```

## Case 3 L2 — VASC000000326061

- topic：`omt_19c7e661624e9be6`
- 根消息：`om_x100b6512a449c8b8c4addf97a2165ec`
- 真 @：耿文文、韩洪涛

```
📋 增值单 AI 预审结果 — VASC000000326061
客户：DEMO_CUST003 / ××供应链有限公司（脱敏）
仓库：USKY5 Warehouse
异常单：EB0326072531612017
异常类型：包裹内出现订单外商品

🔄 本单需求较复杂，AI 无法自动匹配场景，已转人工审核。

已识别的信息摘要：
- 客户提到：第三方编码已关联 + 补贴包裹标签 + 新单上架
- 异常类型“包裹内出现订单外商品”涉及多步骤处理

@耿文文 请人工审核此单。以上摘要供参考。
@韩洪涛 如需补充材料审核人员会通知。
处理方式：暂时
```

## 备注

1. 演示 Bot 仍缺 `contact:user.id:readonly` 与 `im:chat.members:read`；本轮 open_id 与拉人走的是综合解决方案 / 金萤可见的群成员接口。
2. 298617 仍是演示构造 L3。
3. 三条按 L4→L3→L2 连发。

## 产出路径

```
Nonsta_Valueadded_Combined/_runs/20260909_demo_e2e/
  demo-personnel.json   # 已写入 open_id
  dryrun/
  live/                 # 上一轮文本 @
  live_at/              # 本轮真 @ 回执
  demo-result.md
```
