# Supervisor Feedback Analysis -- 5 VASC Orders (2026-09-16)

> Generated: 2026-09-16 | Pipeline: L4-SOP生成-OMS写入试点

---

## Order 1: VASC000000370209

| Field | Value |
|---|---|
| **orderNo** | VASC000000370209 |
| **Warehouse** | DENW3 Warehouse (德国 DE) |
| **Customer** | TikTok Inc.-5 (20177679) |
| **Business Type** | INBOUND (入库订单) |
| **vaSource** | UNUSUAL |
| **Status** | WP (待客户确认) |
| **sceneOverviewCode** | 20250407004 |
| **sceneOverviewName** | 【入库】尺重/标签辨识后换标上架 |
| **需求描述** | EB0126083132659287包裹条码异常，对应异常实际包裹与登记的异常数量不一致，标准无法操作处理，需要仓库帮忙按新单：WI52613192补贴包裹操作上架，帮忙报价，谢谢。 |
| **需求背景** | 异常登记数量和实际异常数量不一致，无法提交标准增值 |
| **上架入库单号 (NWEON)** | WI52613192 |
| **异常单号 (EB)** | EB0126083132659287 |
| **非标增值来源单号** | (empty) |

**SOP (AI-generated):**
```
仓库操作步骤：
1. 在异常商品暂存区通过异常单号 EB0126083132659287定位异常包裹，合计14个；
2. 打开附件「异常单号：EB0126083132659287 对应的入库单号.xlsx」，根据附件提供的对应关系做辨识确认。
3. 补贴对应入库单的包裹标签，覆盖原标签位置粘贴，确保标签平整、条码清晰可扫描。
4. 补贴新标签后，按新入库单： WI52613192 做上架。
5. 完成所有商品上架后，在系统中关闭异常单 EB0126083132659287，使其状态更新为已完成。
```

**Attachments (vaAtomFiles):**

| # | fileName | fileType (attr) | Type |
|---|---|---|---|
| 1 | 异常单号EB0126083132659287对应的包裹条码.xlsx | TRPP | 包裹和标签的对应关系 |
| 2 | Order - 2026-09-16T175752.273.pdf | VAS_ATTR_REL_LF | 标签文件 |

**Event Info:**

| eventNo | eventCode | eventName | eventObj | Event Files |
|---|---|---|---|---|
| EB0126083132659287 | B0102E21 | 包裹条码异常(需客户处理) | 包裹 | 3x JPEG |

### Supervisor Feedback: 370209
- **Issue:** WI number (WI52613192) is present in the requirement text but AI didn't populate it into the structured `上架入库单号` field initially; also related to package barcode exception handling.
- **Root Cause:** The pipeline correctly extracted the WI number into the NWEON field in the final output, but the feedback indicates the extraction was originally missed or unreliable. The text "按新单：WI52613192" contains the WI number embedded in natural language with a colon separator.
- **Pipeline Change Needed:**
  1. **Robust WI-number regex extraction** -- ensure `WI\d{8}` pattern is always applied against 需求描述 text as a fallback when structured fields are empty.
  2. **Exception-order closure step** -- SOP step 5 says "关闭异常单...使其状态更新为已完成", but the correct status wording may need validation (see 370455 feedback).

---

## Order 2: VASC000000370434

| Field | Value |
|---|---|
| **orderNo** | VASC000000370434 |
| **Warehouse** | USGA Warehouse (美国 US) |
| **Customer** | 福席户外用品有限公司 (19733794) |
| **Business Type** | INBOUND (入库订单) |
| **vaSource** | INBOUND |
| **Status** | WP (待客户确认) |
| **sceneOverviewCode** | 202507021814 |
| **sceneOverviewName** | 【入库】上架前拦截 |
| **需求描述** | 原WI51636814入库单号，预计10月2日到仓，需要上架前拦截，将原A+包裹标签，更换为新单WI52653783的A+ 包裹标签 |
| **需求背景** | 因客户要求，WI51636814这个入库单有68箱A+包裹需要在上架前更换新的商品标签，预计10月2日到仓 |
| **上架入库单号 (NWEON)** | WI52653783 (new) |
| **原入库单号 (businessNo)** | WI51636814 (old, to be intercepted) |
| **非标增值来源单号** | (empty) |

