# 历史跑批抽样统计（第一刀）

- 时间：本机生成，**只抽样，未跑评估、未发飞书**
- OMS 缓存：`_runs/20260909_inbound_scene_probe/_oms_cache`
- 归桶：只用场景卡上的可用 OMS 场景码；无码卡不补关键词
- 过滤：服务码 OW01V1602 / OSF6V1603 / OSF6V1841；排除 t14-golden 5 条；需求描述 ≥ 30 字
- 每场景最多 2 条：已审核通过优先，其次有 EB，再取需求描述最长
- 场景卡 75 张（入库 33 / 库内 42 / 其他 0）
- 可用 OMS 码卡片 40 张；无可用 OMS 码 35 张

## 池子规模

| 项 | 数量 |
|----|-----:|
| OMS 订单 | 5112 |
| 命中三类服务码 | 1637 |
| 排除 golden | 5 |
| 需求描述 < 30 字 | 111 |
| 有服务码但对不上场景卡 | 819 |
| 归到场景卡的合格单 | 702 |
| **抽中候选** | **75** |

## 覆盖 vs 验收

| 口径 | 结果 | 验收 |
|------|------|------|
| 入库有抽样的场景 | 17 | ≥ 20 未达标 |
| 库内有抽样的场景 | 21 | ≥ 15 达标 |
| 候选条数 | 75 | 约 150（不强凑） |

## OMS 码冲突

- 无

## 按场景卡

