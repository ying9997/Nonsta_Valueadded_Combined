# 无码场景卡模糊匹配结果

## 匹配结果汇总

- OMS 全表：20260911 合并下拉 + 20260902 + HTML option + atoms.csv，共 171 个码
- G-1 待补字段：37 张（空码 31 + 已有码但样本不足/缓存无已审 6）
- 本次模糊匹配目标：空 `omsSceneCode` 的 31 张（已有码的不重配）
- 高置信度：2　中置信度：16　未匹配：13　高+中：18
- **未写入场景卡。** 高置信度建议直接写入；中置信度需人工确认。
- 跨入库/库内/出库的同名场景已排除（例如库内采集 SN 不配出库采集 SN；入库加急不配出库加急）。

| # | sceneKey | 场景卡名称 | 分类 | 匹配到的 OMS 码 | OMS 场景名 | 匹配方式 | 置信度 |
|---|----------|-----------|------|----------------|-----------|---------|--------|
| 1 | `instock_procure_packaging_bambu` | 【库内】 代购包材-拓竹 | instock | 20250619001 | 【库内】代采购包材物料 | SOP章节回溯 | 中 |
| 2 | `instock_damaged_repack_reshelve` | 【库内】包装破损商品更换包材重新上架 | instock | 20250512001 | 【库内】商品更换包装（WINIT标准包材） | 包含匹配 | 中 |
| 3 | `instock_collect_sn` | 【库内】采集SN码 | instock | — | — | — | 未匹配 |
| 4 | `instock_unbox_identify_change_sku` | 【库内】拆箱辨识后重新更换SKU上架 | instock | 20250421001 | 【库内】商品拆箱加/减配件 | 关键词交集 | 中 |
| 5 | `instock_void_outbound_after_pack` | 【库内】打包完成后作废出库单（有商品增值） | instock | INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND | 【库内】订单作废后重新上架 | 包含匹配 | 中 |
| 6 | `instock_change_sku_defective_shelve` | 【库内】更换SKU做不良品上架 | instock | 20250808003 | 【库内】良品转不良品上架 | 关键词交集 | 中 |
| 7 | `instock_identify_then_relabel_shelve` | 【库内】库内辨识+辨识后重新贴标上架 | instock | 20250407043 | 【库内】商品外观辨识+贴标上架 | 关键词交集 | 中 |
| 8 | `instock_inter_warehouse_transfer_anker` | 【库内】库内仓间调拨-Anker | instock | 20250407074 | 【库内】库间调拨 | 包含匹配 | 中 |
| 9 | `instock_inventory_destroy` | 【库内】库内库存销毁 | instock | 20250407065 | 【库内】指定单品销毁 | 关键词交集 | 中 |
| 10 | `instock_remove_cover_label` | 【库内】清除/覆盖标签 | instock | 20250530002 | 清除标签 | 包含匹配 | 中 |
| 11 | `instock_rework_reshelve` | 【库内】商品改制重新上架 | instock | — | — | — | 未匹配 |
| 12 | `instock_carton_to_each` | 【库内】箱转单一 | instock | — | — | — | 未匹配 |
| 13 | `instock_cancel_self_pickup_need_wi` | 【库内】异常单：自提单取消出库（需要客户下入库单） | instock | INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND | 【库内】订单作废后重新上架 | 包含匹配 | 中 |
| 14 | `instock_cancel_self_pickup_outbound` | 【库内】自提单取消出库 | instock | INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND | 【库内】订单作废后重新上架 | 包含匹配 | 高 |
| 15 | `instock_sn_mgmt_change_reshelve` | 【库内】SN采集+管理方式变更+重新上架（复合场景） | instock | — | — | — | 未匹配 |
| 16 | `instock_winit_pack_offline_ship` | 【库内】WINIT标准包材线下寄件出库（需尾程线下面单） | instock | — | — | — | 未匹配 |
| 17 | `inbound_identify_sku_relabel_parcel` | 【入库】辨识商品条码重新贴包裹标签 | inbound | 202506120003 | 【入库】批量辨识商品后补贴商品条码及包裹条码上架 | 关键词交集 | 中 |
| 18 | `inbound_serialized_sn_handling` | 【入库】单品化管理的SN处理场景 | inbound | — | — | — | 未匹配 |
| 19 | `inbound_split_return_order` | 【入库】分开退货单入库 | inbound | — | — | — | 未匹配 |
| 20 | `inbound_replace_winit_packaging` | 【入库】更换winit包装 | inbound | 20251208 | 【入库】包裹级异常更换包装 | SOP章节回溯 | 中 |
| 21 | `inbound_expedited_inbound` | 【入库】加急入库 | inbound | — | — | — | 未匹配 |
| 22 | `inbound_bulk_return_new_inbound` | 【入库】批量退货（≥20件商品）异常包裹建新入库单入库 | inbound | — | — | — | 未匹配 |
| 23 | `inbound_unsigned_not_received_proof` | 【入库】签署仓库未收到货证明 | inbound | — | — | — | 未匹配 |
| 24 | `inbound_forecast_sku_mismatch` | 【入库】入库预报SKU与实际到货SKU不符合 | inbound | — | — | — | 未匹配 |
| 25 | `inbound_reshelve_change_wi_keep_sku` | 【入库】商品下架后换入库单重新上架（不更换SKU） | inbound | — | — | — | 未匹配 |
| 26 | `inbound_provide_inbound_video` | 【入库】提供入库视频 | inbound | 202507151726 | 【入库】入库少单品/少包裹视频调查 | 关键词交集 | 中 |
| 27 | `inbound_unclaimed_goods_relabel_shelve` | 【入库】无主货异常补贴标签上架 | inbound | 20250530001 | 【入库】无主货找回暂存 | 包含匹配 | 高 |
| 28 | `inbound_winit_fault_multi_action` | 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作 | inbound | 20250407006 | 【入库】同异常多种处理方式（直接上架+换包装上架+换标上架+部分销毁） | 关键词交集 | 中 |
| 29 | `inbound_sku_mgmt_cross_warehouse_b` | 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架 | inbound | [Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses | 【入库】包裹串仓异常调拨 | 关键词交集 | 中 |
| 30 | `inbound_anker_combine_carton` | 【入库】anker 合箱入库 | inbound | — | — | — | 未匹配 |
| 31 | `inbound_basic_3pl_winit_kit` | 【入库】Basic 3PL-Winit 组套产品审核 | inbound | 20250407020 | 【入库】组合后上架 | 关键词交集 | 中 |

## 匹配成功（高置信度，建议直接写入）

包含匹配 / 字面相似度 ≥ 0.72，或关键词交集 score ≥ 0.7，且无同分类歧义。

### instock_cancel_self_pickup_outbound

- 卡名：【库内】自提单取消出库
- 分类：instock
- SOP：§3.11 【库内】自提单取消出库
- 建议码：`INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` 【库内】订单作废后重新上架
- 方式 / 分数：包含匹配 / 0.92
- 说明：去前缀包含匹配 ratio=0.78
- 其他候选：
  - 同分类 `INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` 【库内】订单作废后重新上架（包含匹配 0.92）

### inbound_unclaimed_goods_relabel_shelve

- 卡名：【入库】无主货异常补贴标签上架
- 分类：inbound
- SOP：§2.9 【入库】无主货异常补贴标签上架
- 建议码：`20250530001` 【入库】无主货找回暂存
- 方式 / 分数：包含匹配 / 0.92
- 说明：去前缀包含匹配 ratio=0.78
- 其他候选：
  - 同分类 `20250530001` 【入库】无主货找回暂存（包含匹配 0.92）


## 匹配候选（中置信度，需人工确认）

score 约 0.5–0.7，或名称有差异 / 有歧义 / OMS 名为无前缀 other。

### instock_procure_packaging_bambu

- 卡名：【库内】 代购包材-拓竹
- 分类：instock
- SOP：§3.27 【库内】 代购包材-拓竹
- 建议码：`20250619001` 【库内】代采购包材物料
- 方式 / 分数：SOP章节回溯 / 1
- 说明：SOP 3.27 标题「【库内】 代购包材-拓竹」包含匹配；卡名含客户特化（Anker/拓竹），与已有通用 OMS 码共用，需确认是否写入
- 其他候选：
  - 同分类 `20250619001` 【库内】代采购包材物料（SOP章节回溯 1）

### instock_damaged_repack_reshelve

- 卡名：【库内】包装破损商品更换包材重新上架
- 分类：instock
- SOP：§3.29 【库内】包装破损商品更换包材重新上架
- 建议码：`20250512001` 【库内】商品更换包装（WINIT标准包材）
- 方式 / 分数：包含匹配 / 0.92
- 说明：同分类有歧义：【库内】商品更换包装（WINIT标准包材） / 20250512001；【库内】清除商品属性标签+更换包装 / 20251020001
- 其他候选：
  - 同分类 `20250512001` 【库内】商品更换包装（WINIT标准包材）（包含匹配 0.92）
  - 同分类 `20251020001` 【库内】清除商品属性标签+更换包装（包含匹配 0.74）
  - 同分类 `20250407055` 【库内】更换客制包装（包含匹配 0.4）

### instock_unbox_identify_change_sku

- 卡名：【库内】拆箱辨识后重新更换SKU上架
- 分类：instock
- SOP：§3.30 【库内】拆箱辨识后重新更换SKU上架
- 建议码：`20250421001` 【库内】商品拆箱加/减配件
- 方式 / 分数：关键词交集 / 0.65
- 说明：同分类有歧义：【库内】商品拆箱加/减配件 / 20250421001；【库内】商品外观辨识+贴标上架 / 20250407043
- 其他候选：
  - 同分类 `20250421001` 【库内】商品拆箱加/减配件（关键词交集 0.65）
  - 同分类 `20250407043` 【库内】商品外观辨识+贴标上架（关键词交集 0.65）

### instock_void_outbound_after_pack

- 卡名：【库内】打包完成后作废出库单（有商品增值）
- 分类：instock
- SOP：§3.36 【库内】打包完成后作废出库单（有商品增值）
- 建议码：`INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` 【库内】订单作废后重新上架
- 方式 / 分数：包含匹配 / 0.78
- 说明：去前缀包含匹配 ratio=0.56
- 其他候选：
  - 同分类 `INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` 【库内】订单作废后重新上架（包含匹配 0.78）

### instock_change_sku_defective_shelve

- 卡名：【库内】更换SKU做不良品上架
- 分类：instock
- SOP：§3.20 【库内】更换SKU做不良品上架
- 建议码：`20250808003` 【库内】良品转不良品上架
- 方式 / 分数：关键词交集 / 0.65
- 说明：同分类有歧义：【库内】良品转不良品上架 / 20250808003；【库内】异常商品转不良品上架 / 202512150002
- 其他候选：
  - 同分类 `20250808003` 【库内】良品转不良品上架（关键词交集 0.65）
  - 同分类 `202512150002` 【库内】异常商品转不良品上架（关键词交集 0.65）

### instock_identify_then_relabel_shelve

- 卡名：【库内】库内辨识+辨识后重新贴标上架
- 分类：instock
- SOP：§3.33 【库内】库内辨识+辨识后重新贴标上架
- 建议码：`20250407043` 【库内】商品外观辨识+贴标上架
- 方式 / 分数：关键词交集 / 0.65
- 说明：overlap=辨识 distinctive=辨识
- 其他候选：
  - 同分类 `20250407043` 【库内】商品外观辨识+贴标上架（关键词交集 0.65）

### instock_inter_warehouse_transfer_anker

- 卡名：【库内】库内仓间调拨-Anker
- 分类：instock
- SOP：§3.41 【库内】库内仓间调拨-Anker
- 建议码：`20250407074` 【库内】库间调拨
- 方式 / 分数：包含匹配 / 0.78
- 说明：去前缀包含匹配 ratio=0.50；卡名含客户特化（Anker/拓竹），与已有通用 OMS 码共用，需确认是否写入
- 其他候选：
  - 同分类 `20250407074` 【库内】库间调拨（包含匹配 0.78）

### instock_inventory_destroy

- 卡名：【库内】库内库存销毁
- 分类：instock
- SOP：§3.25 【库内】库内库存销毁
- 建议码：`20250407065` 【库内】指定单品销毁
- 方式 / 分数：关键词交集 / 0.65
- 说明：同分类有歧义：【库内】指定单品销毁 / 20250407065；【库内】不合规商品指定供应商销毁 / 20250407070；【库内】特殊商品销毁（DG、带电、药物） / 202601160001
- 其他候选：
  - 同分类 `20250407065` 【库内】指定单品销毁（关键词交集 0.65）
  - 同分类 `20250407070` 【库内】不合规商品指定供应商销毁（关键词交集 0.65）
  - 同分类 `202601160001` 【库内】特殊商品销毁（DG、带电、药物）（关键词交集 0.65）

### instock_remove_cover_label

- 卡名：【库内】清除/覆盖标签
- 分类：instock
- SOP：§3.15 清除/覆盖标签
- 建议码：`20250530002` 清除标签
- 方式 / 分数：包含匹配 / 0.78
- 说明：去前缀包含匹配 ratio=0.67；OMS 名为无前缀/other，需人工确认分类
- 其他候选：
  - other `20250530002` 清除标签（包含匹配 0.78）

### instock_cancel_self_pickup_need_wi

- 卡名：【库内】异常单：自提单取消出库（需要客户下入库单）
- 分类：instock
- SOP：§3.34 【库内】异常单：自提单取消出库（需要客户下入库单）
- 建议码：`INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` 【库内】订单作废后重新上架
- 方式 / 分数：包含匹配 / 0.78
- 说明：去前缀包含匹配 ratio=0.50
- 其他候选：
  - 同分类 `INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` 【库内】订单作废后重新上架（包含匹配 0.78）

### inbound_identify_sku_relabel_parcel

- 卡名：【入库】辨识商品条码重新贴包裹标签
- 分类：inbound
- SOP：§2.27 【入库】辨识商品条码重新贴包裹标签
- 建议码：`202506120003` 【入库】批量辨识商品后补贴商品条码及包裹条码上架
- 方式 / 分数：关键词交集 / 0.65
- 说明：同分类有歧义：【入库】批量辨识商品后补贴商品条码及包裹条码上架 / 202506120003；【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 / 20250430
- 其他候选：
  - 同分类 `202506120003` 【入库】批量辨识商品后补贴商品条码及包裹条码上架（关键词交集 0.65）
  - 同分类 `20250430` 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架（关键词交集 0.65）

### inbound_replace_winit_packaging

- 卡名：【入库】更换winit包装
- 分类：inbound
- SOP：§2.24 【入库】更换winit包装
- 建议码：`20251208` 【入库】包裹级异常更换包装
- 方式 / 分数：SOP章节回溯 / 1
- 说明：同分类有歧义：【入库】包裹级异常更换包装 / 20251208；【入库】海运整柜100%A+无包裹条码异常，不支持更换商品包装增值 / 20251114
- 其他候选：
  - 同分类 `20251208` 【入库】包裹级异常更换包装（SOP章节回溯 1）
  - 同分类 `20251114` 【入库】海运整柜100%A+无包裹条码异常，不支持更换商品包装增值（包含匹配 0.78）
  - 同分类 `20250509` 【入库】更换客制包材（包含匹配 0.6）

### inbound_provide_inbound_video

- 卡名：【入库】提供入库视频
- 分类：inbound
- SOP：§2.23 【入库】提供入库视频
- 建议码：`202507151726` 【入库】入库少单品/少包裹视频调查
- 方式 / 分数：关键词交集 / 0.65
- 说明：overlap=视频 distinctive=视频
- 其他候选：
  - 同分类 `202507151726` 【入库】入库少单品/少包裹视频调查（关键词交集 0.65）

### inbound_winit_fault_multi_action

- 卡名：【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作
- 分类：inbound
- SOP：§2.26 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作
- 建议码：`20250407006` 【入库】同异常多种处理方式（直接上架+换包装上架+换标上架+部分销毁）
- 方式 / 分数：关键词交集 / 0.65
- 说明：overlap=销毁 distinctive=销毁
- 其他候选：
  - 同分类 `20250407006` 【入库】同异常多种处理方式（直接上架+换包装上架+换标上架+部分销毁）（关键词交集 0.65）

### inbound_sku_mgmt_cross_warehouse_b

- 卡名：【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架
- 分类：inbound
- SOP：§2.20 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架
- 建议码：`[Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses` 【入库】包裹串仓异常调拨
- 方式 / 分数：关键词交集 / 0.65
- 说明：overlap=串仓 distinctive=串仓
- 其他候选：
  - 同分类 `[Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses` 【入库】包裹串仓异常调拨（关键词交集 0.65）

### inbound_basic_3pl_winit_kit

- 卡名：【入库】Basic 3PL-Winit 组套产品审核
- 分类：inbound
- SOP：§2.28 【入库】Basic 3PL-Winit 组套产品审核
- 建议码：`20250407020` 【入库】组合后上架
- 方式 / 分数：关键词交集 / 0.65
- 说明：overlap=组合 distinctive=组合
- 其他候选：
  - 同分类 `20250407020` 【入库】组合后上架（关键词交集 0.65）


## 未匹配（无候选）

同分类下没有可用 OMS 码。跨类别命中已丢弃，这些场景多半是 SOP 有、OMS 下拉里没有独立码。

### instock_collect_sn

- 卡名：【库内】采集SN码
- 分类：instock
- SOP：§3.26 【库内】采集SN码
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：仅跨类别候选，已丢弃：【出库】采集SN打印Packinglist(outbound)；【出库】采集SN码(outbound)

### instock_rework_reshelve

- 卡名：【库内】商品改制重新上架
- 分类：instock
- SOP：§3.24 【库内】商品改制重新上架
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### instock_carton_to_each

- 卡名：【库内】箱转单一
- 分类：instock
- SOP：§3.43 【库内】箱转单一
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### instock_sn_mgmt_change_reshelve

- 卡名：【库内】SN采集+管理方式变更+重新上架（复合场景）
- 分类：instock
- SOP：§3.32 【库内】SN采集+管理方式变更+重新上架（复合场景）
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：仅跨类别候选，已丢弃：【出库】采集SN打印Packinglist(outbound)；【出库】采集SN码(outbound)

### instock_winit_pack_offline_ship

- 卡名：【库内】WINIT标准包材线下寄件出库（需尾程线下面单）
- 分类：instock
- SOP：§3.31 【库内】WINIT标准包材线下寄件出库（需尾程线下面单）
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_serialized_sn_handling

- 卡名：【入库】单品化管理的SN处理场景
- 分类：inbound
- SOP：§2.31 【入库】单品化管理的SN处理场景
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_split_return_order

- 卡名：【入库】分开退货单入库
- 分类：inbound
- SOP：§2.13 【入库】分开退货单入库
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_expedited_inbound

- 卡名：【入库】加急入库
- 分类：inbound
- SOP：§2.29 【入库】加急入库
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：仅跨类别候选，已丢弃：【出库】加急出库(outbound)

### inbound_bulk_return_new_inbound

- 卡名：【入库】批量退货（≥20件商品）异常包裹建新入库单入库
- 分类：inbound
- SOP：§2.14 【入库】批量退货（≥20件商品）异常包裹建新入库单入库
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_unsigned_not_received_proof

- 卡名：【入库】签署仓库未收到货证明
- 分类：inbound
- SOP：§2.32 【入库】签署仓库未收到货证明
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_forecast_sku_mismatch

- 卡名：【入库】入库预报SKU与实际到货SKU不符合
- 分类：inbound
- SOP：§2.10 【入库】入库预报SKU与实际到货SKU不符合
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_reshelve_change_wi_keep_sku

- 卡名：【入库】商品下架后换入库单重新上架（不更换SKU）
- 分类：inbound
- SOP：§2.11 【入库】商品下架后换入库单重新上架（不更换SKU）
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：无同类别候选

### inbound_anker_combine_carton

- 卡名：【入库】anker 合箱入库
- 分类：inbound
- SOP：§2.30 【入库】anker 合箱入库
- 建议码：`—` 
- 方式 / 分数：— / 0
- 说明：仅跨类别候选，已丢弃：【出库】anker彩盒贴EAN标(outbound)


## G-1 已有 OMS 码、本次不重配

这几张在 G-1 里没抽出 requiredInfoFields，但卡上已有码，不属于「无码」。

| sceneKey | 已有 OMS 码 | G-1 跳过原因 |
|----------|------------|--------------|
| `instock_procure_packaging_materials` | `20250619001` | 已审需求样本不足（2 < 3），待补充 |
| `instock_replace_mfg_date_label` | `20260108001` | 缓存中无已审通过单，待补充 |
| `instock_ownership_transfer` | `【In-warehouse】Transfer of ownership of goods` | 已审需求样本不足（0 < 3），待补充 |
| `instock_ownership_transfer_relabel` | `【In-warehouse】Transfer of ownership of goods` | 已审需求样本不足（0 < 3），待补充 |
| `instock_instructional_label_photo` | `20250427001` | 已审需求样本不足（2 < 3），待补充 |
| `inbound_product_quality_inspection` | `20250408002` | 缓存中无已审通过单，待补充 |

