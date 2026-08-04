# 海外仓仓库基础资料知识库

> 来源摘要：
> - `_kb/service-team/inbound-services-doc/海外仓的头程直发收货地址.md`（地址、面单、直发 FAQ）
> - `_kb/product-team/winit/in-warehouse/storage-product-details.md`（仓型定位、可接商品类型、存放分区）

---

## 仓库编码索引

| 仓库编码 | 国家 | 仓库定位 | 作业模式 | 可接商品摘要 | 备注 |
|----------|------|----------|----------|--------------|------|
| AU / AUSY | AU | 综合仓 | AUTO | 纯电、DG、普通化工、食品 | AUSY 为系统编码，AU 为直发地址常用简称；快递收件人须客户简称+编码 |
| AUME | AU | 综合仓 | MANUAL | 仅普货 | 不支持纯电/DG/化工/食品 |
| CATO | CA | 综合仓 | MANUAL | 纯电 | 2023.8.14 搬仓至 Brampton |
| DEBR | DE | 大件仓 | MANUAL | 纯电、DG、普通化工 | 直发地址以运营通知为准；与 DE/DEBR2 同属德仓群 |
| DEBR2 | DE | 综合仓 | AUTO | 普通化工 | 不支持纯电/DG/特殊化工/食品 |
| DE | DE | 海外仓 | — | — | 老德国仓；Straße 可写 strasse |
| UK | UK | 海外仓 | — | — | 建议面单备注 NOT FOR AMAZON |
| UKGF | UK | 大件仓 | MANUAL | 纯电、DG、普通化工 | — |
| UKTW | UK | 中小件仓 | AUTO | 普通化工 | DHL 搜不到 Tamworth 可选 Freasley |
| USKY3 | US | 小件仓 | AUTO | 纯电、DG、普通化工、特殊化工、食品 | 全美可接类型最全的小件仓之一 |
| USKY5 | US | 中小件仓 | AUTO | 纯电、普通化工 | 不支持 DG/特殊化工/食品 |
| USWC | US | 综合仓 | AUTO | 纯电、DG、普通化工、特殊化工 | 2024.4.15 搬仓；不支持食品 |
| USWC2 | US | 中小件仓 | AUTO | 普通化工、特殊化工、食品 | 不支持纯电/DG |
| USWC5 | US | 大件仓 | MANUAL | 纯电、普通化工 | 不支持 DG/特殊化工/食品 |
| USTX | US | 大件仓 | AUTO | 纯电、普通化工、特殊化工 | 2022.7.15 搬仓 Houston；小件仅 A 类包裹 |
| USGA | US | 大件仓 | MANUAL | 普通化工 | 不支持纯电/DG/特殊化工/食品；Dock 264 check-in |
| USNJ / USNJ2 | US | 大件仓 | MANUAL | USNJ2 支持纯电+普通化工 | USNJ2 含专用邮箱；小件仅 A 类包裹 |
| BE | BE | 海外仓 | — | — | — |

---

## 各仓可接商品类型矩阵

> 客户问「某仓能不能存 DG/纯电/食品/化工」时优先查本表。`YES`=支持，`NO`=不支持。

| 国家 | 仓库 | 仓库定位 | 作业模式 | 纯电 | DG | 普通化工 | 特殊化工(US) | 食品 |
|------|------|----------|----------|------|-----|----------|--------------|------|
| AU | AUSY | 综合仓 | AUTO | YES | YES | YES | NO | YES |
| AU | AUME | 综合仓 | MANUAL | NO | NO | NO | NO | NO |
| CA | CATO | 综合仓 | MANUAL | YES | NO | NO | NO | NO |
| DE | DEBR | 大件仓 | MANUAL | YES | YES | YES | NO | NO |
| DE | DEBR2 | 综合仓 | AUTO | NO | NO | YES | NO | NO |
| UK | UKGF | 大件仓 | MANUAL | YES | YES | YES | NO | NO |
| UK | UKTW | 中小件仓 | AUTO | NO | NO | YES | NO | NO |
| US | USKY3 | 小件仓 | AUTO | YES | YES | YES | YES | YES |
| US | USKY5 | 中小件仓 | AUTO | YES | NO | YES | NO | NO |
| US | USWC | 综合仓 | AUTO | YES | YES | YES | YES | NO |
| US | USWC2 | 中小件仓 | AUTO | NO | NO | YES | YES | YES |
| US | USWC5 | 大件仓 | MANUAL | YES | NO | YES | NO | NO |
| US | USTX | 大件仓 | AUTO | YES | NO | YES | YES | NO |
| US | USGA | 大件仓 | MANUAL | NO | NO | YES | NO | NO |
| US | USNJ2 | 大件仓 | MANUAL | YES | NO | YES | NO | NO |

