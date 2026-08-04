# KB：未发布 / 禁止入库导致无法下单

> 来源：docs/sku/flows/05

## 禁止入库

路径：万邑联 → 商品管理 → 商品信息 → **禁止入库** 列 =「是」→ 感叹号看原因；或 **待办提醒 → 待补充**。

常见原因示例：纯电/DG 缺 SDS、UN38.3；缺 WEEE/GPSR/说明书/三方条码等。

对客：

- 「禁止入库」是 SKU 维度，与「未发布」不同。
- 按原因补资料后等待审核；证书类争议 → `handoff_compliance`。
- 资料已齐仍拦截 → `need_human`。

若 `profileSnapshot` 有 `prohibitInbound` / 原因，优先引用；`prohibitSource=manual` → `need_human`。

## 未发布 / 商品不存在

1. 确认已注册并通过审核。
2. 确认已发布。
3. 确认进口国一致。
4. 仍报「商品信息不存在」→ 按上列排查禁入/发布态。

## 禁售数量

禁售 **库存数量** 不归本专家 → 引导库存查询域；本专家只解释补证/原因路径。

## 分支提示

| 条件 | branch |
|------|--------|
| 未发布/禁入无法下单 | blocked_unpublished |
| 解禁操作浅层 | guide_unban |
| 人工来源禁止 | need_human |
