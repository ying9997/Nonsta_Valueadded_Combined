# 附件统计：【库内】库内加固
- sceneKey：`instock_reinforce`
- omsSceneCode：`20250407056`
- 订单数：6（原子 6）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (6/6) | 100.0% (6/6) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (6/6) | 100.0% (6/6) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (6/6) | 33.3% (2/6) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (6/6) | 16.7% (1/6) | 可选 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| OONFRFTS | 下架出库单号 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| NSVASTN | 非标增值来源单号 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (6/6) | 0.0% (0/6) | 不列入 |
| VAS_ATTR_REL_VOIC | 增值单品数量 | 66.7% (4/6) | 66.7% (4/6) | 可选 |
| VAS_ATTR_REL_VACQ | 增值商品数量 | 66.7% (4/6) | 66.7% (4/6) | 可选 |
| VAS_ATTR_REL_EOR | 结果说明 | 66.7% (4/6) | 0.0% (0/6) | 不列入 |
| VAS_ATTR_REL_RDP | 结果展示照片 | 66.7% (4/6) | 0.0% (0/6) | 不列入 |
## 建议必填 / 可选
- 建议必填：（无）
- 建议可选：VAS_ATTR_REL_NWEON, MERCHANDISE_SERNO, VAS_ATTR_REL_VOIC, VAS_ATTR_REL_VACQ
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
