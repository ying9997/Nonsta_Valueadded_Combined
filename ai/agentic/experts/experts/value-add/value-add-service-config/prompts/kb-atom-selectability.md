# 原子可选性层

本文件为 `apply-atom-selectability-rules` 提供原子可选、禁选、互斥、置灰、隐藏和前置校验的规则摘要。来源口径为 `atom-selectability-rules.md` 的裁剪结果。

---

## 规则类型

| ruleType | 含义 | 输出位置 |
|---|---|---|
| `hidden` | 前端隐藏或后端不展示 | `blockedServiceItems` / `blockingReasons` |
| `disabled` | 前端置灰或后端禁用 | `blockedServiceItems` / `blockingReasons` |
| `mutex` | 原子互斥 | `mutexGroups` |
| `dependency` | 依赖其他字段或原子 | `missingConfirmations` |
| `submit_validation` | 提交前校验 | `blockingReasons` |
| `field_visibility` | 字段显隐 | `fieldEvidenceSummary` |
| `option_filter` | 选项过滤 | `blockedClaims` |

---

## 条件字段示例

| 条件字段 | 说明 |
|---|---|
| `shelveWay` | 原单上架 / 新单上架方式 |
| `isEventVa` | 是否异常发起增值 |
| `bookingStatus` | 预约或单据状态 |
| `objectLevel` | 包裹/商品/整单对象层级 |
| `warehouseSupport` | 仓库能力或白名单 |

---

## confirmed inbound 规则行

以下为运行时裁剪规则，只保留入库域高价值、可解释的 confirmed 行。`confidence=conflict_fixed` 的行只能作为谨慎拦截说明，不能当作普通 confirmed 规则泛化。

