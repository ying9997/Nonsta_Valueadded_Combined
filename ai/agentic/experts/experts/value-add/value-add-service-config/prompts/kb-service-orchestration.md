# 服务项编排层

本文件提供 VASC 到服务项/原子的运行时编排切片。它只记录可解释的服务项顺序、互斥组和字段证据状态，不承诺页面字段完整性。

---

## 使用规则

- 一行表示一个 VASC 产品中的一个服务项/原子。
- `requiredInVasc=N` 来自当前 normalized 数据；不能解释为“客户一定可不选”，实际可选性还要结合原子规则、入口和页面动态配置。
- `mutexGroup` 为空表示当前映射未提供互斥组，不代表没有任何互斥关系。
- `attrSpecStatus=missing` 时，不得输出完整字段、附件、模板清单。

---

## 编排表

| vascCode | vascName | activeStatus | seq | serviceItemCode | serviceItemName | requiredInVasc | mutexGroup | attrSpecStatus |
|---|---|---|---:|---|---|---|---|---|
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 1 | `OW01V1561` | 入库-更换商品包装 | N | 入库-更换商品包装 | covered_by_vas_event_attrs_slim |
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 2 | `OW01V1559` | 入库-更换新商品条码 | N | 贴商品标 | covered_by_vas_event_attrs_slim |
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 3 | `OW01V1558` | 入库-补贴原商品条码 | N | 贴商品标 | covered_by_vas_event_attrs_slim |
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 4 | `OW01V1572` | 入库-第三方商品条码关联 | N | 贴商品标 | missing |
| `VASC202407012141008` | 新单上架（WINIT创建入库单） | active | 5 | `OW01V1560` | 入库-补贴包裹条码 | N | 入库-补贴包裹条码 | covered_by_vas_event_attrs_slim |
| `VASC202407031456553` | 库内轻加工 | active | 1 | `OSF6V1566` | 库内-更换商品包装 | N | 库内-更换商品包装 | covered_by_vas_event_attrs_slim |
| `VASC202407031456553` | 库内轻加工 | active | 2 | `OSF6V1565` | 库内-更换新商品条码 | N | 贴标/换标 | covered_by_vas_event_attrs_slim |
| `VASC202407031456553` | 库内轻加工 | active | 3 | `OSF6V1564` | 库内-补贴原商品条码 | N | 贴标/换标 | covered_by_vas_event_attrs_slim |
| `VASC202407031456553` | 库内轻加工 | active | 4 | `OSF6V1681` | 错装商品直接上架 | N | 贴标/换标 | missing |
| `VASC202407031456553` | 库内轻加工 | active | 5 | `OSF6V1574` | 库内-商品其他标签（非商品条码） | N | 库内-商品附加标签 | covered_by_vas_event_attrs_slim |
| `VASC202407031456553` | 库内轻加工 | active | 6 | `OSF6V1591` | 拍照暂存后上架 | N | 拍照暂存后上架 | missing |
| `VASC202407031456553` | 库内轻加工 | active | 7 | `OSF6V1576` | 库内-商品拆分 | N |  | missing |
| `VASC202407031456553` | 库内轻加工 | active | 8 | `OSF6V1804` | 库内-商品组合 | N |  | missing |
| `VASC202407031503503` | 原单上架 | active | 1 | `OW01V1561` | 入库-更换商品包装 | N | 入库-更换商品包装 | covered_by_vas_event_attrs_slim |
| `VASC202407031503503` | 原单上架 | active | 2 | `OW01V1559` | 入库-更换新商品条码 | N | 贴商品标 | covered_by_vas_event_attrs_slim |
| `VASC202407031503503` | 原单上架 | active | 3 | `OW01V1558` | 入库-补贴原商品条码 | N | 贴商品标 | covered_by_vas_event_attrs_slim |
| `VASC202407031503503` | 原单上架 | active | 4 | `OW01V1572` | 入库-第三方商品条码关联 | N | 贴商品标 | missing |
| `VASC202407031503503` | 原单上架 | active | 5 | `OW01V1825` | 入库-补贴原商品条码（带示例图） | N | 贴商品标 | covered_by_vas_event_attrs_slim |
| `VASC202407031503503` | 原单上架 | active | 6 | `OW01V1573` | 入库-商品其他标签（非商品条码） | N | 入库-商品附加标签 | covered_by_vas_event_attrs_slim |
| `VASC202407031503503` | 原单上架 | active | 7 | `OW01V1560` | 入库-补贴包裹条码 | N | 入库-补贴包裹条码 | covered_by_vas_event_attrs_slim |
| `VASC202407031507376` | 入库商品拍照 | inactive | 1 | `OW01V1562` | 入库-商品开箱拍照 | N | 商品拍照辨识 | missing |
| `VASC202407031511413` | 库内商品拍照 | active | 1 | `OSF6V1569` | 库内-商品外观拍照 | N | 拍照 | covered_by_vas_event_attrs_slim |
| `VASC202407031511413` | 库内商品拍照 | active | 2 | `OSF6V1570` | 库内-商品开箱拍照 | N | 拍照 | covered_by_vas_event_attrs_slim |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 1 | `OW01V1561` | 入库-更换商品包装 | N | 入库-更换商品包装 | covered_by_vas_event_attrs_slim |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 2 | `OW01V1560` | 入库-补贴包裹条码 | N | 入库-补贴包裹条码 | covered_by_vas_event_attrs_slim |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 3 | `OW01V1558` | 入库-补贴原商品条码 | N |  | covered_by_vas_event_attrs_slim |
| `VASC202407161056217` | 新单上架（客户创建入库单） | active | 4 | `OW01V1559` | 入库-更换新商品条码 | N |  | covered_by_vas_event_attrs_slim |
| `VASC202409121753076` | 上架前销毁 | active | 1 | `OW01V1703` | 上架前包裹销毁 | N | 上架前销毁 | missing |
| `VASC202409121753076` | 上架前销毁 | active | 2 | `OW01V1563` | 上架前商品销毁 | N | 上架前销毁 | missing |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 1 | `OSF6V1643` | 库内-清除商品标签 | N | 标签类 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 2 | `OSF6V1596` | 单品拆分后上架（拆分为一个SKU） | N | 商品组合/拆分 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 3 | `OSF6V1595` | 单品指定位置开箱拍照 | N | 商品拍照辨识 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 4 | `OSF6V1650` | 辨识单品配件后更换 | N | 商品拍照辨识 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 5 | `OSF6V1649` | 辨识单品配件后销毁 | N | 商品拍照辨识 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 6 | `OSF6V1627` | 单品辨识（不开箱） | N | 商品拍照辨识 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 7 | `OSF6V1651` | 库内商品拍摄视频 | N | 商品拍照辨识 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 8 | `OSF6V1677` | 退货商品补拍细节照 | N | 商品拍照辨识 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 9 | `OSF6V1639` | 测量商品内部配件尺重 | N | 商品尺重测量 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 10 | `OSF6V1640` | 柔性打包装箱/装袋测量尺重 | N | 商品尺重测量 | covered_by_vas_event_attrs_slim |
| `VASC202411192229072` | 库内非标增值（免审核） | active | 11 | `OSF6V1626` | 指定商品盘点 | N | 盘点 | missing |
| `VASC202411192240522` | 上架前自提 | active | 1 | `OW01V1594` | 上架前自提（无需WINIT打托） | N | 上架前自提（无需WINIT打托） | covered_by_vas_event_attrs_slim |
| `VASC202411192240522` | 上架前自提 | active | 2 | `OW01V1604` | 上架前自提（需WINIT打托） | N | 上架前自提-托盘 | covered_by_vas_event_attrs_slim |
| `VASC202411192246131` | 入库非标增值（特批） | active | 1 | `OW01V1654` | 包裹串仓异常调拨 | N | 包裹串仓异常调拨 | covered_by_vas_event_attrs_slim |
| `VASC202411192246131` | 入库非标增值（特批） | active | 2 | `OW01V1602` | 入库其他服务需求 | N | 入库其他服务需求 | covered_by_vas_event_attrs_slim |
| `VASC202411192250069` | 库内非标增值（特批） | active | 1 | `OSF6V1648` | 代采购包材物料 | N | 代采购包材物料 | covered_by_vas_event_attrs_slim |
| `VASC202411192250069` | 库内非标增值（特批） | active | 2 | `OSF6V1660` | 审计盘点 | N | 审计盘点 | covered_by_vas_event_attrs_slim |
| `VASC202411192250069` | 库内非标增值（特批） | active | 3 | `OSF6V1644` | DG商品销毁 | N | DG商品销毁 | covered_by_vas_event_attrs_slim |
| `VASC202411192250069` | 库内非标增值（特批） | active | 4 | `OSF6V1646` | 货权转移（换标模式） | N | 货权转移（换标模式） | covered_by_vas_event_attrs_slim |
| `VASC202411192250069` | 库内非标增值（特批） | active | 5 | `OSF6V1647` | 货权转移（改数模式） | N | 货权转移（改数模式） | covered_by_vas_event_attrs_slim |
| `VASC202411192250069` | 库内非标增值（特批） | active | 6 | `OSF6V1603` | 库内其他服务需求 | N | 库内其他服务需求 | covered_by_vas_event_attrs_slim |
| `VASC202411192253186` | 出库非标增值（特批） | active | 1 | `OSF8V1601` | 出库其他服务需求 | N | 出库其他服务需求 | covered_by_vas_event_attrs_slim |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 1 | `OW01V1610` | 入库-单品指定位置开箱拍照 | N | 入库-单品指定位置开箱拍照 | covered_by_vas_event_attrs_slim |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 2 | `OW01V1674` | 入库-异常包裹开箱拍照 | N | 入库-异常包裹开箱拍照 | covered_by_vas_event_attrs_slim |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 3 | `OW01V1599` | 提供海外仓监控视频-少包裹调查 | N | 提供海外仓监控视频-少包裹调查 | covered_by_vas_event_attrs_slim |
| `VASC202411271721537` | 入库非标拍照或提供视频 | active | 4 | `OW01V1600` | 提供海外仓监控视频-少单品调查 | N | 提供海外仓监控视频-少单品调查 | covered_by_vas_event_attrs_slim |
| `VASC202412111831129` | 新单上架（客户提供预报单） | active | 1 | `OW01V1622` | 入库-提供无箱单预报单上架 | N | 入库-提供无箱单预报单上架 | covered_by_vas_event_attrs_slim |
| `VASC202412111836315` | 库内非标增值（需审核） | active | 1 | `OSF6V1597` | 单品拆分后上架（拆分为多个SKU） | N | 单品拆分后上架（拆分为多个SKU） | covered_by_vas_event_attrs_slim |
| `VASC202412111836315` | 库内非标增值（需审核） | active | 2 | `OSF6V1625` | 检查商品尺重（退货商品） | N | 检查商品尺重（退货商品） | covered_by_vas_event_attrs_slim |
| `VASC202504171850278` | 库内销毁 | active | 1 | `OSF6V1704` | 库内-异常商品销毁 | N | 库内-异常商品销毁 | missing |
| `VASC202504251617529` | 原单上架（直接上架） | active | 1 | `OW01V1708` | 直接上架 | N | 直接上架 | covered_by_vas_event_attrs_slim |
| `VASC202504251617529` | 原单上架（直接上架） | active | 2 | `OW01V1559` | 入库-更换新商品条码 | N |  | covered_by_vas_event_attrs_slim |
| `VASC202504251617529` | 原单上架（直接上架） | active | 3 | `OW01V1736` | 入库-覆盖包裹标签 | N |  | covered_by_vas_event_attrs_slim |
| `VASC202504251617529` | 原单上架（直接上架） | active | 4 | `OW01V1560` | 入库-补贴包裹条码 | N |  | covered_by_vas_event_attrs_slim |
| `VASC202505282347101` | 新单上架（直接上架） | active | 1 | `OW01V1708` | 直接上架 | N | 直接上架 | covered_by_vas_event_attrs_slim |

---

## 编排限制

- 本表只描述 VASC 与服务项/原子的已知编排关系，不承诺页面字段完整性。
- `mutexGroup` 是来源映射中的互斥组说明；实际页面是否禁选须由原子可选性规则或运行时配置证明。
- inactive、库内或出库 VASC 只能在用户明确查询时解释，不作为入库异常推荐链主路径。
- 未在本表出现的 VASC 输出 `missing_vasc` 或 `conditional`，不得编造服务项。
