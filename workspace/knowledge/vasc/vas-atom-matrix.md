# 入库段增值产品原子矩阵

## 数据来源说明
- 生成时间: 2026-07-29T15:28:28.862Z
- 范围: pscgCode=OW01（海外仓入库），不含 OW02/OW03。
- 产品清单接口: pms.VascService_queryVascList，参数 where[code]=空、where[pscgCode]=OW01。
- 原子配置接口/页面: VASC 详情页 detail_items；辅助校验 pms.VascTomService_queryVascItemTypes。
- shelveWay 验证结果: shelveWay 不可用，按产品名称归类。

## 字段来源说明
- 产品清单来源: pms.VascService_queryVascList
- 原子配置来源: pms.VascTomService_queryVascPage / detail_items
- 以下字段为运行时上下文字段，本静态清单不包含: isDisable, disableReason, isShow
- 运行时字段由中间层在每次请求时根据具体订单/仓库/客户动态注入给 Agent

## 三层清单

### 上架

#### 新单上架（WINIT创建入库单） (VASC202407012141008)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_NEW_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1561 | 入库-更换商品包装 | 客户要求增加、更换商品包装 | 入库-更换商品包装 | N | standard |
| OW01V1559 | 入库-更换新商品条码 | "客户货物入库商品无条码或条码无法扫描，补贴原商品标签，使用原入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 贴商品标 | N | standard |
| OW01V1558 | 入库-补贴原商品条码 | "客户货物入库商品条码异常（不含无条码），生成新商品标签并覆盖原商品标签，且使用新入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 贴商品标 | N | standard |
| OW01V1572 | 入库-第三方商品条码关联 | 货物入库时未进行第三方条码关联，但实际物品贴有第三方条码。现在需要进行条码关联，并将货物上架至仓库。 | 贴商品标 | N | standard |
| OW01V1560 | 入库-补贴包裹条码 | "客户货物入库商品无条码或条码无法扫描，补贴原包裹标签，且使用原/新入库单上架 - 包裹标签：含包裹标签，第三方包裹标签（例如FBA箱唛，客户需要关联）" | 入库-补贴包裹条码 | N | standard |

#### 原单上架 (VASC202407031503503)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1561 | 入库-更换商品包装 | 客户要求增加、更换商品包装 | 入库-更换商品包装 | N | standard |
| OW01V1559 | 入库-更换新商品条码 | "客户货物入库商品无条码或条码无法扫描，补贴原商品标签，使用原入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 贴商品标 | N | standard |
| OW01V1558 | 入库-补贴原商品条码 | "客户货物入库商品条码异常（不含无条码），生成新商品标签并覆盖原商品标签，且使用新入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 贴商品标 | N | standard |
| OW01V1572 | 入库-第三方商品条码关联 | 货物入库时未进行第三方条码关联，但实际物品贴有第三方条码。现在需要进行条码关联，并将货物上架至仓库。 | 贴商品标 | N | standard |
| OW01V1825 | 入库-补贴原商品条码（带示例图） | 客户货物入库商品条码异常（不含无条码），生成新商品标签并覆盖原商品标签，且使用原入库单上架 - 商品标签：含商品条码，商品条码贴标示例图 | 贴商品标 | N | standard |
| OW01V1573 | 入库-商品其他标签（非商品条码） | 卖家商品入库时，要求仓库针对商品粘贴标签（不含商品条码），这些标签通常包含有关商品的详细描述、用途等信息，例如含英代标签、欧代标签、尺寸标签、环保标签、产地标签、使用说明标签等。 | 入库-商品附加标签 | N | standard |
| OW01V1560 | 入库-补贴包裹条码 | "客户货物入库商品无条码或条码无法扫描，补贴原包裹标签，且使用原/新入库单上架 - 包裹标签：含包裹标签，第三方包裹标签（例如FBA箱唛，客户需要关联）" | 入库-补贴包裹条码 | N | standard |

