# atom-selectability-rules

> 状态：v0.1 structured draft  
> 生成依据：`vas-atom-hardcoded-rules.md`（产品百事通参考基线） + `vas-atom-disable-logic.md`（研发百事通代码快照）  
> 用途：供 `value-add/value-add-service-config` 判断原子可选、禁选、置灰、隐藏、互斥、联动、提交校验和证据边界。  
> 边界：无统一实时接口可获取完整原子禁用语义；部分命中值受数据库配置、业务白名单或后端返回配置影响，使用时必须保留 `changeMode` 和 `confidence`。

---

## 1. Schema

| 字段 | 说明 |
|---|---|
| `ruleId` | 稳定规则 ID，按域和规则类型编号。 |
| `domain` | `inbound` / `in_warehouse` / `outbound` / `rma` / `global`。 |
| `atomCode` | 原子编码；适用于多个原子时用逗号分隔；通用规则用 `*`。 |
| `atomName` | 原子名称或规则对象。 |
| `ruleType` | `hidden` / `disabled` / `mutex` / `dependency` / `auto_select` / `submit_validation` / `field_visibility` / `option_filter` / `status_override` / `backend_bypass` / `attribute_filter` / `billing_marker` / `global_check`。 |
| `effectType` | `backend_is_show_false` / `frontend_hidden` / `backend_is_disable` / `frontend_disabled` / `submit_validation_error` / `field_option_filtered` / `field_visibility_changed` / `auto_selected` / `backend_status_override` / `backend_bypass` / `billing_trigger`。 |
| `condition` | 触发条件，尽量保留原始字段名。 |
| `result` | 规则结果。 |
| `messageOrCode` | 提示文案、错误码或状态码；没有则为空。 |
| `changeMode` | `release_required` / `db_config` / `business_whitelist` / `backend_returned_config` / `code_snapshot`。 |
| `sourceOwner` | `product` / `rd` / `product+rd`。 |
| `sourceDoc` | 原始离线文档。 |
| `confidence` | `confirmed` / `partial` / `conflict_fixed`。 |
| `notes` | 勘误、前后端差异、动态配置说明。 |

---

## 2. Normalization Notes

- 入库“更换商品包装”正确编码为 `OW01V1561`；产品版原始快照中的 `OSF6V1561` 是笔误，结构化表统一使用 `OW01V1561`。
- `vas-atom-hardcoded-rules.md` 是产品侧参考基线，不是唯一权威；`vas-atom-disable-logic.md` 是研发侧当前代码快照。
- `NO_NEED_DEAL_FILE_VAS_CODE_CONFIG`、`VA_CODES_SUPPORT_SUPPLEMENT_PKG_LABEL`、业务白名单、`controlledServiceList` 等为动态配置或后端返回配置，不能标记为纯硬编码。
- 前端隐藏但后端不禁用的规则必须保留差异说明，例如 `OSF6V1804`。

---

## 3. Inbound Rules

