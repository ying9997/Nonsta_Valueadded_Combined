# 【库内】货权转移 接回记录

- 日期：2026-09-17
- 卡：`knowledge/scenario-cards/instock_ownership_transfer.json`
- 状态：`retired_dedicated_atom` → `supported`
- OMS 码（已有，未改）：`【In-warehouse】Transfer of ownership of goods`
- OMS 名：【库内】货权转移
- 用途：增值服务 = 库内其他服务需求（OSF6V1603）时，场景概述选这一条
- 不接：独立原子 OSF6V1647 货权转移（改数）、OSF6V1646 货权转移（换标）
- 换标 SOP 卡 `instock_ownership_transfer_relabel` 仍 retired（同一概述码只挂一张卡）

真单对照（pageQuery 按码拉全量 133）：catch-all 库内 1 单 `VASC000000123742`（OSF6V1603）；入库其他服务需求 OW01V1602 另有 4 单也选过同一概述名。

40 已同步该卡并重启轮询：`poll_start cards=68`（原先 67 张生效卡 + 本张）。独立原子白名单未改，仍是 OW01V1602 / OSF6V1603 / OSF6V1841。
