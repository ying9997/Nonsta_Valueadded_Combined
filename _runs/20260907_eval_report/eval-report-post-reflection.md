# 评测报告 V0.1 (post-reflection)

## 数据集
- 来源：7 条 demo 用例（L1×1 L2×1 L3×1 L4×4）
- Golden labels：`internal-review-copilot/eval/golden/demo-7.jsonl`（人工标注）
- 附录：16 条当日待审核单粗标（不计主表准确率结论）

## 指标

| 指标 | 值 |
|------|---|
| outputPath Accuracy | 7/7 (100.0%) |
| sceneKey Accuracy | 5/5 (100.0%) |
| missingFields Recall | 100.0% |
| missingFields Precision | 100.0% |
| LLM Success Rate | 7/7 (100.0%) |
| sop_generated | 4 |
| transfer_human | 1 |
| needs_*_clarification | 2 |

## 逐条对比

| vascNo | expected | actual | match | scene | missing | 差异说明 |
|--------|----------|--------|-------|-------|---------|----------|
| VASC000000183069 | needs_requirement_clarification | needs_requirement_clarification | ✓ | - | ✓ | - |
| VASC000000344421 | transfer_human | transfer_human | ✓ | - | ✓ | - |
| VASC000000343821 | needs_field_clarification | needs_field_clarification | ✓ | ✓ | ✓ | - |
| VASC000000333147 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000326061 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000143515 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |
| VASC000000080416 | sop_generated | sop_generated | ✓ | ✓ | ✓ | - |

## Reflection（sop_generated）

| vascNo | reflectionPass | regenerated | issues |
|--------|----------------|-------------|--------|
| VASC000000333147 | false | false | 输入数据中提到了6个已上传附件，但SOP仅引用了3个（WI51547628非标.xlsx、lQLPJxau-Mx4Rg_NAo3NAhCwFU6hfX26oYAKSFU9MGhdAA_528_653.png、WYT包裹条码.pdf、操作说明.pdf），遗漏了'VAS_ATTR_REL_RDP（6a0f587b1fa447e3928fb811938d9cf5.JPEG）'和'商品和标签的对应关系（商品标签对应关系.xlsx）'两个附件的用途说明; 步骤1'根据异常单定位待处理货物'缺少具体操作指引：操作人员应该在哪个系统查询异常单？如何通过异常单找到实物货物的存放位置？; 步骤3'为每个外箱补贴对应的Winit包裹条码标签'未明确标签打印方式：是使用附件中的PDF直接打印？还是需要在系统中生成？标签应贴在外箱的什么位置？; 缺少异常处理指引：如果发现外箱数量不是36箱怎么办？如果箱序标签模糊不清无法辨识怎么办？如果对应关系表格中的条码与实际不符怎么办？ |
| VASC000000326061 | false | true | 输入数据中提到入库单 WI50582583，但 SOP 中未引用或说明其用途; 已上传附件中包含两张现场照片（VAS_ATTR_REL_RDP 的 JPEG 文件），SOP 未提示操作员参考这些照片进行实物核对; 缺少'找货'步骤：SOP 直接从'根据异常单定位包裹'开始,未明确说明如何从异常单号找到实物包裹的具体位置/货架; '按对应入库单分别扫描上架'表述模糊：未明确是扫描包裹标签还是 SKU 条码，也未说明上架到哪个库位/区域; 第2步'核对实物产品条码'未说明核对方式：是目视检查、扫描枪验证，还是与附件照片比对？ |
| VASC000000143515 | false | false | SOP 中未引用客户上传的三张实物照片附件：'6eadeba385204c80be7a5add9e1c5c2d.JPEG'、'785235fd040a416dab9d9947b064043e.JPEG'、'd0d9887212fb48d5b8124ef4b6bdf45e.JPEG'，这些照片可能是辨识型号的重要参考依据; SOP 中提到'使用「新M条码.zip」、「Order (2)(1).pdf」、「Order (3)(1).pdf」中的标签文件打印'，但未明确说明：(1) 哪个条码号对应哪个文件？(2) zip 文件需要先解压吗？(3) 三个文件是否都需要打印还是按需选择？操作人员可能无法判断; 步骤 2 中'按「商品标签对应关系.xlsx」和「操作说明.pdf」辨识商品型号'过于笼统，未说明具体辨识方法（例如：根据外观特征、包装标识、尺寸等），且未提示可参考实物照片附件; 缺少数量核对环节：SOP 未要求操作人员确认 Brave 4 Pro 和 EK7000 各有多少件，直接辨识可能导致贴错数量 |
| VASC000000080416 | false | false | SOP 中仅列举了 'EB0125031518682708 等 60 个异常单'，未完整列出输入数据中提供的 59 个具体异常单号。虽然数量对应，但实际操作中仓库人员需要逐一关闭异常单，应提供完整清单或明确引用方式。; 步骤 2 中'使用「Order (6).pdf」和「Order (7).pdf」标签文件'未明确哪个 SKU 使用哪个标签文件。根据输入数据，两个 PDF 分别对应两个 SKU，但 SOP 未建立明确映射关系。; 步骤 5 '检查中间的大箱子'缺少定位方法。输入数据提到'最中间的大箱子'，但 SOP 未说明如何在 60 箱中识别这个'中间的大箱子'（是否参考附件图片？是否有特殊标识？）。; 步骤 6 '完成后关闭相关异常单'未明确关闭时机：是每完成一箱关闭一个异常单，还是全部 60 箱完成后统一关闭？异常单与箱子的对应关系未说明。 |

## 已知问题

- 本批主表无 path/scene/missing 不匹配

## 版本
- Pipeline: run-pipeline.ts
- LLM model: claude-sonnet-4-5
- skipLlm: false
- tag: post-reflection
- 日期: 2026-09-08