| ruleId | domain | atomCode | atomName | ruleType | effectType | condition | result | messageOrCode | changeMode | sourceOwner | sourceDoc | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| INB-HID-001 | inbound | OW01V1593 | 采集 A+ 包裹条码 | hidden | backend_is_show_false | `InboundCollectAPlusPackageBarcodeDisableHandler.isShow()=false` | 无条件完全隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版未列，研发确认应纳入。 |
| INB-HID-002 | inbound | OW01V1794 | LPN 直接上架 | hidden | backend_is_show_false | `InboundLpnCodeShelveDirectlyDisableHandler.isShow()=false` | 无条件完全隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版未列，研发确认应纳入。 |
| INB-DIS-001 | inbound | OW01V1708 | 不贴标直接上架 | disabled | backend_is_disable | 非异常单入口（`!vaOrder.isEventVa()`） | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版只记录原单上架字段置灰，研发补充禁用条件。 |
| INB-DIS-002 | inbound | OW01V1708 | 不贴标直接上架 | disabled | backend_is_disable | `shelveWay` 不是 `USE_ORIGIN_INBOUND_ORDER` 且不是 `INBOUND_ORDER_OF_CUSTOMER` | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-DIS-003 | inbound | OW01V1708 | 不贴标直接上架 | disabled | backend_is_disable | `shelveWay=USE_ORIGIN_INBOUND_ORDER` 且业务类型非 `INBOUND` 或入库单号为空 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-FLD-001 | inbound | OW01V1708 | 不贴标直接上架 | field_visibility | frontend_disabled | `shelveWay=USE_ORIGIN_INBOUND_ORDER` | 属性 `VAS_ATTR_REL_WRN` 自动填入入库单号并置灰 |  | code_snapshot | product+rd | both | confirmed | 产品版和研发版一致。 |
| INB-DIS-004 | inbound | OW01V1560 | 补贴包裹条码 | disabled | backend_is_disable | `shelveWay=USE_NEW_INBOUND_ORDER` | 禁用，不可手动勾选 | 当 VASC 的上架方式是新单上架，默认置灰补贴包裹条码，不能单独选择该原子 | code_snapshot | product+rd | both | confirmed | 前端也同步置灰。 |
| INB-AUTO-001 | inbound | OW01V1560 | 补贴包裹条码 | auto_select | auto_selected | 新单上架且已选 `OW01V1558` / `OW01V1559` / `OW01V1572` 任一 | 系统自动勾选 `OW01V1560`，并设置 `LABEL_SIZE=10X6`、`LABEL_TYPE=PACKGE_SERNO`；`OTHER_LABEL` 非必填 |  | code_snapshot | product+rd | both | confirmed | `PACKGE_SERNO` 保留原文拼写。 |
| INB-DIS-005 | inbound | OW01V1558 | 补贴原 SKU 条码（入库） | disabled | backend_is_disable | 无 `MERCHANDISE` 类型商品 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 研发版完整条件。 |
| INB-DIS-006 | inbound | OW01V1558 | 补贴原 SKU 条码（入库） | disabled | backend_is_disable | 任意商品条码 `goodsBarcode` 为空 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版 `merchandiseSerno` 为空是该条件子集。 |
| INB-DIS-007 | inbound | OW01V1558 | 补贴原 SKU 条码（入库） | disabled | backend_is_disable | 异常来源 + `USE_ORIGIN_INBOUND_ORDER` + 商品不在原入库单中 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版未记录，研发确认采用。 |
| INB-FLD-002 | inbound | OW01V1558 | 补贴原 SKU 条码（入库） | field_visibility | field_visibility_changed | `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY!=CUSTOMER` | 显示 `OTHER_LABEL` 上传标签对应关系 |  | code_snapshot | product+rd | both | confirmed |  |
| INB-FLD-003 | inbound | OW01V1558 | 补贴原 SKU 条码（入库） | field_visibility | field_visibility_changed | `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY=CUSTOMER` | 显示 `LABEL_FILE_MERCHANDISE_REL_FILE` |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-FLD-004 | inbound | OW01V1558 | 补贴原 SKU 条码（入库） | field_visibility | field_visibility_changed | `GEN_WAY=CUSTOMER` | 显示第三方商品条码标签文件 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-FLD-005 | inbound | OW01V1559 | 更换新 SKU 条码（入库） | field_visibility | field_visibility_changed | `GEN_WAY!=CUSTOMER` | 显示 `OTHER_LABEL` 上传标签对应关系 |  | code_snapshot | product+rd | both | confirmed | 无后端 DisableHandler，无置灰条件。 |
| INB-FLD-006 | inbound | OW01V1559 | 更换新 SKU 条码（入库） | field_visibility | field_visibility_changed | `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` 且 `GEN_WAY=CUSTOMER` | 显示 `LABEL_FILE_MERCHANDISE_REL_FILE` |  | code_snapshot | product+rd | both | confirmed |  |
| INB-FLD-007 | inbound | OW01V1559 | 更换新 SKU 条码（入库） | field_visibility | field_visibility_changed | `GEN_WAY=CUSTOMER` | 显示第三方商品条码标签文件 |  | code_snapshot | product+rd | both | confirmed |  |
| INB-DIS-008 | inbound | OW01V1572 | 关联第三方条码 | disabled | backend_is_disable | 无 `MERCHANDISE` 类型商品 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-DIS-009 | inbound | OW01V1572 | 关联第三方条码 | disabled | backend_is_disable | 非异常单入口 | 禁用 | 该原子仅支持异常单入口下发! | code_snapshot | product+rd | both | confirmed |  |
| INB-DIS-010 | inbound | OW01V1572 | 关联第三方条码 | disabled | backend_is_disable | 异常单入口但任意商品第三方条码为空 | 禁用 | 异常信息未登记第三方商品条码，无法选择该增值 | code_snapshot | product+rd | both | confirmed |  |
| INB-DIS-011 | inbound | OW01V1736 | 补贴包裹覆盖标签 | disabled | backend_is_disable | 下单列表入口且无 `PACKAGE` 类型商品 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版未列，研发确认应纳入。 |
| INB-DIS-012 | inbound | OW01V1736 | 补贴包裹覆盖标签 | disabled | backend_is_disable | 下单列表入口且任意包裹等级不是 `A` 或 `A+` | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-DIS-013 | inbound | OW01V1736 | 补贴包裹覆盖标签 | disabled | backend_is_disable | 下单入口且 PSC 偏好匹配规则不匹配 | 禁用 |  | backend_returned_config | rd | vas-atom-disable-logic.md | partial | 依赖后端/偏好匹配结果，可能随配置漂移。 |
| INB-DIS-014 | inbound | OW01V1745 | 采集 A+ 包裹序列号 | disabled | backend_is_disable | 无 vaOrder 场景：入库单号为空 | 禁用 + 隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版只有摘要，研发版为执行条件。 |
| INB-DIS-015 | inbound | OW01V1745 | 采集 A+ 包裹序列号 | disabled | backend_is_disable | 无 vaOrder 场景：入库单下无 A+ 包裹 | 禁用 + 隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-DIS-016 | inbound | OW01V1745 | 采集 A+ 包裹序列号 | disabled | backend_is_disable | 无 vaOrder 场景：入库单下无 SI 管理的 BOX 产品 | 禁用 + 隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-DIS-017 | inbound | OW01V1745 | 采集 A+ 包裹序列号 | disabled | backend_is_disable | 下单列表/下单入口：入库单为空，或非 Direct 验货，或非 OI 检查模式，或无包裹订单 | 禁用 + 隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-DIS-018 | inbound | OW01V1745 | 采集 A+ 包裹序列号 | disabled | backend_is_disable | 下单列表/下单入口：无 A+ 包裹，或 A+ 包裹下商品不满足 SI 管理 + BOX + 采集 SN | 禁用 + 隐藏 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| INB-VAL-001 | inbound | OW01V1561 | 更换商品包装（入库） | submit_validation | submit_validation_error | 入库单/异常单选了 `OW01V1561` 但未同时选 `OW01V1558` 或 `OW01V1559` | 提交时报错拦截 | `_02040501458` | code_snapshot | product+rd | both | conflict_fixed | 产品版误写为 `OSF6V1561`，双方确认正确编码为 `OW01V1561`。 |
| INB-FLD-008 | inbound | OW01V1561 | 更换商品包装（入库） | dependency | frontend_disabled | 勾选时未同时选 `OW01V1558` 或 `OW01V1559` | 前端弹提示；研发确认仅提示，不阻止勾选 | 增值选项选择更换商品包装时，必须选择商品级-补贴原SKU条码或者商品级-更换新SKU条码 | code_snapshot | product+rd | both | confirmed | 真正拦截在提交强校验。 |
| INB-FLD-009 | inbound | OW01V1573 | 补贴其他商品类标签或文件 | field_visibility | field_visibility_changed | `ALL_GOODS_SAME_LABEL=Y` | 仅显示统一标签文件 |  | code_snapshot | product+rd | both | confirmed | 切换时有二次确认弹框。 |
| INB-FLD-010 | inbound | OW01V1573 | 补贴其他商品类标签或文件 | field_visibility | field_visibility_changed | `ALL_GOODS_SAME_LABEL=N` | 显示逐条标签文件 + 对应关系文件 |  | code_snapshot | product+rd | both | confirmed |  |
| INB-OPT-001 | inbound | OW01V1573,OSF6V1574 | 补贴其他商品类标签 | option_filter | field_option_filtered | 商品只有 1 个 | `ALL_GOODS_SAME_LABEL` 排除 `N`，只能选统一 `Y` |  | code_snapshot | product | vas-atom-hardcoded-rules.md | confirmed |  |
| INB-OPT-002 | inbound | * | `PACKAGING_MODE` 属性 | option_filter | field_option_filtered | 非（全单品 SKU + 异常单入口） | 排除 `PACKAGING_CUSTOMER` |  | code_snapshot | product | vas-atom-hardcoded-rules.md | confirmed |  |
| INB-OPT-003 | inbound | * | `DEAL_WITH_WAY` 属性 | option_filter | field_option_filtered | `vaSource=REVA` | 排除 `STORAGE` |  | code_snapshot | product | vas-atom-hardcoded-rules.md | confirmed |  |
| INB-FILTER-001 | inbound | * | 国内仓验货类型过滤（WI 模式） | option_filter | field_option_filtered | 入库单验货类型为 `WI` | 请求追加 `vascAttributeType=VASC_PRODUCT_TYPE`、`vascAttributeValue=NON_STANDARD_VASC`；只可选非标准增值 |  | backend_returned_config | rd | vas-atom-disable-logic.md | partial | 影响产品级过滤，原子同步不可选。 |

