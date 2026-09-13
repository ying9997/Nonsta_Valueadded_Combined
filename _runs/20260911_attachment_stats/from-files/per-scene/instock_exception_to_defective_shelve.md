# 附件统计：【库内】异常商品转不良品上架
- sceneKey：`instock_exception_to_defective_shelve`
- omsSceneCode：`202512150002`
- 订单数：22（原子 22）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (22/22) | 100.0% (22/22) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (22/22) | 100.0% (22/22) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (22/22) | 50.0% (11/22) | 必填 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (22/22) | 36.4% (8/22) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (22/22) | 13.6% (3/22) | 可选 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| OONFRFTS | 下架出库单号 | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (22/22) | 0.0% (0/22) | 不列入 |
| VAS_ATTR_REL_VOIC | 增值单品数量 | 4.5% (1/22) | 4.5% (1/22) | 不列入 |
| VAS_ATTR_REL_VACQ | 增值商品数量 | 4.5% (1/22) | 4.5% (1/22) | 不列入 |
| VAS_ATTR_REL_EOR | 结果说明 | 4.5% (1/22) | 0.0% (0/22) | 不列入 |
| VAS_ATTR_REL_RDP | 结果展示照片 | 4.5% (1/22) | 0.0% (0/22) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON
- 建议可选：VAS_ATTR_REL_LF, NSVASTN
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