| ruleId | atomCode | atomName | ruleType | effectType | condition | result | messageOrCode | confidence | boundary |
|---|---|---|---|---|---|---|---|---|---|
| `INB-HID-001` | `OW01V1593` | 采集 A+ 包裹条码 | `hidden` | `backend_is_show_false` | 无条件隐藏 | 不展示、不可选 |  | `confirmed` | 只能解释该原子不可见，不反推 VASC 不可下单 |
| `INB-HID-002` | `OW01V1794` | LPN 直接上架 | `hidden` | `backend_is_show_false` | 无条件隐藏 | 不展示、不可选 |  | `confirmed` | 只能解释该原子不可见 |
| `INB-DIS-001` | `OW01V1708` | 不贴标直接上架 | `disabled` | `backend_is_disable` | 非异常单入口，即 `isEventVa=false` | 禁用 |  | `confirmed` | 缺少 `isEventVa` 时写入待确认 |
| `INB-DIS-002` | `OW01V1708` | 不贴标直接上架 | `disabled` | `backend_is_disable` | `shelveWay` 不是 `USE_ORIGIN_INBOUND_ORDER` 且不是 `INBOUND_ORDER_OF_CUSTOMER` | 禁用 |  | `confirmed` | 缺少 `shelveWay` 时不得强判 |
| `INB-FLD-001` | `OW01V1708` | 不贴标直接上架 | `field_visibility` | `frontend_disabled` | `shelveWay=USE_ORIGIN_INBOUND_ORDER` | 属性 `VAS_ATTR_REL_WRN` 自动填入入库单号并置灰 |  | `confirmed` | 只说明字段行为，不输出完整字段清单 |
| `INB-DIS-004` | `OW01V1560` | 补贴包裹条码 | `disabled` | `backend_is_disable` | `shelveWay=USE_NEW_INBOUND_ORDER` | 禁用，不可手动勾选 | 当 VASC 的上架方式是新单上架，默认置灰补贴包裹条码，不能单独选择该原子 | `confirmed` | 可输出 blockedServiceItems |
| `INB-AUTO-001` | `OW01V1560` | 补贴包裹条码 | `auto_select` | `auto_selected` | 新单上架且已选 `OW01V1558` / `OW01V1559` / `OW01V1572` 任一 | 系统自动勾选 `OW01V1560`，并设置 `LABEL_SIZE=10X6`、`LABEL_TYPE=PACKGE_SERNO`；`OTHER_LABEL` 非必填 |  | `confirmed` | 只在已知新单上架和已选商品级条码原子时使用 |
| `INB-DIS-005` | `OW01V1558` | 补贴原 SKU 条码（入库） | `disabled` | `backend_is_disable` | 无 `MERCHANDISE` 类型商品 | 禁用 |  | `confirmed` | 缺少商品类型事实时待确认 |
| `INB-DIS-006` | `OW01V1558` | 补贴原 SKU 条码（入库） | `disabled` | `backend_is_disable` | 任意商品条码 `goodsBarcode` 为空 | 禁用 |  | `confirmed` | 缺少条码事实时待确认 |
| `INB-DIS-007` | `OW01V1558` | 补贴原 SKU 条码（入库） | `disabled` | `backend_is_disable` | 异常来源 + `USE_ORIGIN_INBOUND_ORDER` + 商品不在原入库单中 | 禁用 |  | `confirmed` | 需要同时具备异常来源、上架方式和原单商品关系 |
| `INB-FLD-002` | `OW01V1558` | 补贴原 SKU 条码（入库） | `field_visibility` | `field_visibility_changed` | `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY!=CUSTOMER` | 显示 `OTHER_LABEL` 上传标签对应关系 |  | `confirmed` | 只说明显隐，不承诺附件模板完整性 |
| `INB-FLD-003` | `OW01V1558` | 补贴原 SKU 条码（入库） | `field_visibility` | `field_visibility_changed` | `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY=CUSTOMER` | 显示 `LABEL_FILE_MERCHANDISE_REL_FILE` |  | `confirmed` | 只说明显隐 |
| `INB-FLD-005` | `OW01V1559` | 更换新 SKU 条码（入库） | `field_visibility` | `field_visibility_changed` | `GEN_WAY!=CUSTOMER` | 显示 `OTHER_LABEL` 上传标签对应关系 |  | `confirmed` | 无后端禁用条件证据，不得额外禁选 |
| `INB-DIS-008` | `OW01V1572` | 关联第三方条码 | `disabled` | `backend_is_disable` | 无 `MERCHANDISE` 类型商品 | 禁用 |  | `confirmed` | 缺少商品类型事实时待确认 |
| `INB-DIS-009` | `OW01V1572` | 关联第三方条码 | `disabled` | `backend_is_disable` | 非异常单入口 | 禁用 | 该原子仅支持异常单入口下发 | `confirmed` | 可解释为非异常入口不可选 |
| `INB-DIS-010` | `OW01V1572` | 关联第三方条码 | `disabled` | `backend_is_disable` | 异常单入口但任意商品第三方条码为空 | 禁用 | 异常信息未登记第三方商品条码，无法选择该增值 | `confirmed` | 需要异常信息里的第三方条码事实 |
| `INB-DIS-011` | `OW01V1736` | 补贴包裹覆盖标签 | `disabled` | `backend_is_disable` | 下单列表入口且无 `PACKAGE` 类型商品 | 禁用 |  | `confirmed` | 缺少入口和商品类型事实时待确认 |
| `INB-DIS-012` | `OW01V1736` | 补贴包裹覆盖标签 | `disabled` | `backend_is_disable` | 下单列表入口且任意包裹等级不是 `A` 或 `A+` | 禁用 |  | `confirmed` | 需要包裹等级事实 |
| `INB-DIS-014` | `OW01V1745` | 采集 A+ 包裹序列号 | `disabled` | `backend_is_disable` | 无 vaOrder 场景：入库单号为空 | 禁用 + 隐藏 |  | `confirmed` | 缺入库单号时可作为 blockingMissing |
| `INB-DIS-015` | `OW01V1745` | 采集 A+ 包裹序列号 | `disabled` | `backend_is_disable` | 无 vaOrder 场景：入库单下无 A+ 包裹 | 禁用 + 隐藏 |  | `confirmed` | 需要 A+ 包裹事实 |
| `INB-DIS-016` | `OW01V1745` | 采集 A+ 包裹序列号 | `disabled` | `backend_is_disable` | 无 vaOrder 场景：入库单下无 SI 管理的 BOX 产品 | 禁用 + 隐藏 |  | `confirmed` | 需要 SI 管理与 BOX 商品事实 |
| `INB-VAL-001` | `OW01V1561` | 更换商品包装（入库） | `submit_validation` | `submit_validation_error` | 入库单/异常单选了 `OW01V1561` 但未同时选 `OW01V1558` 或 `OW01V1559` | 提交时报错拦截 | `_02040501458` | `conflict_fixed` | 仅作提交校验风险说明；编码已按勘误修正 |
| `INB-FLD-008` | `OW01V1561` | 更换商品包装（入库） | `dependency` | `frontend_disabled` | 勾选时未同时选 `OW01V1558` 或 `OW01V1559` | 前端提示；提交强校验另见 `INB-VAL-001` | 增值选项选择更换商品包装时，必须选择商品级-补贴原SKU条码或者商品级-更换新SKU条码 | `confirmed` | 前端提示不等于后端禁止勾选 |
| `INB-FLD-009` | `OW01V1573` | 补贴其他商品类标签或文件 | `field_visibility` | `field_visibility_changed` | `ALL_GOODS_SAME_LABEL=Y` | 仅显示统一标签文件 |  | `confirmed` | 只说明显隐 |
| `INB-FLD-010` | `OW01V1573` | 补贴其他商品类标签或文件 | `field_visibility` | `field_visibility_changed` | `ALL_GOODS_SAME_LABEL=N` | 显示逐条标签文件 + 对应关系文件 |  | `confirmed` | 只说明显隐 |
| `INB-OPT-001` | `OW01V1573,OSF6V1574` | 补贴其他商品类标签 | `option_filter` | `field_option_filtered` | 商品只有 1 个 | `ALL_GOODS_SAME_LABEL` 排除 `N`，只能选统一 `Y` |  | `confirmed` | 只影响选项，不反推是否必填 |
| `INB-OPT-002` | `*` | `PACKAGING_MODE` 属性 | `option_filter` | `field_option_filtered` | 非“全单品 SKU + 异常单入口” | 排除 `PACKAGING_CUSTOMER` |  | `confirmed` | 需要商品形态与入口事实 |
| `INB-OPT-003` | `*` | `DEAL_WITH_WAY` 属性 | `option_filter` | `field_option_filtered` | `vaSource=REVA` | 排除 `storage` |  | `confirmed` | 仅在已知 `vaSource` 时使用 |

---

## 输出规则

- 命中 confirmed 规则时，可输出 `selectableServiceItems` 或 `blockedServiceItems`。
- 规则条件缺失时，写入 `missingConfirmations.informationalMissing` 或 `blockingMissing`。
- 规则来源冲突时，写入 `blockedClaims`，不做强判断。
- 动态配置、业务白名单或后台返回配置影响的规则，必须在 `configBoundaryNotes` 中说明可能变化。
