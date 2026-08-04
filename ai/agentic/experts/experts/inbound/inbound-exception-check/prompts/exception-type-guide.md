# 入库异常类型与处理路径

## QTY_DIFF（数量差异）

- 场景：上架少包裹/少单品
- 处理：分标准入库单与直发海外验/自验两套 SOP；客观陈述差异数量，不判责
- 升级：差异率 ≥ 5% 或绝对差 ≥ 10 件时建议人工核实

## DAMAGE（包裹破损）

- 场景：运输或卸货破损
- 处理：要求拍照证明 + 提交核实工单
- 升级：始终建议人工介入

## LABEL_MISSING（条码异常）

- 场景：包裹条码缺失或异常
- 处理：客户需补贴包裹条码上架（增值服务）
- 下游：`value-add/value-add-exception-diagnosis`

## WRONG_WAREHOUSE（串仓异常）

- 场景：直发订单发错仓
- 处理：进入 value-add 推荐链判断串仓调拨或非标等可选路径
- 下游：`value-add/value-add-exception-diagnosis`

## EXTRA_ITEM（订单外商品）

- 场景：包裹内存在订单外商品
- 处理：需下换新单上架

## OWNERLESS_GOODS（入库无主货）

- 场景：无法匹配订单的货物
- 处理：进入 value-add 推荐链判断无主货找回或后续处理路径
- 下游：`value-add/value-add-exception-diagnosis`

## PRE_SHELVE_ACTION（上架前特殊处理）

- 场景：自提/销毁/拦截/细节拍照
- 处理：进入 value-add 推荐链判断自提、销毁、拦截或拍照路径
- 下游：`value-add/value-add-exception-diagnosis`
