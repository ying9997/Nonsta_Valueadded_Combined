# L4 Trace Index（真实 LLM）

- 样本数: 8
- 自然 L4: 6
- 构造 L4: 2

| # | VASC | scene | source | outputPath | reflectionPass | llmError | trace |
|---|------|-------|--------|------------|----------------|----------|-------|
| 1 | VASC000000311652 | T1 | natural | transfer_human | null | SOP 编造了输入中没有的单号：VASC000000310857 | [VASC000000311652.trace.md](VASC000000311652.trace.md) |
| 2 | VASC000000311505 | T1 | natural | sop_generated | false | - | [VASC000000311505.trace.md](VASC000000311505.trace.md) |
| 3 | VASC000000334308 | T1 | natural | sop_generated | false | - | [VASC000000334308.trace.md](VASC000000334308.trace.md) |
| 4 | VASC000000309171 | T1 | natural | transfer_human | null | Expected ',' or '}' after property value in JSON at position 989 (line 6 column 25) | [VASC000000309171.trace.md](VASC000000309171.trace.md) |
| 5 | VASC000000332778 | T4 | natural | sop_generated | true | - | [VASC000000332778.trace.md](VASC000000332778.trace.md) |
| 6 | VASC000000333147 | T4 | natural | sop_generated | true | - | [VASC000000333147.trace.md](VASC000000333147.trace.md) |
| 7 | VASC000000298617 | T2 | constructed_from_l3 | sop_generated | true | - | [VASC000000298617.constructed.trace.md](VASC000000298617.constructed.trace.md) |
| 8 | VASC000000305805 | T3 | constructed_from_l3 | sop_generated | false | - | [VASC000000305805.constructed.trace.md](VASC000000305805.constructed.trace.md) |
