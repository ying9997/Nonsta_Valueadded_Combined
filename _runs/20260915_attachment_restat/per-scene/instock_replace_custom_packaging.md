# 附件统计：【库内】更换客制包装
- sceneKey：`instock_replace_custom_packaging`
- omsSceneCode：`20250407055`
- 订单数：9（原子 9）
- 旧人工卡：否
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (9/9) | 100.0% (9/9) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (9/9) | 100.0% (9/9) | 表单正文，不作为附件门 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (9/9) | 88.9% (8/9) | 必填 |
| OONFRFTS | 下架出库单号 | 100.0% (9/9) | 88.9% (8/9) | 必填 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (9/9) | 88.9% (8/9) | 必填 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (9/9) | 11.1% (1/9) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (9/9) | 11.1% (1/9) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (9/9) | 11.1% (1/9) | 可选 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (9/9) | 11.1% (1/9) | 可选 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (9/9) | 0.0% (0/9) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (9/9) | 0.0% (0/9) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (9/9) | 0.0% (0/9) | 不列入 |
| VAS_ATTR_REL_VOIC | 增值單品數量 | 11.1% (1/9) | 11.1% (1/9) | 不列入 |
| VAS_ATTR_REL_VACQ | 增值商品數量 | 11.1% (1/9) | 11.1% (1/9) | 不列入 |
| VAS_ATTR_REL_EOR | 結果說明 | 11.1% (1/9) | 0.0% (0/9) | 不列入 |
| VAS_ATTR_REL_RDP | 結果展示照片 | 11.1% (1/9) | 0.0% (0/9) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON, OONFRFTS, VAS_ATTR_REL_LF
- 建议可选：PACKAGE_SERNO, MERCHANDISE_SERNO, NSVASTN, VAS_ATTR_REL_TCRBCAL
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_NWEON