---

## 4. In-Warehouse Rules

| ruleId | domain | atomCode | atomName | ruleType | effectType | condition | result | messageOrCode | changeMode | sourceOwner | sourceDoc | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| WH-HID-001 | in_warehouse | OSF6V1576 | 库内商品拆分 | hidden | frontend_hidden | `hiddenVasCodes` 命中 | 完全不渲染，用户不可见 |  | release_required | product+rd | both | confirmed | 若出现在列表中，仍有非单一产品校验残留。 |
| WH-VAL-001 | in_warehouse | OSF6V1576 | 库内商品拆分 | submit_validation | frontend_disabled | 商品非全部单一产品（`!isAllSkuSingle`）且尝试勾选 | 弹提示并阻止勾选 | 增值服务：{serviceName} 只支持单一产品，您下单第一步选择的商品存在非单一产品SKU，请修改 | code_snapshot | product+rd | both | confirmed | 通常因前端隐藏不会触发。 |
| WH-HID-002 | in_warehouse | OSF6V1804 | 库内商品组合 | hidden | frontend_hidden | `hiddenVasCodes` 命中 | 完全不渲染，用户不可见 |  | release_required | product+rd | both | confirmed | 前端隐藏但后端不禁用。 |
| WH-INCON-001 | in_warehouse | OSF6V1804 | 库内商品组合 | global_check | frontend_hidden | 前端 `hiddenVasCodes`，后端 `InWarehouseMerchandiseCombinationDisableHandler` 无禁用条件 | 实际用户不可选，后端可处理 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | `inconsistencyFlag=frontend_hidden_backend_enabled`。 |
| WH-DIS-001 | in_warehouse | OSF6V1591 | 清货拍照标签 | disabled | backend_is_disable | 非再次创建增值（`!isInHouseReVaOrder()`） | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版未列，研发确认应纳入。 |
| WH-DIS-002 | in_warehouse | OSF6V1681 | 库内异常商品上架 | disabled | backend_is_disable | 无 `MERCHANDISE` 类型商品 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed | 产品版未列，研发确认应纳入。 |
| WH-DIS-003 | in_warehouse | OSF6V1681 | 库内异常商品上架 | disabled | backend_is_disable | 非异常单入口 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| WH-DIS-004 | in_warehouse | OSF6V1704 | 库内商品销毁 | disabled | backend_is_disable | 非异常单入口，且非再次创建增值，且非库内增值 + 操作对象为单品 | 禁用 |  | code_snapshot | product+rd | both | confirmed | 可选条件为三者任一满足。 |
| WH-DIS-005 | in_warehouse | OSF6V1564 | 补贴原 SKU 条码（库内） | disabled | backend_is_disable | 无 `MERCHANDISE` 类型商品 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| WH-DIS-006 | in_warehouse | OSF6V1564 | 补贴原 SKU 条码（库内） | disabled | backend_is_disable | （异常单入口或再次创建增值）且商品中有 BOX 箱类 | 禁用 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| WH-OPT-001 | in_warehouse | OSF6V1564 | 补贴原 SKU 条码（库内） | option_filter | field_option_filtered | 商品已有条码值（`existSkuBarcodeValue`） | `LABEL_TYPE` 只保留 `THIRD_PARTY_SKU_SERNO_ITEM_SERNO` |  | code_snapshot | product+rd | both | confirmed | 若同时含 BOX，后续 BOX 过滤会覆盖。 |
| WH-OPT-002 | in_warehouse | OSF6V1564 | 补贴原 SKU 条码（库内） | option_filter | field_option_filtered | 含箱 SKU（`isIncludeBoxSku`） | `LABEL_TYPE` 排除 `THIRD_PARTY_SKU_SERNO_ITEM_SERNO` |  | code_snapshot | product+rd | both | confirmed |  |
| WH-FLD-001 | in_warehouse | OSF6V1564 | 补贴原 SKU 条码（库内） | field_visibility | field_visibility_changed | `LABEL_TYPE=THIRD_PARTY_SKU_SERNO_ITEM_SERNO` | 显示“上传标签编码”文件 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| WH-VAL-002 | in_warehouse | OSF6V1566 | 更换商品包装（库内） | submit_validation | submit_validation_error | 库内单选了 `OSF6V1566` 但未同时选 `OSF6V1564` 或 `OSF6V1565` | 提交时报错拦截 | `_02040501458` | code_snapshot | product+rd | both | confirmed | 前端仅弹提示，不阻止勾选。 |

