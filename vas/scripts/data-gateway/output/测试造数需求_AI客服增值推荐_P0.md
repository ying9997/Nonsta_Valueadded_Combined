# 测试造数需求 — AI 客服增值推荐 P0

> 生成时间：2026-06-18 13:01 UTC
> 覆盖页面：**异常单** + **增值订单**（每条 P0 需造两套档位）

## 造数层级（最小闭环）

```
pre_vas（AI 推荐入口）
  Layer1  WI 入库单 INBOUND / USGA
  Layer2  EB 异常 UNUSUAL / eventCode=PMS / 待客户处理
  Layer3  eventFiles 仓库实拍图

post_vas（增值订单页验收）
  Layer1~3  同上（历史异常上下文）
  Layer4  VASC 增值单 vaSource=UNUSUAL / status=已完成(PD)
  Layer5  原子服务 status=已处理(CO) + vaAtomAttrs 必填属性
  关联     VASC.businessOrderNo=WI；childBusinessOrders 含 EB；
           getEventOrder4VaAtom.eventCode=PMS；EB 状态已关闭
```

运行时样本：`../output/vas_VASC000000296745.json`（B0102E23 + OW01V1561）

## 造数档位说明

| profile | 页面 | 说明 |
|---------|------|------|
| `pre_vas` | 异常单列表/详情 | 仅有 WI + EB，客户尚未下增值单；用于 AI 推荐验证 |
| `post_vas` | 异常单列表/详情、增值订单列表/详情 | WI + EB + VASC 全链路；EB 已关联增值单并关闭，增值订单页可查到已完成单据 |

## P0 场景总览

| TC_ID | 场景 | PMS eventCode | 推荐原子服务 | VASC 套餐 hint |
|-------|------|---------------|-------------|----------------|
| TC-P0-01 | ①包裹条码异常 | `B0102E21` | `OW01V1560, OW01V1736` | VASC202407031503503, VASC202407161056217 ... |
| TC-P0-02 | ②商品质量异常 | `B01E1314` | `OW01V1563, OW01V1703` | VASC202407012141008, VASC202407031503503 ... |
| TC-P0-03 | ④商品包装异常 | `B0102E08` | `OW01V1563` | VASC202407031456553, VASC202407031511413 ... |
| TC-P0-04 | ③商品裸装 | `B0102E27` | `OW01V1573` | VASC202407012141008, VASC202407031503503 ... |
| TC-P0-05 | ⑤包裹包装异常/A+包裹质量异常 | `B0102E23` | `OW01V1561` | VASC202407031503503, VASC202407031507376 ... |
| TC-P0-06 | ①商品条码异常 | `B01E1315` | `OW01V1558, OW01V1559, OW01V1825` | VASC202407012141008, VASC202407031503503 ... |
| TC-P0-07 | 包裹内商品错装 | `B05E013` | `OW01V1560` | VASC202407031456553, VASC202407031511413 ... |
| TC-P0-08 | ②商品有条码但系统无法识别 | `B01E1316` | `OW01V1572` | VASC202407012141008, VASC202407031503503 ... |
| TC-P0-10 | A+包裹质量异常（多原子组合） | `B0102E23` | `OW01V1561, OW01V1558` | VASC202407031503503, VASC202407031507376 ... |

## 逐用例造数要点（post_vas 档位）

### TC-P0-01 ①包裹条码异常

- **PMS eventCode**：`B0102E21`
- **增值套餐**：`VASC202407031503503` 原单上架
- **原子服务**：`OW01V1560`, `OW01V1736`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-02 ②商品质量异常

- **PMS eventCode**：`B01E1314`
- **增值套餐**：`VASC202407012141008` 新单上架（WINIT创建入库单）
- **原子服务**：`OW01V1563`, `OW01V1703`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-03 ④商品包装异常

- **PMS eventCode**：`B0102E08`
- **增值套餐**：`VASC202407031456553` 
- **原子服务**：`OW01V1563`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-04 ③商品裸装

- **PMS eventCode**：`B0102E27`
- **增值套餐**：`VASC202407012141008` 新单上架（WINIT创建入库单）
- **原子服务**：`OW01V1573`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-05 ⑤包裹包装异常/A+包裹质量异常

- **PMS eventCode**：`B0102E23`
- **增值套餐**：`VASC202407031503503` 原单上架
- **原子服务**：`OW01V1561`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`
- **参考样本**：`../output/vas_VASC000000296745.json`

### TC-P0-06 ①商品条码异常

- **PMS eventCode**：`B01E1315`
- **增值套餐**：`VASC202407012141008` 新单上架（WINIT创建入库单）
- **原子服务**：`OW01V1558`, `OW01V1559`, `OW01V1825`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-07 包裹内商品错装

- **PMS eventCode**：`B05E013`
- **增值套餐**：`VASC202407031456553` 
- **原子服务**：`OW01V1560`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-08 ②商品有条码但系统无法识别

- **PMS eventCode**：`B01E1316`
- **增值套餐**：`VASC202407012141008` 新单上架（WINIT创建入库单）
- **原子服务**：`OW01V1572`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`

### TC-P0-10 A+包裹质量异常（多原子组合）

