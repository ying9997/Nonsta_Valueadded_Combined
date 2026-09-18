# 附件统计：【库内】库存冻结/解冻
- sceneKey：`instock_inventory_freeze_unfreeze`
- omsSceneCode：`INSTOCK_INVENTORY_FREEZE_UNFREEZE`
- 订单数：13（原子 13）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| MERCHANDISE_SERNO | 商品条码 | 100.0% (13/13) | 38.5% (5/13) | 可选 |
| VAS_ATTR_REL_RD | 需求描述 | 92.3% (12/13) | 92.3% (12/13) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 92.3% (12/13) | 92.3% (12/13) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 92.3% (12/13) | 23.1% (3/13) | 可选 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 92.3% (12/13) | 15.4% (2/13) | 可选 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 92.3% (12/13) | 7.7% (1/13) | 不列入 |
| NSVASTN | 非标增值来源单号 | 92.3% (12/13) | 7.7% (1/13) | 不列入 |
| PACKAGE_SERNO | 包裹条码 | 92.3% (12/13) | 0.0% (0/13) | 不列入 |
| OONFRFTS | 下架出库单号 | 92.3% (12/13) | 0.0% (0/13) | 不列入 |
| CEO_SOA | CEO审批截图 | 92.3% (12/13) | 0.0% (0/13) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 92.3% (12/13) | 0.0% (0/13) | 不列入 |
| VAS_ATTR_REL_LF | 标签文件 | 92.3% (12/13) | 0.0% (0/13) | 不列入 |
## 建议必填 / 可选
- 建议必填：（无）
- 建议可选：MERCHANDISE_SERNO, VAS_ATTR_REL_TCRBCAL, VAS_ATTR_REL_AOOI
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
