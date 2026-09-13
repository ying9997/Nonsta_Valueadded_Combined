# LLM-as-Judge 报告

## 数据集
- 仅评测 golden 中 `expectedOutputPath=sop_generated` 的 case（本轮 4 条）
- Judge 读取 expectedScene / OMS 全名仅用于评分，不传入 `runPipeline` ✓
- LLM 配置: 可用

## 汇总

| 维度（中文） | 英文 | 平均分 |
|------------|------|-------:|
| 事实准确性 | factualAccuracy | 3.00 |
| 操作完整性 | completeness | 1.00 |
| 可执行性 | executability | 1.00 |
| 安全合规 | safety | 5.00 |
| 场景匹配 | sceneFit | 1.25 |
| overallPass 数 | — | 0/4 |

## 逐条

| VASC | 预期场景（OMS 全名） | 事实 | 完整 | 可执行 | 安全 | 场景 | Pass | 备注 |
|------|-------------------|-----:|-----:|------:|-----:|-----:|------|------|
| VASC000000311652 | 【入库】"包裹条码批量异常（需客户处理）"辨识后补贴包裹标签上架 | 1 | 1 | 1 | 5 | 1 | ✗ | 注：pipeline 出口为 transfer_human（llmError=SOP 编造了输入中没有的单号：VASC000000310857），仍对可得 SOP 草稿评分 |
| VASC000000298617 | 【入库】指定商品拍照暂存 | 5 | 1 | 1 | 5 | 1 | ✗ | 注：pipeline 出口为 transfer_human（llmError=无），仍对可得 SOP 草稿评分 |
| VASC000000305805 | 【入库】关联第三方商品条码上架 | 5 | 1 | 1 | 5 | 2 | ✗ | 注：pipeline 出口为 transfer_human（llmError=无），仍对可得 SOP 草稿评分 |
| VASC000000326061 | 【入库】尺重/标签辨识后换标上架 | 1 | 1 | 1 | 5 | 1 | ✗ | 注：pipeline 出口为 transfer_human（llmError=Expected ',' or '}' after property value in JSON at position 1265 (line 6 column 25)），仍对可得 SOP 草稿评分 |

## 说明

- 若出现 `judgeError`，不阻塞客观评测（见 `objective-eval-report.md`）。
- 场景名一律使用 OMS 全名（统一映射表）。
