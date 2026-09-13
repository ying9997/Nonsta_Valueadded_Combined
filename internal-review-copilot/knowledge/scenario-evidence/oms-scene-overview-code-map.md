# OMS 增值审核场景概述 码–名映射

- 生成：2026-09-11T09:06:34.016870+00:00
- 来源：live `VasOrder` 详情页 `select[name=sceneOverviewCode]`，**入库 + 库内 + 出库** 三张详情合并去重
- 条数：171（inbound=51 / instock=71 / outbound=42 / other=7）
- 原始：`_runs/20260911_oms_scene_code_map/scene_overview_code_map.json`
- 拉业务池仍按码滤；按名滤会被忽略

## 各类型详情页下拉条数

| 类型 | 种子单 | 下拉条数 | 仅该类型独有 |
|------|--------|----------|--------------|
| inbound | `VASC000000344421` | 171 | 0 |
| instock | `VASC000000184008` | 171 | 0 |
| outbound | `VASC000000348573` | 171 | 0 |

## 本轮已核（F-001 / A / B）

| 别名 | 码 | 名 |
|------|----|----|
| F-001 | `20250407004` | 【入库】尺重/标签辨识后换标上架 |
| A | `20250407008` | 【入库】包裹类异常换商品标签上架 |
| B | `20250522001` | 【入库】指定商品拍照暂存 |

## 全表