| 业务段 | 场景 | OMS码 | 合格池 | 抽中 | 说明 |
|--------|------|------|------:|-----:|------|
| inbound | 【入库】尺重/标签辨识后换标上架 `inbound_label_identify` | `20250407004` | 32 | 2 | 满 2 条 |
| inbound | 【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架 `inbound_aplus_direct_shelve` | `20250929` | 29 | 2 | 满 2 条 |
| inbound | 【入库】包裹类异常换商品标签上架 `inbound_package_exception_relabel_shelving` | `20250407008` | 15 | 2 | 满 2 条 |
| inbound | 【入库】指定商品拍照暂存 `inbound_photo_hold` | `20250522001` | 45 | 2 | 满 2 条 |
| inbound | 【入库】anker 合箱入库 `inbound_anker_combine_carton` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】Basic 3PL-Winit 组套产品审核 `inbound_basic_3pl_winit_kit` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】批量辨识商品后补贴商品条码及包裹条码上架 `inbound_batch_identify_relabel_barcode` | `202506120003` | 41 | 2 | 满 2 条 |
| inbound | 【入库】批量退货（≥20件商品）异常包裹建新入库单入库 `inbound_bulk_return_new_inbound` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】收集SN码 `inbound_collect_sn` | `20250529001` | 7 | 2 | 满 2 条 |
| inbound | 【入库】上架前销毁 `inbound_destroy_before_shelve` | `INBOUND_DESTORY_BF_SHELVE` | 7 | 2 | 满 2 条 |
| inbound | 【入库】加急入库 `inbound_expedited_inbound` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】入库预报SKU与实际到货SKU不符合 `inbound_forecast_sku_mismatch` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】辨识商品条码重新贴包裹标签 `inbound_identify_sku_relabel_parcel` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】组合后上架 `inbound_kit_then_shelve` | `20250407020` | 9 | 2 | 满 2 条 |
| inbound | 【入库】包裹串仓异常调拨 `inbound_parcel_cross_warehouse_transfer` | `[Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses` | 5 | 2 | 满 2 条 |
| inbound | 【入库】上架前盘点-辨识费 `inbound_pre_shelve_inventory_identify` | `202506120002` | 3 | 2 | 满 2 条 |
| inbound | 【入库】商品质检 `inbound_product_quality_inspection` | `20250408002` | 0 | 0 | 有OMS码但合格样本为0 |
| inbound | 【入库】提供入库视频 `inbound_provide_inbound_video` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】清除标签 `inbound_remove_label` | `20260302` | 60 | 2 | 满 2 条 |
| inbound | 【入库】更换客制包材 `inbound_replace_custom_packaging` | `20250509` | 4 | 2 | 满 2 条 |
| inbound | 【入库】更换winit包装 `inbound_replace_winit_packaging` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】商品下架后换入库单重新上架（不更换SKU） `inbound_reshelve_change_wi_keep_sku` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】上架前自提 `inbound_self_pickup_before_shelve` | `INBOUND_PICKUP_BF_SHELVE` | 4 | 2 | 满 2 条 |
| inbound | 【入库】单品化管理的SN处理场景 `inbound_serialized_sn_handling` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架 `inbound_sku_mgmt_cross_warehouse_b` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】分开退货单入库 `inbound_split_return_order` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】补贴透明标签 `inbound_transparent_label` | `2026041701` | 13 | 2 | 满 2 条 |
| inbound | 【入库】无主货异常补贴标签上架 `inbound_unclaimed_goods_relabel_shelve` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】拆包/拆箱上架 `inbound_unpack_shelve` | `20250407003` | 12 | 2 | 满 2 条 |
| inbound | 【入库】签署仓库未收到货证明 `inbound_unsigned_not_received_proof` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作 `inbound_winit_fault_multi_action` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】商品拆箱加/减配件 `instock_add_remove_accessories` | `20250421001` | 20 | 2 | 满 2 条 |
| instock | 【库内】A+包裹更换标签上架 `instock_aplus_parcel_relabel_shelve` | `20250407060` | 5 | 2 | 满 2 条 |
| instock | 【库内】商品外观辨识+贴标上架 `instock_appearance_identify_label` | `20250407043` | 51 | 2 | 满 2 条 |
| instock | 【库内】审计盘点 `instock_audit_inventory` | `20250407039` | 2 | 2 | 满 2 条 |
| instock | 【库内】异常单：自提单取消出库（需要客户下入库单） `instock_cancel_self_pickup_need_wi` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】自提单取消出库 `instock_cancel_self_pickup_outbound` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】箱转单一 `instock_carton_to_each` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】更换SKU做不良品上架 `instock_change_sku_defective_shelve` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】采集SN码 `instock_collect_sn` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】包装破损商品更换包材重新上架 `instock_damaged_repack_reshelve` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】不良品转良品 `instock_defective_to_good` | `20250808002` | 2 | 2 | 满 2 条 |
| instock | 【库内】异常重新拍照 `instock_exception_rephoto` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】异常商品转不良品上架 `instock_exception_to_defective_shelve` | `202512150002` | 22 | 2 | 满 2 条 |
| instock | 【库内】良品/不良品检测 `instock_good_defective_inspection` | `20250407051` | 14 | 2 | 满 2 条 |
| instock | 【库内】良品转不良品上架 `instock_good_to_defective_shelve` | `20250808003` | 14 | 2 | 满 2 条 |
| instock | 【库内】辨识拍照后销毁 `instock_identify_photo_then_destroy` | `20250407045` | 11 | 2 | 满 2 条 |
| instock | 【库内】库内辨识+辨识后重新贴标上架 `instock_identify_then_relabel_shelve` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】商品贴指令性标签（警示标语/使用说明/清洁维护等）+拍照 `instock_instructional_label_photo` | `20250427001` | 2 | 2 | 满 2 条 |
| instock | 【库内】库内仓间调拨 `instock_inter_warehouse_transfer` | `20250407074` | 3 | 2 | 满 2 条 |
| instock | 【库内】库内仓间调拨-Anker `instock_inter_warehouse_transfer_anker` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】库内库存销毁 `instock_inventory_destroy` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】库存冻结/解冻 `instock_inventory_freeze_unfreeze` | `INSTOCK_INVENTORY_FREEZE_UNFREEZE` | 10 | 2 | 满 2 条 |
| instock | 【库内】商品尺重测量辨识 `instock_measure_identify_dims_weight` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】非标收费 `instock_nonstandard_charge` | `20250620001` | 7 | 2 | 满 2 条 |
| instock | 【库内】货权转移-改数 `instock_ownership_transfer` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】货权转移（换标模式） `instock_ownership_transfer_relabel` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】拍摄照片/视频 `instock_photo_video` | `20250407035` | 46 | 2 | 满 2 条 |
| instock | 【库内】 代购包材-拓竹 `instock_procure_packaging_bambu` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】代采购包材物料 `instock_procure_packaging_materials` | `20250619001` | 1 | 1 | 样本不足 |
| instock | 【库内】商品组合 `instock_product_kitting` | `20250407071` | 26 | 2 | 满 2 条 |
| instock | 【库内】库内加固 `instock_reinforce` | `20250407056` | 4 | 2 | 满 2 条 |
| instock | 【库内】指定单品/库位商品更换标签上架【换标前后SKU不一样】 `instock_relabel_change_sku` | `20250407062` | 35 | 2 | 满 2 条 |
| instock | 【库内】清除/覆盖标签 `instock_remove_cover_label` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】更换客制包装 `instock_replace_custom_packaging` | `20250407055` | 9 | 2 | 满 2 条 |
| instock | 【库内】更换商品生产日期标签 `instock_replace_mfg_date_label` | `20260108001` | 0 | 0 | 有OMS码但合格样本为0 |
| instock | 【库内】商品改制重新上架 `instock_rework_reshelve` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】SN采集+管理方式变更+重新上架（复合场景） `instock_sn_mgmt_change_reshelve` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】指定位置贴标 `instock_specified_position_label` | `20260127001` | 7 | 2 | 满 2 条 |
| instock | 【库内】拆分SKU `instock_split_sku` | `INSTOCK_SPLIT_SKU` | 22 | 2 | 满 2 条 |
| instock | 【库内】拆箱辨识后重新更换SKU上架 `instock_unbox_identify_change_sku` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】打包完成后作废出库单（有商品增值） `instock_void_outbound_after_pack` | - | 0 | 0 | 无可用OMS码 |
| instock | 【库内】WINIT标准包材线下寄件出库（需尾程线下面单） `instock_winit_pack_offline_ship` | - | 0 | 0 | 无可用OMS码 |
| inbound | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 `inbound_package_barcode_batch_relabel` | `20250430` | 67 | 2 | 满 2 条 |
| inbound | 【入库】关联第三方商品条码上架 `inbound_third_party_merchandise_barcode` | `202506120001` | 36 | 2 | 满 2 条 |