### 库存属性与存放分区（摘要）

| 商品属性 | 存放分区 | 说明 |
|----------|----------|------|
| 普货_良品 | 普通库位 | 常规可售商品 |
| 普货_不良品 | 不良品区域 | 有瑕疵、无法直接二次销售 |
| 纯电 | 纯电区域 | 带电但非 DG；防火隔离 |
| DG | DG 区域 | 陆运/空运 DG，各国标准不同 |
| 特殊化工(US) | 化工区域 | 须满足 SDS 等条件，仅美国部分仓承接 |
| 食品 | 食品区域 | 肉、蛋、奶类制品禁止入库 |

---

## 通用送货与面单规范

- **海空运面单**：CNEE 填进口商/Buyer；须标明 IOR；地址加 C/O。
- **快递面单**：收件人 `Online Seller C/O 3rd Pty Warehouse`；澳洲填**客户简称+编码**，不可填 Online Seller。
- **C/O 不可省略**：表示 in care of（转交），标示货权非万邑通；可写 `in care of` 或 `C.O.`。
- **货代不能填 Online Seller**：可用 ①客户 ID；②店铺名称+eBay+客户 ID。
- **预约**：通过 booking.winit.com.cn 线上预约；电话非送仓必须条件。
- **地址类型**：海外仓为商业地址，不产生住宅派送费。
- **发票**：空运海运发票不能显示万邑通地址；快递可与面单一致但须标明 IOR。

---

## AU 区域仓库

### AU

- **仓库名称**：澳洲海外仓（AU / AUSY）
- **国家**：AU
- **仓库定位**：综合仓
- **作业模式**：AUTO
- **可接商品**：纯电、DG、普通化工、食品（不支持特殊化工）
- **地址**：C/O Warehouse 2, 54 Ferndell St, South Granville 2142 AU
- **地址（快递）**：C/O Warehouse 2, 54 Ferndell St, South Granville 2142 AU（收件人：客户简称+客户编码；公司：客户全称）
- **联系电话**：海空运 +02 8718 8708；快递 +0061-2-8718 8718
- **仓型**：海外仓（直发/头程收货）
- **特殊说明**
  - 快递收件人须**客户简称+编码**，不可填 Online Seller
  - 系统编码 AUSY 与直发简称 AU 指同一主仓

### AUME

- **仓库名称**：澳洲 AUME 仓
- **国家**：AU
- **仓库定位**：综合仓
- **作业模式**：MANUAL
- **可接商品**：仅普货（不支持纯电、DG、化工、食品）
- **地址**：C/O 1-5 Felstead Drive, Truganina, Victoria, 3029
- **地址（快递）**：C/O 1-5 Felstead Drive, Truganina, Victoria, 3029（收件人：客户简称+客户编码）
- **联系电话**：+0061-2-8718 8718
- **仓型**：海外仓
- **特殊说明**
  - 快递收件人规范同 AU 主仓

---

## US 区域仓库

### USWC

- **仓库名称**：美西海外仓（USWC）
- **国家**：US
- **仓库定位**：综合仓
- **作业模式**：AUTO
- **可接商品**：纯电、DG、普通化工、特殊化工（不支持食品）
- **地址**：C/O 131 Marcellin Dr, City of Industry, CA 91789
- **地址（快递）**：131 Marcellin Dr, City of Industry, CA 91789（收件人 Online Seller C/O 3rd Pty Warehouse）
- **联系电话**：+001-626-606-0308
- **仓型**：海外仓（直发/头程收货）
- **特殊说明**
  - 2024.4.15 搬仓，须使用新地址
  - 货代导航报空地时建议用 Google Map（Apple Map 可能不准）
  - 与 USWC2/USWC5 多仓互转需关注运营公告

### USWC2

- **仓库名称**：美西 2 仓（USWC2）
- **国家**：US
- **仓库定位**：中小件仓
- **作业模式**：AUTO
- **可接商品**：普通化工、特殊化工、食品（不支持纯电、DG）
- **地址**：C/O 381 S Brea Canyon Road, Walnut, CA 91789
- **地址（快递）**：381 S Brea Canyon Road, Walnut, CA 91789
- **联系电话**：+001-6266060308-5704
- **仓型**：海外仓
- **特殊说明**
  - 与 USWC 同属美西仓群，串仓场景见 arrival SOP

