# 附件统计：【库内】指定位置贴标
- sceneKey：`instock_specified_position_label`
- omsSceneCode：`20260127001`
- 订单数：7（原子 7）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (7/7) | 100.0% (7/7) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (7/7) | 100.0% (7/7) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (7/7) | 14.3% (1/7) | 可选 |
| OONFRFTS | 下架出库单号 | 100.0% (7/7) | 14.3% (1/7) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (7/7) | 14.3% (1/7) | 可选 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (7/7) | 0.0% (0/7) | 不列入 |
## 建议必填 / 可选
- 建议必填：（无）
- 建议可选：VAS_ATTR_REL_NWEON, OONFRFTS, NSVASTN
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