---

## 5. Outbound Rules

| ruleId | domain | atomCode | atomName | ruleType | effectType | condition | result | messageOrCode | changeMode | sourceOwner | sourceDoc | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OUT-HID-001 | outbound | OSF8V1534 | 指定商品数量装箱 | hidden | frontend_hidden | 标准单据且前置拣货 `isPostOrder=N`；或有打包策略；或自提（带面单） | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-002 | outbound | OSF8V1552 | 线下增值（非标增值） | hidden | frontend_hidden | `isNeedOfflineVas` 非 `F` | 隐藏 |  | backend_returned_config | product | vas-atom-hardcoded-rules.md | partial | 依赖后端返回或配置状态。 |
| OUT-HID-003 | outbound | OSF8V1726 | 新指定装箱 | hidden | frontend_hidden | 无打包策略 | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-004 | outbound | OSFV0003 | 打托 | hidden | frontend_hidden | 已配置打托策略 | 隐藏 |  | backend_returned_config | product | vas-atom-hardcoded-rules.md | partial |  |
| OUT-HID-005 | outbound | OSF8V1727 | 指定打托（新） | hidden | frontend_hidden | 非打托类型订单 | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-006 | outbound | OSF8V1308 | 补贴第三方快递面单 | hidden | frontend_hidden | 自提（不带面单）且无打包策略且非新单 | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-007 | outbound | OSF8V1310 | 贴商业发票 | hidden | frontend_hidden | 自提（带面单） | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-008 | outbound | OSF8V1705 | 托盘转包裹 | hidden | frontend_hidden | 非新单 | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-009 | outbound | OSF8V1303 | 贴包裹标签 | hidden | frontend_hidden | 已选 `OSF8V1534`，或已配置 `OSF8V1534` 的服务列表中有 `OSF8V1303` | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-010 | outbound | OSF8V1482,OSF8V1483,OSF8V1484,OSF8V1485 | DG/UN 标签 | hidden | frontend_hidden | `controlledServiceList` 中不存在 | 隐藏 |  | backend_returned_config | product | vas-atom-hardcoded-rules.md | partial | 产品确认该值可能由后端/数据库配置驱动。 |
| OUT-HID-011 | outbound | OSF8V1295 | 补贴超重标签 | hidden | frontend_hidden | 收件人类型为 `FBA_NONVC` 或 `FBA_VC` | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-HID-012 | outbound | OSF8V1303 | 贴包裹标签 | hidden | frontend_hidden | 收件人类型为 `FBA_NONVC` 或 `FBA_VC` 且有打包策略 | 隐藏 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-DIS-001 | outbound | OSF8V1774 | 出库采集 SN 码 | disabled | frontend_disabled | 全部商品是单品化管理（`merchandiseIsAllSingle`） | 置灰 |  | release_required | product+rd | both | confirmed | 单品化管理系统默认追踪 SN。 |
| OUT-DIS-002 | outbound | * | 包裹/托盘级增值 | disabled | frontend_disabled | `bookingStatus=SUCCESS` 且操作对象为 `PALLET` 或 `PACKAGE` | 置灰 | 您已预约成功，请先取消预约后再操作添加增值 | release_required | product+rd | both | confirmed |  |
| OUT-DIS-003 | outbound | OSF8V1310,OSF8V1303,OSF8V1301,OSF8V1549,OSF8V1309,OSF8V1312,OSF8V1308,OSF8V1550,OSF8V1311,OSF8V1295,OSF8V1743 | 提货加工暂存后补充环节原子 | disabled | frontend_disabled | `submitLink=SUBMIT` | 原子仍显示，但所有文件字段和属性字段 `disabled=true` 且 `required=false` |  | release_required | product+rd | both | confirmed | 产品称 PickupProcessing 场景置灰，研发补充字段行为。 |
| OUT-MTX-001 | outbound | OSF8V1534,OSF24WW008,OSF8V1711,OSF8V1726 | 指定装箱 / 加包装互斥组 | mutex | frontend_disabled | 互斥组内选中任一原子 | 其余三个置灰；切换时若已有填写内容需确认清空 |  | release_required | product+rd | both | confirmed | assocServiceCode / group radio 形式。 |
| OUT-MTX-002 | outbound | OSF8V1618,OSF8V1294 | 透明标签 / 商品标签 | mutex | field_option_filtered | 选中 `OSF8V1294` | `OSF8V1618` 文件类型只保留 `TRANSPARENT_LABEL` |  | release_required | product+rd | both | confirmed | 产品版还描述透明标签选中后商品标签置灰。 |
| OUT-MTX-003 | outbound | OSF8V1303,OSF8V1308 | 贴包裹标签 / 第三方面单 | mutex | field_visibility_changed | `OSF8V1303.FILE_TYPE=PACKAGE_LABEL_AND_EXPRESS_LABEL_COMPOSITE` | `OSF8V1308` 跟踪号、面单、匹配关系全部隐藏；面单合并到 `OSF8V1303` 文件 |  | release_required | product+rd | both | confirmed | 后端还有文件级联处理。 |
| OUT-MTX-004 | outbound | OSF8V1303,OSF8V1308 | 贴包裹标签 / 第三方面单 | mutex | frontend_disabled | `OSF8V1303` 取消勾选 | `OSF8V1308` 置灰 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-MTX-005 | outbound | OSF8V1303,OSF8V1308 | 复合面单选项 | dependency | field_option_filtered | `OSF8V1303` 文件类型选择复合面单但 `OSF8V1308` 不存在 | “一份文件上传快递面单和包裹标签”选项不可用 |  | release_required | product+rd | both | confirmed |  |
| OUT-OPT-001 | outbound | OSF8V1743 | 补贴运输标签（UN） | option_filter | field_option_filtered | 未选指定装箱（`OSF8V1534` / `OSF8V1726`）且非智能/指定打包策略 | 文件类型只能选统一 `PACKAGE_LABEL_ALL_SAME` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-OPT-002 | outbound | OSF8V1549 | 其他包裹类标签文件 | option_filter | field_option_filtered | 未选指定装箱（`OSF8V1534` / `OSF8V1726`）且打包策略非智能推荐/客户指定；或新单 + RPL | 文件类型只能选统一标签 `OTHER_LABEL_ALL_SAME` |  | release_required | product+rd | both | confirmed |  |
| OUT-OPT-003 | outbound | OSF8V1303 | 贴包裹标签 | option_filter | field_option_filtered | 非新单 + 标准/PTL/无 `OSF8V1308` | 排除“复合面单”选项 |  | release_required | product+rd | both | confirmed |  |
| OUT-OPT-004 | outbound | OSF8V1303 | 贴包裹标签 | option_filter | field_option_filtered | 新单模式 | 只能选“上传文件并提供对应关系” `PACKAGE_LABEL_NOTVC_TEMPLATE` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-FLD-001 | outbound | OSF8V1311 | 贴托盘标签 | field_visibility | field_visibility_changed | `supportsTagsVas` 不包含 `OSF8V1311` | `FILE_SOURCE` 属性不显示 |  | backend_returned_config | rd | vas-atom-disable-logic.md | partial |  |
| OUT-FLD-002 | outbound | OSF8V1311 | 贴托盘标签 | field_visibility | field_visibility_changed | `FILE_SOURCE=DIRECT_UPLOAD` | 显示文件上传字段；选定制标签时文件字段隐藏 |  | release_required | rd | vas-atom-disable-logic.md | confirmed |  |
| OUT-BATCH-001 | outbound | OSF24WW008,OSF8V1284,OSF8V1482,OSF8V1483,OSF8V1484,OSF8V1485,OSF8V1534,OSF8V1550,OSFV0003,OSF8V1621,OSF8V1670,OSF8V1711,OSF8V1726,OSF8V1727,OSF8V1748,OSF8V1705,OSF8V1308,OSF8V1309 | 批量导入不支持原子 | hidden | frontend_hidden | Excel 批量导入场景 | 过滤隐藏，不支持批量导入选择 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-NEW-001 | outbound | * | 新单模式过滤 | hidden | frontend_hidden | `isNewOrder=true` 且原子操作对象为 `GOODS` 或 `SINGLE` | 过滤 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-NEW-002 | outbound | * | 新单模式过滤 | hidden | frontend_hidden | `isNewOrder=true` 且原子属于 assocServiceCode 组 | 过滤 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-NEW-003 | outbound | OSFV0003,OSF8V1727 | 新单托盘过滤 | hidden | frontend_hidden | `isNewOrder=true` 且商品形式为 `PALLET` | 额外过滤 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-BYPASS-001 | outbound | OSF8V1453 | 暂存增值 | backend_bypass | backend_bypass | 命中原子 | 跳过业务白名单校验 + 跳过增值配置校验 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-BYPASS-002 | outbound | OSF8V1552 | 非标增值（线下） | backend_bypass | backend_bypass | 命中原子 | 跳过业务白名单校验 + 跳过增值配置校验 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-STATUS-001 | outbound | OSF8V1748 | 出库补贴子包裹条码 | status_override | backend_status_override | 命中原子 | 强制 `UnHandle` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-STATUS-002 | outbound | * | NO_NEED_DEAL_FILE_VAS_CODE_CONFIG 列表原子 | status_override | backend_status_override | 原子编码命中 `NO_NEED_DEAL_FILE_VAS_CODE_CONFIG` | 强制 `UnHandle` |  | db_config | product | vas-atom-hardcoded-rules.md | partial | 配置值可由数据库修改。 |
| OUT-STATUS-003 | outbound | OSF8V1303 | 贴包裹标签 | status_override | backend_status_override | `LABEL_SOURCE=GENERATE` | 强制 `UnHandle` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-STATUS-004 | outbound | OSF8V1294 | 贴商品标签 | status_override | backend_status_override | `MERCHANDISE_LABEL_LIST` 中有 `BARCODE` 且值非空 | 强制 `UnHandle` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-STATUS-005 | outbound | * | 所有原子 | status_override | backend_status_override | 父订单状态为 `DR` / `PRE` / `TSC` | 强制 `DR` 草稿 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-VAL-001 | outbound | OSF24WW008 | 出库加包装 | submit_validation | submit_validation_error | `PACKAGING_AUXILIARY_MATERIAL` 不是 `AIR_BUBBLE_FILM` | 提交报错 | `PACKAGING_AUXILIARY_MATERIAL_INVALID` | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-FILE-001 | outbound | OSF8V1303,OSF8V1308 | 贴包裹标签 + 第三方面单 | dependency | field_visibility_changed | 文件类型为 `PACKAGE_LABEL_AND_EXPRESS_LABEL_COMPOSITE` | 后端删除两者原有文件并重新写入复合文件 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-FILE-002 | outbound | OSF8V1303 | 贴包裹标签 | dependency | field_visibility_changed | 文件合并 | 只取 `PACKAGE_LABEL_AND_EXPRESS_LABEL_COMPOSITE` 类型文件合并到其他原子 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-ATTR-001 | outbound | OSFV0003 | 打托 | attribute_filter | field_visibility_changed | 后端属性白名单 | 只返回 `PALLET_STANDARD_CONFIG`、`PALLET_TYPE_VALUE`、`PALLET_LIMIT_ID`、`PALLET_STANDARD_GRADE_ID`、`IS_ALLOW_OVER_PALLET` 等属性 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-ATTR-002 | outbound | OSF24WW008 | 出库加包装 | attribute_filter | field_visibility_changed | 后端属性白名单 | 只返回 `PACKAGE_MODE`、`PACKAGE_TYPE_MATERIAL`、`PACKAGE_MERCHANDISE_CODE/SERNO` 等属性 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-ATTR-003 | outbound | OSF8V1301 | 贴发货标签 | attribute_filter | field_visibility_changed | 后端属性白名单 | 只返回 `ASN_LABEL_CODE`、`FILE_COLOR`、`FILE_COPIES`、`FILE_LOCATION`、`OTHER_REQUIREMENTS`、`FILE_SIZE` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-ATTR-004 | outbound | OSF8V1555 | 代理出口清关 | attribute_filter | field_visibility_changed | 后端属性白名单 | 只返回 `TRADE_METHOD`、`SHIPPING_METHOD`、`SENDER_VAT_NO`、`RECEIVER_VAT_NO`、`HSCODE_QTY`、`IS_RELEASE` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-ATTR-005 | outbound | OSF8V1295,OSF8V1300 | 标签类原子 | attribute_filter | field_visibility_changed | 后端属性白名单 | 只返回 `SUBMISSION_MODE`、`ADDITIONAL_SESSION` |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-WL-001 | outbound | OSF8V1303,OSF8V1548,OSF8V1549 | 文件名空格处理白名单 | dependency | field_visibility_changed | 客户命中对应 `*_NOT_REMOVE_BLANK_CUSTOMER_WHITELIST` | 文件名中的空格不删除 |  | business_whitelist | product | vas-atom-hardcoded-rules.md | partial | 白名单后台可改。 |
| OUT-WL-002 | outbound | OSF8V1618 | 贴 FBA 透明计划标签 | submit_validation | submit_validation_error | 未通过 `dgVasRecognitionWhiteList` | 拒绝或不可用 |  | business_whitelist | product | vas-atom-hardcoded-rules.md | partial | 业务白名单可变。 |
| OUT-VAL-002 | outbound | OSF8V1548,OSF8V1549 | 其他商品/包裹标签 | submit_validation | submit_validation_error | `CHECK_OTHER_LABEL_VAS_ALL_HANDLE=N` 且商品/包裹没有全部提供标签文件 | 拒绝提交 |  | db_config | product | vas-atom-hardcoded-rules.md | partial | 动态配置。 |
| OUT-FLD-003 | outbound | * | `SUBMISSION_MODE` / `ADDITIONAL_SESSION` 属性 | field_visibility | frontend_disabled | 非首个分组 `groupSeqIndex!=1`，或只有 1 个选项 | 下拉框置灰 |  | release_required | product+rd | both | confirmed |  |
| OUT-PREF-001 | outbound | OSF8V1621 | DG 商品出库检查 | hidden | frontend_hidden | 服务偏好配置页面 | 不展示，不支持客户自行开关 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed |  |
| OUT-BILL-001 | outbound | OSF8V1284,OSF24WW008,OSFV0003,OSF8V1439,OSF8V1464,OSF8V1440,OSF8V1700 | 需计费原子 | billing_marker | billing_trigger | 选中原子 | 触发费用预估展示 |  | release_required | product | vas-atom-hardcoded-rules.md | confirmed | 不是可选性限制，但影响下单体验。 |

