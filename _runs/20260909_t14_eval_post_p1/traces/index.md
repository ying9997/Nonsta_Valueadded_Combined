# Trace Index（分层抽样，含自然 L4 skipLlm 预览）

- 样本数: 25
- 策略: 每场景×出口最多 2 条，优先对话更长

| # | VASC | expectedScene | exit | outputPath | decision | convLen | trace |
|---|------|---------------|------|------------|----------|--------:|-------|
| 1 | VASC000000336390 | T1 | L1 | needs_requirement_clarification | - | 3879 | [trace](VASC000000336390.trace.md) |
| 2 | VASC000000300849 | T1 | L2-unsupported | transfer_human | unsupported | 937 | [trace](VASC000000300849.trace.md) |
| 3 | VASC000000327918 | T1 | L2-ambiguous | transfer_human | ambiguous | 6004 | [trace](VASC000000327918.trace.md) |
| 4 | VASC000000292659 | T1 | L2-ambiguous | transfer_human | ambiguous | 5001 | [trace](VASC000000292659.trace.md) |
| 5 | VASC000000315774 | T1 | L3 | needs_field_clarification | supported | 3178 | [trace](VASC000000315774.trace.md) |
| 6 | VASC000000322629 | T1 | L3 | needs_field_clarification | supported | 838 | [trace](VASC000000322629.trace.md) |
| 7 | VASC000000311652 | T1 | L4 | sop_generated | supported | 4083 | [trace](VASC000000311652.trace.md) |
| 8 | VASC000000311505 | T1 | L4 | sop_generated | supported | 3178 | [trace](VASC000000311505.trace.md) |
| 9 | VASC000000313380 | T2 | L1 | needs_requirement_clarification | - | 5163 | [trace](VASC000000313380.trace.md) |
| 10 | VASC000000341349 | T2 | L2-ambiguous | transfer_human | ambiguous | 4633 | [trace](VASC000000341349.trace.md) |
| 11 | VASC000000324069 | T2 | L2-ambiguous | transfer_human | ambiguous | 4471 | [trace](VASC000000324069.trace.md) |
| 12 | VASC000000315159 | T2 | L3 | needs_field_clarification | supported | 1122 | [trace](VASC000000315159.trace.md) |
| 13 | VASC000000321645 | T2 | L4 | sop_generated | supported | 1933 | [trace](VASC000000321645.trace.md) |
| 14 | VASC000000305805 | T3 | L2-unsupported | transfer_human | unsupported | 10323 | [trace](VASC000000305805.trace.md) |
| 15 | VASC000000337947 | T3 | L2-ambiguous | transfer_human | ambiguous | 6020 | [trace](VASC000000337947.trace.md) |
| 16 | VASC000000337968 | T3 | L2-ambiguous | transfer_human | ambiguous | 6020 | [trace](VASC000000337968.trace.md) |
| 17 | VASC000000298782 | T3 | L4 | sop_generated | supported | 6019 | [trace](VASC000000298782.trace.md) |
| 18 | VASC000000323658 | T3 | L4 | sop_generated | supported | 2256 | [trace](VASC000000323658.trace.md) |
| 19 | VASC000000319344 | T4 | L1 | needs_requirement_clarification | - | 3166 | [trace](VASC000000319344.trace.md) |
| 20 | VASC000000319377 | T4 | L1 | needs_requirement_clarification | - | 3166 | [trace](VASC000000319377.trace.md) |
| 21 | VASC000000303444 | T4 | L2-unsupported | transfer_human | unsupported | 4762 | [trace](VASC000000303444.trace.md) |
| 22 | VASC000000292350 | T4 | L2-unsupported | transfer_human | unsupported | 4653 | [trace](VASC000000292350.trace.md) |
| 23 | VASC000000311247 | T4 | L3 | needs_field_clarification | supported | 898 | [trace](VASC000000311247.trace.md) |
| 24 | VASC000000332778 | T4 | L4 | sop_generated | supported | 1045 | [trace](VASC000000332778.trace.md) |
| 25 | VASC000000333147 | T4 | L4 | sop_generated | supported | 1045 | [trace](VASC000000333147.trace.md) |
