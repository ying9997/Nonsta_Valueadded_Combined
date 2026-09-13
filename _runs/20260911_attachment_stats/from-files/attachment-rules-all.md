# 全场景附件必填规则统计

> 本目录是 **补抓文件表后的对照结果**，没有回写场景卡。旧报告仍在上一级 `attachment-rules-all.md`。

## 和「只看 attrs 空槽」差在哪

上一轮 CSV 里标签文件几乎全空，建议必填主要是上架入库单号。这次用真实上传文件重算：

| 附件 | 达到建议必填的场景数 | 说明 |
|------|----------------------|------|
| 标签文件 `VAS_ATTR_REL_LF` | **14** | 含 F-001 尺重换标 37 单、非空率 83.8% |
| 操作说明 `VAS_ATTR_REL_AOOI` | **1** | 仅「库内商品拆箱加/减配件」59.1% |
| 商品和标签对应关系 `TCRBCAL` | 0 | 最高约 36%，未达 50% |
| 包裹和标签对应关系 `TRPP` | 0 | 窗口内最高约 23%；用户单 `VASC000000362139` 有这个 xlsx，但是 **2026-09-11** 下的单，不在本窗口 |
| 视频 SOP `VSS` / CEO 截图 | 0 | 出现少 |

建议必填场景：25 → **27**（多出来的两张卡都是新达标的标签文件）。未执行 `--apply`。

## 统计口径

