# match-template 组件评测

- 评测集：`D:\DA\Nonsta_Valueadded_Combined\internal-review-copilot\eval\golden\match-template-eval.jsonl`
- 条数：40（gold 23 / derived 10 / shadow 7）
- 主结论口径：**仅 gold + derived**（shadow 分栏报告，不计入主结论）

## 主结论（gold + derived）

| 指标 | 值 |
|------|---|
| Top-1 Accuracy | 26/33 (78.8%) |
| Scene Accuracy (supported) | 19/19 (100.0%) |
| Unsupported Accuracy | 8/8 (100.0%) |
| False Supported Rate | 1/33 (3.0%) |
| Ambiguous Rate (actual) | 9/33 (27.3%) |

## 分栏对照

### gold

| 指标 | 值 |
|------|---|
| Top-1 Accuracy | 18/23 (78.3%) |
| Scene Accuracy (supported) | 16/16 (100.0%) |
| Unsupported Accuracy | 5/5 (100.0%) |
| False Supported Rate | 0/23 (0.0%) |
| Ambiguous Rate (actual) | 7/23 (30.4%) |

### derived

| 指标 | 值 |
|------|---|
| Top-1 Accuracy | 8/10 (80.0%) |
| Scene Accuracy (supported) | 3/3 (100.0%) |
| Unsupported Accuracy | 3/3 (100.0%) |
| False Supported Rate | 1/10 (10.0%) |
| Ambiguous Rate (actual) | 2/10 (20.0%) |

### shadow（16 当日单等，不计主结论）

| 指标 | 值 |
|------|---|
| Top-1 Accuracy | 7/7 (100.0%) |
| Scene Accuracy (supported) | 1/1 (100.0%) |
| Unsupported Accuracy | 6/6 (100.0%) |
| False Supported Rate | 0/7 (0.0%) |
| Ambiguous Rate (actual) | 0/7 (0.0%) |

### 全量（含 shadow，仅供对照）

| 指标 | 值 |
|------|---|
| Top-1 Accuracy | 33/40 (82.5%) |
| Scene Accuracy (supported) | 20/20 (100.0%) |
| Unsupported Accuracy | 14/14 (100.0%) |
| False Supported Rate | 1/40 (2.5%) |
| Ambiguous Rate (actual) | 9/40 (22.5%) |

## 易判错子集（hardCase，期望 supported）

| 命中 | 0/5 |

| id | vascNo | expected | actual | reason |
|----|--------|----------|--------|--------|
| gold-VASC000000323364 | VASC000000323364 | supported | ambiguous | ambiguous_below_high_confidence |
| gold-VASC000000332922 | VASC000000332922 | supported | ambiguous | ambiguous_below_high_confidence |
| gold-VASC000000342681 | VASC000000342681 | supported | ambiguous | ambiguous_below_high_confidence |
| gold-VASC000000328776 | VASC000000328776 | supported | ambiguous | ambiguous_below_high_confidence |
| gold-VASC000000327963 | VASC000000327963 | supported | ambiguous | ambiguous_below_high_confidence |

## 误判明细

| id | status | expected | actual | scene exp/act | notes | reason |
|----|--------|----------|--------|---------------|-------|--------|
| derived-boundary-f001-b | derived | ambiguous | unsupported | ∅ / ∅ | 拍照意图但无暂存去向 | unsupported_template |
| derived-boundary-relabel-only | derived | ambiguous | supported | ∅ / inbound_label_identify | 换标上架但辨识办法未定 → ambiguous | supported_clear_top1 |
| gold-VASC000000323364 | gold | supported | ambiguous | inbound_label_identify / inbound_label_identify | CASEBOOK/历史完成倾向 F-001，当前常判 ambiguous（易判错） | ambiguous_below_high_confidence |
| gold-VASC000000332922 | gold | supported | ambiguous | inbound_label_identify / inbound_label_identify | CASEBOOK/历史完成倾向 F-001，当前常判 ambiguous（易判错） | ambiguous_below_high_confidence |
| gold-VASC000000342681 | gold | supported | ambiguous | inbound_label_identify / inbound_label_identify | CASEBOOK/历史完成倾向 F-001，当前常判 ambiguous（易判错） | ambiguous_below_high_confidence |
| gold-VASC000000328776 | gold | supported | ambiguous | inbound_label_identify / inbound_label_identify | CASEBOOK/历史完成倾向 F-001，当前常判 ambiguous（易判错） | ambiguous_below_high_confidence |
| gold-VASC000000327963 | gold | supported | ambiguous | inbound_label_identify / inbound_label_identify | CASEBOOK/历史完成倾向 F-001，当前常判 ambiguous（易判错） | ambiguous_below_high_confidence |

