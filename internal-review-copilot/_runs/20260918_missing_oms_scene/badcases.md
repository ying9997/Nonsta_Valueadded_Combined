# 线上 badcase：缺 OMS 场景概述码，SOP 写不进去

日期：2026-09-18  
来源：40 `logs/poll.log` + `live_poll/case-store.json`

## 发生了什么

知识库匹配到了场景，SOP 也生成了，但 `sceneCodeFromKey()` 发现场景卡没有 `omsSceneCode`，**整次写入直接抛错**。结果：OMS 里场景没选、SOP 也没写上。

## 待审核单（8 张，均 `first_assessed` / `sop_generated`）

| 增值单 | 知识库场景 | 卡上的 OMS 码 |
|---|---|---|
| VASC000000374793 | inbound_reshelve_change_wi_keep_sku 换入库单重新上架（不更换SKU） | 无 |
| VASC000000374808 | 同上 | 无 |
| VASC000000374823 | 同上 | 无 |
| VASC000000370740 | instock_inventory_destroy 库内库存销毁 | 无 |
| VASC000000373161 | instock_inter_warehouse_transfer_anker 库内仓间调拨-Anker | 无 |
| VASC000000373164 | instock_carton_to_each 箱转单一 | 无 |
| VASC000000373179 | instock_carton_to_each 箱转单一 | 无 |
| VASC000000374889 | instock_void_outbound_after_pack 打包完成后作废出库单 | 无 |

更早评估过同一场景、当时可能还没走到真写：VASC000000366201 / 370446 / 370434 / 370407（store 为 `sop_ready`）。本次重跑名单以 8 张 `oms_write_error` 为准。

## 迭代口径（已按此改代码）

1. **有知识库场景、没有 OMS 码**：SOP 照写，OMS **不选**场景概述；飞书绿卡和私聊 **@ 金萤**，请业务确认下拉该选哪一项。不 @ 李颖/何静/耿文文。
2. **知识库也没匹配上**：需求不是空白时，仍然生成 SOP、同样不选场景、@ 金萤。不要套用尺重换标兜底模板。
3. 业务回了码之后，再把码填进对应场景卡，以后就可以自动选下拉。

不要猜码硬填（上次货权转移已经证明：猜错会混进独立原子）。

## 重跑结果（2026-09-18）

| 增值单 | 结果 |
|---|---|
| VASC000000374793 | 待审核，SOP 已写入，未选场景，已私聊金萤 |
| VASC000000374808 | 同上 |
| VASC000000374823 | 同上 |
| VASC000000374889 | 同上（打包完成后作废出库单） |
| VASC000000370740 | 已取消，没写 |
| VASC000000373161 | 已完成，没写 |
| VASC000000373164 | 已下单，没写 |
| VASC000000373179 | 已下单，没写 |

写入字段：操作 SOP + 需求描述/背景 AI 总结。`sceneOverviewCode` 故意跳过。

