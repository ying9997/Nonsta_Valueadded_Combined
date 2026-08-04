## 示例 1：精确产品名匹配（托盘产品）

**用户问**：FedEx Freight Economy-US 可以发带电商品吗

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "US",
      "productLine": "pallet",
      "matchedProducts": [
        {
          "name": "FedEx Freight Economy",
          "category": "pallet",
          "weightLimit": "按订单实际重量计费，不足0.5KG按0.5KG",
          "dimensionLimit": "托盘长×宽=1.2m×0.8m（标准欧托）",
          "deliveryTime": "3-7个工作日妥投"
        }
      ],
      "confidence": "high"
    },
    "analysis": "FedEx Freight Economy 是万邑通美国托盘尾程派送产品，由 FedEx 承运：\n\n**带电政策：**\n- 支持功率≤100wh 内置/外置电池\n- 不支持纯电产品\n- 不支持危险品\n\n**其他基本信息：**\n- 支持发货仓：USKY3/USKY5/USWC/USWC2/USWC5/USTX/USNJ2/USGA\n- 配送范围：美国本土48州（商业地址、住宅地址）\n- 支持包裹追踪：√\n\n**不支持地址：** FBA地址、离岸地址（PR/AK/HI/GU）、军事地址（APO/FPO/DPO）、码头/海湾地址等。\n\n**主要附加费：** 住宅地址派送费 243 USD、偏远地区附加费（按区域32-318 USD）、超长附加费（按长度分级）、燃油附加费等。\n\n具体价格请参考合同价卡。"
  }
}
```

## 示例 2：国家+产品线（WF 美国）

**用户问**：请问 Winit Fulfillment 七日达是什么服务，可以发什么

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "US",
      "productLine": "wf",
      "matchedProducts": [
        {
          "name": "Winit Fulfillment-7日达",
          "category": "wf",
          "weightLimit": "计费重≤30 lb",
          "dimensionLimit": "长≤243.8cm，宽≤76.2cm，长+2×(宽+高)≤266cm",
          "deliveryTime": "7工作日送达率≥95%（偏远地区除外）"
        }
      ],
      "confidence": "high"
    },
    "analysis": "Winit Fulfillment 七日达是万邑通尾程履约服务的组合渠道产品之一，主要面向美国市场：\n\n**基本信息：**\n- 支持发货仓：USKY3/USKY5/USWC/USWC2/USWC5/USTX\n- 截单时间：当地14点\n- 配送范围：美国本土\n- 计费重限制：≤30 lb\n\n**带电政策：**\n- 不接受纯电\n- 可接受功率≤100wh或锂含量≤2g的配套/内置锂电池\n- 限制同一个订单的电池商品数量不得超过2个\n\n**增值服务：**\n- 支持仓储增值、尾程保险【追踪守护】【时效保】\n- 赔付：支持超时无上网、未妥投丢失（支持代客索赔）\n- 不支持破损赔付、妥投未收到赔付\n\n**不支持：** 军事地址、POBox、亚马逊地址、尾程改址/拦截/签名服务\n\n具体价格请参考合同价卡。"
  }
}
```

## 示例 3：仅国家（德国全部产品线）

**用户问**：德国有什么尾程产品

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "DE",
      "productLine": "",
      "matchedProducts": [
        {
          "name": "DE Post Untracked Letter",
          "category": "psc",
          "weightLimit": "≤0.5 kg",
          "dimensionLimit": "35.3×25×2 cm",
          "deliveryTime": "1-2工作日"
        },
        {
          "name": "DHL Kleinpaket",
          "category": "psc",
          "weightLimit": "≤1 kg",
          "dimensionLimit": "≤35.3×25×8 cm",
          "deliveryTime": "2-4工作日"
        },
        {
          "name": "DHL Domestic Paket",
          "category": "psc",
          "weightLimit": "≤31.5 kg",
          "dimensionLimit": "L≤200cm, L+2×(W+H)≤360cm",
          "deliveryTime": "1-3工作日"
        },
        {
          "name": "Winit Fulfillment-Economy",
          "category": "wf",
          "weightLimit": "计费重≤1kg",
          "dimensionLimit": "15-35.3×10-25×≤8cm",
          "deliveryTime": "详见合同价卡"
        },
        {
          "name": "Winit Fulfillment-Standard",
          "category": "wf",
          "weightLimit": "计费重≤31.5kg",
          "dimensionLimit": "L≤175cm, L+2×(W+H)≤300cm",
          "deliveryTime": "详见合同价卡"
        },
        {
          "name": "DB SCHENKER Standard Delivery",
          "category": "pallet",
          "weightLimit": "无限制",
          "dimensionLimit": "标准欧托 1.2m×0.8m",
          "deliveryTime": "德国2工作日；德国除外2-5工作日"
        }
      ],
      "confidence": "high"
    },
    "analysis": "德国尾程产品覆盖三大产品线：\n\n**PSC 标准尾程：**\n- 轻小件（≤1kg）：DE Post Untracked Letter（平邮）、DHL Kleinpaket（挂号）\n- 标准件（≤31.5kg）：DHL Domestic Paket、DPD Domestic、UPS Standard\n- 国际派送：Winit Parcel-EU、DHL/DPD International\n\n**WF Winit Fulfillment：**\n- Economy：≤1kg，欧盟内派送\n- Standard：≤31.5kg，分区计费\n- 指定渠道：DHL Express-Worldwide、DHL Paket\n- 退货：DHL Paket Return\n\n**Pallet 托盘：**\n- DB SCHENKER Standard Delivery：欧盟内+欧盟外部分国家\n\n各产品具体附加费和限制请参考对应知识库或咨询客服。"
  }
}
```

## 示例 4：无参数（仅索引）

**用户问**：你们有什么尾程服务

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "",
      "productLine": "",
      "matchedProducts": [],
      "confidence": "medium"
    },
    "analysis": "万邑通提供三大尾程产品线：\n\n**1. PSC 标准尾程派送**\n覆盖国家：美国、英国、德国、澳洲、加拿大\n- 各国本地正向/逆向派送产品\n- 部分国家支持国际派送\n- 产品包括 USPS、Royal Mail、DHL、UPS、FedEx 等主流承运商\n\n**2. WF Winit Fulfillment 履约服务**\n覆盖国家：美国、英国、德国、澳洲\n- 组合渠道（如7日达/5日达/3日达/2日达）\n- 指定渠道（如 USPS Ground Advantage、DHL Next Day）\n- 逆向退货服务\n- 增值保险：追踪守护、时效保（仅美国）\n\n**3. Pallet 托盘派送**\n覆盖国家：美国（FedEx Freight Economy）、德国（DB SCHENKER Standard Delivery）\n\n请告诉我您想了解哪个**国家**或哪个**产品线**的详细信息，我可以提供完整的产品规格、限制与费用说明。"
  }
}
```
