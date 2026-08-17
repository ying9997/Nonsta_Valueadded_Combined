# VASC 约束过滤层

本文件为 `filter-by-constraints` 节点提供过滤依据。候选 VASC 在经过意图导航和映射验证后，须通过本层约束检查，排除**不可用**的候选。

> 使用规则：
> - inactive VASC 不得作为可下单推荐，只能作为历史线索或待确认项。
> - 约束的具体命中值依赖知识库同步，v1 不调用 `pms.VascTomService_queryVascPage` 刷新。
> - 约束有疑义时输出 `informationalMissing`，不编造系统限制。

---

## 一、VASC 启用态约束

| VASC 类别 | 启用态 | 使用限制 |
|---|---|---|
| 原单上架类 VASC | active | 可推荐为首选 |
| 新单上架类 VASC | active | 可推荐为首选 |
| 拍照/测量/质检类 VASC | active | 可推荐为辅助服务 |
| 销毁类 VASC | active | 可推荐，需客户授权确认 |
| 自提类 VASC | active（部分仓库限制）| 需确认目的仓是否支持 |
| 调拨/转运类 VASC | active（非标服务）| 需人工评估，建议升级 |
| inactive VASC | inactive | 不作可下单推荐；作为历史/待确认线索，在 `notRecommendedOptions` 中注明 |

---

## 二、入库单状态依赖约束

以下约束影响特定 VASC 的可用性，缺失时产生 `blockingMissing` 或 `informationalMissing`。

| VASC 意图 | 依赖的入库单状态 | 状态不满足时的处理 | 缺失信息类型 |
|---|---|---|---|
| 原单上架 | 入库单须为**可操作状态**（待上架、验货中等，非已关闭/已完成） | 降级：提示改为新单上架；原单上架候选降为条件性推荐 | `blockingMissing`（dimension: orderStatus） |
| 新单上架 | 无强依赖，但新入库单号有助于后续服务配置 | 可先推荐，新单号作 `informationalMissing` | `informationalMissing`（dimension: newOrderNo） |
| 库内盘点 | 无强依赖 | 直接推荐 | — |
| 销毁 | 无状态依赖，但需客户授权 | 授权确认作 `informationalMissing` | `informationalMissing`（dimension: destroyAuthorization） |
| 自提 | 仓库须支持自提 | 仓库限制不满足时降级 | `blockingMissing`（dimension: warehousePickupSupport） |

---

## 三、对象层级兼容约束

候选 VASC 有对象层级适用范围；异常对象层级与 VASC 适用范围不匹配时，该候选应降级或排除。

| VASC 类别 | 适用对象层级 | 不兼容时处理 |
|---|---|---|
| 包裹条码修复类（原单/新单） | `package` | 若异常对象为 `product` 或 `item`，此类 VASC 不适用 |
| 商品条码修复类（原单/新单） | `product`、`item` | 若异常对象为 `package`，此类 VASC 不适用 |
| 拍照/测量 | `package`、`product`（均支持）| 通常无层级限制 |
| 销毁 | `package`、`product`、`item`（均支持）| 通常无层级限制 |
| 库内盘点 | `order`、`package` | 通常按入库单整体盘点 |
| 自提/调拨 | `order`（整单操作）| 不适用于单件操作 |

---

## 四、实物包装方式约束

| 实物包装方式 | 约束说明 |
|---|---|
| 托盘（pallet）装 | 托盘层异常不能直接做商品级贴标；需先「拆托盘」才能操作商品层级 VASC；`objectLevel=pallet` 时此约束作为 `informationalMissing` 提示 |
| 散件/箱装 | 无额外约束 |

---

## 五、其他不推荐原因参考

| 原因类型 | 说明 | 输出位置 |
|---|---|---|
| 意图不匹配 | VASC 适用的上架方式与客户意图相悖（如意图原单上架但 VASC 是新单上架类） | `notRecommendedOptions` |
| 对象层级不匹配 | 见第三节 | `notRecommendedOptions` |
| inactive | VASC 当前未启用 | `notRecommendedOptions`（附历史线索说明） |
| PSC 轨道限制 | 数量差异类 VASC 在 standard_firstleg 轨道不建议直接推荐（优先核实责任） | `notRecommendedOptions` 或 `missingConfirmations` |
| 仓库不支持 | 特定仓库不支持此 VASC（如自提仓库限制）| `notRecommendedOptions` |
