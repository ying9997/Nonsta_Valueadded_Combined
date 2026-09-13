# 附件统计：【入库】批量辨识商品后补贴商品条码及包裹条码上架
- sceneKey：`inbound_batch_identify_relabel_barcode`
- omsSceneCode：`202506120003`
- 订单数：47（原子 47）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (47/47) | 100.0% (47/47) | 必填 |
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (47/47) | 100.0% (47/47) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (47/47) | 100.0% (47/47) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (47/47) | 78.7% (37/47) | 必填 |
| TRPP | 包裹和标签的对应关系 | 100.0% (47/47) | 23.4% (11/47) | 可选 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (47/47) | 19.1% (9/47) | 可选 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (47/47) | 17.0% (8/47) | 可选 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (47/47) | 10.6% (5/47) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (47/47) | 10.6% (5/47) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (47/47) | 8.5% (4/47) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (47/47) | 0.0% (0/47) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (47/47) | 0.0% (0/47) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 建议可选：TRPP, VAS_ATTR_REL_TCRBCAL, VAS_ATTR_REL_AOOI, PACKAGE_SERNO, MERCHANDISE_SERNO
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
