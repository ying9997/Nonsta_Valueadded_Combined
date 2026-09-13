# 附件统计：【入库】包裹串仓异常调拨
- sceneKey：`inbound_parcel_cross_warehouse_transfer`
- omsSceneCode：`[Warehouse]AbnormalTransferOfParcelsFromMultipleWarehouses`
- 订单数：9（原子 10）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 66.7% (6/9) | 66.7% (6/9) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 66.7% (6/9) | 66.7% (6/9) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 66.7% (6/9) | 44.4% (4/9) | 可选 |
| PACKAGE_SERNO | 包裹条码 | 66.7% (6/9) | 11.1% (1/9) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 66.7% (6/9) | 11.1% (1/9) | 可选 |
| NSVASTN | 非标增值来源单号 | 66.7% (6/9) | 11.1% (1/9) | 可选 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 66.7% (6/9) | 0.0% (0/9) | 不列入 |
| CEO_SOA | CEO审批截图 | 66.7% (6/9) | 0.0% (0/9) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 66.7% (6/9) | 0.0% (0/9) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 66.7% (6/9) | 0.0% (0/9) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 66.7% (6/9) | 0.0% (0/9) | 不列入 |
| VAS_ATTR_REL_LF | 标签文件 | 66.7% (6/9) | 0.0% (0/9) | 不列入 |
| TJ | 订单体积 | 44.4% (4/9) | 44.4% (4/9) | 可选 |
| VAS_ATTR_REL_VPC | 增值包裹数量 | 44.4% (4/9) | 44.4% (4/9) | 可选 |
| VAS_ATTR_REL_AT | 增值托盘数量 | 44.4% (4/9) | 44.4% (4/9) | 可选 |
| DW | 目的仓库 | 44.4% (4/9) | 44.4% (4/9) | 可选 |
## 建议必填 / 可选
- 建议必填：（无）
- 建议可选：VAS_ATTR_REL_NWEON, PACKAGE_SERNO, MERCHANDISE_SERNO, NSVASTN, TJ, VAS_ATTR_REL_VPC, VAS_ATTR_REL_AT, DW
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
