# 入库异常到 VASC 产品映射

本文件是 `value-add-product-recommendation` 判断候选 VASC 的主依据。

## 覆盖口径

- 当前规划口径：168 条去重关系，覆盖 18 个 VASC。
- 全量机器可读来源待补到 `source-references/exception-vas-data-package/data/normalized/`。
- 本摘要只记录 v1 expert 需要遵守的使用规则。

## 使用规则

| 规则 | 说明 |
|---|---|
| 候选关系 | 异常到 VASC 映射证明“有关联”，不单独解释“为什么这样选” |
| 首选推荐 | 必须结合客户意图、异常对象、节点、VASC 启用态和限制 |
| 缺失映射 | 输出待确认方向和需业务确认项，不用接口文档反推适用性 |
| inactive VASC | 不能直接作为可下单推荐，只能作为历史或待确认线索 |

## 运行时消费

运行时裁剪知识见 `../../../experts/value-add/value-add-product-recommendation/prompts/kb-product-recommendation.md`。
