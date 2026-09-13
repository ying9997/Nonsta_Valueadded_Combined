# 附件统计：【入库】收集SN码
- sceneKey：`inbound_collect_sn`
- omsSceneCode：`20250529001`
- 订单数：7（原子 7）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (7/7) | 100.0% (7/7) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (7/7) | 100.0% (7/7) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (7/7) | 57.1% (4/7) | 必填 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (7/7) | 28.6% (2/7) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (7/7) | 28.6% (2/7) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (7/7) | 28.6% (2/7) | 可选 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (7/7) | 28.6% (2/7) | 可选 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (7/7) | 28.6% (2/7) | 可选 |
| CEO_SOA | CEO审批截图 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 71.4% (5/7) | 0.0% (0/7) | 不列入 |
| OONFRFTS | 下架出库单号 | 28.6% (2/7) | 14.3% (1/7) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON
- 建议可选：PACKAGE_SERNO, MERCHANDISE_SERNO, NSVASTN, VAS_ATTR_REL_AOOI, VAS_ATTR_REL_LF
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
