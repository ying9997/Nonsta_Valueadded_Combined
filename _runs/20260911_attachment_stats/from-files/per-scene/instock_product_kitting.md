# 附件统计：【库内】商品组合
- sceneKey：`instock_product_kitting`
- omsSceneCode：`20250407071`
- 订单数：28（原子 28）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (28/28) | 85.7% (24/28) | 必填 |
| VAS_ATTR_REL_RD | 需求描述 | 96.4% (27/28) | 96.4% (27/28) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 96.4% (27/28) | 96.4% (27/28) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_LF | 标签文件 | 96.4% (27/28) | 82.1% (23/28) | 必填 |
| OONFRFTS | 下架出库单号 | 96.4% (27/28) | 71.4% (20/28) | 必填 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 96.4% (27/28) | 39.3% (11/28) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 96.4% (27/28) | 10.7% (3/28) | 可选 |
| VSS | 视频拍摄SOP（中文+英文） | 96.4% (27/28) | 10.7% (3/28) | 可选 |
| CEO_SOA | CEO审批截图 | 96.4% (27/28) | 3.6% (1/28) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 96.4% (27/28) | 3.6% (1/28) | 不列入 |
| PACKAGE_SERNO | 包裹条码 | 96.4% (27/28) | 0.0% (0/28) | 不列入 |
| NSVASTN | 非标增值来源单号 | 96.4% (27/28) | 0.0% (0/28) | 不列入 |
| VAS_ATTR_REL_QOSIITOAS | 拆分后订单单品数量 | 3.6% (1/28) | 3.6% (1/28) | 不列入 |
| VAS_ATTR_REL_NPB | 新商品条码 | 3.6% (1/28) | 3.6% (1/28) | 不列入 |
| VAS_ATTR_REL_SP | 示例图片 | 3.6% (1/28) | 3.6% (1/28) | 不列入 |
| TRMS | 商品拆分对应关系 | 3.6% (1/28) | 3.6% (1/28) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, OONFRFTS
- 建议可选：VAS_ATTR_REL_AOOI, MERCHANDISE_SERNO, VSS
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
