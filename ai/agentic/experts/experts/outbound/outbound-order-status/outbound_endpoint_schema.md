# ============================================================
# queryOutboundOrder 出库单查询接口输出 Schema
# 用途：供 LLM 理解出库单数据结构及业务语义
# 数据源：OutboundOrderVo (spi-oms) + OutboundOrderBuilder (openapi)
# ============================================================

# ┌─────────────────────────────────────────────────────────┐
# │  重要业务规则（必须优先理解）                              │
# └─────────────────────────────────────────────────────────┘
#
# 【规则1: 承运商变更判断】
#   carrierHasChange 是一个标记字段，表示下单时选择的承运商与实际发货承运商是否一致。
#   - "Y": 承运商已变更（下单PSC上SU策略的carrier ≠ 运单实际发货carrier）
#   - "N": 承运商未变更
#   - "O": 组合服务（PSC上有多个SU策略对应不同carrier），不判断是否变更
#   - "":  数据不足，无法判断（如无运单信息）
#   注意：该字段仅做标记，不会修改订单上的 carrier/deliverywayName 等字段值。
#
# 【规则2: carrier 字段的含义】
#   顶层 carrier 字段的值来源有优先级：
#   1. 如果有包裹(shipping)数据 → 取包裹上确认的派送商名称(shippingVo.dispatchName)，即实际发货后的carrier
#   2. 如果无包裹数据 → 取订单主表上的 carrierName/carrierCode，即下单时的carrier
#   因此当 carrierHasChange="Y" 时，顶层 carrier 通常是【更换后】的派送商。
#
# 【规则3: deliverywayName vs carrier】
#   - deliverywayName = 下单时选择的万邑通产品名称(orderWinitProductName)，始终不变
#   - carrier = 实际派送商名称，可能因履约过程中承运商变更而与下单时不同
#   两者不是同一维度：deliverywayName 是产品维度，carrier 是供应商维度。
#
# 【规则4: serviceList 中的干线 vs 末端派送】
#   serviceList 包含订单履约链路上的所有服务实例，通过 serviceCategory 区分：
#   - B开头: 仓库操作服务（拣选/打包/发货等），无 vendor 信息
#   - C0501: 干线/中转服务（如 FedEx 干线运输），有 vendorCode/vendorName，但通常无 carrierCode/dispatchName
#   - C0601: 末端派送服务（如 SpeedX 最后一公里），有完整的 carrierCode/dispatchName/endDistCode
#   
#   ⚠️ 关键：提取"派送商"信息时，必须过滤 serviceCategory="C0601"，
#   忽略 C0501（干线转运方），否则会将干线承运商误认为派送商。
#
# 【规则5: endDistCode 的含义】
#   endDistCode 仅出现在 C0601（末端派送）服务上，表示"最后一公里派送费目的分区"。
#   它是派送费计价时使用的分区（如 ZONE1~ZONE5），描述的是：
#   从末端派送商的服务起点（如转运仓 LAX）到买家收货地址的距离分区。
#   不是订单级别的笼统分区，也不是干线段的分区。
#   数据来源：PMS计费引擎中派送费(chargeId=1000010)的 endDistName。
#
# 【规则6: 区域供应商产品的服务链路】
#   使用区域供应商产品（如 Winit Fulfillment 5/7 days）时，典型链路为：
#   仓库操作(B0501→B0609→B0703) → 干线转运(C0501) → 末端派送(C0601)
#   例如：KY3仓 → FedEx干线到LAX(C0501) → SpeedX末端派送到买家(C0601)
#   serviceList 会同时包含干线和末端两条 C 类服务记录。

# ┌─────────────────────────────────────────────────────────┐
# │  顶层字段                                                │
# └─────────────────────────────────────────────────────────┘

orderNo:
  type: string
  description: 出库单号，格式 "WO" + 数字，如 "WO10723014845"

status:
  type: string
  description: |
    订单状态编码。常见值：
    - "N": 新建
    - "P": 处理中
    - "W": 待出库
    - "S": 已出库
    - "F": 已完成
    - "C": 已取消
    - "V": 已作废    

sellerOrderNo:
  type: string
  description: 卖家自定义订单号

orderSource:
  type: string
  description: 订单来源（如 API、seller 前端等）

# --- 时间字段 ---
orderTime:
  type: datetime
  description: 下单时间
created:
  type: datetime
  description: 订单创建时间
outWhTime:
  type: datetime
  description: 出库时间（UTC）
outWhTimeLocal:
  type: datetime
  description: 出库时间（仓库当地时区）
finishedTime:
  type: datetime
  description: 订单完成时间
estimateCompleteDate:
  type: datetime
  description: 预计送达时间

