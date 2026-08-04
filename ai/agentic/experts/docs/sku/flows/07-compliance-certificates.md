---
title: 合规证书与电清关
type: flow
tags: [sku, compliance, weee, gpsr, msds, ecommerce]
expert: [sku/compliance-check, sku/registration-guide]
updated: 2026-07-10
---

# 07 — 合规证书、WEEE、GPSR、电清关

> 场景：证书是否齐备、WEEE 类别、海关建议申报价、电池资料导致无法下承运单等。

---

## 证书上传路径 `[KB]`

万邑联 → 商品管理 → 商品信息 → 点击 SKU → 商品详情 → 下拉 **资料证书** → 国家选 **ALL** → 选择证书类型（MSDS / UN38.3 等）→ 提交

**资料预审**：客户发 SDS 问「能不能用」→ 引导先注册 SKU 并在资料证书栏上传后提交审核，避免口头预审重复劳动。

---

## 电池资料无法下承运单 `[KB]`

头程供应商要求：含电池商品须 **当年有效期内** 的 **MSDS + UN38.3**，且与商品匹配。

| 情况 | 动作 |
|------|------|
| 过期/缺失/不一致 | 按上路径上传有效文件 |
| 确认已上传仍报错 | 转人工排查 |

---

## GPSR 与禁售 `[KB]`

未关联 GPSR → 库存 **不合规禁售**，解除方式：在系统完成 GPSR 信息关联。详见 [05-prohibit-inbound-sale](05-prohibit-inbound-sale.md)。

---

## 德国 WEEE `[KB]`

### 查询

商品编辑 → 进口国 **德国** → 字段 **WEEE 类别**（及需 WEEE 注册号、需 GPSR、德语说明书要求等勾选）

### 对客话术结构

1. 引用系统显示的 WEEE 类别（如「5. 外部尺寸不超过 50 厘米的设备（小型设备）」）  
2. 附六类定义摘要 → [appendix/weee-categories-de.md](../appendix/weee-categories-de.md)  
3. 有异议 → 请客户提供认为正确的类别及依据，提交复核

### 截图示例（CEILING LIGHT）

- HS：`9405114090`
- WEEE 类别：第 5 类小型设备
- 勾选：需 WEEE 注册号、需 GPSR、需说明书链接

---

## 电商清关 — 海关建议申报价 `[KB]`

### 场景

SKU 未获取海关建议申报价；客户问链接是否合规。

### 要点

- 欧盟海关依据**符合要求的销售链接**审核，通过后回传建议申报价  
- 审核周期通常 **1–3 个工作日**（时差）  
- 完整 15 条链接规则 → [appendix/ecommerce-clearance-link-rules.md](../appendix/ecommerce-clearance-link-rules.md)

---

## 品牌备案查询 `[KB]`

引导客户自行在目的国商标官网检索；若已备案须提供**品牌授权文件**。

| 国家 | 查询入口 |
|------|----------|
| 中国 | http://202.127.48.145:8888/zscq/search/jsp/vBrandSearchIndex.jsp |
| 美国 | https://iprs.cbp.gov/s/#/ |
| 英国 | https://iprs.cbp.gov/s/#/ |
| 德国 | https://register.dpma.de/DPMAregister/marke/einsteiger |
| 澳大利亚 | https://search.ipaustralia.gov.au/trademarks/search/quick |
| 加拿大 | https://ised-isde.canada.ca/cipo/trademark-search/srch |

---

## 熏蒸（澳大利亚）`[KB]`

发往澳大利亚的**非密度板**木质产品需熏蒸；**密度板(MDF)** 无需熏蒸。

---

## 专家分工

| 类型 | Expert |
|------|--------|
| 操作上传路径、等待审核 | `sku/registration-guide` |
| 能否承运、缺什么证、链接合规判定 | P2 `sku/compliance-check` |

---

## 原始配图

`raw/consultation-taxonomy-analysis/WDntblvOvoJvkPxDGvsc8YppnMb.png`（德国 WEEE/GPSR 区）