### USWC5

- **仓库名称**：美西 5 仓（USWC5）
- **国家**：US
- **仓库定位**：大件仓
- **作业模式**：MANUAL
- **可接商品**：纯电、普通化工（不支持 DG、特殊化工、食品）
- **地址**：C/O 151 Marcellin Dr, City of Industry, CA 91789
- **地址（快递）**：151 Marcellin Dr, City of Industry, CA 91789
- **联系电话**：626-606-0308
- **仓型**：海外仓（大件）

### USTX

- **仓库名称**：美南海外仓（USTX）
- **国家**：US
- **仓库定位**：大件仓
- **作业模式**：AUTO
- **可接商品**：纯电、普通化工、特殊化工（不支持 DG、食品）
- **地址**：C/O 11142 Beltline Road, Houston, TX 77067
- **地址（快递）**：11142 Beltline Road, Houston, TX 77067
- **联系电话**：832-590-3532
- **仓型**：海外仓
- **特殊说明**
  - 2022.7.15 起使用新地址
  - 小件包裹类型限制：USTX 小件仅 A 类包裹

### USKY3

- **仓库名称**：美东 3 仓（USKY3）
- **国家**：US
- **仓库定位**：小件仓
- **作业模式**： AUTO
- **可接商品**：纯电、DG、普通化工、特殊化工、食品（类型最全）
- **地址**：C/O 2125 Gateway Blvd, Hebron, KY 41048
- **地址（快递）**：2125 Gateway Blvd, Hebron, KY 41048
- **联系电话**：+001-8594850550-5601
- **仓型**：海外仓（小件）

### USKY5

- **仓库名称**：美东 5 仓（USKY5）
- **国家**：US
- **仓库定位**：中小件仓
- **作业模式**：AUTO
- **可接商品**：纯电、普通化工（不支持 DG、特殊化工、食品）
- **地址**：C/O 7050 New Buffington Road, Florence, Kentucky 41042
- **地址（快递）**：7050 New Buffington Road, Florence, Kentucky 41042
- **联系电话**：+1(502)482-3736
- **仓型**：海外仓

### USNJ

- **仓库名称**：美东仓（USNJ）
- **国家**：US
- **仓库定位**：大件仓
- **作业模式**：MANUAL
- **可接商品**：以运营配置为准（矩阵未单列，建议确认目的仓）
- **地址**：C/O 1120 Route 22 E, Bridgewater, NJ 08807
- **地址（快递）**：C/O 1120 Route 22 E, Bridgewater, NJ 08807
- **联系电话**：732-347-0593
- **仓型**：海外仓

### USNJ2

- **仓库名称**：美东新仓（USNJ2）
- **国家**：US
- **仓库定位**：大件仓
- **作业模式**：MANUAL
- **可接商品**：纯电、普通化工（不支持 DG、特殊化工、食品）
- **地址**：700 Linden Logistics Wy, Linden, NJ 07036
- **地址（快递）**：700 Linden Logistics Wy, Linden, NJ 07036
- **联系人**：dongsheng.xue@winitamerica.com
- **联系电话**：5307461932
- **仓型**：海外仓
- **特殊说明**
  - 小件仅 A 类包裹

### USGA

- **仓库名称**：美南佐治亚仓（USGA）
- **国家**：US
- **仓库定位**：大件仓
- **作业模式**：MANUAL
- **可接商品**：普通化工（不支持纯电、DG、特殊化工、食品）
- **地址**：C/O 301 Cypress Mdw Dr #100, Pooler, GA 31322
- **地址（快递）**：C/O 301 Cypress Mdw Dr #100, Pooler, GA 31322
- **联系电话**：+1 912-207-7797
- **仓型**：海外仓
- **特殊说明**
  - WINIT check-in 道口：Dock 264
  - Google Map 链接可查：maps.app.goo.gl/V35MbZMEwFiHkQnR7

---

## UK 区域仓库

### UK

- **仓库名称**：英国海外仓（UK）
- **国家**：UK
- **地址**：C/O Unit 73 Interlink Way West, Bardon Business Park, Bardon, Leicestershire, LE67 1LD
- **地址（快递）**：Unit 73 Interlink Way West, Bardon Business Park, Bardon, Leicestershire, LE67 1LD
- **联系电话**：+44 1530 837046
- **仓型**：海外仓
- **特殊说明**
  - 面单建议备注 **NOT FOR AMAZON（FBA）**，包裹贴 A4 纸标示
  - 快递收件人：Online Seller C/O 3rd Pty Warehouse

