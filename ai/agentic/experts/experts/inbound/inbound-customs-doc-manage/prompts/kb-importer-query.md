# 进口商查询指引

## API

`winit.ums.getVendorInfo`（[查询进/出口供应商](https://developer.winit.com.cn/document/detail/id/33.html)）

- 入参：`countryCode`（目的国二字码）+ `vendorType=IOR`
- 返回：`vendorCode`、`vendorName`、`isWinit`（Y=Winit 供应商，N=客户自有）

## 说明

- 本接口返回**当前 app_key 可用的进出口商列表**，用于入库单选择 IOR。
- **不包含**审核状态（待审核/已通过等）；审核进度仍须在万邑联 → 进口商管理查看。
- 指定 `importerCode` 时，在 API 结果中匹配编码；未找到则提示客户核对编码或联系客服。

## 万邑联自助查询（审核状态）

1. 登录万邑联 → 进口商管理
2. 搜索进口商编码或公司名称
3. 查看审核状态：待审核 / 审核中 / 已通过 / 已拒绝

## 对客约束

- 不代客注册或修改进口商
- 审核被拒需客户自行复核材料