# --- 产品信息（下单时选择的万邑通产品）---
orderWinitProductCode:
  type: string
  description: 下单时的万邑通产品编码（如 "OSF811008761"），订单级别，不随履约变更
orderWinitProductName:
  type: string
  description: 下单时的万邑通产品名称（如 "Winit Fulfillment 5 days"），即 deliverywayName 的来源
winitProductCode:
  type: string
  description: 当前产品编码（可能因拆包/换产品与 orderWinitProductCode 不同）
winitProductName:
  type: string
  description: 当前产品名称

# --- 承运商信息（顶层，见规则2/3）---
carrier:
  type: string
  description: |
    承运商编码或名称。
    ⚠️ 不同 API 版本含义不同：
    - seller前端(OutboundOrderBuilder): 取 vo.getCarrierCode()，是承运人编码
    - adapte接口(OrderAdapteBuilder): 取 shippingVo.getDispatchName()，是派送商名称
    当有包裹数据时，通常是实际发货后的派送商（可能已变更）。    
carrierHasChange:
  type: string
  enum: ["Y", "N", "O", ""]
  description: |
    派送商是否变更标记（见规则1）。
    "Y"=已变更, "N"=未变更, "O"=组合服务不判断, ""=数据不足    

# --- 时效信息 ---
ontimeTrack:
  type: string
  enum: ["PT", "BL", "IP"]
  description: 准时派送状态。PT=准时, BL=迟到, IP=进行中
serviceNormDay:
  type: integer
  description: 服务标准天数
serviceCompletionDay:
  type: integer
  description: 服务实际完成天数

# --- 重量体积 ---
weight:
  type: decimal
  description: 预估重量(kg)
volume:
  type: decimal
  description: 预估体积(cm³)
autalWeight:
  type: decimal
  description: 实际重量(kg)（注意字段名拼写是 autal 不是 actual）
autalVolume:
  type: decimal
  description: 实际体积(cm³)

# --- 跟踪号 ---
winitTrackingNo:
  type: string
  description: 万邑通跟踪号
vendorTrackingNos:
  type: array
  description: 供应商跟踪号列表
  items:
    vendorTrackingNo:
      type: string

# --- 仓库信息 ---
warehouseCode:
  type: string
  description: 发货仓库编码
warehouseName:
  type: string
  description: 发货仓库名称
countryCode:
  type: string
  description: 仓库所在国家编码
countryName:
  type: string
  description: 仓库所在国家名称
orderWarehouseCode:
  type: string
  description: 下单仓库编码（可能与实际发货仓不同）
orderWarehouseName:
  type: string
  description: 下单仓库名称

# --- 平台信息 ---
storeType:
  type: string
  description: 平台类型（如 EBAY, AMAZON, SHOPIFY 等）
platformOrderId:
  type: string
  description: 平台订单ID
platformAccount:
  type: string
  description: 平台店铺名称
platformBuyerId:
  type: string
  description: 平台买家ID
iossNo:
  type: string
  description: IOSS编号（欧盟增值税）

# --- 收货人信息（原始）---
buyerName:
  type: string
  description: 收货人姓名（敏感信息，可能被屏蔽为"-"）
buyerPhone:
  type: string
  description: 收货人电话（敏感信息）
buyerEmail:
  type: string
  description: 收货人邮箱（敏感信息）
buyerAddress1:
  type: string
  description: 收货地址行1（敏感信息）
buyerAddress2:
  type: string
  description: 收货地址行2（敏感信息）
buyerHouseNo:
  type: string
  description: 门牌号
buyerCountry:
  type: string
  description: 收货国家
buyerState:
  type: string
  description: 收货州/省
buyerCity:
  type: string
  description: 收货城市
buyerPostcode:
  type: string
  description: 收货邮编
buyerCompany:
  type: string
  description: 收货公司名

# --- 修正后收货人信息（地址校验后）---
# 字段名以 correction 前缀，结构同上，如：
# correctionBuyerName, correctionBuyerAddress1, correctionBuyerCity 等
# 当系统对地址做过校验修正时，此处为修正后的地址

# --- 地址校验结果 ---
addressCheckStatus:
  type: string
  description: 地址校验状态
addressCheckResult:
  type: string
  description: 地址校验结果
result:
  type: string
  description: 地址校验结果码
resultMessage:
  type: string
  description: 地址校验结果描述

# --- 费用信息 ---
estimateFeeList:
  type: array
  description: 预估费用列表（冻结费用）
  items:
    itemName:
      type: string
      description: 费用项名称
    currency:
      type: string
      description: 币种
    productServiceOrVas:
      type: string
      description: 所属产品服务或增值服务名称
    originPrice:
      type: decimal
      description: 原价
    discountPrice:
      type: decimal
      description: 折扣金额
    rebatePrice:
      type: decimal
      description: 返利金额
    resultPrice:
      type: decimal
      description: 最终金额 = originPrice + discountPrice + rebatePrice