#### 新单上架（客户创建入库单） (VASC202407161056217)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["INBOUND_ORDER_OF_CUSTOMER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1561 | 入库-更换商品包装 | 客户要求增加、更换商品包装 | 入库-更换商品包装 | N | standard |
| OW01V1560 | 入库-补贴包裹条码 | "客户货物入库商品无条码或条码无法扫描，补贴原包裹标签，且使用原/新入库单上架 - 包裹标签：含包裹标签，第三方包裹标签（例如FBA箱唛，客户需要关联）" | 入库-补贴包裹条码 | N | standard |
| OW01V1558 | 入库-补贴原商品条码 | "客户货物入库商品条码异常（不含无条码），生成新商品标签并覆盖原商品标签，且使用新入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 接口无此字段 | N | standard |
| OW01V1559 | 入库-更换新商品条码 | "客户货物入库商品无条码或条码无法扫描，补贴原商品标签，使用原入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 接口无此字段 | N | standard |

#### 优先上架 (VASC202411192232522)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["DR","OD","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1632 | 优先上架 |  | 优先上架 | N | standard |

#### 新单上架（客户提供预报单） (VASC202412111831129)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","STOP","SHD","EWC"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["INBOUND_ORDER_OF_CUSTOMER"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1622 | 入库-提供无箱单预报单上架 | 客户使用无箱单预报单入库，但是货物到仓后发现无箱单识别标识丢失，导致仓库无法正常上架，客户需提供原始无箱单信息，以便仓库能够正确处理货物并完成上架操作。 | 入库-提供无箱单预报单上架 | N | 2a_named |

#### 原单上架（直接上架） (VASC202504251617529)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","SHD","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["Y"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1708 | 直接上架 | 对于入库状态异常、包裹质量异常或商品质量异常的包裹，不进行补贴且直接上架处理。 | 直接上架 | N | standard |
| OW01V1559 | 入库-更换新商品条码 | "客户货物入库商品无条码或条码无法扫描，补贴原商品标签，使用原入库单上架 - 商品标签：含商品条码，第三方商品条码（例如FNSKU标签，客户需要关联）" | 接口无此字段 | N | standard |
| OW01V1736 | 入库-覆盖包裹标签 | 入库覆盖A+/A包的包裹标签，包括但不限于DG标签、UN标签、禁止空运标签等 | 接口无此字段 | N | standard |
| OW01V1560 | 入库-补贴包裹条码 | "客户货物入库商品无条码或条码无法扫描，补贴原包裹标签，且使用原/新入库单上架 - 包裹标签：含包裹标签，第三方包裹标签（例如FBA箱唛，客户需要关联）" | 接口无此字段 | N | standard |

#### 新单上架（直接上架） (VASC202505282347101)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["Y"],"VASC_LISTING":["INBOUND_ORDER_OF_CUSTOMER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1708 | 直接上架 | 对于入库状态异常、包裹质量异常或商品质量异常的包裹，不进行补贴且直接上架处理。 | 直接上架 | N | standard |

#### 原单上架（100%A+包无包裹条码订单） (VASC202512101928588)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["Y"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["WINIT_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1782 | A+包裹条码异常直接上架 | 100%A+包裹无包裹条码入库订单，当客户发生商品条码未关联问题时，系统流程缺失，只能登记包裹条码异常（需客户处理），这时候客户重新关联新的条码到原入库单，客户可使用此增值告知仓库已做好关联，要求异常包裹直接上架到原入库单 | 接口无此字段 | N | 2a_named |

### 销毁

#### 上架前销毁 (VASC202409121753076)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["DESTRUCTION"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1703 | 上架前包裹销毁 | "针对异常包裹，到仓后上架前，Winit提供将包裹销毁的服务<br>注：此销毁服务无法提供销毁证明" | 上架前销毁 | N | standard |
| OW01V1563 | 上架前商品销毁 | 货物到海外仓后，已卸货未上架，客户要求销毁 | 上架前销毁 | N | standard |

#### 上架前异常包裹销毁 (VASC202412111833485)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","STOP","EWC","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["DESTRUCTION"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| 接口无返回 | 接口无返回 | 接口无返回 | 接口无返回 | 接口无返回 | ❓待确认 |

#### 上架前异常销毁 (VASC202503241916527)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["EWC","PS","RE","PEWC","STOP","OD","VO","IC","SHO","SHD","DR","TS","SB"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["Y"],"VASC_LISTING":["DESTRUCTION"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| 接口无返回 | 接口无返回 | 接口无返回 | 接口无返回 | 接口无返回 | ❓待确认 |

### 自提

