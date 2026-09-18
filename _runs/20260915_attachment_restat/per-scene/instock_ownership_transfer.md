# 附件统计：【库内】货权转移-改数
- sceneKey：`instock_ownership_transfer`
- omsSceneCode：`【In-warehouse】Transfer of ownership of goods`
- 订单数：44（原子 44）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_VOIC | 增值单品数量 | 97.7% (43/44) | 97.7% (43/44) | 必填 |
| BTBATSPASTC | 买卖双方提供并签署合约 | 97.7% (43/44) | 97.7% (43/44) | 必填 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 38.6% (17/44) | 36.4% (16/44) | 可选 |
| OONFRFTS | 下架出库单号 | 36.4% (16/44) | 36.4% (16/44) | 可选 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 36.4% (16/44) | 36.4% (16/44) | 可选 |
| VAS_ATTR_REL_LF | 标签文件 | 36.4% (16/44) | 36.4% (16/44) | 可选 |
| VAS_ATTR_REL_RD | 需求描述 | 2.3% (1/44) | 2.3% (1/44) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 2.3% (1/44) | 2.3% (1/44) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 2.3% (1/44) | 2.3% (1/44) | 不列入 |
| LABEL_TYPE | 标签类型 | 2.3% (1/44) | 2.3% (1/44) | 不列入 |
| PACKAGE_SERNO | 包裹条码 | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
| MERCHANDISE_SERNO | 商品条码 | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
| NSVASTN | 非标增值来源单号 | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
| CEO_SOA | CEO审批截图 | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
| TRPL | 托盘和标签的对应关系 | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 2.3% (1/44) | 0.0% (0/44) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_VOIC, BTBATSPASTC
- 建议可选：VAS_ATTR_REL_TCRBCAL, OONFRFTS, VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
