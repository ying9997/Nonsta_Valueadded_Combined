# VASC000000342198 弯引号修复重跑

上一版「先原样 parse」只覆盖**合法 JSON 里带着弯引号**。这单是模型把场景名写成了英文引号，JSON 在第 6 行第 25 列断开（`【入库】"` 把字符串提前结束）。

## 修法

`parseJsonishObject` 在原样 parse 失败后，把 `【入库】"短标题"` 收成弯引号再 parse。单测覆盖这种非法 JSON。

## 重跑

- 单号：VASC000000342198
- 场景：inbound_package_barcode_batch_relabel（包裹条码批量异常补贴包裹标签）
- 出口：`sop_generated`，`gate=-`（不再是 SOP JSON 失败红卡）
- 测试群新话题：`omt_19cf97ba96cf1bab`

请看测试群里这张**绿卡**。之前那张红卡可以忽略。
