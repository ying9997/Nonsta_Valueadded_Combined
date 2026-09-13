# 附件统计：【入库】拆包/拆箱上架
- sceneKey：`inbound_unpack_shelve`
- omsSceneCode：`20250407003`
- 订单数：18（原子 18）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (18/18) | 100.0% (18/18) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (18/18) | 100.0% (18/18) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (18/18) | 88.9% (16/18) | 必填 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (18/18) | 50.0% (9/18) | 必填 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (18/18) | 33.3% (6/18) | 可选 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (18/18) | 5.6% (1/18) | 不列入 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (18/18) | 5.6% (1/18) | 不列入 |
| NSVASTN | 非标增值来源单号 | 100.0% (18/18) | 5.6% (1/18) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (18/18) | 5.6% (1/18) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (18/18) | 5.6% (1/18) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (18/18) | 0.0% (0/18) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 94.4% (17/18) | 5.6% (1/18) | 不列入 |
| OONFRFTS | 下架出库单号 | 5.6% (1/18) | 0.0% (0/18) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 建议可选：VAS_ATTR_REL_AOOI
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