actualFeeList:
  type: array
  description: 实际费用列表（已结算），结构同 estimateFeeList

# --- 商品信息 ---
merList:
  type: array
  description: 商品列表
  items:
    merchandiseCode:
      type: string
      description: SKU编码
    specification:
      type: string
      description: 商品规格
    skuType:
      type: string
      description: SKU类型
    skuStandardQuantity:
      type: integer
      description: SKU标准数量
    estimateDispatchQty:
      type: integer
      description: 预估发货数量
    isDangerMer:
      type: string
      description: 是否危险品
    isBattery:
      type: string
      enum: ["Y", "N"]
      description: 是否含电池

# ┌─────────────────────────────────────────────────────────┐
# │  serviceList - 服务实例列表（⚠️ 核心，见规则4/5/6）       │
# └─────────────────────────────────────────────────────────┘
#
# 来源：OutboundOrderVo.serviceList → List<OutboundOrderWinitServiceVo>
# 包含订单履约链路上的所有服务实例（仓库操作 + 干线 + 末端派送）
# 每个包裹(shippingNo)下都有独立的一组服务实例

serviceList:
  type: array
  description: |
    订单的服务实例列表，包含从仓库操作到末端派送的完整履约链路。
    ⚠️ 同一个订单可能包含多种类型的服务，必须通过 serviceCategory 区分用途。    
  items:
    id:
      type: long
      description: 服务实例主键ID

    orderNo:
      type: string
      description: 所属出库单号

    shippingNo:
      type: string
      description: |
        所属包裹号（如 "WO10723014845A"）。
        一个订单可能拆成多个包裹，每个包裹有独立的服务链路。
        过滤时应按 shippingNo + serviceCategory 组合。        

    winitProductCode:
      type: string
      description: 万邑通产品编码

    serviceCode:
      type: string
      description: |
        服务编码。
        B类服务：固定编码如 "B05010002"（拣选）、"B06090001"（打包）、"B07030003"（发货）
        C类服务：动态编码如 "C0501008467"（干线）、"C0601008399"（派送）        

    serviceName:
      type: string
      description: |
        服务名称。
        B类：如"订单拣选"、"商品打包"、"商品发货"
        C0501干线：如"KY3-LAX_FEDEX 1DAY"（含转运路线和干线承运商信息）
        C0601派送：如"US SPEEDX_DGD_LAX_KY3"（含派送商和服务起点信息）        

    serviceCategory:
      type: string
      description: |
        ⭐ 服务分类编码，是区分服务类型的关键字段。
        第一位字母表示大类：B=仓库, C=运输, D=关贸, Z=其他
        
        常见值：
        ── 仓库操作类（无 vendor/carrier 信息）──
        B0501: 订单拣选
        B0609: 商品打包
        B0703: 商品发货/SG服务
        
        ── 运输类（有 vendor 信息）──
        C0501: 干线/中转服务 ⚠️ 这是干线转运方，不是末端派送商！
        C0601: 末端派送服务 ✅ 这才是真正的派送商(carrier)
        
        其他运输类：
        C0101: 包裹揽收
        C0201: 送港
        C0301: 空运
        C0302: 海运
        C0401: 送仓
        C0701: 国内中转        

    # --- 以下字段仅在 C 类服务（运输类）中有值 ---

    vendorCode:
      type: string
      description: |
        供应商编码。
        C0501干线：干线转运方的供应商编码（如 "3300001164" = US FedEx Express）
        C0601派送：末端派送商的供应商编码（如 "3300001244" = Speed Xpress, Inc.）        

    vendorName:
      type: string
      description: |
        供应商名称。
        ⚠️ C0501 和 C0601 的 vendorName 是不同的供应商！
        C0501: 干线转运方名称（如 "US FedEx Express"）
        C0601: 末端派送商名称（如 "Speed Xpress, Inc."）        

    vendorServiceCode:
      type: string
      description: 供应商服务编码（如 "3300001244_00007"）

    vendorServiceName:
      type: string
      description: 供应商服务名称（如 "US SPEEDX_DGD_LAX"）

    # --- 以下字段通常仅在 C0601（末端派送）中有值 ---

    carrierCode:
      type: string
      description: |
        承运人编码（如 "CR52916980"）。
        ⚠️ 通常只有 C0601（末端派送）才有此字段。
        C0501（干线）一般没有 carrierCode。        

    dispatchName:
      type: string
      description: |
        派送商名称（如 "SpeedX"）。
        ⚠️ 通常只有 C0601（末端派送）才有此字段。
        这是面向客户展示的派送商简称。        

    endDistCode:
      type: string
      description: |
        最后一公里派送费目的分区（如 "ZONE4"）。
        ⚠️ 仅出现在 C0601（末端派送）服务上。
        含义：末端派送商从其服务起点到买家收货地址的距离分区。
        用于派送费计价，数据来源是 PMS 计费引擎中派送费(chargeId=1000010)的 endDistName。
        不是订单级别的分区，不是干线段的分区。
        常见值：ZONE1, ZONE2, ZONE3, ZONE4, ZONE5 等。        

    # --- 服务能力标记（通常仅 C0601 有值）---

    isTrackedService:
      type: string
      enum: ["Y", "N"]
      description: 是否跟踪服务（可追踪物流轨迹）

    isSupportClaim:
      type: string
      enum: ["Y", "N"]
      description: 是否支持索赔

    isGenerateWinitTracknum:
      type: string
      enum: ["Y", "N"]
      description: 是否生成万邑通跟踪号

    # --- 服务链路编排 ---

    sendNode:
      type: string
      description: |
        下发节点，表示该服务在什么时机触发。
        "orderStatus": 订单状态变更时触发（通常是链路起点或独立触发的服务）
        "B05010002": 在拣选完成后触发（如打包服务）
        "B06090001": 在打包完成后触发（如发货服务）
        B类服务通常形成链式依赖：拣选→打包→发货
        C类服务通常由 orderStatus 直接触发（与仓库操作并行）        

    # --- 路由信息 ---

    suRouteId:
      type: string
      description: SU路由ID
    suRouteName:
      type: string
      description: SU路由名称
    suRouteVersionNo:
      type: string
      description: SU路由版本号

    # --- 通用字段 ---
    created:
      type: datetime
    updated:
      type: datetime
    isActive:
      type: string
      enum: ["Y", "N"]
    isDelete:
      type: string
      enum: ["Y", "N"]
    status:
      type: string
      description: 服务状态