---

## 6. RMA Rules

| ruleId | domain | atomCode | atomName | ruleType | effectType | condition | result | messageOrCode | changeMode | sourceOwner | sourceDoc | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RMA-DIS-001 | rma | OSF5V1746 | 退货-更换商品包装 | disabled | backend_is_disable | 按仓库国家查询商品信息，SKU 类型为 BOX 或 SUITE 时选择客户提供包材模式 `PACKAGING_CUSTOMER` | 不可选或拒绝 |  | code_snapshot | product | vas-atom-hardcoded-rules.md | partial | RMA 依赖后端策略和商品信息。 |
| RMA-VAL-001 | rma | OSF5V1746 | 退货-更换商品包装 | submit_validation | submit_validation_error | 更换包材后尺寸/重量超限 | 拒绝提交 |  | code_snapshot | product | vas-atom-hardcoded-rules.md | partial |  |
| RMA-RES-001 | rma | OSF5V1747 | 退货-补贴商品条码 | disabled | backend_is_disable | 代码中有预留逻辑但当前未启用 | 不作为当前可选性结论 |  | code_snapshot | product | vas-atom-hardcoded-rules.md | partial | 注释状态。 |
| RMA-GEN-001 | rma | OSF5V1764,OSF5V1803 | 退货-更换商品吊牌 / 追踪守护 | global_check | backend_is_disable | 枚举定义存在，具体置灰规则由通用校验覆盖 | 按通用校验处理 |  | code_snapshot | product | vas-atom-hardcoded-rules.md | partial |  |
| RMA-GEN-002 | rma | * | 退货域原子 | global_check | backend_is_disable | RMA 前端 `vasConfig` 为空 | 原子可选性由后端 API 返回 `disabled` 状态控制 |  | backend_returned_config | product | vas-atom-hardcoded-rules.md | partial |  |