**SOP (AI-generated):**
```
仓库操作步骤：
1、入库单：WI51636814 需要做上架前拦截；
2、拦截后更换新的包裹标签，做新单WI52653783上架，标签见附件。
原WI51636814入库单号，预计10月2日到仓，请仓库注意拦截。
```

**Attachments (vaAtomFiles):**

| # | fileName | fileType (attr) | Type |
|---|---|---|---|
| 1 | Order - 2026-09-16T184644.589.pdf | VAS_ATTR_REL_LF | 标签文件 |

**Event Info:** (none)

### Supervisor Feedback: 370434
- **Issue:** Original inbound order interception scenario -- need SKU consistency check between old WI (WI51636814) and new WI (WI52653783). The AI should verify that the SKU list on the old and new inbound orders match or that the customer has explicitly acknowledged differences.
- **Root Cause:** The pipeline generates the SOP without cross-referencing the actual SKU contents of the two WI orders. For interception scenarios, the old order's goods must map correctly to the new order.
- **Pipeline Change Needed:**
  1. **Cross-WI SKU validation** -- When sceneOverviewCode is "202507021814" (上架前拦截), the pipeline should call the WI order API to compare SKU lists between old and new WI numbers.
  2. **Quantity reconciliation** -- SOP should include a step confirming the 68 boxes count matches the actual inbound shipment.
  3. **Timeline awareness** -- The SOP mentions "预计10月2日到仓" but should generate a warehouse alert/reminder mechanism.

---

## Order 3: VASC000000370455

| Field | Value |
|---|---|
| **orderNo** | VASC000000370455 |
| **Warehouse** | UKTW Warehouse (英国 UK) |
| **Customer** | 赢时科技有限公司 (16640414) |
| **Business Type** | INBOUND (入库订单) |
| **vaSource** | UNUSUAL |
| **Status** | WA (待审核) |
| **sceneOverviewCode** | null (NOT matched) |
| **sceneOverviewName** | null (NOT matched) |
| **需求描述** | 关联的异常单号EB0126091533082065。麻烦将散落的产品还原包装一下，更换合适的快递袋包装，然后补贴对应的商品标签条码上架；sku对应的产品图片请查看附件，（ZM2957=M010000000007799185, ZZ2379=M010000000012559684, ZM0180=M010000000004819085） |
| **需求背景** | (same as 需求描述 -- customer duplicated) |
| **上架入库单号 (NWEON)** | WI52655763 |
| **原入库单号 (businessNo)** | WI50806322 |
| **异常单号 (EB)** | EB0126091533082065 |
| **非标增值来源单号** | (empty) |

**SOP:** (EMPTY -- AI failed to generate)

**Attachments (vaAtomFiles):**

| # | fileName | fileType (attr) | Type |
|---|---|---|---|
| 1 | 操作说明.docx | VAS_ATTR_REL_AOOI | 操作说明附件 |
| 2 | sku对应的产品图片.zip | VAS_ATTR_REL_LF | 标签文件 |

**Event Info:**

| eventNo | eventCode | eventName | eventObj | Event Files |
|---|---|---|---|---|
| EB0126091533082065 | B01E1315 | 商品条码异常(需客户处理) | 商品 | 11x JPEG |

