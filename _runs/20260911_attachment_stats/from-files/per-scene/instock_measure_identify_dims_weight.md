# 附件统计：【库内】商品尺重测量辨识
- sceneKey：`instock_measure_identify_dims_weight`
- omsSceneCode：`【Warehouse】Measurement and identification of commodity weight`
- 订单数：15（原子 15）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| MERCHANDISE_SERNO | 商品条码 | 100.0% (15/15) | 33.3% (5/15) | 可选 |
| VAS_ATTR_REL_RD | 需求描述 | 73.3% (11/15) | 73.3% (11/15) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 73.3% (11/15) | 73.3% (11/15) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_LF | 标签文件 | 73.3% (11/15) | 26.7% (4/15) | 可选 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 73.3% (11/15) | 6.7% (1/15) | 不列入 |
| PACKAGE_SERNO | 包裹条码 | 73.3% (11/15) | 0.0% (0/15) | 不列入 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 73.3% (11/15) | 0.0% (0/15) | 不列入 |
| NSVASTN | 非标增值来源单号 | 73.3% (11/15) | 0.0% (0/15) | 不列入 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 73.3% (11/15) | 0.0% (0/15) | 不列入 |
| CEO_SOA | CEO审批截图 | 73.3% (11/15) | 0.0% (0/15) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 73.3% (11/15) | 0.0% (0/15) | 不列入 |
| OONFRFTS | 下架出库单号 | 66.7% (10/15) | 6.7% (1/15) | 不列入 |
| VAS_ATTR_REL_VOIC | 增值单品数量 | 26.7% (4/15) | 26.7% (4/15) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 6.7% (1/15) | 0.0% (0/15) | 不列入 |
## 建议必填 / 可选
- 建议必填：（无）
- 建议可选：MERCHANDISE_SERNO, VAS_ATTR_REL_LF
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