#### 上架前自提 (VASC202411192240522)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","SHD","EWC","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["SELF_PICKUP"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1594 | 上架前自提（无需WINIT打托） | 此增值服务仅支持异常货物，货物到海外仓后客户要求按照包裹提货 | 上架前自提（无需WINIT打托） | N | 2a_named |
| OW01V1604 | 上架前自提（需WINIT打托） | 此增值服务仅支持异常货物，货物到海外仓后客户要求打托后提货 | 上架前自提-托盘 | N | 2a_named |

### 暂存/拍照辨识

#### 入库商品拍照 (VASC202407031507376)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["STORAGE"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1562 | 入库-商品开箱拍照 | 客户指定商品SKU，仓库将商品外包装及销售包装拆开，对商品裸货及单品拍照。（拆包前拍照）提供外箱条码1张+外包装全览图，（拆包后）提供商品条码照片1张，商品实物照3~4张（商品全览图、商品细节图等）； | 商品拍照辨识 | N | standard |

#### 入库非标拍照或提供视频 (VASC202411271721537)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","STOP","SHD","DR","SB","EWC","RE","OD","VO","IC","SHO","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["STORAGE"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1610 | 入库-单品指定位置开箱拍照 | 指定异常或入库单某个商品，开箱后指定位置拍照 | 入库-单品指定位置开箱拍照 | N | 2a_named |
| OW01V1674 | 入库-异常包裹开箱拍照 | 针对入库包裹类异常，开箱后指定位置拍照 | 入库-异常包裹开箱拍照 | N | 2a_named |
| OW01V1599 | 提供海外仓监控视频-少包裹调查 | 针对上架异常商品，客户需要查询视频监控，需要海外仓提供监控视频进行佐证：<br> WINIT海外仓提供以下监控视频服务范围：<br> 1.少包裹调查：<br> 1.1整柜到仓：客户提供入库单号和POD；海外仓提供开柜到关柜期间视频，但客户无法通过视频清点具体数据<br> 1.2散货到仓：客户提供入库单号和POD；海外仓提供卸货过程/包裹分堆过程视频，但可能无法确定具体的送仓包裹数量<br> 1.3快递到仓：<br> 1.3.1当面交付的快递包裹：客户提供包裹对应的快递单号及快递供应商名称；海外仓提供当天供应商送货，卸货和扫描视频并结合扫描记录告知调查结果。可支持的供应商参考《海外仓收货面签供应商》；若供应商将快递包裹使用整柜投递drop到仓，海外仓无法提供包裹卸货视频 | 提供海外仓监控视频-少包裹调查 | N | 2a_named |
| OW01V1600 | 提供海外仓监控视频-少单品调查 | 针对上架异常商品，客户需要查询视频监控，需要海外仓提供监控视频进行佐证：<br> WINIT海外仓提供以下监控视频服务范围：<br> 少单品调查: <br>1.B/C包裹：客户提供入库单号和包裹号；海外仓提供商品预分拣视频和调查结果<br>2.上架数量与验货数量一致的A包：海外仓不提供视频服务，客户需提交库内盘点增值，增值单提交需要A包上架的商品做盘点<br>3.上架数量与验货数量不一致的A包：客户提供入库单号和包裹号；海外仓提供商品预分拣视频和调查结果" | 提供海外仓监控视频-少单品调查 | N | 2a_named |

### 其他/待确认

#### 入库增值 (VASC202410291838066)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1593 | 校验A+包商品条码与包裹条码是否一致 | 校验A+包裹的第三方包裹条码与第三方商品条码是否一致 | 校验A+包商品条码与包裹条码是否一致 | N | standard |
| OW01V1736 | 入库-覆盖包裹标签 | 入库覆盖A+/A包的包裹标签，包括但不限于DG标签、UN标签、禁止空运标签等 | 入库覆盖包裹标签 | N | standard |

