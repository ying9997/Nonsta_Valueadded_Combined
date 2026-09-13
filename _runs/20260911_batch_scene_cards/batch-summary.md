# 批量场景卡生成报告

## 统计
- SOP 入库章节：33（§2.1-§2.33）
- SOP 库内章节：42（§3.1-§3.43，缺节不计）
- 已有场景卡跳过：6
- 新生成：69
- OMS 码匹配成功：33
- OMS 码未匹配：36
- 薄内容章节（SOP 模板过短）：9
- 安装后 `loadScenarioCards()`：75（原 6 + 新 69；SOP 无 §3.37）

安装后做了两处防误抢：
1. 需求文本没有「库内/在库/货权…」时，库内场景卡不参与打分（避免入库单被库内卡抢走）
2. 把「新入库单 / 包裹条码」这类过于通用的词从 strong 降到 weak

demo-7 规则回归：outputPath 7/7，sceneKey 4/5（与安装前基线一致；VASC000000326061 仍判 T1 而非 F-001，是安装前就有的差异）

## 跳过的已有场景卡

- §2.1 【入库】尺重/标签辨识后换标上架 — SOP §2.1 已有人工场景卡
- §2.3 【入库】海运整柜100%A+无包裹条码异常 — SOP §2.3 已有人工场景卡
- §2.5 【入库】包裹类异常换商品标签上架 — SOP §2.5 已有人工场景卡
- §2.7 【入库】指定商品拍照暂存 — SOP §2.7 已有人工场景卡
- §2.12 【入库】关联第三方条码上架 — SOP §2.12 已有人工场景卡
- §2.33 【入库】包裹条码批量异常(需客户处理)"辨识后补贴包裹标签上架 — SOP §2.33 已有人工场景卡

## 入库场景卡（新生成）

