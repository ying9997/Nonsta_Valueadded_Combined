# 附件探测：VASC000000362139 与 20260909 缓存缺口

探测时间：2026-09-11  
探测单：`VASC000000362139`（用户看到有「【包裹和标签的对应关系】模板.xlsx」）

## 结论

**不是脚本把附件值读漏了，是当时根本没抓文件表。** 附件不在 `oms_va_atom_attr.attribute_value` 里，而在 `oms.oms_va_execute_file`（OMS 详情 `vaAtomFiles`）。20260909 缓存的 `oms-cache-window.json` 写明 `"skipped": ["files"]`。上一轮用 attrs 非空率判断附件，会把「已上传的 Excel」当成空槽。

这张用户单还额外有一个时间窗问题：下单时间是 **2026-09-11**，不在 20260909 缓存窗口（2026-04-21 ~ 2026-09-03）里，所以 `attrs_submit.csv` 里本来就没有它。

## 这张单对上了

| 来源 | 有没有这个 xlsx |
|------|----------------|
| 页面/OMS `getVasList` → `vaAtomFiles` | 有。`fileType=TRPP`，`fileName=【包裹和标签的对应关系】模板.xlsx`，`attrId=3558174` |
| 库表 `oms.oms_va_execute_file` | 有。id=446676，file_type=TRPP，created=2026-09-11 16:41 |
| 库表 `oms.oms_va_atom_attr` 的 TRPP 行 | **有槽位、值为空**。6 个附件槽（AOOI / CEO_SOA / TCRBCAL / TRPP / VSS / LF）的 `attribute_value` 全是空字符串 |
| 20260909 `attrs_submit.csv` | 没有这张单（窗口外） |

订单：`order_date=2026-09-11`，状态 WA，原子 `OW01V1602`，场景码当时还是空。需求大意：仓库重新扫描第三方编码后换到新单 WI52543477 上架。

实拉详情：`_runs/20260911_attachment_stats/probe-362139/VASC000000362139.input.json`

## 缓存窗口里其实有大量真附件

同一窗口（2026-04-21 ~ 2026-09-03）`oms_va_execute_file` 未删除文件：

| 口径 | 文件行 | 订单数 |
|------|--------|--------|
| 全部 | 11950 | 3230 |
| SUBMIT（按 attr_id 关联） | 6068 | 2792 |
| FINISH | 5882 | 1976 |

SUBMIT 里常见附件类型：

| file_type | 文件行 | 订单数 |
|-----------|--------|--------|
| VAS_ATTR_REL_LF 标签文件 | 3019 | 1532 |
| VAS_ATTR_REL_AOOI 操作说明 | 470 | 416 |
| VAS_ATTR_REL_TCRBCAL 商品和标签对应关系 | 208 | 204 |
| TRPP 包裹和标签对应关系 | 192 | 191 |
| VSS | 59 | 48 |
| CEO_SOA | 38 | 35 |

对照 F-001（码 `20250407004`，窗口内 37 单）：

- attrs 非空率：标签文件 **0/37**
- 文件表：标签文件 **30/37（81%）** ← 若按文件表会达到「建议必填」

所以「新卡没把标签文件设成必填」是数据源选错，不是业务上真没传。

## 下一步（已开跑补抓）

补抓已完成：`_runs/20260911_attachment_stats/_oms_files/files.csv`（11950 行，与窗口内库表一致）。

用文件表重算（**未回写场景卡**）产出：`_runs/20260911_attachment_stats/from-files/attachment-rules-all.md`

- 标签文件达到建议必填：**14** 个场景（F-001 非空率 83.8%）
- 操作说明：1 个场景
- TRPP 包裹对应关系：窗口内未达 50%；用户这张 9/11 的单不进窗口统计

要改卡上 `requiredFieldKeys` 需要再点名 `--apply`。
