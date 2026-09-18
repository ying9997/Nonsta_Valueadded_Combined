# 历史跑批演示（测试群）

- 群：`oc_80b07f38ed6833df3787a97a496f1097`
- `OMS_WRITE_ENABLED=0`，未写 OMS
- 条数：9
- 话题标题格式：`[历史跑批] VASC｜客户｜仓库｜摘要`
- 绿卡按钮保留，未点击

## 各单

| VASC | 业务段 | 本轮结果 | 轮数 | 话题 |
|---|---|---|---|---|
| VASC000000312144 | 入库 | **sop_llm_failed** | 2 | `om_x100b65ba17f608b0c3936f953497085` |
| VASC000000329235 | 入库 | **l4_direct** | 1 | `om_x100b65ba2fd8d084c446d87ebdd2bfb` |
| VASC000000305787 | 入库 | **max_rounds_exceeded** | 3 | `om_x100b65ba2df91090c382be8ad1b8c45` |
| VASC000000272319 | 入库 | **l4_direct** | 1 | `om_x100b65ba229210acc3a772ffd377ed4` |
| VASC000000305892 | 入库 | **l4_direct** | 1 | `om_x100b65ba39a9c8a0c34cf1d15ec1abf` |
| VASC000000284952 | 库内 | **l4_direct** | 1 | `om_x100b65ba336460a0c237e15c15b282e` |
| VASC000000338049 | 库内 | **max_rounds_exceeded** | 3 | `om_x100b65bacee4ecb4c39a490b9415ef6` |
| VASC000000321948 | 库内 | **sop_after_rounds** | 2 | `om_x100b65bac6f764a4c31443e31d64c32` |
| VASC000000318543 | 库内 | **sop_after_rounds** | 2 | `om_x100b65bac31a98a0deb1fc032c43899` |

## 各单轮次

### VASC000000312144
- 结果：sop_llm_failed
- 话题：om_x100b65ba17f608b0c3936f953497085
- 第?轮 transfer_human → override_scene（overrideScene=inbound_aplus_direct_shelve）
- 第?轮 sop_generated → sop_llm_failed（Expected ',' or '}' after property value in JSON at position 73 (line 2 column 72)）
- 模拟回复：
  - 选择场景：【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架（来源：OMS 审核员实际选择）

### VASC000000329235
- 结果：l4_direct
- 话题：om_x100b65ba2fd8d084c446d87ebdd2bfb
- 第?轮 sop_generated → l4_direct（绿色卡片已发，按钮未点击）

### VASC000000305787
- 结果：max_rounds_exceeded
- 话题：om_x100b65ba2df91090c382be8ad1b8c45
- 第?轮 transfer_human → override_scene（overrideScene=inbound_photo_hold）
- 第?轮 needs_field_clarification → l3_mock_attachment（拍照目的/背景未说明）
- 第?轮 needs_field_clarification → l3_mock_attachment（拍照目的/背景未说明）
- 模拟回复：
  - 选择场景：【入库】指定商品拍照暂存（来源：OMS 审核员实际选择）
  - [模拟] 已补齐：拍照目的/背景未说明
  - [模拟] 已补齐：拍照目的/背景未说明

### VASC000000272319
- 结果：l4_direct
- 话题：om_x100b65ba229210acc3a772ffd377ed4
- 第?轮 sop_generated → l4_direct（绿色卡片已发，按钮未点击）

### VASC000000305892
- 结果：l4_direct
- 话题：om_x100b65ba39a9c8a0c34cf1d15ec1abf
- 第?轮 sop_generated → l4_direct（绿色卡片已发，按钮未点击）

### VASC000000284952
- 结果：l4_direct
- 话题：om_x100b65ba336460a0c237e15c15b282e
- 第?轮 sop_generated → l4_direct（绿色卡片已发，按钮未点击）

### VASC000000338049
- 结果：max_rounds_exceeded
- 话题：om_x100b65bacee4ecb4c39a490b9415ef6
- 第?轮 needs_field_clarification → l3_mock_attachment（商品标签数量未说明）
- 第?轮 needs_field_clarification → l3_mock_attachment（商品条码/SKU编码未说明、处理数量未说明）
- 第?轮 needs_field_clarification → l3_mock_attachment（商品标签数量未说明）
- 模拟回复：
  - [模拟] 已补齐：商品标签数量未说明
  - [模拟] 已补齐：商品条码/SKU编码未说明、处理数量未说明
  - [模拟] 已补齐：商品标签数量未说明

### VASC000000321948
- 结果：sop_after_rounds
- 话题：om_x100b65bac6f764a4c31443e31d64c32
- 第?轮 transfer_human → override_scene（overrideScene=instock_reinforce）
- 第?轮 sop_generated → sop（绿色卡片已发，按钮未点击）
- 模拟回复：
  - 选择场景：【库内】库内加固（来源：OMS 审核员实际选择）

### VASC000000318543
- 结果：sop_after_rounds
- 话题：om_x100b65bac31a98a0deb1fc032c43899
- 第?轮 transfer_human → override_scene（overrideScene=instock_split_sku）
- 第?轮 sop_generated → sop（绿色卡片已发，按钮未点击）
- 模拟回复：
  - 选择场景：【库内】拆分SKU（来源：OMS 审核员实际选择）

## SOP 打分文件

- `_runs/20260915_historical_demo/sop-for-scoring/VASC000000329235.md`
- `_runs/20260915_historical_demo/sop-for-scoring/VASC000000272319.md`
- `_runs/20260915_historical_demo/sop-for-scoring/VASC000000305892.md`
- `_runs/20260915_historical_demo/sop-for-scoring/VASC000000284952.md`
- `_runs/20260915_historical_demo/sop-for-scoring/VASC000000321948.md`
- `_runs/20260915_historical_demo/sop-for-scoring/VASC000000318543.md`
