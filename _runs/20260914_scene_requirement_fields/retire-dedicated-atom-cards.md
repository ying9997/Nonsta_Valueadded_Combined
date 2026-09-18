# 独立原子场景卡下线

日期：2026-09-14

## G-1b OMS 码

高 / 中 / 未匹配 **一律不写入** 场景卡 `omsSceneCode`。

## 从审核目录剔除（status=retired_dedicated_atom）

判定：4.21–9.3 `NON_STANDARD_VASC` 缓存里，这类业务主要是**独立服务原子**（标准/免审非标产品），不是「入库/库内其他服务需求」上的场景概述。Copilot 只处理 `OW01V1602` / `OSF6V1603` / `OSF6V1841`。

| 场景卡 | 独立原子 | catch-all 场景概述 | dedicated |
|--------|----------|-------------------|-----------|
| `instock_ownership_transfer` 货权转移-改数 | OSF6V1647 / OSF6V1646 | 0 | 135 |
| `instock_ownership_transfer_relabel` 货权转移换标 | OSF6V1646 | 0 | （上表内） |
| `inbound_unclaimed_goods_relabel_shelve` 无主货 | OSF6V1752/1673/1672/1751/1753 | 9 | 115 |
| `inbound_provide_inbound_video` 提供入库视频 | OW01V1599 / OW01V1600 监控视频 | 0 | 130 |
| `inbound_self_pickup_before_shelve` 上架前自提 | OW01V1594 / OW01V1604 | 7 | 73 |
| `instock_audit_inventory` 审计盘点 | OSF6V1660 | 2 | 48 |
| `instock_procure_packaging_materials` 代采购包材物料 | OSF6V1648 | 5 | 37 |
| `instock_procure_packaging_bambu` 代购包材-拓竹 | 同上 OSF6V1648 | （上表内） | （上表内） |

JSON 仍在 `knowledge/scenario-cards/`，`loadScenarioCards()` 默认不加载。目录 75 个 JSON，生效 67 张。

## 没有剔除

| 场景 | 原因 |
|------|------|
| 【入库】上架前销毁 | 仍是 catch-all 场景概述 `INBOUND_DESTORY_BF_SHELVE`（7 条，无独立原子） |
| 【库内】拍摄照片/视频 | 是其他服务需求上的场景概述，不是「监控视频」原子 |
| 【库内】自提单取消出库 | 是 catch-all 场景（订单作废后重新上架），不是「上架前自提」产品 |
| 专业销毁询价 | 场景卡目录里本来就没有对应卡 |

销毁询价（OSF8V1848）是出库独立原子，Copilot 本就不处理出库。

## 恢复方法

把对应 JSON 的 `status` 改回 `supported`。