### UKGF

- **仓库名称**：英国 UKGF 仓
- **国家**：UK
- **仓库定位**：大件仓
- **作业模式**：MANUAL
- **可接商品**：纯电、DG、普通化工
- **地址**：C/O Warehouse 1, Mill Lane Industrial Estate, Kirby Road, Glenfield, Leicestershire, LE3 8DX
- **地址（快递）**：Warehouse 1, Mill Lane Industrial Estate, Kirby Road, Glenfield, Leicestershire, LE3 8DX
- **联系电话**：01162986177
- **仓型**：海外仓（大件）

### UKTW

- **仓库名称**：英国新仓（UKTW）
- **国家**：UK
- **仓库定位**：中小件仓
- **作业模式**：AUTO
- **可接商品**：普通化工（不支持纯电、DG、特殊化工、食品）
- **地址**：C/O Unit 5, St Modwen Park Tamworth, Signet Way, Tamworth, England, B78 2FG
- **地址（快递）**：Unit 5, St Modwen Park Tamworth, Signet Way, Staffordshire, B78 2FG
- **联系电话**：+0044 1827816199
- **仓型**：海外仓
- **特殊说明**
  - DHL 搜不到 Tamworth/Staffordshire 时可选城市 Freasley

---

## DE 区域仓库

### DE

- **仓库名称**：德国海外仓（DE）
- **国家**：DE
- **地址**：C/O Ludwig-Erhard-Str.2, 28197 Bremen
- **地址（快递）**：Ludwig-Erhard-Str.2, 28197 Bremen
- **联系电话**：+0049 1727287134
- **仓型**：海外仓
- **特殊说明**
  - Straße 打不出可改为 strasse
  - 与 DEBR/DEBR2 同属德仓群

### DEBR

- **仓库名称**：德国 DEBR 大件仓
- **国家**：DE
- **仓库定位**：大件仓
- **作业模式**：MANUAL
- **可接商品**：纯电、DG、普通化工
- **地址**：直发收货地址未在地址 KB 单列，下单目的仓为 DEBR 时以万邑联/运营通知为准
- **仓型**：海外仓（大件）
- **特殊说明**
  - 与 DE、DEBR2 组合为德仓群，修改目的仓时须注意仓群规则

### DEBR2

- **仓库名称**：德国新仓（DEBR2）
- **国家**：DE
- **仓库定位**：综合仓
- **作业模式**：AUTO
- **可接商品**：普通化工（不支持纯电、DG、特殊化工、食品）
- **地址**：C/O Senator-Blase-Straße 13, 28197, Bremen
- **地址（快递）**：Senator-Blase-Straße 13, 28197, Bremen
- **联系电话**：+0049 1727287134
- **仓型**：海外仓
- **特殊说明**
  - 有箱单自验 B/C 包小件子包裹体积限制 0.04CBM

---

## CA 区域仓库

### CATO

- **仓库名称**：加拿大海外仓（CATO）
- **国家**：CA
- **仓库定位**：综合仓
- **作业模式**：MANUAL
- **可接商品**：纯电（不支持 DG、化工、食品）
- **地址**：C/O 108 Summerlea Rd, Brampton, ON L6T 4X3
- **地址（快递）**：108 Summerlea Rd, Brampton, ON L6T 4X3
- **联系电话**：905-319-3885
- **仓型**：海外仓
- **特殊说明**
  - 2023.8.14 搬仓，须使用 Brampton 新地址

---

## BE 区域仓库

### BE

- **仓库名称**：比利时海外仓（BE）
- **国家**：BE
- **地址**：C/O Boulevard de l'Eurozone 35, B-7700 Mouscron, Belgium
- **地址（快递）**：Boulevard de l'Eurozone 35, B-7700 Mouscron, Belgium
- **联系电话**：+32 56 85 76 52
- **仓型**：海外仓
- **特殊说明**
  - 商业地址，按预约送仓

---

## 无匹配时的处理

- KB 无该 `warehouseCode` 或 `country` 无匹配仓：明确告知「暂无该仓库资料，建议联系客服确认」。
- 可接商品类型以矩阵为准；若商品属性边界不清（如是否属 DG/特殊化工），建议客户查价卡或联系客服。
- 不输出库容/Slots 实时信息（→ inbound-capacity-availability）。
- 仓租计费、组织库存、库内箱转单等存储增值服务（→ inbound-process-guide 或对应增值专家）。
- 不引用飞书或内部系统 URL。