- 数据窗口：2026-04-21 ~ 2026-09-03
- 数据源：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260909_inbound_scene_probe\_oms_cache/attrs_submit.csv + atoms.csv + D:\DA\Nonsta_Valueadded_Combined\_runs\20260911_attachment_stats\_oms_files\files.csv`
- 只统计 `inputNode=SUBMIT`
- 判断规则：出现率 ≥ 70% **且** 非空率 ≥ 50% → 建议必填；出现率 ≥ 30% 且非空率 ≥ 10%（但未达必填）→ 建议可选；空表单槽（有 key 无值）不列入
- 场景订单数 < 5 → 待验证，不自动填
- 出现率 = 有该 key 的订单数 / 该场景总订单数；文本字段非空率 = attributeValue 非空；**附件非空率 = `oms_va_execute_file` 在 SUBMIT 有真实文件**（不看空槽）
- 附件白名单：`VAS_ATTR_REL_LF` / `AOOI` / `TCRBCAL` / `TRPP` / `VSS` / `CEO_SOA`。FINISH 文件（如结果照片 RDP）不计入提交必填。
- 文件表：`D:\DA\Nonsta_Valueadded_Combined\_runs\20260911_attachment_stats\_oms_files\files.csv`（SUBMIT 行 6068）
- `BEOR` / `VAS_ATTR_REL_RD` 是需求正文，不算附件门。
- 有 OMS 码场景：44；其中建议必填 ≥1 项：27；无码：31

## 汇总

| # | 场景名 | omsSceneCode | 订单数 | 建议必填 | 建议可选 | 待验证 |
|---|--------|-------------|-------|---------|---------|--------|
| 1 | 【库内】辨识拍照后销毁 | 20250407045 | 13 | VAS_ATTR_REL_LF | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_AOOI, MERCHANDISE_SERNO |  |
| 2 | 【库内】不良品转良品 | 20250808002 | 3 |  |  | n=3<5 |
| 3 | 【库内】拆分SKU | INSTOCK_SPLIT_SKU | 34 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF, OONFRFTS, VAS_ATTR_REL_QOSIITOAS, VAS_ATTR_REL_NPB, VAS_ATTR_REL_SP, TRMS |  |
| 4 | 【库内】代采购包材物料 | 20250619001 | 29 | VAS_ATTR_REL_NOPM, VAS_ATTR_REL_QOPM, VAS_ATTR_REL_DOPM, POML |  |  |
| 5 | 【库内】非标收费 | 20250620001 | 52 | VAS_ATTR_REL_VOIC, BTBATSPASTC |  |  |
| 6 | 【库内】更换客制包装 | 20250407055 | 9 | VAS_ATTR_REL_NWEON, OONFRFTS, VAS_ATTR_REL_LF | PACKAGE_SERNO, MERCHANDISE_SERNO, NSVASTN, VAS_ATTR_REL_TCRBCAL |  |
| 7 | 【库内】更换商品生产日期标签 | 20260108001 | 0 |  |  | 缓存无单 |
| 8 | 【库内】货权转移-改数 | 【In-warehouse】Transfer of ownership of goods | 44 | VAS_ATTR_REL_VOIC, BTBATSPASTC | VAS_ATTR_REL_TCRBCAL, OONFRFTS, VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF |  |
| 9 | 【库内】货权转移（换标模式） | 【In-warehouse】Transfer of ownership of goods | 44 | VAS_ATTR_REL_VOIC, BTBATSPASTC | VAS_ATTR_REL_TCRBCAL, OONFRFTS, VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF |  |
| 10 | 【库内】库存冻结/解冻 | INSTOCK_INVENTORY_FREEZE_UNFREEZE | 13 |  | MERCHANDISE_SERNO, VAS_ATTR_REL_TCRBCAL, VAS_ATTR_REL_AOOI |  |
| 11 | 【库内】库内仓间调拨 | 20250407074 | 5 |  | VAS_ATTR_REL_LF, VAS_ATTR_REL_NWEON, OONFRFTS |  |
| 12 | 【库内】库内加固 | 20250407056 | 6 |  | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, MERCHANDISE_SERNO, VAS_ATTR_REL_VOIC, VAS_ATTR_REL_VACQ |  |
| 13 | 【库内】良品/不良品检测 | 20250407051 | 14 |  | VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF |  |
| 14 | 【库内】良品转不良品上架 | 20250808003 | 16 |  | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, OONFRFTS, VAS_ATTR_REL_TCRBCAL, VAS_ATTR_REL_AOOI, VAS_ATTR_REL_VOIC, VAS_ATTR_REL_VACQ |  |
| 15 | 【库内】拍摄照片/视频 | 20250407035 | 54 |  | VAS_ATTR_REL_LF, MERCHANDISE_SERNO, VAS_ATTR_REL_AOOI, PACKAGE_SERNO, VSS, VAS_ATTR_REL_NWEON |  |
| 16 | 【库内】商品拆箱加/减配件 | 20250421001 | 22 | VAS_ATTR_REL_NWEON, OONFRFTS, VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF | VSS, MERCHANDISE_SERNO, PACKAGE_SERNO, VAS_ATTR_REL_TCRBCAL |  |
| 17 | 【库内】商品尺重测量辨识 | 【Warehouse】Measurement and identification of commodity weight | 15 |  | MERCHANDISE_SERNO, VAS_ATTR_REL_LF |  |
| 18 | 【库内】商品贴指令性标签（警示标语/使用说明/清洁维护等）+拍照 | 20250427001 | 2 |  |  | n=2<5 |
| 19 | 【库内】商品外观辨识+贴标上架 | 20250407043 | 62 | VAS_ATTR_REL_LF, VAS_ATTR_REL_NWEON | OONFRFTS, VAS_ATTR_REL_TCRBCAL, VAS_ATTR_REL_AOOI, MERCHANDISE_SERNO |  |
| 20 | 【库内】商品组合 | 20250407071 | 28 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, OONFRFTS | VAS_ATTR_REL_AOOI, MERCHANDISE_SERNO, VSS |  |
| 21 | 【库内】审计盘点 | 20250407039 | 40 | MERCHANDISE_SERNO, VAS_ATTR_REL_WWH, EVENT03 |  |  |
| 22 | 【库内】异常商品转不良品上架 | 202512150002 | 22 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_LF, NSVASTN |  |
| 23 | 【库内】异常重新拍照 | 【Library】Abnormal re-photographing | 10 |  | VAS_ATTR_REL_AOOI, PACKAGE_SERNO, NSVASTN |  |
| 24 | 【库内】指定单品/库位商品更换标签上架【换标前后SKU不一样】 | 20250407062 | 49 | VAS_ATTR_REL_LF, VAS_ATTR_REL_NWEON, OONFRFTS | VAS_ATTR_REL_TCRBCAL, MERCHANDISE_SERNO, PACKAGE_SERNO, VAS_ATTR_REL_AOOI |  |
| 25 | 【库内】指定位置贴标 | 20260127001 | 7 | VAS_ATTR_REL_LF | VAS_ATTR_REL_AOOI, VAS_ATTR_REL_NWEON, OONFRFTS, NSVASTN, VAS_ATTR_REL_TCRBCAL |  |
| 26 | 【库内】A+包裹更换标签上架 | 20250407060 | 7 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | VAS_ATTR_REL_TCRBCAL, PACKAGE_SERNO, MERCHANDISE_SERNO, OONFRFTS, VAS_ATTR_REL_VOIC |  |
| 27 | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | 20250430 | 76 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | TRPP, NSVASTN, VAS_ATTR_REL_AOOI |  |
| 28 | 【入库】包裹串仓异常调拨 | [Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses | 9 |  | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, TRPP, PACKAGE_SERNO, MERCHANDISE_SERNO, NSVASTN, VAS_ATTR_REL_AOOI, VAS_ATTR_REL_TCRBCAL, TJ, VAS_ATTR_REL_VPC, VAS_ATTR_REL_AT, DW |  |
| 29 | 【入库】包裹类异常换商品标签上架 | 20250407008 | 15 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | PACKAGE_SERNO, MERCHANDISE_SERNO, VAS_ATTR_REL_AOOI |  |
| 30 | 【入库】补贴透明标签 | 2026041701 | 13 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | PACKAGE_SERNO, MERCHANDISE_SERNO |  |
| 31 | 【入库】拆包/拆箱上架 | 20250407003 | 18 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | VAS_ATTR_REL_AOOI |  |
| 32 | 【入库】尺重/标签辨识后换标上架 | 20250407004 | 37 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | VAS_ATTR_REL_AOOI, VAS_ATTR_REL_TCRBCAL, TRPP |  |
| 33 | 【入库】更换客制包材 | 20250509 | 4 |  |  | n=4<5 |
| 34 | 【入库】关联第三方商品条码上架 | 202506120001 | 42 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF, TRPP |  |
| 35 | 【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架 | 20250929 | 29 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_LF |  |
| 36 | 【入库】批量辨识商品后补贴商品条码及包裹条码上架 | 202506120003 | 47 | VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF | TRPP, VAS_ATTR_REL_TCRBCAL, VAS_ATTR_REL_AOOI, PACKAGE_SERNO, MERCHANDISE_SERNO |  |
| 37 | 【入库】清除标签 | 20260302 | 68 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_LF |  |
| 38 | 【入库】商品质检 | 20250408002 | 0 |  |  | 缓存无单 |
| 39 | 【入库】上架前盘点-辨识费 | 202506120002 | 4 |  |  | n=4<5 |
| 40 | 【入库】上架前销毁 | INBOUND_DESTORY_BF_SHELVE | 7 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_AOOI, PACKAGE_SERNO, MERCHANDISE_SERNO |  |
| 41 | 【入库】上架前自提 | INBOUND_PICKUP_BF_SHELVE | 7 |  | VAS_ATTR_REL_LF, PACKAGE_SERNO, VAS_ATTR_REL_TCRBCAL, MERCHANDISE_SERNO, VAS_ATTR_REL_NWEON, NSVASTN, VAS_ATTR_REL_AOOI |  |
| 42 | 【入库】收集SN码 | 20250529001 | 7 | VAS_ATTR_REL_NWEON | PACKAGE_SERNO, MERCHANDISE_SERNO, NSVASTN, VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF |  |
| 43 | 【入库】指定商品拍照暂存 | 20250522001 | 61 |  | PACKAGE_SERNO, VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, VAS_ATTR_REL_AOOI, MERCHANDISE_SERNO, NSVASTN |  |
| 44 | 【入库】组合后上架 | 20250407020 | 26 | VAS_ATTR_REL_NWEON | VAS_ATTR_REL_LF, VAS_ATTR_REL_AOOI, TRPP |  |

## 6 张旧卡对照（只标注，不覆盖）

### 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 (`inbound_package_barcode_batch_relabel`)

- 订单数：76
- 卡上 requiredFieldKeys：VAS_ATTR_REL_LF
- 统计建议必填：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 差异：统计多出 `VAS_ATTR_REL_NWEON`；卡上多出 `无`。**不覆盖旧卡。**
  - VAS_ATTR_REL_NWEON（上架入库单号）出现率 100.0% / 非空率 98.7% → required
  - VAS_ATTR_REL_LF（标签文件）出现率 100.0% / 非空率 80.3% → required
  - TRPP（包裹和标签的对应关系）出现率 100.0% / 非空率 14.5% → optional
  - NSVASTN（非标增值来源单号）出现率 100.0% / 非空率 13.2% → optional
  - VAS_ATTR_REL_AOOI（操作说明附件）出现率 100.0% / 非空率 13.2% → optional
  - VAS_ATTR_REL_TCRBCAL（商品和标签的对应关系）出现率 100.0% / 非空率 5.3% → skip
  - CEO_SOA（CEO审批截图）出现率 100.0% / 非空率 0.0% → skip
  - VSS（视频拍摄SOP（中文+英文））出现率 100.0% / 非空率 0.0% → skip

### 【入库】包裹类异常换商品标签上架 (`inbound_package_exception_relabel_shelving`)

- 订单数：15
- 卡上 requiredFieldKeys：VAS_ATTR_REL_LF
- 统计建议必填：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 差异：统计多出 `VAS_ATTR_REL_NWEON`；卡上多出 `无`。**不覆盖旧卡。**
  - VAS_ATTR_REL_NWEON（上架入库单号）出现率 100.0% / 非空率 100.0% → required
  - VAS_ATTR_REL_LF（标签文件）出现率 100.0% / 非空率 100.0% → required
  - VAS_ATTR_REL_AOOI（操作说明附件）出现率 100.0% / 非空率 13.3% → optional
  - NSVASTN（非标增值来源单号）出现率 100.0% / 非空率 6.7% → skip
  - CEO_SOA（CEO审批截图）出现率 100.0% / 非空率 6.7% → skip
  - VAS_ATTR_REL_TCRBCAL（商品和标签的对应关系）出现率 100.0% / 非空率 0.0% → skip
  - TRPP（包裹和标签的对应关系）出现率 100.0% / 非空率 0.0% → skip
  - VSS（视频拍摄SOP（中文+英文））出现率 100.0% / 非空率 0.0% → skip

### 【入库】尺重/标签辨识后换标上架 (`inbound_label_identify`)

- 订单数：37
- 卡上 requiredFieldKeys：VAS_ATTR_REL_LF
- 统计建议必填：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 差异：统计多出 `VAS_ATTR_REL_NWEON`；卡上多出 `无`。**不覆盖旧卡。**
  - VAS_ATTR_REL_NWEON（上架入库单号）出现率 100.0% / 非空率 94.6% → required
  - VAS_ATTR_REL_LF（标签文件）出现率 100.0% / 非空率 83.8% → required
  - VAS_ATTR_REL_AOOI（操作说明附件）出现率 100.0% / 非空率 18.9% → optional
  - VAS_ATTR_REL_TCRBCAL（商品和标签的对应关系）出现率 100.0% / 非空率 13.5% → optional
  - TRPP（包裹和标签的对应关系）出现率 100.0% / 非空率 10.8% → optional
  - NSVASTN（非标增值来源单号）出现率 100.0% / 非空率 5.4% → skip
  - CEO_SOA（CEO审批截图）出现率 100.0% / 非空率 2.7% → skip
  - VSS（视频拍摄SOP（中文+英文））出现率 100.0% / 非空率 0.0% → skip

### 【入库】关联第三方商品条码上架 (`inbound_third_party_merchandise_barcode`)

- 订单数：42
- 卡上 requiredFieldKeys：（空）
- 统计建议必填：VAS_ATTR_REL_NWEON
- 差异：统计多出 `VAS_ATTR_REL_NWEON`；卡上多出 `无`。**不覆盖旧卡。**
  - VAS_ATTR_REL_NWEON（上架入库单号）出现率 100.0% / 非空率 95.2% → required
  - VAS_ATTR_REL_AOOI（操作说明附件）出现率 100.0% / 非空率 16.7% → optional
  - VAS_ATTR_REL_LF（标签文件）出现率 100.0% / 非空率 14.3% → optional
  - NSVASTN（非标增值来源单号）出现率 100.0% / 非空率 9.5% → skip
  - CEO_SOA（CEO审批截图）出现率 100.0% / 非空率 0.0% → skip
  - VAS_ATTR_REL_TCRBCAL（商品和标签的对应关系）出现率 100.0% / 非空率 0.0% → skip
  - VSS（视频拍摄SOP（中文+英文））出现率 100.0% / 非空率 0.0% → skip
  - TRPP（包裹和标签的对应关系）出现率 97.6% / 非空率 11.9% → optional

### 【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架 (`inbound_aplus_direct_shelve`)

- 订单数：29
- 卡上 requiredFieldKeys：（空）
- 统计建议必填：VAS_ATTR_REL_NWEON
- 差异：统计多出 `VAS_ATTR_REL_NWEON`；卡上多出 `无`。**不覆盖旧卡。**
  - VAS_ATTR_REL_NWEON（上架入库单号）出现率 100.0% / 非空率 100.0% → required
  - VAS_ATTR_REL_LF（标签文件）出现率 100.0% / 非空率 17.2% → optional
  - NSVASTN（非标增值来源单号）出现率 100.0% / 非空率 0.0% → skip
  - VAS_ATTR_REL_AOOI（操作说明附件）出现率 100.0% / 非空率 0.0% → skip
  - CEO_SOA（CEO审批截图）出现率 100.0% / 非空率 0.0% → skip
  - VAS_ATTR_REL_TCRBCAL（商品和标签的对应关系）出现率 100.0% / 非空率 0.0% → skip
  - TRPP（包裹和标签的对应关系）出现率 100.0% / 非空率 0.0% → skip
  - VSS（视频拍摄SOP（中文+英文））出现率 100.0% / 非空率 0.0% → skip

### 【入库】指定商品拍照暂存 (`inbound_photo_hold`)

- 订单数：61
- 卡上 requiredFieldKeys：（空）
- 统计建议必填：（无）
- 差异：**一致**
  - VAS_ATTR_REL_NWEON（上架入库单号）出现率 100.0% / 非空率 31.1% → optional
  - VAS_ATTR_REL_LF（标签文件）出现率 100.0% / 非空率 21.3% → optional
  - VAS_ATTR_REL_AOOI（操作说明附件）出现率 100.0% / 非空率 19.7% → optional
  - NSVASTN（非标增值来源单号）出现率 100.0% / 非空率 13.1% → optional
  - VSS（视频拍摄SOP（中文+英文））出现率 100.0% / 非空率 4.9% → skip
  - VAS_ATTR_REL_TCRBCAL（商品和标签的对应关系）出现率 100.0% / 非空率 3.3% → skip
  - CEO_SOA（CEO审批截图）出现率 100.0% / 非空率 1.6% → skip
  - TRPP（包裹和标签的对应关系）出现率 100.0% / 非空率 0.0% → skip


## 无 OMS 码的场景（无法按码统计）

| 场景名 | sceneKey | 说明 |
|--------|----------|------|
| 【库内】 代购包材-拓竹 | `instock_procure_packaging_bambu` | 无 omsSceneCode |
| 【库内】包装破损商品更换包材重新上架 | `instock_damaged_repack_reshelve` | 无 omsSceneCode |
| 【库内】采集SN码 | `instock_collect_sn` | 无 omsSceneCode |
| 【库内】拆箱辨识后重新更换SKU上架 | `instock_unbox_identify_change_sku` | 无 omsSceneCode |
| 【库内】打包完成后作废出库单（有商品增值） | `instock_void_outbound_after_pack` | 无 omsSceneCode |
| 【库内】更换SKU做不良品上架 | `instock_change_sku_defective_shelve` | 无 omsSceneCode |
| 【库内】库内辨识+辨识后重新贴标上架 | `instock_identify_then_relabel_shelve` | 无 omsSceneCode |
| 【库内】库内仓间调拨-Anker | `instock_inter_warehouse_transfer_anker` | 无 omsSceneCode |
| 【库内】库内库存销毁 | `instock_inventory_destroy` | 无 omsSceneCode |
| 【库内】清除/覆盖标签 | `instock_remove_cover_label` | 无 omsSceneCode |
| 【库内】商品改制重新上架 | `instock_rework_reshelve` | 无 omsSceneCode |
| 【库内】箱转单一 | `instock_carton_to_each` | 无 omsSceneCode |
| 【库内】异常单：自提单取消出库（需要客户下入库单） | `instock_cancel_self_pickup_need_wi` | 无 omsSceneCode |
| 【库内】自提单取消出库 | `instock_cancel_self_pickup_outbound` | 无 omsSceneCode |
| 【库内】SN采集+管理方式变更+重新上架（复合场景） | `instock_sn_mgmt_change_reshelve` | 无 omsSceneCode |
| 【库内】WINIT标准包材线下寄件出库（需尾程线下面单） | `instock_winit_pack_offline_ship` | 无 omsSceneCode |
| 【入库】辨识商品条码重新贴包裹标签 | `inbound_identify_sku_relabel_parcel` | 无 omsSceneCode |
| 【入库】单品化管理的SN处理场景 | `inbound_serialized_sn_handling` | 无 omsSceneCode |
| 【入库】分开退货单入库 | `inbound_split_return_order` | 无 omsSceneCode |
| 【入库】更换winit包装 | `inbound_replace_winit_packaging` | 无 omsSceneCode |
| 【入库】加急入库 | `inbound_expedited_inbound` | 无 omsSceneCode |
| 【入库】批量退货（≥20件商品）异常包裹建新入库单入库 | `inbound_bulk_return_new_inbound` | 无 omsSceneCode |
| 【入库】签署仓库未收到货证明 | `inbound_unsigned_not_received_proof` | 无 omsSceneCode |
| 【入库】入库预报SKU与实际到货SKU不符合 | `inbound_forecast_sku_mismatch` | 无 omsSceneCode |
| 【入库】商品下架后换入库单重新上架（不更换SKU） | `inbound_reshelve_change_wi_keep_sku` | 无 omsSceneCode |
| 【入库】提供入库视频 | `inbound_provide_inbound_video` | 无 omsSceneCode |
| 【入库】无主货异常补贴标签上架 | `inbound_unclaimed_goods_relabel_shelve` | 无 omsSceneCode |
| 【入库】因winit原因做入库拦截、辨识、重新包装、销毁或上架等多种动作 | `inbound_winit_fault_multi_action` | 无 omsSceneCode |
| 【入库】A仓单品化管理的包裹串仓到B仓异常--在B仓上架 | `inbound_sku_mgmt_cross_warehouse_b` | 无 omsSceneCode |
| 【入库】anker 合箱入库 | `inbound_anker_combine_carton` | 无 omsSceneCode |
| 【入库】Basic 3PL-Winit 组套产品审核 | `inbound_basic_3pl_winit_kit` | 无 omsSceneCode |

## 写入规则（给 update-cards-attachment.ts）

- 只把 pipeline 能校验的建议必填写入 `requiredFieldKeys`：附件白名单 + `VAS_ATTR_REL_NWEON` + `NSVASTN`
- 旧 6 张卡不写；n<5 不写