| 分组 | 码 | 名 | 出现在 |
|------|----|----|--------|
| A | `20250407008` | 【入库】包裹类异常换商品标签上架 | inbound/instock/outbound |
| B | `20250522001` | 【入库】指定商品拍照暂存 | inbound/instock/outbound |
| F-001 | `20250407004` | 【入库】尺重/标签辨识后换标上架 | inbound/instock/outbound |
| inbound | `20250407002` | 【入库】包裹级异常不开箱拍外观照片 | inbound/instock/outbound |
| inbound | `20250407003` | 【入库】上架前拆包装 | inbound/instock/outbound |
| inbound | `20250407006` | 【入库】同异常多种处理方式（直接上架+换包装上架+换标上架+部分销毁） | inbound/instock/outbound |
| inbound | `20250407020` | 【入库】组合后上架 | inbound/instock/outbound |
| inbound | `20250407025` | 【入库】异常商品/包裹数量与实际不符，按照实际贴标上架 | inbound/instock/outbound |
| inbound | `20250407075` | 【入库】指定包裹拍照 | inbound/instock/outbound |
| inbound | `20250408002` | 【入库】商品质检 | inbound/instock/outbound |
| inbound | `20250430` | 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架 | inbound/instock/outbound |
| inbound | `20250506` | 【入库】A+包出现订单外商品，无法登记异常，需补贴包裹标签新单上架 | inbound/instock/outbound |
| inbound | `20250509` | 【入库】更换客制包材 | inbound/instock/outbound |
| inbound | `20250529001` | 【入库】上架前采集条码（含SN码、A+包第三方包裹码等） | inbound/instock/outbound |
| inbound | `20250530001` | 【入库】无主货找回暂存 | inbound/instock/outbound |
| inbound | `202506120001` | 【入库】关联第三方商品条码上架 | inbound/instock/outbound |
| inbound | `202506120002` | 【入库】上架前盘点 | inbound/instock/outbound |
| inbound | `202506120003` | 【入库】批量辨识商品后补贴商品条码及包裹条码上架 | inbound/instock/outbound |
| inbound | `202506170001` | 【入库】加固包装（含透明胶带封口、木箱加固等） | inbound/instock/outbound |
| inbound | `20250619` | 【入库】 ABC类/子包裹内商品错装暂存（需客户处理），云仓不支持原单补贴包裹条码上架 | inbound/instock/outbound |
| inbound | `202507021814` | 【入库】上架前拦截 | inbound/instock/outbound |
| inbound | `202507151726` | 【入库】入库少单品/少包裹视频调查 | inbound/instock/outbound |
| inbound | `20250929` | 【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架 | inbound/instock/outbound |
| inbound | `20251010` | 【入库】新单商品与原单商品不一致，导致无法提交补贴包裹标签 | inbound/instock/outbound |
| inbound | `202510102` | 【入库】商品条码异常仓库登记信息不符，客户已更新关联，需直接上架 | inbound/instock/outbound |
| inbound | `20251027` | 【入库】包裹类异常关联第三方包裹条码直接上架 | inbound/instock/outbound |
| inbound | `20251103` | 【入库】补贴包裹标签上架到原入库单“已终止的”包裹中 | inbound/instock/outbound |
| inbound | `20251104` | 【入库】无箱单预报单不支持标准增值（含商品换标/换包装） | inbound/instock/outbound |
| inbound | `20251111` | 【入库】Winit头程不支持随入库单下标准增值 | inbound/instock/outbound |
| inbound | `20251114` | 【入库】海运整柜100%A+无包裹条码异常，不支持更换商品包装增值 | inbound/instock/outbound |
| inbound | `20251124` | 【入库】包裹条码异常，客户需要有箱单直接上架 | inbound/instock/outbound |
| inbound | `20251205` | 【入库】新单上架到预报单，无需更换包裹条码 | inbound/instock/outbound |
| inbound | `20251208` | 【入库】包裹级异常更换包装 | inbound/instock/outbound |
| inbound | `20260115` | 【入库】上架到不良品 | inbound/instock/outbound |
| inbound | `20260128002` | 【入库】代采购包材补贴标签上架 | inbound/instock/outbound |
| inbound | `20260302` | 【入库】覆盖/清除标签 | inbound/instock/outbound |
| inbound | `20260320` | 【入库】 商品异常更换包裹标签商品标签新单上架 | inbound/instock/outbound |
| inbound | `20260413` | 【入库】商品分类理货/预处理 | inbound/instock/outbound |
| inbound | `2026041701` | 【入库】补贴透明计划标签 | inbound/instock/outbound |
| inbound | `2026042101` | 【入库】100%A+/A包裹包裹条码批量异常（需客户处理） | inbound/instock/outbound |
| inbound | `2026050701` | 【入库】商品上架并冻结 | inbound/instock/outbound |
| inbound | `2026051101` | 【入库】包裹/商品条码异常重新扫描包裹/商品条码上架 | inbound/instock/outbound |
| inbound | `20260522` | 【入库】商品条码异常换包装+重新贴标后上架 | inbound/instock/outbound |
| inbound | `2026060801` | 【入库】仓库加班工时费收取 | inbound/instock/outbound |
| inbound | `20260616` | 【入库】A+包质量异常需开箱辨识 | inbound/instock/outbound |
| inbound | `20260622001` | 【入库】补贴包裹条码原单上架 | inbound/instock/outbound |
| inbound | `20260908001` | 【入库】批量退货异常使用退货流程操作 | inbound/instock/outbound |
| inbound | `INBOUND_DESTORY_BF_SHELVE` | 【入库】上架前销毁 | inbound/instock/outbound |
| inbound | `INBOUND_PICKUP_BF_SHELVE` | 【入库】上架前自提 | inbound/instock/outbound |
| inbound | `[Warehouse] Package-level abnormalities Unpack and take product photos` | 【入库】包裹级异常开箱拍商品照片 | inbound/instock/outbound |
| inbound | `[Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses` | 【入库】包裹串仓异常调拨 | inbound/instock/outbound |
| instock | `20250401002` | 【库内】关联第三方条码上架 | inbound/instock/outbound |
| instock | `20250407010` | 【库内】指定库位开箱拍照 | inbound/instock/outbound |
| instock | `20250407035` | 【库内】拍摄照片/视频 | inbound/instock/outbound |
| instock | `20250407039` | 【库内】审计盘点 | inbound/instock/outbound |
| instock | `20250407043` | 【库内】商品外观辨识+贴标上架 | inbound/instock/outbound |
| instock | `20250407045` | 【库内】辨识后贴标上架+销毁 | inbound/instock/outbound |
| instock | `20250407047` | 【库内】商品软件升级 | inbound/instock/outbound |
| instock | `20250407051` | 【库内】良品/不良品检测 | inbound/instock/outbound |
| instock | `20250407052` | 【库内】包裹错装换标上架 | inbound/instock/outbound |
| instock | `20250407055` | 【库内】更换客制包装 | inbound/instock/outbound |
| instock | `20250407056` | 【库内】商品包装加固 | inbound/instock/outbound |
| instock | `20250407060` | 【库内】A+包裹更换标签上架 | inbound/instock/outbound |
| instock | `20250407061` | 【库内】销毁出库拦截 | inbound/instock/outbound |
| instock | `20250407062` | 【库内】指定单品/库位商品更换标签上架 | inbound/instock/outbound |
| instock | `20250407063` | 【库内】普货转带电商品补贴UN标签 | inbound/instock/outbound |
| instock | `20250407065` | 【库内】指定单品销毁 | inbound/instock/outbound |
| instock | `20250407066` | 【库内】覆盖A包包裹外箱上的商品标签 | inbound/instock/outbound |
| instock | `20250407067` | 【库内】贴透明计划标签+拍照 | inbound/instock/outbound |
| instock | `20250407068` | 【库内】在库库存切换批次管理 | inbound/instock/outbound |
| instock | `20250407069` | 【库内】开箱取卡片 | inbound/instock/outbound |
| instock | `20250407070` | 【库内】不合规商品指定供应商销毁 | inbound/instock/outbound |
| instock | `20250407071` | 【库内】商品组合 | inbound/instock/outbound |
| instock | `20250407073` | 【库内】冻结商品直接上架 | inbound/instock/outbound |
| instock | `20250407074` | 【库内】库间调拨 | inbound/instock/outbound |
| instock | `20250408003` | 【库内】柔性打包重量测量 | inbound/instock/outbound |
| instock | `20250408004` | 【库内】单一产品开箱补贴商品标签 | inbound/instock/outbound |
| instock | `20250421001` | 【库内】商品拆箱加/减配件 | inbound/instock/outbound |
| instock | `20250427001` | 【库内】商品贴指令性标签（警示标语/使用说明/清洁维护等）+拍照 | inbound/instock/outbound |
| instock | `20250512001` | 【库内】商品更换包装（WINIT标准包材） | inbound/instock/outbound |
| instock | `20250603001` | 【库内】单一产品转箱产品 | inbound/instock/outbound |
| instock | `20250616001` | 【库内】清除包装绑带 | inbound/instock/outbound |
| instock | `20250619001` | 【库内】代采购包材物料 | inbound/instock/outbound |
| instock | `20250620001` | 【库内】IT改数收费 | inbound/instock/outbound |
| instock | `20250701001` | 【库内】指定包裹盘点上架数量 | inbound/instock/outbound |
| instock | `20250714001` | 【库内】UN箱补贴箭头标识 | inbound/instock/outbound |
| instock | `20250714003` | 【库内】单品条码状态异常换新入库单上架 | inbound/instock/outbound |
| instock | `20250716001` | 【库内】标准盘点 | inbound/instock/outbound |
| instock | `20250721001` | 【库内】箱产品补贴/更换箱内单品标签 | inbound/instock/outbound |
| instock | `20250721002` | 【库内】箱产品箱内少单品异常转单一产品上架 | inbound/instock/outbound |
| instock | `20250808001` | 【库内】退货商品更换退货单重新上架 | inbound/instock/outbound |
| instock | `20250808002` | 【库内】不良品转良品上架 | inbound/instock/outbound |
| instock | `20250808003` | 【库内】良品转不良品上架 | inbound/instock/outbound |
| instock | `20250822001` | 【库内】库存数据海外仓签字盖章 | inbound/instock/outbound |
| instock | `20250822002` | 【库内】补贴DG标签 | inbound/instock/outbound |
| instock | `20250825001` | 【库内】瑞拓步圣诞树维修 | inbound/instock/outbound |
| instock | `20251013001` | 【库内】A+包裹开箱检查单品数量 | inbound/instock/outbound |
| instock | `20251020001` | 【库内】清除商品属性标签+更换包装 | inbound/instock/outbound |
| instock | `20251024001` | 【库内】大件货拆托盘存储 | inbound/instock/outbound |
| instock | `20251103001` | 【库内】客户耗材线下自提出库 | inbound/instock/outbound |
| instock | `20251205002` | 【库内】SKU指定包材装箱测量 | inbound/instock/outbound |
| instock | `20251212001` | 【库内】盘亏货物重新入库单上架 | inbound/instock/outbound |
| instock | `202512150001` | 【库内】清除吊牌 | inbound/instock/outbound |
| instock | `202512150002` | 【库内】异常商品转不良品上架 | inbound/instock/outbound |
| instock | `20251217001` | 【库内】盘点多货做新单入库 | inbound/instock/outbound |
| instock | `20251218001` | 【库内】退货商品拍照辨识 | inbound/instock/outbound |
| instock | `202512190001` | 【库内】补贴超重标签 | inbound/instock/outbound |
| instock | `20251230001` | 【库内】补贴第三方商品条码上架 | inbound/instock/outbound |
| instock | `20260108001` | 【库内】更换商品生产日期标签 | inbound/instock/outbound |
| instock | `20260115001` | 【库内】客户上门参观 | inbound/instock/outbound |
| instock | `20260115002` | 【库内】指定SKU个性化装箱 | inbound/instock/outbound |
| instock | `202601160001` | 【库内】特殊商品销毁（DG、带电、药物） | inbound/instock/outbound |
| instock | `20260119001` | 【库内】补贴认证标签 | inbound/instock/outbound |
| instock | `20260127001` | 【库内】商品指定位置贴标 | inbound/instock/outbound |
| instock | `20260313001` | 【库内】清理污渍/油渍 | inbound/instock/outbound |
| instock | `20260415001` | 【库内】客制包材折叠后重新上架 | inbound/instock/outbound |
| instock | `INSTOCK_INVENTORY_FREEZE_UNFREEZE` | 【库内】库存冻结/解冻 | inbound/instock/outbound |
| instock | `INSTOCK_SELF_PICK_ORDER_CANCEL_OUTBOUND` | 【库内】订单作废后重新上架 | inbound/instock/outbound |
| instock | `INSTOCK_SPLIT_SKU` | 【库内】拆分SKU | inbound/instock/outbound |
| instock | `【In-warehouse】Transfer of ownership of goods` | 【库内】货权转移 | inbound/instock/outbound |
| instock | `【Library】Abnormal re-photographing` | 【库内】异常重新拍照 | inbound/instock/outbound |
| instock | `【Warehouse】Measurement and identification of commodity weight` | 【库内】商品尺重测量辨识 | inbound/instock/outbound |
| other | `20250407044` | 仓库已完成 需补收费用 | inbound/instock/outbound |
| other | `20250530002` | 清除标签 | inbound/instock/outbound |
| other | `20250714002` | 【退货】退货超期销毁货物找回 | inbound/instock/outbound |
| other | `20250723` | 【尾程】Anker Crowfoots出库 | inbound/instock/outbound |
| other | `20251031002` | 测试标签打印效果 | inbound/instock/outbound |
| other | `202512301` | 【尾程】winit线下尾程询价 | inbound/instock/outbound |
| other | `20260715` | 【头程】Winit海外揽收服务 | inbound/instock/outbound |
| outbound | `20250407013` | 【出库】指定位置贴商品/包裹标签/快递面单 | inbound/instock/outbound |
| outbound | `20250407015` | 【出库】补增值后补包裹/托盘级标签 | inbound/instock/outbound |
| outbound | `20250407018` | 【出库】自提单组套转第三方仓 | inbound/instock/outbound |
| outbound | `20250407033` | 【出库】自提单重新测量包裹尺重 | inbound/instock/outbound |
| outbound | `20250407040` | 【出库】采集SN打印Packinglist | inbound/instock/outbound |
| outbound | `20250407042` | 【出库】暂存完成订单补拍包裹内商品标签照片 | inbound/instock/outbound |
| outbound | `20250407049` | 【出库】单品拆分补贴第三方商品标签 | inbound/instock/outbound |
| outbound | `20250408001` | 【出库】重新打托（塑料托盘） | inbound/instock/outbound |
| outbound | `20250414001` | 【出库】补增值后补订单级标签 | inbound/instock/outbound |
| outbound | `20250421002` | 【出库】仓库自主交货 | inbound/instock/outbound |
| outbound | `20250429001` | 【出库】指定单品出库 | inbound/instock/outbound |
| outbound | `202505091` | 【出库】无需暂存单补贴标签 | inbound/instock/outbound |
| outbound | `20250516` | 【出库】补贴/更换商品标签 | inbound/instock/outbound |
| outbound | `20250714` | 【出库】指定托盘贴托盘标签 | inbound/instock/outbound |
| outbound | `202507141` | 【出库】采集SN码 | inbound/instock/outbound |
| outbound | `20250717` | 【出库】指定原箱出库 | inbound/instock/outbound |
| outbound | `20250818` | 【出库】清除配件 | inbound/instock/outbound |
| outbound | `20250819` | 【出库】交货时拍照 | inbound/instock/outbound |
| outbound | `202509031` | 【出库】瑞美雅发特殊组套+包装 | inbound/instock/outbound |
| outbound | `20250917` | 【出库】拍标签照片 | inbound/instock/outbound |
| outbound | `20251009001` | 【出库】开箱抽查箱内第三方商品条码 | inbound/instock/outbound |
| outbound | `20251128002` | 【出库】出库剪标 | inbound/instock/outbound |
| outbound | `20251230` | 【出库】视频抽查出库数量 | inbound/instock/outbound |
| outbound | `20260106001` | 【出库】3PL订单拦截换笼车出库 | inbound/instock/outbound |
| outbound | `20260112` | 【出库】无法指定装箱，需用客制包材装箱 | inbound/instock/outbound |
| outbound | `20260127` | 【出库】覆盖指定包裹标签 | inbound/instock/outbound |
| outbound | `20260128001` | 【出库】补贴包裹/托盘标签 | inbound/instock/outbound |
| outbound | `20260210` | 【出库】指定方式折叠 | inbound/instock/outbound |
| outbound | `20260210001` | 【出库】线下打印标签纸使用WINIT线下尾程出库 | inbound/instock/outbound |
| outbound | `20260214` | 【出库】自提转线下询价 | inbound/instock/outbound |
| outbound | `20260228` | 【出库】出库单补贴标签重新派送 | inbound/instock/outbound |
| outbound | `20260318` | 【出库】anker彩盒贴EAN标 | inbound/instock/outbound |
| outbound | `20260402` | 【出库】部分贴商品级标签 | inbound/instock/outbound |
| outbound | `20260408` | 【出库】特殊打托需求 | inbound/instock/outbound |
| outbound | `20260630001` | 【出库】更换出库包材（winit标准包材） | inbound/instock/outbound |
| outbound | `20260806001` | 【出库】开箱拍照 | inbound/instock/outbound |
| outbound | `20260818001` | 【出库】销毁出库 | inbound/instock/outbound |
| outbound | `20260902001` | 【出库】采集箱唛 | inbound/instock/outbound |
| outbound | `[Delivery] Expedited delivery` | 【出库】加急出库 | inbound/instock/outbound |
| outbound | `[Outbound] Repackaging by self-pickup order` | 【出库】暂存单重新装箱 | inbound/instock/outbound |
| outbound | `【Delivery】Delivery and packaging removal` | 【出库】出库清除包装 | inbound/instock/outbound |
| outbound | `【Outbound】Customs clearance agent` | 【出库】代理清关 | inbound/instock/outbound |

## 注意

- 这是配置下拉，不是订单池。扩展新场景时先查本表再 `pageQuery where[sceneOverviewCode]`。
- 码只圈场景，不能单独当 Copilot 命中，也不能单独进 gold。
- 三张详情若下拉条数不同，以合并全集为准；独有行见 `seenOnSeeds`。
- BaseConfig 列表接口若当天未打通，以本下拉为准；探测记录见同目录 `baseconfig_api_probe.json`。