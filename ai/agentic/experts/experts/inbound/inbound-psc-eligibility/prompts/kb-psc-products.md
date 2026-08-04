# 入库 PSC 产品线对照表

> API：`winit.wh.pms.getWinitProducts`（[查询头程服务](https://developer.winit.com.cn/document/detail/id/28.html)）

## productType 与产品线

| productType | 产品线 | 说明 |
|-------------|--------|------|
| OW0101 | 标准海外仓入库 | Winit 头程全托管，返回 OW0101* 具体 PSC |
| OW0102 | 直发自验入库 | 返回 OW01021*（Winit 承运自验）、OW01022*（卖家直发自验）等 |
| OW0103 | 直发海外验入库 | 返回 OW01031*、OW01032* 等 |

接口按 `productType` 分三次查询（或按 filter 只查相关类型）；**仅返回当前 app_key 可下单的产品**，无 `enabled` 字段。

## 权限标记规则（由 productCode 前缀推断）

- **自验权限**（`hasSelfInspection`）：存在任意 `OW0102*` 产品
- **海外验权限**（`hasOverseasInspection`）：存在任意 `OW0103*` / `OW0104*` 产品
- **标准头程**（`hasStandardFirstLeg`）：存在任意 `OW0101*` 产品

家族编码对照（filterCodes 常用）：

| 家族编码 | 含义 | productCode 前缀 |
|----------|------|------------------|
| OW01011 | 标准头程 | OW0101* |
| OW01021 | Winit 承运自验 | OW01021* |
| OW01022 | 卖家直发自验 | OW01022* |
| OW01031 | Winit 承运海外验 | OW01031* |
| OW01032 | 直发海外验 | OW01032* |

## 对客原则

- 简洁列举 API 返回的可下单产品及中文名称
- 客户问某家族编码（如 OW01021）但 API 无匹配产品时，说明未开通并提示「如需申请，请通过万邑联客服渠道申请」
- 不输出额度数字；额度查询见 inbound-capacity-availability
- 本接口不含仓库维度；`warehouseCode` 仅作上下文，不用于 API 过滤

## 客户自助查看路径

万邑联 → 个人中心 → 产品权限
