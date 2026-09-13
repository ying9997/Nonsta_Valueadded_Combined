# 附件统计：【库内】拆分SKU
- sceneKey：`instock_split_sku`
- omsSceneCode：`INSTOCK_SPLIT_SKU`
- 订单数：34（原子 34）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (34/34) | 82.4% (28/34) | 必填 |
| VAS_ATTR_REL_RD | 需求描述 | 64.7% (22/34) | 64.7% (22/34) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 64.7% (22/34) | 64.7% (22/34) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 64.7% (22/34) | 47.1% (16/34) | 可选 |
| VAS_ATTR_REL_LF | 标签文件 | 64.7% (22/34) | 47.1% (16/34) | 可选 |
| NSVASTN | 非标增值来源单号 | 64.7% (22/34) | 8.8% (3/34) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 64.7% (22/34) | 5.9% (2/34) | 不列入 |
| PACKAGE_SERNO | 包裹条码 | 64.7% (22/34) | 2.9% (1/34) | 不列入 |
| MERCHANDISE_SERNO | 商品条码 | 64.7% (22/34) | 2.9% (1/34) | 不列入 |
| CEO_SOA | CEO审批截图 | 64.7% (22/34) | 0.0% (0/34) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 64.7% (22/34) | 0.0% (0/34) | 不列入 |
| OONFRFTS | 下架出库单号 | 61.8% (21/34) | 38.2% (13/34) | 可选 |
| VAS_ATTR_REL_QOSIITOAS | 拆分后订单单品数量 | 35.3% (12/34) | 35.3% (12/34) | 可选 |
| VAS_ATTR_REL_NPB | 新商品条码 | 35.3% (12/34) | 35.3% (12/34) | 可选 |
| VAS_ATTR_REL_SP | 示例图片 | 35.3% (12/34) | 35.3% (12/34) | 可选 |
| TRMS | 商品拆分对应关系 | 35.3% (12/34) | 35.3% (12/34) | 可选 |
| VAS_ATTR_REL_VOIC | 增值单品数量 | 2.9% (1/34) | 2.9% (1/34) | 不列入 |
| VAS_ATTR_REL_VACQ | 增值商品数量 | 2.9% (1/34) | 2.9% (1/34) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 2.9% (1/34) | 0.0% (0/34) | 不列入 |
| VAS_ATTR_REL_EOR | 结果说明 | 2.9% (1/34) | 0.0% (0/34) | 不列入 |
| VAS_ATTR_REL_RDP | 结果展示照片 | 2.9% (1/34) | 0.0% (0/34) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON
- 建议可选：VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF, OONFRFTS, VAS_ATTR_REL_QOSIITOAS, VAS_ATTR_REL_NPB, VAS_ATTR_REL_SP, TRMS
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
