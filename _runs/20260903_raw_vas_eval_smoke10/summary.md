# 原始增值单 10 条 smoke 干跑

- 输入：`D:\DA\Nonsta_Valueadded_Combined\_tmp\raw_vas_eval_cut_20260903\llm_smoke_10.details.json`
- 样本数：10
- 候选态 smoke，不是正式 gold，不写入 eval-v0.1
- SOP：本地 mock，未改运行时代码

## 分流

| outputPath | n |
|---|---:|
| transfer_human | 7 |
| needs_requirement_clarification | 3 |

## 明细

| orderNo | outputPath | node | top1 | decision | missing |
|---|---|---|---|---|---|
| VASC000000152232 | transfer_human | match-template | - | unsupported | - |
| VASC000000276285 | transfer_human | match-template | - | unsupported | - |
| VASC000000280917 | transfer_human | match-template | - | unsupported | - |
| VASC000000283047 | transfer_human | match-template | - | unsupported | - |
| VASC000000286677 | needs_requirement_clarification | check-requirement | - | - | 操作动作不清 |
| VASC000000308991 | needs_requirement_clarification | check-requirement | - | - | 操作动作不清 |
| VASC000000257703 | transfer_human | match-template | inbound_label_identify | ambiguous | - |
| VASC000000274815 | needs_requirement_clarification | check-requirement | - | - | 需求背景/操作目的/处理去向不清 |
| VASC000000296325 | transfer_human | match-template | - | unsupported | - |
| VASC000000270000 | transfer_human | match-template | inbound_photo_hold | ambiguous | - |
