# 附件统计：【库内】A+包裹更换标签上架
- sceneKey：`instock_aplus_parcel_relabel_shelve`
- omsSceneCode：`20250407060`
- 订单数：7（原子 7）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (7/7) | 100.0% (7/7) | 必填 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_RD | 需求描述 | 85.7% (6/7) | 85.7% (6/7) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 85.7% (6/7) | 85.7% (6/7) | 表单正文，不作为附件门 |
| PACKAGE_SERNO | 包裹条码 | 85.7% (6/7) | 28.6% (2/7) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 85.7% (6/7) | 28.6% (2/7) | 可选 |
| NSVASTN | 非标增值来源单号 | 85.7% (6/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 85.7% (6/7) | 0.0% (0/7) | 不列入 |
| CEO_SOA | CEO审批截图 | 85.7% (6/7) | 0.0% (0/7) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 85.7% (6/7) | 0.0% (0/7) | 不列入 |
| OONFRFTS | 下架出库单号 | 71.4% (5/7) | 28.6% (2/7) | 可选 |
| VAS_ATTR_REL_VOIC | 增值单品数量 | 42.9% (3/7) | 42.9% (3/7) | 可选 |
| VAS_ATTR_REL_VACQ | 增值商品数量 | 28.6% (2/7) | 28.6% (2/7) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 28.6% (2/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_EOR | 结果说明 | 28.6% (2/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_RDP | 结果展示照片 | 28.6% (2/7) | 0.0% (0/7) | 不列入 |
| BTBATSPASTC | 买卖双方提供并签署合约 | 14.3% (1/7) | 0.0% (0/7) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON
- 建议可选：PACKAGE_SERNO, MERCHANDISE_SERNO, OONFRFTS, VAS_ATTR_REL_VOIC
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON
- 卡上现有 requiredFieldKeys：（空）