#### 入库非标增值（特批） (VASC202411192246131)
- productType: nonstandard_special_approval
- pscgCode: OW01
- vascAttributeMap: `{"VASC_ALLOW_CHANGE_WHEN_AUDIT":["Y"],"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","STOP","SHD","DR","SB","EWC","RE","OD","VO","IC","SHO","TS"],"VASC_AUDIT_DEPARTMENT":["PD"],"VASC_REQUIRE_REVIEW":["Y"],"VASC_REQUIRE_CUSTOMER_CONFIRM":["Y"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["STORAGE","USE_ORIGIN_INBOUND_ORDER","DESTRUCTION","SELF_PICKUP","INBOUND_ORDER_OF_CUSTOMER"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1654 | 包裹串仓异常调拨 | 针对包裹直发串仓异常，客户要求在仓群内调拨（仅支持DE/DEBR2、USWC/USWC2） | 包裹串仓异常调拨 | N | 2a_named |
| OW01V1602 | 入库其他服务需求 | 万邑通除基本入库增值服务外，还提供特殊定制服务。客户提交需求后，我们将根据客户提供的需求内容进行定制化报价。 | 入库其他服务需求 | N | 2b_catchall |

#### 入库非标增值（免审核） (VASC202411271744362)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","STOP","SHD","SB","EWC","OD","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["STORAGE","USE_ORIGIN_INBOUND_ORDER","DESTRUCTION","SELF_PICKUP","INBOUND_ORDER_OF_CUSTOMER"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1610 | 入库-单品指定位置开箱拍照 | 指定异常或入库单某个商品，开箱后指定位置拍照 | 商品拍照辨识 | N | 2a_named |
| OW01V1674 | 入库-异常包裹开箱拍照 | 针对入库包裹类异常，开箱后指定位置拍照 | 商品拍照辨识 | N | 2a_named |
| OW01V1652 | 入库-清除商品标签 | 入库清除标签 | 标签类 | N | 2a_named |
| OW01V1622 | 入库-提供无箱单预报单上架 | 客户使用无箱单预报单入库，但是货物到仓后发现无箱单识别标识丢失，导致仓库无法正常上架，客户需提供原始无箱单信息，以便仓库能够正确处理货物并完成上架操作。 | 提供无箱单预报单上架 | N | 2a_named |
| OW01V1600 | 提供海外仓监控视频-少单品调查 | 针对上架异常商品，客户需要查询视频监控，需要海外仓提供监控视频进行佐证：<br> WINIT海外仓提供以下监控视频服务范围：<br> 少单品调查: <br>1.B/C包裹：客户提供入库单号和包裹号；海外仓提供商品预分拣视频和调查结果<br>2.上架数量与验货数量一致的A包：海外仓不提供视频服务，客户需提交库内盘点增值，增值单提交需要A包上架的商品做盘点<br>3.上架数量与验货数量不一致的A包：客户提供入库单号和包裹号；海外仓提供商品预分拣视频和调查结果" | 提供海外仓监控视频 | N | 2a_named |
| OW01V1599 | 提供海外仓监控视频-少包裹调查 | 针对上架异常商品，客户需要查询视频监控，需要海外仓提供监控视频进行佐证：<br> WINIT海外仓提供以下监控视频服务范围：<br> 1.少包裹调查：<br> 1.1整柜到仓：客户提供入库单号和POD；海外仓提供开柜到关柜期间视频，但客户无法通过视频清点具体数据<br> 1.2散货到仓：客户提供入库单号和POD；海外仓提供卸货过程/包裹分堆过程视频，但可能无法确定具体的送仓包裹数量<br> 1.3快递到仓：<br> 1.3.1当面交付的快递包裹：客户提供包裹对应的快递单号及快递供应商名称；海外仓提供当天供应商送货，卸货和扫描视频并结合扫描记录告知调查结果。可支持的供应商参考《海外仓收货面签供应商》；若供应商将快递包裹使用整柜投递drop到仓，海外仓无法提供包裹卸货视频 | 提供海外仓监控视频 | N | 2a_named |
| OW01V1604 | 上架前自提（需WINIT打托） | 此增值服务仅支持异常货物，货物到海外仓后客户要求打托后提货 | 上架前自提 | N | 2a_named |
| OW01V1594 | 上架前自提（无需WINIT打托） | 此增值服务仅支持异常货物，货物到海外仓后客户要求按照包裹提货 | 上架前自提 | N | 2a_named |

#### 入库非标增值-Anker (VASC202412181841037)
- productType: nonstandard_special_approval
- pscgCode: OW01
- vascAttributeMap: `{"VASC_ALLOW_CHANGE_WHEN_AUDIT":["Y"],"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","EWC","TS"],"VASC_AUDIT_DEPARTMENT":["PD"],"VASC_REQUIRE_REVIEW":["Y"],"VASC_REQUIRE_CUSTOMER_CONFIRM":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["INBOUND_ORDER_OF_CUSTOMER"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1653 | Anker异常包裹良品/不良品辨识 | Anker异常包裹良品/不良品辨识 | Anker异常包裹良品/不良品辨识 | N | 2a_named |

#### 入库清除标签 (VASC202504071528233)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1652 | 入库-清除商品标签 | 入库清除标签 | 入库-清除商品标签 | N | 2a_named |

#### 入库商品查验 (VASC202504152122014)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PS","PEWC","STOP","SHD","DR","SB","EWC","RE","OD","VO","IC","SHO","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["WINIT_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1494 | 入库商品查验 | 入库时需检查是否携带DG标签，有则清除 | 入库商品查验 | N | standard |

#### 采集箱内单品码 (VASC202509241832463)
- productType: standard
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["USE_ORIGIN_INBOUND_ORDER"],"VASC_PRODUCT_TYPE":["STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1745 | Capture Unit Codes Inside Carton | 在入库环节，采集箱产品外箱上的第三方单品码 | 接口无此字段 | N | standard |

#### Aiper 运输高低温检验 (VASC202510211530474)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["PEWC","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["STORAGE"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1756 | Aiper辨识包裹外部温度贴纸颜色 | 根据客户提供sop检查包裹上的温度贴纸是否变色并根据不同的检查结果操作下一步： ①有贴纸，且温度贴纸变色，需将货物暂存，等待开箱抽查 ②有贴纸，且温度贴纸未变色，需将正常上架 ③无贴纸，将货物暂存，等待抽查 | 接口无此字段 | N | 2a_named |
| OW01V1757 | Aiper开箱检查良品不良品 | 根据客户提供的原增值单信息，开箱检查良品与不良品 开箱检查要求： ①有贴纸，且温度贴纸变色，整箱所有单品开箱按照SOP检查 ②无贴纸，整箱抽查10%（四舍五入）单品开箱按照SOP检查 | 接口无此字段 | N | 2a_named |

#### 入库-指定商品质检(TOP GLORY) (VASC202510291630196)
- productType: nonstandard_no_review
- pscgCode: OW01
- vascAttributeMap: `{"VAS_ORDER_STATUS_INBOUND":["OD","TS"],"VASC_REQUIRE_REVIEW":["N"],"VASC_EXECUTOR":["WAREHOUSE"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["Y"],"VASC_LISTING":["STOCK_SHELVES"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER","CUSTOMER_SERVICE"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1760 | 入库-指定商品质检(TOP GLORY) | 入库-指定商品质检(TOP GLORY) | 接口无此字段 | N | 2a_named |

#### WINIT头程海外揽收服务 (VASC202607072041193)
- productType: nonstandard_special_approval
- pscgCode: OW01
- vascAttributeMap: `{"VASC_ALLOW_CHANGE_WHEN_AUDIT":["Y"],"VAS_ORDER_STATUS_INBOUND":["OD","IC","TS"],"VASC_AUDIT_DEPARTMENT":["FIRST_LEG_QUOTATION_MANAGER"],"VASC_REQUIRE_REVIEW":["Y"],"VASC_REQUIRE_CUSTOMER_CONFIRM":["Y"],"VASC_EXECUTOR":["FIRST_LEG_QUOTATION_MANAGER"],"VASC_SUPPORT_WITHOUT_BUSINESS_DOCUMENTS":["N"],"VASC_LISTING":["NO_WAREHOUSE_PROCESSING"],"VASC_PRODUCT_TYPE":["NON_STANDARD_VASC"],"VASC_ISSUANCE_TYPE":["CUSTOMER_INITIATE"],"VASC_SUBMITTER":["CUSTOMER"]}`

| 原子编码 | 原子名称 | 描述 | 互斥组 | 必选 | 分支归属 |
|---|---|---|---|---|---|
| OW01V1836 | WINIT头程海外揽收服务 | 针对大批量货物需要使用托盘、卡车派送的订单，WINIT暂无标准服务支持，需要提供线下询价并安排出库服务 | 接口无此字段 | N | 2a_named |

## 汇总一：按分支归属

| 分支归属 | 原子数 |
|---|---:|
| 2a_named | 23 |
| 2b_catchall | 1 |
| standard | 29 |
| ❓待确认 | 0 |

## 汇总二：按产品类型

| 产品类型 | 产品数 |
|---|---:|
| standard | 11 |
| nonstandard_no_review | 10 |
| nonstandard_special_approval | 3 |
| ❓待确认 | 0 |
