# OMS 码同类别重匹配

- 码表：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260911_oms_scene_code_map\scene_overview_code_map.json`
- 码表条数：171
- 变更：8
- 仍无码：31
- install：true

## 变更明细

| SOP | sceneKey | 动作 | 旧码 | 新码 | 类型 | OMS 名 | 说明 |
|-----|----------|------|------|------|------|--------|------|
| §2.17 | `inbound_collect_sn` | fill | - | 20250529001 | alias | 【入库】上架前采集条码（含SN码、A+包第三方包裹码等） | SOP收集SN码 ≈ OMS上架前采集条码 |
| §2.21 | `inbound_remove_label` | replace | 20250530002 | 20260302 | alias | 【入库】覆盖/清除标签 | 入库清除标签 → 【入库】覆盖/清除标签，不用无前缀「清除标签」 |
| §2.16 | `inbound_unpack_shelve` | fill | - | 20250407003 | alias | 【入库】上架前拆包装 | SOP拆包/拆箱上架 ≈ OMS上架前拆包装 |
| §3.26 | `instock_collect_sn` | clear_cross_category | 202507141 | - | pending_oms_code | - |  |
| §3.23 | `instock_identify_photo_then_destroy` | fill | - | 20250407045 | alias | 【库内】辨识后贴标上架+销毁 | SOP辨识拍照后销毁 ≈ OMS辨识后贴标上架+销毁 |
| §3.40 | `instock_inter_warehouse_transfer` | fill | - | 20250407074 | alias | 【库内】库间调拨 | SOP库内仓间调拨 ≈ OMS库间调拨 |
| §3.13 | `instock_nonstandard_charge` | fill | - | 20250620001 | alias | 【库内】IT改数收费 | SOP非标收费 ≈ OMS IT改数收费 |
| §3.38 | `instock_reinforce` | fill | - | 20250407056 | alias | 【库内】商品包装加固 | SOP库内加固 ≈ OMS商品包装加固 |

## 仍无 OMS 码（等业务确认，不臆造）

- 【入库】anker 合箱入库 (`inbound_anker_combine_carton`)
- 【入库】Basic 3PL-Winit 组套产品审核 (`inbound_basic_3pl_winit_kit`)
- 【入库】批量退货（≥20件商品）异常包裹建新入库单入库 (`inbound_bulk_return_new_inbound`)
- 【入库】加急入库 (`inbound_expedited_inbound`)
- 【入库】入库预报SKU与实际到货SKU不符合 (`inbound_forecast_sku_mismatch`)
- 【入库】辨识商品条码重新贴包裹标签 (`inbound_identify_sku_relabel_parcel`)
- 【入库】提供入库视频 (`inbound_provide_inbound_video`)
- 【入库】更换winit包装 (`inbound_replace_winit_packaging`)
- 【入库】商品下架后换入库单重新上架（不更换SKU） (`inbound_reshelve_change_wi_keep_sku`)
- 【入库】单品化管理的SN处理场景 (`inbound_serialized_sn_handling`)
- 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架 (`inbound_sku_mgmt_cross_warehouse_b`)
- 【入库】分开退货单入库 (`inbound_split_return_order`)
- 【入库】无主货异常补贴标签上架 (`inbound_unclaimed_goods_relabel_shelve`)
- 【入库】签署仓库未收到货证明 (`inbound_unsigned_not_received_proof`)
- 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作 (`inbound_winit_fault_multi_action`)
- 【库内】异常单：自提单取消出库（需要客户下入库单） (`instock_cancel_self_pickup_need_wi`)
- 【库内】自提单取消出库 (`instock_cancel_self_pickup_outbound`)
- 【库内】箱转单一 (`instock_carton_to_each`)
- 【库内】更换SKU做不良品上架 (`instock_change_sku_defective_shelve`)
- 【库内】采集SN码 (`instock_collect_sn`)
- 【库内】包装破损商品更换包材重新上架 (`instock_damaged_repack_reshelve`)
- 【库内】库内辨识+辨识后重新贴标上架 (`instock_identify_then_relabel_shelve`)
- 【库内】库内仓间调拨-Anker (`instock_inter_warehouse_transfer_anker`)
- 【库内】库内库存销毁 (`instock_inventory_destroy`)
- 【库内】 代购包材-拓竹 (`instock_procure_packaging_bambu`)
- 【库内】清除/覆盖标签 (`instock_remove_cover_label`)
- 【库内】商品改制重新上架 (`instock_rework_reshelve`)
- 【库内】SN采集+管理方式变更+重新上架（复合场景） (`instock_sn_mgmt_change_reshelve`)
- 【库内】拆箱辨识后重新更换SKU上架 (`instock_unbox_identify_change_sku`)
- 【库内】打包完成后作废出库单（有商品增值） (`instock_void_outbound_after_pack`)
- 【库内】WINIT标准包材线下寄件出库（需尾程线下面单） (`instock_winit_pack_offline_ship`)

## 规则

- 只在同一订单类型内匹配：入库卡不对库内/出库码，库内卡不对入库/出库码。
- 别名仅用于 SOP 名与 OMS 名明显同义的条目。
- 「无主货异常补贴标签上架」≠「无主货找回暂存」，不自动合并。
- 「库内仓间调拨-Anker」不并到普通库间调拨。