## 建议试点 20 条（未跑）

挑选逻辑：入库 10 个不同场景各 1 条 + 库内 10 个不同场景各 1 条；场景内取排序第一（已审核 / 有 EB / 描述更长）。不足时用另一段补齐。

| # | VASC | 业务段 | 场景 | 已审 | EB | 群聊 | 描述字数 |
|---|------|--------|------|:----:|:--:|:----:|--------:|
| 1 | VASC000000312144 | inbound | 【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架 | Y | Y | Y | 116 |
| 2 | VASC000000346185 | inbound | 【入库】批量辨识商品后补贴商品条码及包裹条码上架 | Y | Y |  | 351 |
| 3 | VASC000000292350 | inbound | 【入库】尺重/标签辨识后换标上架 | Y | Y | Y | 1975 |
| 4 | VASC000000324789 | inbound | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | Y | Y |  | 894 |
| 5 | VASC000000329235 | inbound | 【入库】包裹类异常换商品标签上架 | Y | Y |  | 270 |
| 6 | VASC000000305787 | inbound | 【入库】指定商品拍照暂存 | Y | Y |  | 298 |
| 7 | VASC000000272319 | inbound | 【入库】清除标签 | Y | Y | Y | 127 |
| 8 | VASC000000287754 | inbound | 【入库】更换客制包材 | Y | Y | Y | 190 |
| 9 | VASC000000305892 | inbound | 【入库】关联第三方商品条码上架 | Y | Y |  | 1637 |
| 10 | VASC000000326745 | inbound | 【入库】拆包/拆箱上架 | Y | Y | Y | 196 |
| 11 | VASC000000320376 | instock | 【库内】商品拆箱加/减配件 | Y | Y | Y | 226 |
| 12 | VASC000000272679 | instock | 【库内】A+包裹更换标签上架 | Y | Y |  | 99 |
| 13 | VASC000000309402 | instock | 【库内】商品外观辨识+贴标上架 | Y | Y | Y | 116 |
| 14 | VASC000000284952 | instock | 【库内】异常商品转不良品上架 | Y | Y | Y | 435 |
| 15 | VASC000000338049 | instock | 【库内】良品转不良品上架 | Y | Y | Y | 121 |
| 16 | VASC000000271185 | instock | 【库内】拍摄照片/视频 | Y | Y |  | 107 |
| 17 | VASC000000321948 | instock | 【库内】库内加固 | Y | Y | Y | 156 |
| 18 | VASC000000282990 | instock | 【库内】指定单品/库位商品更换标签上架【换标前后SKU不一样】 | Y | Y | Y | 149 |
| 19 | VASC000000308661 | instock | 【库内】指定位置贴标 | Y | Y | Y | 151 |
| 20 | VASC000000318543 | instock | 【库内】拆分SKU | Y | Y | Y | 114 |

## 已记录、下一刀才执行的约定

- 库内 OMS 码对不上场景卡：跳过选场景，标记「无对应场景卡」，不兜底
- 试点阶段发测试群
- 金萤发不出时用机器人前缀 `[模拟·金萤]`

本刀未写 `run-historical-batch.ts`，未调用 pipeline，未发飞书。

