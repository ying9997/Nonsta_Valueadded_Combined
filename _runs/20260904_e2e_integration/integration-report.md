# 内部审核 Copilot 端到端集成报告

- 执行时间：2026-09-03
- 演示目标：D+2（2026-09-05）
- 输入：`_runs/20260902_ow01v1602_review_orders/details.json`
- 演示单：`VASC000000348477`
- 飞书发送身份：金萤（`user_access_token`）
- 规则节点未修改：`check-requirement` / `match-template` / `check-completeness`

## 结论

端到端链路已跑通：真实 OMS 单据快照 → 确定性规则 → 真实 LLM 追问 → 真人身份发飞书话题 → 模拟回复 → 可复制审核备注 → case-store → 二次轮询去重 → 日报导出。

D+2 演示可用。当前演示单仍缺「操作说明附件」「商品和标签的对应关系」，因此正确停在 `needs_field_clarification`，不生成 SOP，不自动审核。

## 步骤验收

| 步骤 | 结果 | 证据 |
| --- | --- | --- |
| 真实单 AI 判定 | 通过 | F-001，confidence=1，缺 2 项资料 |
| 真实 LLM 追问 | 通过 | 自然语言说明已知事实、已传附件与缺失资料 |
| 飞书发群 | 通过 | 业务标题、@人、正文末尾 💪，真人身份发送 |
| 飞书话题 | 通过 | topic `omt_19fccb358b8e1be9` |
| 模拟回复总结 | 通过 | 六段审核备注完整，可直接复制 |
| 16 单轮询 | 通过 | case-store 16 条，0 个 LLM 错误 |
| 转人工通知 | 通过 | 15 条 `transfer_human` 均发飞书 |
| 缺资料通知 | 通过 | `VASC000000348477` 已发飞书 |
| 二次轮询去重 | 通过 | 16 条全部 `skip_existing`，无重复发送 |
| LLM 失败降级 | 通过 | 故意使用无效 key，输出 `transfer_human`，流程 exit 0 |
| 日报导出 | 通过 | `pilot-export/pilot-daily.md`、`pilot-daily.json` |

## 状态表结果

| 指标 | 数量 |
| --- | ---: |
| 总案件 | 16 |
| `transferred` | 15 |
| `awaiting_reply` | 1 |
| 飞书根消息已记录 | 16 |
| LLM 错误 | 0 |

第二轮日志片段：

```text
skip_existing VASC000000348495 status=transferred
skip_existing VASC000000348477 status=awaiting_reply
...
skip_existing VASC000000347517 status=transferred
poll_done cases=16
```

## 集成中发现并修复

1. **演示日志过于偏技术**
   - 改为「需求完整性 / 场景匹配 / 附件完整性 / 结论」中文摘要。
   - 最后明确打印结构化结果与可复制备注路径。

2. **演示飞书失败会中断**
   - 飞书发送增加 `try/catch`；失败打印警告，继续回复总结和产物落盘。

3. **飞书标题与手机排版**
   - 标题改为 `增值单 <VASC> 缺资料/缺需求/转人工`。
   - 正文发送前去掉 Markdown `**` 和反引号，末尾保留 💪。

4. **轮询未通知转人工案件**
   - 增加 `transfer_human` 飞书通知；本次 15 条均发送成功。

5. **话题 ID 与根消息 ID 混用**
   - 回复使用 `om_` 根消息 ID；读取话题使用 `omt_` + `container_id_type=thread`。

6. **OMS 拉取失败没有本地回退**
   - 增加 `--fallback-input`；默认回退到已有 2026-09-02 `details.json`。

7. **真人代发权限**
   - OAuth token 实际包含 `im:message` + `im:message.send_as_user`；真人身份发群验证通过。

8. **LLM 失败时演示标题不一致**
   - 降级后标题改为「转人工」，不再沿用规则原路径的「缺资料」。

## 模拟回复审核备注

审核备注包含：

- 客户原始需求
- AI 补全后需求
- 本次补充来源
- 仍缺失的信息
- 建议审核动作
- SOP 草稿

文件：`demo-simulated-reply/VASC000000348477.review-remark.txt`

回复只表示「群内声称已上传」，AI 没有把未核验附件硬判为已齐；仍建议人工核实，符合不编造和人工兜底边界。

## D+2 最终演示命令

不发群预演：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --simulate-reply "操作说明见群内图片，商品和标签对应关系已上传附件" --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_e2e_integration\demo-rehearsal
```

正式发测试群：

```powershell
cd D:\DA\Nonsta_Valueadded_Combined
npx tsx internal-review-copilot/scripts/demo-e2e.ts --order VASC000000348477 --send-feishu --simulate-reply "操作说明见群内图片，商品和标签对应关系已上传附件" --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_e2e_integration\demo-live
```

试点单次轮询：

```powershell
npx tsx internal-review-copilot/scripts/poll-and-assess.ts --once --input D:\DA\Nonsta_Valueadded_Combined\_runs\20260902_ow01v1602_review_orders\details.json --send-feishu --out D:\DA\Nonsta_Valueadded_Combined\_runs\20260904_e2e_integration\poll
```

## 产物

- `integration-report.md`：本报告
- `demo-live/`：真实单发飞书演示产物
- `demo-simulated-reply/`：模拟回复与审核备注
- `llm-fallback/`：LLM 失败降级验证
- `poll/case-store.json`：16 条案件状态
- `poll/poll.log`：两轮轮询日志
- `pilot-export/`：试点日报

未做 OMS 回写、万邑联页面联调和自动审核。