### Supervisor Feedback: 370455
- **Issue 1:** Exception order status wording must be "仓库已处理" not "已完成" when closing out from the warehouse side.
- **Issue 2:** The pipeline needs attachment content recognition -- the `操作说明.docx` file contains crucial operational instructions, and the `sku对应的产品图片.zip` contains product images for SKU identification. Without reading these, the AI cannot generate a proper SOP.
- **Issue 3:** Scene matching failed entirely (sceneOverviewCode = null), so no SOP was generated.
- **Root Cause:** The order involves scattered products needing repackaging + relabeling + SKU identification via images, which is a complex multi-step scenario. The AI could not match it to any known scene because it requires reading the docx attachment to understand the actual operation instructions.
- **Pipeline Change Needed:**
  1. **Attachment content extraction** -- Parse `.docx` files (操作说明附件) to extract operational instructions and feed them into the scene-matching and SOP-generation stages.
  2. **Image-based SKU identification context** -- When `.zip` files contain product images, note this in the SOP so the warehouse knows to reference the images for product differentiation.
  3. **Status wording fix** -- Hardcode the correct exception closure wording as "仓库已处理" (not "已完成") across all SOP templates that involve exception order closure.
  4. **SKU mapping extraction** -- Parse the `ZM2957=M010000000007799185` style mappings from the requirement text to build a structured SKU correspondence table in the SOP.

---

## Order 4: VASC000000370554

| Field | Value |
|---|---|
| **orderNo** | VASC000000370554 |
| **Warehouse** | USKY3 Warehouse (美国 US) |
| **Customer** | 淄博铠璘机械有限公司 (13256007) |
| **Business Type** | INHOUSE (库内订单) |
| **vaSource** | INHOUSE |
| **Status** | WP (待客户确认) |
| **sceneOverviewCode** | 20250407043 |
| **sceneOverviewName** | 【库内】商品外观辨识+贴标上架 |
| **需求描述** | 按图片区分BRP-92和24-BRP-10 ------24-BRP-10的螺纹两边更宽一点，BRP-92螺纹两边更细一点 |
| **需求背景** | BRP-92现有库存可能错误 |
| **上架入库单号 (NWEON)** | WI52602124 |
| **下架出库单号 (OONFRFTS)** | WO12255578264 |
| **非标增值来源单号** | (empty) |

**SOP (AI-generated):**
```
【仓库操作步骤】
1. 将下架单WO12255578264内的商品下架
2. 根据客户提供的辨识方法操作辨识（尺寸差异是比较大的，普通尺子也可以测量）
3. 辨识完成后补贴商品标签，按照新提供的入库单上架WI52602124
```

**Attachments (vaAtomFiles):**

| # | fileName | fileType (attr) | Type |
|---|---|---|---|
| 1 | 辨别BRP-92库存.xlsx | VAS_ATTR_REL_AOOI | 操作说明附件 |
| 2 | Order - 2026-09-16T190057.655.pdf | VAS_ATTR_REL_LF | 标签文件 |
| 3 | Order - 2026-09-16T190046.834.pdf | VAS_ATTR_REL_LF | 标签文件 |

**Event Info:** (none)

### Supervisor Feedback: 370554
- **Issue:** The AI needs to read image attachments to understand customer instructions about distinguishing similar products (BRP-92 vs 24-BRP-10). The customer describes the difference as "螺纹两边更宽/更细" (thread width difference), and the attachment `辨别BRP-92库存.xlsx` likely contains the detailed identification criteria and quantity breakdown.
- **Root Cause:** The SOP says "根据客户提供的辨识方法操作辨识" but does not reproduce the actual identification criteria from the attachment. The warehouse operator would need to open the xlsx to understand what to look for. Ideally the SOP should inline the key identification instructions.
- **Pipeline Change Needed:**
  1. **Excel/image attachment parsing** -- Read the `辨别BRP-92库存.xlsx` to extract the product differentiation criteria and inline them into the SOP.
  2. **Visual identification SOP enrichment** -- When the scene is "商品外观辨识", the SOP must include specific visual cues (e.g., "24-BRP-10: wider threads on both sides; BRP-92: narrower threads") extracted from both the requirement text and attachments.
  3. **Measurement-based instructions** -- The SOP mentions "尺子也可以测量" but should specify exact dimensions if available from the xlsx.

---

## Order 5: VASC000000370356

