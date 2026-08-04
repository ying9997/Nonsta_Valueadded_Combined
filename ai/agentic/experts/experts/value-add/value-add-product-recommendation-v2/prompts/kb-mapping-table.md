# 异常 → VASC 紧凑映射表

本文件是**验证层**，用于核实意图导航推荐的 VASC 候选是否有异常关系支撑，以及补充意图导航未覆盖的候选。

> 使用规则：
> - 先通过 `kb-intent-guide.md` 确定候选方向，再用本表验证「异常编码 ↔ VASC」关系是否存在。
> - 本表只记录编码关系，不解释业务原因；解释见意图导航层。
> - 全量来源：`docs/value-add/relationship-mappings/inbound-exception-to-vasc-product-mapping.md`（168 条关系，18 个 VASC）。
> - inactive VASC 标注 `[inactive]`，不作可下单推荐，仅作历史线索。

---

## 包裹条码类异常

| 异常编码 | 异常名称（简） | 关联 VASC 编码 | VASC 名称（简） | 对象层级 |
|---|---|---|---|---|
| B01E1615 | 包裹条码状态异常 | VASC202407031503503 | 原单上架 | package |
| B01E1615 | 包裹条码状态异常 | VASC202407161056217 | 新单上架（客户创建） | package |
| B01E1614 | 包裹条码缺失 | VASC202407031503503 | 原单上架 | package |
| B01E1614 | 包裹条码缺失 | VASC202407161056217 | 新单上架（客户创建） | package |
| B01E1613 | 包裹条码破损 | VASC202407031503503 | 原单上架 | package |
| B01E1613 | 包裹条码破损 | VASC202407161056217 | 新单上架（客户创建） | package |
| B01E1616 | 多个冲突条码 | VASC202407031503503 | 原单上架 | package |
| B01E1616 | 多个冲突条码 | VASC202407161056217 | 新单上架（客户创建） | package |

---

## 商品/SKU 条码类异常

| 异常编码 | 异常名称（简） | 关联 VASC 编码 | VASC 名称（简） | 对象层级 |
|---|---|---|---|---|
| B01E1315 | 商品条码异常（需客户处理） | VASC202407031503503 | 原单上架 | product |
| B01E1315 | 商品条码异常（需客户处理） | VASC202407161056217 | 新单上架（客户创建） | product |
| B01E1316 | 商品条码无法识别 | VASC202407031503503 | 原单上架 | product |
| B01E1317 | 商品条码未录入系统 | VASC202407031503503 | 原单上架 | product |
| B01E1317 | 商品条码未录入系统 | VASC202407161056217 | 新单上架（客户创建） | product |

---

## 包装/质量类异常

| 异常编码 | 异常名称（简） | 关联 VASC 编码 | VASC 名称（简） | 对象层级 |
|---|---|---|---|---|
| B01E2101 | 外包装破损 | VASC_REPACK_001 | 重新包装/包装加固 | package |
| B01E2101 | 外包装破损 | VASC_DESTROY_001 | 销毁处理 | package |
| B01E2102 | 外包装受潮 | VASC_REPACK_001 | 重新包装/包装加固 | package |
| B01E2102 | 外包装受潮 | VASC_DESTROY_001 | 销毁处理 | package |
| B01E2103 | 商品质量明显异常 | VASC_DESTROY_001 | 销毁处理 | product |

---

## 数量差异类异常

| 异常编码 | 异常名称（简） | 关联 VASC 编码 | VASC 名称（简） | 对象层级 | PSC 限制 |
|---|---|---|---|---|---|
| B01E3001 | 到货数量不符 | VASC_INVENTORY_001 | 库内盘点 | order | 建议仅 self_inspection 轨道直接推荐；standard_firstleg 轨道先核实责任 |
| B01E3002 | 货物串仓 | VASC_TRANSFER_001 | 非标调拨/转运 | order | 全 PSC |

---

## 拍照/测量/质检类

| 适用场景 | 关联 VASC 编码 | VASC 名称（简） | 说明 |
|---|---|---|---|
| 存证拍照 | VASC_PHOTO_001 | 库前拍照 | 上架前对包裹或商品拍照 |
| 尺重测量 | VASC_MEASURE_001 | 库前测量 | 核实或记录实物尺重 |
| 质量检验 | VASC_QC_001 | 质检服务 | 按标准或客户定制表检验 |

---

## 映射覆盖说明

- 当前口径：168 条去重关系，覆盖 18 个 VASC。
- 全量 normalized 来源待补齐至 `docs/value-add/source-references/exception-vas-data-package/data/normalized/`。
- 本表为摘要版本，仅覆盖高频异常编码；未在本表出现的异常编码，以 `docs/value-add/relationship-mappings/inbound-exception-to-vasc-product-mapping.md` 为准。
- **不能仅凭本表反推 VASC 适用性**；异常到 VASC 映射证明「有关联」，不替代意图和对象层级判断。