- **PMS eventCode**：`B0102E23`
- **增值套餐**：`VASC202407031503503` 原单上架
- **原子服务**：`OW01V1561`, `OW01V1558`
- **EB 状态**：已关闭，linkedVascNo = VASC 单号
- **VASC 状态**：PD / 已完成；各原子服务 CO / 已处理
- **验收接口**：`getVasList`、`getEventOrder4VaAtom`、`queryRelatedVaOrdersPage`
- **参考样本**：`../output/vas_VASC000000296745.json`

## 属性枚举附录（P0 原子服务）

| serviceCode | attributeKeyOriginal | 中文名 | isRequired | showType | 允许值示例 |
|-------------|---------------------|--------|------------|----------|-----------|
| `OW01V1558` | `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | N | OPTIONAL_BOX | GOOD_PRODUCT=良品; DEFECTIVE_PRODUCT=不良品 |
| `OW01V1558` | `LABEL_SIZE` | 尺寸规格 | Y | OPTIONAL_BOX | 10X6=10cm*6cm; 5X2.5=5cm*2.5cm |
| `OW01V1558` | `LABEL_TYPE` | 标签类型 | Y | OPTIONAL_BOX | WINIT_SKU_SERNO_ITEM_SERNO=Winit商品/单品条码; THIRD_PARTY_SKU_SERNO_ITEM_SERNO=第三方商品/单品条码 |
| `OW01V1559` | `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | N | OPTIONAL_BOX | GOOD_PRODUCT=良品; DEFECTIVE_PRODUCT=不良品 |
| `OW01V1559` | `LABEL_TYPE` | 标签类型 | Y | OPTIONAL_BOX | WINIT_SKU_SERNO_ITEM_SERNO=Winit商品/单品条码; THIRD_PARTY_SKU_SERNO_ITEM_SERNO=第三方商品/单品条码 |
| `OW01V1559` | `LABEL_SIZE` | 尺寸规格 | Y | OPTIONAL_BOX | 10X6=10cm*6cm; 5X2.5=5cm*2.5cm |
| `OW01V1560` | `LABEL_TYPE` | 标签类型 | Y | OPTIONAL_BOX | PACKGE_SERNO=Winit包裹条码; THIRD_PARTY_PACKGE_SERNO=第三方包裹条码 |
| `OW01V1560` | `LABEL_SIZE` | 尺寸规格 | Y | OPTIONAL_BOX | 10X6=10cm*6cm; 10X15=10cm*15cm |
| `OW01V1561` | `PACKAGING_MODE` | 包装方式 | Y | OPTIONAL_BOX | PACKAGING_WINIT=Winit标准包装; REINFORCED_PACKAGING=包装加固 |
| `OW01V1561` | `PACKAGING_MATERAIL_TYPE` | 包材类型 | Y | OPTIONAL_BOX | PADDED_ENVELOPE=气泡袋; COURIER_SATCHEL=快递袋; CARTON_BOX=纸箱 |
| `OW01V1573` | `LABEL_SIZE` | 尺寸规格 | Y | OPTIONAL_BOX | 10X6=10cm*6cm; 5X2.5=5cm*2.5cm |
| `OW01V1573` | `ALL_GOODS_SAME_LABEL` | 标签文件是否全部相同 | Y | OPTIONAL_BOX | Y=是 |
| `OW01V1573` | `FILE_OPERATION_POSITION` | 文件操作位置 | Y | OPTIONAL_BOX | LABELING=贴标 |
| `OW01V1736` | `CLEAR_LABEL_TYPE` | 清除的标签类型 | Y | OPTIONAL_BOX_WITH_IMAGE | DG_LABEL=DG标签; UN_LABEL=UN标签; CARGO_AIRCRAFT_ONLY_LABEL=Cargo Aircraft ONLY标签 |
| `OW01V1736` | `COVER_LABEL_TYPE` | 覆盖的标签类型 | Y | OPTIONAL_BOX_WITH_IMAGE | WINIT_LABEL=Winit标签-白标; WINIT_LABEL_GRAPHIC=Winit标签-带图文; CUSTOMER_PROVIDED_OVERRIDING_LABEL=客户自提供覆盖标签 |
| `OW01V1736` | `CLEAR_LABEL_SAMPLE_IMAGE` | 上传清除标签示例图 | Y | ANNEX | — |
| `OW01V1736` | `COVER_LABEL_IMAGE` | 上传覆盖标签图片 | Y | ANNEX | — |
| `OW01V1736` | `COVER_LABEL_SIZE` | 覆盖的标签尺寸规格 | Y | OPTIONAL_BOX | 10X15=10cm*15cm; 10X10=10cm*10cm |
| `OW01V1825` | `SHELVE_PRODUCT_GRADE` | 上架的商品等级 | N | OPTIONAL_BOX | GOOD_PRODUCT=良品; DEFECTIVE_PRODUCT=不良品 |
| `OW01V1825` | `LABEL_SIZE` | 尺寸规格 | Y | OPTIONAL_BOX | 10X6=10cm*6cm; 5X2.5=5cm*2.5cm |
| `OW01V1825` | `LABEL_TYPE` | 标签类型 | Y | OPTIONAL_BOX | WINIT_SKU_SERNO_ITEM_SERNO=Winit商品/单品条码; THIRD_PARTY_SKU_SERNO_ITEM_SERNO=第三方商品/单品条码 |
| `OW01V1825` | `VAS_ATTR_REL_SP` | 示例图片 | Y | ANNEX | — |
