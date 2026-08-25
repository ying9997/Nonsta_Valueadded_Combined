# 新单上架产品级必填：NEW_INBOUND_ORDER_NO

来源：`test_prompt_B0102E23.json.enrichedContext.fieldRequirements.新单上架_产品级必填`

本文件不是原子属性页，而是 B0102E23 测试用例里已出现的产品级必填项。放在 `field-requirements/` 下是为了 MVP 阶段集中管理字段要求。

## 字段清单

| attrKey | attrName | required | showType | AI 指引 | validation | 来源状态 |
|---------|----------|----------|----------|---------|------------|----------|
| NEW_INBOUND_ORDER_NO | 上架入库单号 | true | INPUT | AI 推断为新单上架时必须追问客户提供 | 入库单号需属于 `exceptionFacts.warehouseCode` 同一仓库 | copied_from_test_prompt |

## 使用规则

- 推断为新单上架时，必须追问新的上架入库单号。
- 推断为原单上架时，使用异常单关联原入库单，不追问该字段。
- 新入库单号的同仓校验由系统/中间层执行，AI 只能提示需要提供。

## Pending

- 字段是否属于产品级、页面级或接口级字段，待 `getVascInfo` / 页面接口确认。
