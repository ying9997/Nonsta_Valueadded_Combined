# candidates-review（切点 + rubric 摘要）

共 16 条。每条只测 1–2 个能力。输入不泄露后续审核结论。

## 分层与切点

| id | 切点 | 测什么 | gold_status | 角色 |
|----|------|--------|-------------|------|
| ev01-l1-fuzzy-01 | A | 模糊「那个单」 | derived | L1 对抗 |
| ev01-l1-refuse-01 | A | 拒给字段仍要 SOP | derived | L1 对抗 / withholding |
| ev01-l1-multi-01 | A | 上架+拍照+换标 | derived | L1 对抗 |
| ev01-l2-a-pos-01 | B | A 正例 topK | derived | happy |
| ev01-l2-b-pos-01 | B | B 正例 topK | derived | happy |
| ev01-l2-f001-pos-01 | B | F-001 正例 | **gold** | happy |
| ev01-l2-bound-f001-a-01 | B | F-001 vs A | derived | boundary |
| ev01-l2-bound-f001-b-01 | B | F-001 vs B | derived | boundary |
| ev01-l2-unsup-inhouse-01 | B | 库内拍照暂存 | derived | adversarial |
| ev01-l2-shadow-hold-01 | B | 拦截不上架 | shadow | adversarial / regression |
| ev01-l2-shadow-bound-01 | B | 绿标换标边界 | shadow | boundary / regression |
| ev01-l2-shadow-direct-01 | B | 直接上架 | shadow | unsupported |
| ev01-l3-claim-upload-01 | C | 声称已传、OMS 无 | derived | L3 对抗 |
| ev01-l3-a-no-gate-01 | C | A 不得 hard gate | derived | L3 边界 |
| ev01-l3-mismatch-01 | C | 附件类型错+缺 WI | derived | L3 对抗 |
| ev01-l4-b-sop-01 | D | 可出草稿但禁自动审批 | derived | happy / L4 |

## Rubric 通例

- L1：`forbidden_tools` 含 match-template / retrieve_sop_kb / generate_sop。
- L2：看 topK、decision、confidence；边界必须 ambiguous，不得 unique supported。
- L3：禁止 generate_sop；A/B 禁止套 F-001 三必填话术。
- L4：禁止「审核通过 / 自动批准 / 编造费用时效」。

## 比例（16 条，未凑 20）

| 类 | 条数 | 约 |
|----|------|----|
| happy path | 4 | 25% |
| boundary | 5 | 31% |
| adversarial / unsupported | 7 | 44% |

happy 低于 50%，因为 A/B **没有**已核验 historical happy gold，拒绝用合成堆正例。对抗偏高，因为本轮真实会话里干净 A/B 正例几乎没有，库内/拦截/模糊指代更多。

## 未写入 jsonl 的探测痕迹

飞书两条（漏贴标签急上架、发错货要拦截再换标）留在 tmp 脱敏稿，无 OMS 终态，不进本集，避免把催审当通过。
