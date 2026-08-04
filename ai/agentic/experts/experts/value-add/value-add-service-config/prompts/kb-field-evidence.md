# 字段证据层

本文件定义服务项普通属性字段证据覆盖状态。它只说明当前知识切片是否有字段证据，不提供完整下单字段、附件、模板或上传关系清单。

---

## 使用规则

- `partial_field_evidence` 表示当前有普通属性字段证据覆盖，但不是完整字段配置映射。
- `missing_field_evidence` 表示当前没有该服务项的普通属性字段证据；必须写入 `blockedClaims` 或 `informationalMissing`，不得解释成“无需字段”。
- `not_full_config_mapping` 表示不能把该行当成完整字段、附件、模板配置。
- `not_available_from_current_sources` 表示当前知识不足以给出字段配置结论。
- 客户可准备信息只能作为提示，不得说成页面必填项。

---

## 覆盖统计

| 指标 | 数量 | 说明 |
|---|---:|---|
| 唯一服务项 | 52 | 当前运行时切片覆盖的 VASC 编排服务项 |
| 普通属性字段证据覆盖 | 42 | 可输出 `partial_field_evidence` |
| 缺少普通属性字段证据 | 10 | 输出 `missing_field_evidence` |

---

## 服务项字段证据表

| serviceItemCode | serviceItemName | fieldEvidenceStatus | configFieldMappingStatus | attrSpecStatus | usedInVascCodes |
|---|---|---|---|---|---|
| `OSF6V1564` | 库内-补贴原商品条码 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031456553` |
| `OSF6V1565` | 库内-更换新商品条码 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031456553` |
| `OSF6V1566` | 库内-更换商品包装 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031456553` |
| `OSF6V1569` | 库内-商品外观拍照 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031511413` |
| `OSF6V1570` | 库内-商品开箱拍照 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031511413` |
| `OSF6V1574` | 库内-商品其他标签（非商品条码） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031456553` |
| `OSF6V1576` | 库内-商品拆分 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202407031456553` |
| `OSF6V1591` | 拍照暂存后上架 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202407031456553` |
| `OSF6V1595` | 单品指定位置开箱拍照 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1596` | 单品拆分后上架（拆分为一个SKU） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1597` | 单品拆分后上架（拆分为多个SKU） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202412111836315` |
| `OSF6V1603` | 库内其他服务需求 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192250069` |
| `OSF6V1625` | 检查商品尺重（退货商品） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202412111836315` |
| `OSF6V1626` | 指定商品盘点 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202411192229072` |
| `OSF6V1627` | 单品辨识（不开箱） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1639` | 测量商品内部配件尺重 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1640` | 柔性打包装箱/装袋测量尺重 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1643` | 库内-清除商品标签 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1644` | DG商品销毁 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192250069` |
| `OSF6V1646` | 货权转移（换标模式） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192250069` |
| `OSF6V1647` | 货权转移（改数模式） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192250069` |
| `OSF6V1648` | 代采购包材物料 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192250069` |
| `OSF6V1649` | 辨识单品配件后销毁 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1650` | 辨识单品配件后更换 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1651` | 库内商品拍摄视频 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1660` | 审计盘点 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192250069` |
| `OSF6V1677` | 退货商品补拍细节照 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192229072` |
| `OSF6V1681` | 错装商品直接上架 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202407031456553` |
| `OSF6V1704` | 库内-异常商品销毁 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202504171850278` |
| `OSF6V1804` | 库内-商品组合 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202407031456553` |
| `OSF8V1601` | 出库其他服务需求 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192253186` |
| `OW01V1558` | 入库-补贴原商品条码 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407012141008`, `VASC202407031503503`, `VASC202407161056217` |
| `OW01V1559` | 入库-更换新商品条码 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407012141008`, `VASC202407031503503`, `VASC202407161056217`, `VASC202504251617529` |
| `OW01V1560` | 入库-补贴包裹条码 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407012141008`, `VASC202407031503503`, `VASC202407161056217`, `VASC202504251617529` |
| `OW01V1561` | 入库-更换商品包装 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407012141008`, `VASC202407031503503`, `VASC202407161056217` |
| `OW01V1562` | 入库-商品开箱拍照 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202407031507376` |
| `OW01V1563` | 上架前商品销毁 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202409121753076` |
| `OW01V1572` | 入库-第三方商品条码关联 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202407012141008`, `VASC202407031503503` |
| `OW01V1573` | 入库-商品其他标签（非商品条码） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031503503` |
| `OW01V1594` | 上架前自提（无需WINIT打托） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192240522` |
| `OW01V1599` | 提供海外仓监控视频-少包裹调查 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411271721537` |
| `OW01V1600` | 提供海外仓监控视频-少单品调查 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411271721537` |
| `OW01V1602` | 入库其他服务需求 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192246131` |
| `OW01V1604` | 上架前自提（需WINIT打托） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192240522` |
| `OW01V1610` | 入库-单品指定位置开箱拍照 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411271721537` |
| `OW01V1622` | 入库-提供无箱单预报单上架 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202412111831129` |
| `OW01V1654` | 包裹串仓异常调拨 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411192246131` |
| `OW01V1674` | 入库-异常包裹开箱拍照 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202411271721537` |
| `OW01V1703` | 上架前包裹销毁 | `missing_field_evidence` | `not_available_from_current_sources` | `missing` | `VASC202409121753076` |
| `OW01V1708` | 直接上架 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202504251617529`, `VASC202505282347101` |
| `OW01V1736` | 入库-覆盖包裹标签 | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202504251617529` |
| `OW01V1825` | 入库-补贴原商品条码（带示例图） | `partial_field_evidence` | `not_full_config_mapping` | `covered_by_vas_event_attrs_slim` | `VASC202407031503503` |

---

## 客户可准备信息提示

| 服务方向 | 可提示客户先准备 | 证据边界 |
|---|---|---|
| 原单上架 / 新单上架 | 原入库单号或新入库单号、异常包裹/商品标识、需补贴或更换的条码说明 | 只能说“可先准备”，不等于页面必填字段 |
| 直接上架 | 入库单号、异常对象、是否需要覆盖包裹标签或补包裹条码 | 需结合 VASC 编排和原子规则，不得只按意图判断 |
| 销毁 | 销毁对象、数量、客户授权确认 | 上架前销毁相关服务项当前缺字段证据 |
| 拍照 / 视频 / 调查 | 拍照对象、拍照部位、调查对象、是否需要视频佐证 | 多数为 partial，不能承诺附件或模板要求 |
| 自提 / 调拨 / 非标 | 自提对象、是否打托、调拨/非标诉求描述、人工确认材料 | 特批/审核场景不等于系统可直接下单 |

---

## blockedClaims 固定项

- 没有完整字段配置证据时，不承诺“页面必填字段只有这些”。
- 没有附件、模板、上传关系证据时，不承诺 `vaAtomFiles` 或附件模板完整清单。
- `missing_field_evidence` 只表示当前缺少普通属性字段证据，不表示该服务项无需字段。
- 已提交增值单上的字段事实只能解释订单事实，不能反推事前配置全量。