---

## 7. Global Rules

| ruleId | domain | atomCode | atomName | ruleType | effectType | condition | result | messageOrCode | changeMode | sourceOwner | sourceDoc | confidence | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| GLB-DIS-001 | global | * | 标准 VASC 包裹校验 | global_check | backend_is_disable | 订单含不支持标准增值的包裹 | 该 VASC 下所有原子置灰 |  | code_snapshot | product+rd | both | confirmed | `AtomDisableCmdExe` 通用置灰。 |
| GLB-DIS-002 | global | * | 非标 VASC 操作对象校验 | global_check | backend_is_disable | 原子的操作对象 `operateObject` 与增值单对象类型 `vasObjectType` 不匹配 | 原子置灰 |  | code_snapshot | product+rd | both | confirmed |  |
| GLB-DIS-003 | global | * | 操作对象层级校验 | global_check | backend_is_disable | 低层级操作对象（如单品）在高层级增值单（如包裹级）中选择 | 原子置灰 |  | code_snapshot | product+rd | both | confirmed |  |
| GLB-DIS-004 | global | * | 必选原子自动置灰 | disabled | frontend_disabled | `required=Y` 且非互斥组 | 自动勾选且不可取消 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| GLB-DIS-005 | global | * | 后端禁用标记透传 | disabled | backend_is_disable | 后端返回 `isDisable=Y` | 前端 `disabled=true`，显示后端或前端 tooltip |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| GLB-FLD-001 | global | * | 单选项提交方式 | field_visibility | frontend_disabled | `SUBMISSION_MODE` 只有一个选项 | 下拉框不可操作 |  | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| GLB-VAL-001 | global | * | 原子不在 VASC 配置中 | submit_validation | submit_validation_error | 提交原子不在 VASC 配置中 | 提交时报错 | `_02040501409` | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| GLB-VAL-002 | global | * | emoji 字符校验 | submit_validation | submit_validation_error | 提交内容含 emoji 表情字符 | 提交时报错 | `_02040901697` | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |
| GLB-VAL-003 | inbound | * | 包裹关联异常单入口校验 | submit_validation | submit_validation_error | 包裹关联了异常单，但从入库单列表入口提交 | 提交时报错 | `_02040901684` | code_snapshot | rd | vas-atom-disable-logic.md | confirmed |  |

---

## 8. Known Conflicts And Follow-Up

| 项 | 处理 |
|---|---|
| `OSF6V1561` | 产品快照原文保留，但结构化表修正为 `OW01V1561`；`OSF6V1561` 不存在。 |
| `OW01V1558` | 采用研发版三条完整禁用条件；产品版条件仅作为子集参考。 |
| 产品版未列但研发版确认的原子 | `OW01V1593`、`OW01V1794`、`OW01V1736`、`OSF6V1591`、`OSF6V1681` 已纳入。 |
| 动态配置项 | `db_config`、`business_whitelist`、`backend_returned_config` 规则只能说明当前离线结构，不能保证实时值。 |
| 前后端不一致 | 用 `notes` 标记，例如 `OSF6V1804` 前端隐藏但后端不禁用。 |