# ┌─────────────────────────────────────────────────────────┐
# │  slaList / serviceList(SLA版) - 服务时效列表              │
# └─────────────────────────────────────────────────────────┘
#
# ⚠️ 注意：seller前端 /wh/outbound/queryOrderByOrderNo 接口中，
# "serviceList" 字段实际构建自 OutboundOrderSlaVo（SLA时效数据），
# 与上面的 OutboundOrderWinitServiceVo 是完全不同的数据结构！
# 两者字段名都叫 serviceList，但内容完全不同。

slaBasedServiceList:
  _note: 此结构仅出现在 seller前端 /wh/outbound/queryOrderByOrderNo 的响应中
  type: array
  description: 服务时效列表（SLA），seller前端接口中的 serviceList 实际是这个结构
  items:
    serviceStatus:
      type: string
      enum: ["PT", "BL", "IP"]
      description: 服务时效状态。PT=准时, BL=迟到, IP=进行中
    serviceName:
      type: string
      description: SLA名称
    standardTime:
      type: integer
      description: 标准完成天数
    completeTime:
      type: integer
      description: 实际完成天数

# ┌─────────────────────────────────────────────────────────┐
# │  使用指南：如何正确提取派送商信息                          │
# └─────────────────────────────────────────────────────────┘
#
# 场景1: 获取末端派送商
#   filter: serviceList WHERE serviceCategory = "C0601"
#   取值: dispatchName（派送商简称）, vendorName（供应商全称）, carrierCode（承运人编码）
#
# 场景2: 末端派送商的派送分区（干扰项，这里并不是订单的派送分区）
#   filter: serviceList WHERE serviceCategory = "C0601"
#   取值: endDistCode（如 ZONE4）, 这个字段是末端派送商的派送分区，但是它不代表订单的派送分区，而是最终派送商使用的分区
#
# 场景3: 获取干线转运方（如需要）
#   filter: serviceList WHERE serviceCategory = "C0501"
#   取值: vendorName（转运方名称）, serviceName（含路线信息）
#
# 场景4: 判断承运商是否变更
#   取值: 顶层 carrierHasChange 字段
#   如果 = "Y"，说明实际派送商与下单时不同
#   此时顶层 carrier 是变更后的值，orderWinitProductName 仍是下单时的产品
#
# 场景5: 多包裹订单
#   同一订单可能有多个 shippingNo，每个包裹可能有不同的：
#   - 派送商(C0601)
#   - 干线(C0501)
#   - 分区(endDistCode)
#   必须按 shippingNo 分组后再提取

# 注意事项
# 1. 区分干线和派送的唯一可靠依据是 serviceCategory：C0501 = 干线，C0601 = 末端派送。不要用 vendorName 或 serviceName 做判断，因为命名规则不固定。
# 2. endDistCode 的 ZONE 值是 PMS 计费引擎根据派送费规则计算出来的，绑定在 C0601 服务上，描述的是末端派送段的距离分区。