| Field | Value |
|---|---|
| **orderNo** | VASC000000370356 |
| **Warehouse** | USTX Warehouse (美国 US) |
| **Customer** | 自由創新(香港)有限公司 (19227270) |
| **Business Type** | INHOUSE (库内订单) |
| **vaSource** | INHOUSE |
| **Status** | WA (待审核) |
| **sceneOverviewCode** | null (NOT matched) |
| **sceneOverviewName** | null (NOT matched) |
| **需求描述** | M010000000009973294*93, M010000000010057963*1. 总94件未上货物，请仓库上到新单WI52487074，附件已上传标签pdf文件。非标增值不收费，原因：库内导致增值操作异常，所以不收费 |
| **需求背景** | VASC000000360165 该增值仓库退回实际没操作，里面的出库-下架单WO12246371688，仓库把货物拣选出库，导致现在货物无法入库93件，需要新单入库。M010000000009973294*93. 然后M010000000010057963*1，是美西增值贴错了标签发来美南仓库，现在需要在美南进行新单上架。 |
| **上架入库单号 (NWEON)** | WI52487074 |
| **下架出库单号 (OONFRFTS)** | (empty in field; WO12246371688 in text) |
| **非标增值来源单号 (NSVASTN)** | VASC000000360165 |
| **Order Source** | TOM (TOM下单) |

**SOP:** (EMPTY -- AI failed to generate)

**Attachments (vaAtomFiles):**

| # | fileName | fileType (attr) | Type |
|---|---|---|---|
| 1 | Order (51).pdf | VAS_ATTR_REL_LF | 标签文件 |

**Event Info:** (none)

### Supervisor Feedback: 370356
- **Issue 1:** The order references a historical VASC (VASC000000360165) which was returned by the warehouse without being actually processed. The AI needs cross-order context to understand the full background.
- **Issue 2:** The label file logic -- the pdf "Order (51).pdf" contains the labels for the new WI order, and the SOP must instruct the warehouse to use these specific labels.
- **Issue 3:** The 下架出库单号 field is empty but WO12246371688 appears in the background text. This indicates the pipeline failed to extract it.
- **Issue 4:** Scene matching failed (sceneOverviewCode = null), no SOP generated.
- **Root Cause:** This is a cascading failure from a prior VASC order. The AI has no mechanism to fetch and incorporate the context of the referenced VASC000000360165, so it cannot understand the full operational chain (original VASC -> warehouse return -> new VASC to fix).
- **Pipeline Change Needed:**
  1. **Cross-order context fetching** -- When `非标增值来源单号` (NSVASTN) is populated, fetch the referenced VASC order and incorporate its SOP, status, and outcome into the current order's context.
  2. **WO number extraction from text** -- Apply `WO\d{11,}` regex against 需求背景 text to populate the 下架出库单号 field when it's empty.
  3. **Label file association** -- When a label PDF is attached, the SOP should explicitly reference it by filename and describe how to use it ("打印附件 Order (51).pdf 中的标签并粘贴到对应商品上").
  4. **No-charge flag handling** -- The text says "非标增值不收费", which is a billing directive; the pipeline should extract this into a structured flag or note for the auditor.
  5. **Multi-SKU item listing** -- Parse `M01...*数量` patterns from the text to build a structured goods list in the SOP.

---

## Summary Comparison Table