## 逐条

| id | status | expected | actual | match |
|----|--------|----------|--------|-------|
| gold-VASC000000343821 | gold | supported | supported | ✓ |
| gold-VASC000000333147 | gold | supported | supported | ✓ |
| gold-VASC000000326061 | gold | supported | supported | ✓ |
| gold-VASC000000143515 | gold | supported | supported | ✓ |
| gold-VASC000000080416 | gold | supported | supported | ✓ |
| gold-VASC000000193236 | gold | supported | supported | ✓ |
| gold-VASC000000190569 | gold | supported | supported | ✓ |
| gold-VASC000000332778 | gold | supported | supported | ✓ |
| gold-VASC000000317712 | gold | supported | supported | ✓ |
| gold-VASC000000297120 | gold | supported | supported | ✓ |
| gold-VASC000000333237 | gold | supported | supported | ✓ |
| gold-VASC000000344421 | gold | ambiguous | ambiguous | ✓ |
| derived-boundary-f001-a | derived | ambiguous | ambiguous | ✓ |
| derived-boundary-photo-unclear | derived | ambiguous | ambiguous | ✓ |
| derived-boundary-f001-b | derived | ambiguous | unsupported | ✗ |
| derived-boundary-relabel-only | derived | ambiguous | supported | ✗ |
| gold-VASC000000327915 | gold | ambiguous | ambiguous | ✓ |
| gold-VASC000000323364 | gold | supported | ambiguous | ✗ |
| gold-VASC000000332922 | gold | supported | ambiguous | ✗ |
| gold-VASC000000342681 | gold | supported | ambiguous | ✗ |
| gold-VASC000000328776 | gold | supported | ambiguous | ✗ |
| gold-VASC000000327963 | gold | supported | ambiguous | ✗ |
| derived-intercept-hold | derived | unsupported | unsupported | ✓ |
| derived-direct-scan | derived | unsupported | unsupported | ✓ |
| derived-inhouse-photo-done | derived | unsupported | unsupported | ✓ |
| gold-VASC000000335325 | gold | unsupported | unsupported | ✓ |
| gold-VASC000000334098 | gold | unsupported | unsupported | ✓ |
| gold-VASC000000324960 | gold | unsupported | unsupported | ✓ |
| gold-VASC000000323808 | gold | unsupported | unsupported | ✓ |
| gold-VASC000000313455 | gold | unsupported | unsupported | ✓ |
| shadow-VASC000000348495 | shadow | unsupported | unsupported | ✓ |
| shadow-VASC000000348477 | shadow | supported | supported | ✓ |
| shadow-VASC000000347559 | shadow | unsupported | unsupported | ✓ |
| shadow-VASC000000347556 | shadow | unsupported | unsupported | ✓ |
| shadow-VASC000000347553 | shadow | unsupported | unsupported | ✓ |
| shadow-VASC000000347550 | shadow | unsupported | unsupported | ✓ |
| shadow-VASC000000347547 | shadow | unsupported | unsupported | ✓ |
| derived-a-positive | derived | supported | supported | ✓ |
| derived-b-positive | derived | supported | supported | ✓ |
| derived-f001-positive-text | derived | supported | supported | ✓ |
