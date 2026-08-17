## 示例 1：大件家具发美国

**用户问**：大件家具发美国，30kg，60x40x40cm

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "US",
      "recommendedProducts": [
        {
          "name": "FedEx Ground / UPS Ground / OnTrac Ground",
          "tier": "标准5日达",
          "reason": "30kg大件，FedEx Ground/UPS Ground是标准首选，OnTrac Ground为多仓优选",
          "sellingPoints": [
            "10-200磅/件 US本土可派",
            "单仓3日达95%，多仓2日达95%"
          ]
        },
        {
          "name": "USPS Priority Mail / UPS 3 Day Select",
          "tier": "快捷3日达",
          "reason": "需要更快时效时选择",
          "sellingPoints": [
            "3日达"
          ]
        },
        {
          "name": "FedEx 2 Day",
          "tier": "快捷隔日达",
          "reason": "急件隔日达",
          "sellingPoints": [
            "隔日达"
          ]
        }
      ],
      "missingInfo": [],
      "confidence": "high"
    },
    "analysis": "根据30kg大件家具（60×40×40cm）发美国的需求：\n\n**件型判定**：30kg≤31.5kg，60×40×40≤120×100×80 → 大件。\n\n**推荐方案**：\n1. **标准5日达**：FedEx Ground / UPS Ground（首选），OnTrac Ground（多仓场景更优）\n2. **快捷3日达**：USPS Priority Mail / UPS 3 Day Select\n3. **快捷隔日达**：FedEx 2 Day\n4. **快捷次日达**：FedEx Standard Overnight / UPS Next Day Air Saver\n\n如需托盘运输，可选 FedEx Freight Economy（单托/木箱）。具体价格以合同价卡为准。"
  }
}
```

## 示例 2：中件商品发德国

**用户问**：10kg商品发德国，尺寸大概50x30x20cm

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "DE",
      "recommendedProducts": [
        {
          "name": "DE UPS Domestic Standard / DE DPD Domestic Parcels",
          "tier": "标准5日达",
          "reason": "10kg中件，UPS和DPD均可覆盖标准时效",
          "sellingPoints": [
            "德国本土标准配送"
          ]
        },
        {
          "name": "DE DHL Domestic Paket",
          "tier": "快捷3日达",
          "reason": "DHL快捷配送首选",
          "sellingPoints": [
            "DHL标准快捷配送，覆盖德国全境"
          ]
        },
        {
          "name": "DHL Express Domestic",
          "tier": "快捷次日达",
          "reason": "需要次日达时选择",
          "sellingPoints": [
            "DHL Express德国全境次日达"
          ]
        }
      ],
      "missingInfo": [],
      "confidence": "high"
    },
    "analysis": "根据10kg商品（50×30×20cm）发德国的需求：\n\n**件型判定**：10kg≤10kg，50×30×20≤70×40×25 → 中件。\n\n**推荐方案**：\n1. **标准5日达**：DE UPS Domestic Standard / DE DPD Domestic Parcels\n2. **快捷3日达**：DE DHL Domestic Paket\n3. **快捷次日达**：DHL Express Domestic\n\n具体价格以合同价卡为准。如需了解产品详情，可咨询产品信息专家(product-info)。"
  }
}
```

## 示例 3：信息不足，引导补充

**用户问**：发英国用什么产品好

**输出**：
```json
{
  "analysisResult": {
    "structured": {
      "countryResolved": "UK",
      "recommendedProducts": [],
      "missingInfo": [
        "商品重量",
        "商品尺寸"
      ],
      "confidence": "low"
    },
    "analysis": "您要发英国，我可以帮您推荐最合适的尾程产品。为了给出精准推荐，请补充以下信息：\n\n1. **商品重量**（如 5kg、30kg）\n2. **商品尺寸**（如 60×40×40cm）\n\n英国支持的尾程渠道包括：XDP、DHL、FedEx、DPD、EVRi、Royal Mail 等，不同件型和时效需求对应不同推荐。"
  }
}
```
