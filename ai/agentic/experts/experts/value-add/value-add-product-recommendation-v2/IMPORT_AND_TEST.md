# 导入与试跑

1. 在 Coze 新建草稿/新工作流，导入 `D:\DA\AI_EXPERT\agentic\experts\experts_coze_output\value-add-product-recommendation-v2.zip`。
2. 禁止直接覆盖生产注册的 `value_add_product_recommendation`。
3. 导入后确认工作流名：`value_add_product_recommendation_v2`。
4. 确认 Text 节点含 `kb-inference-rules`、`kb-intent-routing-B0102E23`、`kb-forbidden-products`、`kb-h-rules`。
5. 最小入参：
```json
{"query":"EB0126032028176357，这个异常，我想拍照暂存，如果产品没有问题，然后更换你们的5号纸箱上架，这样处理可以么","exceptionCode":"B0102E23","exceptionName":"A+包裹质量异常","exceptionCategory":"packaging_quality","exceptionObject":"package","customerActionIntent":"拍照暂存后更换纸箱原单上架","enrichedContext":{"systemScopedVascList":[{"vascCode":"VASC202411271721537","vascName":"入库非标拍照或提供视频"},{"vascCode":"VASC202407031503503","vascName":"原单上架"}],"forbiddenProducts":[{"vascCode":"VASC202407031507376","vascName":"入库商品拍照","scope":"product_global"}]}}
```
6. 期望：不推荐 `入库商品拍照`。
7. 期望：客户需求明确时推断“先拍照/视频，再原单上架”。
8. 期望：只有描述模糊时才追问原单/新单/销毁/自提等意图。