| Field | 370209 | 370434 | 370455 | 370554 | 370356 |
|---|---|---|---|---|---|
| **Warehouse** | DENW3 (DE) | USGA (US) | UKTW (UK) | USKY3 (US) | USTX (US) |
| **Customer** | TikTok Inc.-5 | 福席户外用品有限公司 | 赢时科技有限公司 | 淄博铠璘机械有限公司 | 自由創新(香港)有限公司 |
| **Business Type** | INBOUND | INBOUND | INBOUND | INHOUSE | INHOUSE |
| **vaSource** | UNUSUAL | INBOUND | UNUSUAL | INHOUSE | INHOUSE |
| **Order Source** | WINIT | WINIT | WINIT | WINIT | TOM |
| **Status** | WP | WP | WA | WP | WA |
| **Scene Matched?** | Yes (20250407004) | Yes (202507021814) | **NO** | Yes (20250407043) | **NO** |
| **Scene Name** | 尺重/标签辨识后换标上架 | 上架前拦截 | (null) | 商品外观辨识+贴标上架 | (null) |
| **SOP Generated?** | Yes | Yes | **NO** | Yes | **NO** |
| **New WI (NWEON)** | WI52613192 | WI52653783 | WI52655763 | WI52602124 | WI52487074 |
| **Old WI / Source** | -- | WI51636814 | WI50806322 | -- | VASC000000360165 |
| **WO (下架单)** | -- | -- | -- | WO12255578264 | WO12246371688 (in text only) |
| **Exception (EB)** | EB0126083132659287 | -- | EB0126091533082065 | -- | -- |
| **Attachments** | 2 (xlsx + pdf) | 1 (pdf) | 2 (docx + zip) | 3 (xlsx + 2x pdf) | 1 (pdf) |
| **Event Files** | 3 JPEG | -- | 11 JPEG | -- | -- |
| **Has Cross-Order Ref** | No | No | No | No | **Yes** (VASC..360165) |

---

## Supervisor Feedback Category Summary

| Order | Feedback Category | Key Issue | Pipeline Gap |
|---|---|---|---|
| **370209** | WI extraction from text; barcode exception | WI number present in text but AI extraction unreliable | Regex fallback for `WI\d{8}` in free-text fields |
| **370434** | Inbound interception + SKU consistency | No cross-check between old WI and new WI SKU lists | Cross-WI API call for SKU validation in interception scenes |
| **370455** | Status wording + attachment content recognition | SOP not generated; docx/zip not parsed; wrong status term | Attachment content extraction (docx, zip/images); status wording = "仓库已处理" |
| **370554** | Image attachment reading for product identification | Identification criteria not inlined into SOP from attachments | Excel parsing; visual-cue extraction for identification SOPs |
| **370356** | Cross-order context + label file logic | Historical VASC not fetched; WO not extracted from text; no SOP | NSVASTN cross-fetch; WO regex extraction; label file reference in SOP |

---

## Recommended Pipeline Changes (Priority Order)

### P0 -- Blocking SOP Generation

1. **Attachment content extraction** (affects 370455, 370554, 370356)
   - Parse `.docx` files for operational instructions
   - Parse `.xlsx` files for structured data (SKU lists, identification criteria)
   - Recognize `.zip` files containing product images and note them in SOP
   - This is the single highest-impact change: 2 of 5 orders had no SOP generated, and both had critical information locked in attachments.

2. **Cross-order context fetching** (affects 370356)
   - When `非标增值来源单号` (NSVASTN) field is populated, fetch the referenced VASC order's SOP, status, and outcome.
   - Inject this context into the scene-matching and SOP-generation prompts.

### P1 -- SOP Quality

3. **Structured field extraction from free text** (affects 370209, 370356)
   - Apply regex patterns (`WI\d{8}`, `WO\d{11,}`, `EB\d{16}`, `M01\d{13}\*\d+`) against 需求描述 and 需求背景 to populate empty structured fields.
   - The 下架出库单号 for 370356 was only in the text, not the field.

4. **Cross-WI SKU validation for interception scenes** (affects 370434)
   - For scene "上架前拦截" (202507021814), call WI order API to compare SKU lists.
   - Add a reconciliation step to the SOP template.

5. **Exception order status wording** (affects 370455, 370209)
   - When SOP includes an exception closure step, use "仓库已处理" not "已完成".
   - Update all SOP templates that reference exception order closure.

### P2 -- Enhanced Intelligence

6. **Visual identification SOP enrichment** (affects 370554)
   - For scene "商品外观辨识", inline specific visual cues and measurement criteria from both text and attachments.

7. **No-charge flag extraction** (affects 370356)
   - Detect "不收费" / "免费" patterns and extract into a structured billing note.

8. **Multi-SKU item list parsing** (affects 370356, 370455)
   - Parse `M01...*数量` and `SKU=M01...` patterns into structured goods lists.