| # | SOP | 场景名 | sceneKey | omsSceneCode | strong 信号数 | status |
|---|-----|--------|----------|--------------|-------------|--------|
| 1 | §2.2 | 【入库】批量辨识商品后补贴商品条码及包裹条码上架 | `inbound_batch_identify_relabel_barcode` | 202506120003 | 7 | supported |
| 2 | §2.4 | 【入库】包裹串仓异常调拨 | `inbound_parcel_cross_warehouse_transfer` | [Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses | 8 | supported |
| 3 | §2.6 | 【入库】上架前自提 | `inbound_self_pickup_before_shelve` | INBOUND_PICKUP_BF_SHELVE | 6 | supported |
| 4 | §2.8 | 【入库】商品质检 | `inbound_product_quality_inspection` | 20250408002 | 8 | supported |
| 5 | §2.9 | 【入库】无主货异常补贴标签上架 | `inbound_unclaimed_goods_relabel_shelve` | pending_oms_code | 7 | supported |
| 6 | §2.10 | 【入库】入库预报SKU与实际到货SKU不符合 | `inbound_forecast_sku_mismatch` | pending_oms_code | 8 | supported |
| 7 | §2.11 | 【入库】商品下架后换入库单重新上架（不更换SKU） | `inbound_reshelve_change_wi_keep_sku` | pending_oms_code | 6 | supported |
| 8 | §2.13 | 【入库】分开退货单入库 | `inbound_split_return_order` | pending_oms_code | 7 | supported |
| 9 | §2.14 | 【入库】批量退货（≥20件商品）异常包裹建新入库单入库 | `inbound_bulk_return_new_inbound` | pending_oms_code | 6 | supported |
| 10 | §2.15 | 【入库】补贴透明标签 | `inbound_transparent_label` | 2026041701 | 8 | supported |
| 11 | §2.16 | 【入库】拆包/拆箱上架 | `inbound_unpack_shelve` | pending_oms_code | 8 | supported |
| 12 | §2.17 | 【入库】收集SN码 | `inbound_collect_sn` | pending_oms_code | 7 | supported |
| 13 | §2.18 | 【入库】上架前盘点-辨识费 | `inbound_pre_shelve_inventory_identify` | 202506120002 | 8 | supported |
| 14 | §2.19 | 【入库】组合后上架 | `inbound_kit_then_shelve` | 20250407020 | 7 | supported |
| 15 | §2.20 | 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架 | `inbound_sku_mgmt_cross_warehouse_b` | pending_oms_code | 7 | supported |
| 16 | §2.21 | 【入库】清除标签 | `inbound_remove_label` | 20250530002 | 8 | supported |
| 17 | §2.22 | 【入库】上架前销毁 | `inbound_destroy_before_shelve` | INBOUND_DESTORY_BF_SHELVE | 6 | supported |
| 18 | §2.23 | 【入库】提供入库视频 | `inbound_provide_inbound_video` | pending_oms_code | 8 | supported |
| 19 | §2.24 | 【入库】更换winit包装 | `inbound_replace_winit_packaging` | pending_oms_code | 7 | supported |
| 20 | §2.25 | 【入库】更换客制包材 | `inbound_replace_custom_packaging` | 20250509 | 6 | supported |
| 21 | §2.26 | 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作 | `inbound_winit_fault_multi_action` | pending_oms_code | 8 | supported |
| 22 | §2.27 | 【入库】辨识商品条码重新贴包裹标签 | `inbound_identify_sku_relabel_parcel` | pending_oms_code | 8 | supported |
| 23 | §2.28 | 【入库】Basic 3PL-Winit 组套产品审核 | `inbound_basic_3pl_winit_kit` | pending_oms_code | 8 | supported |
| 24 | §2.29 | 【入库】加急入库 | `inbound_expedited_inbound` | pending_oms_code | 6 | supported |
| 25 | §2.30 | 【入库】anker 合箱入库 | `inbound_anker_combine_carton` | pending_oms_code | 7 | supported |
| 26 | §2.31 | 【入库】单品化管理的SN处理场景 | `inbound_serialized_sn_handling` | pending_oms_code | 8 | supported |
| 27 | §2.32 | 【入库】签署仓库未收到货证明 | `inbound_unsigned_not_received_proof` | pending_oms_code | 7 | supported |

## 库内场景卡（新生成）

| # | SOP | 场景名 | sceneKey | omsSceneCode | strong 信号数 | status |
|---|-----|--------|----------|--------------|-------------|--------|
| 1 | §3.1 | 【库内】货权转移-改数 | `instock_ownership_transfer` | 【In-warehouse】Transfer of ownership of goods | 7 | supported |
| 2 | §3.2 | 【库内】审计盘点 | `instock_audit_inventory` | 20250407039 | 8 | supported |
| 3 | §3.3 | 【库内】良品/不良品检测 | `instock_good_defective_inspection` | 20250407051 | 8 | supported |
| 4 | §3.4 | 【库内】代采购包材物料 | `instock_procure_packaging_materials` | 20250619001 | 8 | supported |
| 5 | §3.5 | 【库内】拆分SKU | `instock_split_sku` | INSTOCK_SPLIT_SKU | 7 | supported |
| 6 | §3.6 | 【库内】商品组合 | `instock_product_kitting` | 20250407071 | 8 | supported |
| 7 | §3.7 | 【库内】拍摄照片/视频 | `instock_photo_video` | 20250407035 | 8 | supported |
| 8 | §3.8 | 【库内】商品尺重测量辨识 | `instock_measure_identify_dims_weight` | 【Warehouse】Measurement and identification of commodity weight | 8 | supported |
| 9 | §3.9 | 【库内】指定单品/库位商品更换标签上架【换标前后SKU不一样】 | `instock_relabel_change_sku` | 20250407062 | 7 | supported |
| 10 | §3.10 | 【库内】库存冻结/解冻 | `instock_inventory_freeze_unfreeze` | INSTOCK_INVENTORY_FREEZE_UNFREEZE | 7 | supported |
| 11 | §3.11 | 【库内】自提单取消出库 | `instock_cancel_self_pickup_outbound` | pending_oms_code | 6 | supported |
| 12 | §3.12 | 【库内】异常重新拍照 | `instock_exception_rephoto` | 【Library】Abnormal re-photographing | 6 | supported |
| 13 | §3.13 | 【库内】非标收费 | `instock_nonstandard_charge` | pending_oms_code | 6 | supported |
| 14 | §3.14 | 【库内】异常商品转不良品上架 | `instock_exception_to_defective_shelve` | 202512150002 | 7 | supported |
| 15 | §3.15 | 【库内】清除/覆盖标签 | `instock_remove_cover_label` | pending_oms_code | 8 | supported |
| 16 | §3.16 | 【库内】商品外观辨识+贴标上架 | `instock_appearance_identify_label` | 20250407043 | 8 | supported |
| 17 | §3.17 | 【库内】更换客制包装 | `instock_replace_custom_packaging` | 20250407055 | 6 | supported |
| 18 | §3.18 | 【库内】更换商品生产日期标签 | `instock_replace_mfg_date_label` | 20260108001 | 5 | supported |
| 19 | §3.19 | 【库内】不良品转良品 | `instock_defective_to_good` | 20250808002 | 7 | supported |
| 20 | §3.20 | 【库内】更换SKU做不良品上架 | `instock_change_sku_defective_shelve` | pending_oms_code | 5 | supported |
| 21 | §3.21 | 【库内】A+包裹更换标签上架 | `instock_aplus_parcel_relabel_shelve` | 20250407060 | 6 | supported |
| 22 | §3.22 | 【库内】指定位置贴标 | `instock_specified_position_label` | 20260127001 | 5 | supported |
| 23 | §3.23 | 【库内】辨识拍照后销毁 | `instock_identify_photo_then_destroy` | pending_oms_code | 5 | supported |
| 24 | §3.24 | 【库内】商品改制重新上架 | `instock_rework_reshelve` | pending_oms_code | 7 | supported |
| 25 | §3.25 | 【库内】库内库存销毁 | `instock_inventory_destroy` | pending_oms_code | 7 | supported |
| 26 | §3.26 | 【库内】采集SN码 | `instock_collect_sn` | 202507141 | 6 | supported |
| 27 | §3.27 | 【库内】 代购包材-拓竹 | `instock_procure_packaging_bambu` | pending_oms_code | 8 | supported |
| 28 | §3.28 | 【库内】货权转移（换标模式） | `instock_ownership_transfer_relabel` | 【In-warehouse】Transfer of ownership of goods | 7 | supported |
| 29 | §3.29 | 【库内】包装破损商品更换包材重新上架 | `instock_damaged_repack_reshelve` | pending_oms_code | 6 | supported |
| 30 | §3.30 | 【库内】拆箱辨识后重新更换SKU上架 | `instock_unbox_identify_change_sku` | pending_oms_code | 8 | supported |
| 31 | §3.31 | 【库内】WINIT标准包材线下寄件出库（需尾程线下面单） | `instock_winit_pack_offline_ship` | pending_oms_code | 6 | supported |
| 32 | §3.32 | 【库内】SN采集+管理方式变更+重新上架（复合场景） | `instock_sn_mgmt_change_reshelve` | pending_oms_code | 8 | supported |
| 33 | §3.33 | 【库内】库内辨识+辨识后重新贴标上架 | `instock_identify_then_relabel_shelve` | pending_oms_code | 8 | supported |
| 34 | §3.34 | 【库内】异常单：自提单取消出库（需要客户下入库单） | `instock_cancel_self_pickup_need_wi` | pending_oms_code | 7 | supported |
| 35 | §3.35 | 【库内】商品贴指令性标签（警示标语/使用说明/清洁维护等）+拍照 | `instock_instructional_label_photo` | 20250427001 | 8 | supported |
| 36 | §3.36 | 【库内】打包完成后作废出库单（有商品增值） | `instock_void_outbound_after_pack` | pending_oms_code | 6 | supported |
| 37 | §3.38 | 【库内】库内加固 | `instock_reinforce` | pending_oms_code | 6 | supported |
| 38 | §3.39 | 【库内】商品拆箱加/减配件 | `instock_add_remove_accessories` | 20250421001 | 6 | supported |
| 39 | §3.40 | 【库内】库内仓间调拨 | `instock_inter_warehouse_transfer` | pending_oms_code | 8 | supported |
| 40 | §3.41 | 【库内】库内仓间调拨-Anker | `instock_inter_warehouse_transfer_anker` | pending_oms_code | 7 | supported |
| 41 | §3.42 | 【库内】良品转不良品上架 | `instock_good_to_defective_shelve` | 20250808003 | 6 | supported |
| 42 | §3.43 | 【库内】箱转单一 | `instock_carton_to_each` | pending_oms_code | 7 | supported |

## OMS 码未匹配的场景

- §2.9 【入库】无主货异常补贴标签上架 (`inbound_unclaimed_goods_relabel_shelve`)
- §2.10 【入库】入库预报SKU与实际到货SKU不符合 (`inbound_forecast_sku_mismatch`)
- §2.11 【入库】商品下架后换入库单重新上架（不更换SKU） (`inbound_reshelve_change_wi_keep_sku`)
- §2.13 【入库】分开退货单入库 (`inbound_split_return_order`)
- §2.14 【入库】批量退货（≥20件商品）异常包裹建新入库单入库 (`inbound_bulk_return_new_inbound`)
- §2.16 【入库】拆包/拆箱上架 (`inbound_unpack_shelve`)
- §2.17 【入库】收集SN码 (`inbound_collect_sn`)
- §2.20 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架 (`inbound_sku_mgmt_cross_warehouse_b`)
- §2.23 【入库】提供入库视频 (`inbound_provide_inbound_video`)
- §2.24 【入库】更换winit包装 (`inbound_replace_winit_packaging`)
- §2.26 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作 (`inbound_winit_fault_multi_action`)
- §2.27 【入库】辨识商品条码重新贴包裹标签 (`inbound_identify_sku_relabel_parcel`)
- §2.28 【入库】Basic 3PL-Winit 组套产品审核 (`inbound_basic_3pl_winit_kit`)
- §2.29 【入库】加急入库 (`inbound_expedited_inbound`)
- §2.30 【入库】anker 合箱入库 (`inbound_anker_combine_carton`)
- §2.31 【入库】单品化管理的SN处理场景 (`inbound_serialized_sn_handling`)
- §2.32 【入库】签署仓库未收到货证明 (`inbound_unsigned_not_received_proof`)
- §3.11 【库内】自提单取消出库 (`instock_cancel_self_pickup_outbound`)
- §3.13 【库内】非标收费 (`instock_nonstandard_charge`)
- §3.15 【库内】清除/覆盖标签 (`instock_remove_cover_label`)
- §3.20 【库内】更换SKU做不良品上架 (`instock_change_sku_defective_shelve`)
- §3.23 【库内】辨识拍照后销毁 (`instock_identify_photo_then_destroy`)
- §3.24 【库内】商品改制重新上架 (`instock_rework_reshelve`)
- §3.25 【库内】库内库存销毁 (`instock_inventory_destroy`)
- §3.27 【库内】 代购包材-拓竹 (`instock_procure_packaging_bambu`)
- §3.29 【库内】包装破损商品更换包材重新上架 (`instock_damaged_repack_reshelve`)
- §3.30 【库内】拆箱辨识后重新更换SKU上架 (`instock_unbox_identify_change_sku`)
- §3.31 【库内】WINIT标准包材线下寄件出库（需尾程线下面单） (`instock_winit_pack_offline_ship`)
- §3.32 【库内】SN采集+管理方式变更+重新上架（复合场景） (`instock_sn_mgmt_change_reshelve`)
- §3.33 【库内】库内辨识+辨识后重新贴标上架 (`instock_identify_then_relabel_shelve`)
- §3.34 【库内】异常单：自提单取消出库（需要客户下入库单） (`instock_cancel_self_pickup_need_wi`)
- §3.36 【库内】打包完成后作废出库单（有商品增值） (`instock_void_outbound_after_pack`)
- §3.38 【库内】库内加固 (`instock_reinforce`)
- §3.40 【库内】库内仓间调拨 (`instock_inter_warehouse_transfer`)
- §3.41 【库内】库内仓间调拨-Anker (`instock_inter_warehouse_transfer_anker`)
- §3.43 【库内】箱转单一 (`instock_carton_to_each`)
