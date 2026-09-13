# 附件统计：【入库】指定商品拍照暂存
- sceneKey：`inbound_photo_hold`
- omsSceneCode：`20250522001`
- 订单数：61（原子 61）
- 旧人工卡：是（只对照，不覆盖）
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (61/61) | 100.0% (61/61) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (61/61) | 100.0% (61/61) | 表单正文，不作为附件门 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (61/61) | 31.1% (19/61) | 可选 |
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (61/61) | 31.1% (19/61) | 可选 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (61/61) | 21.3% (13/61) | 可选 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (61/61) | 19.7% (12/61) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (61/61) | 18.0% (11/61) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (61/61) | 13.1% (8/61) | 可选 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (61/61) | 4.9% (3/61) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (61/61) | 3.3% (2/61) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (61/61) | 1.6% (1/61) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 100.0% (61/61) | 0.0% (0/61) | 不列入 |
## 建议必填 / 可选
- 建议必填：（无）
- 建议可选：PACKAGE_SERNO, VAS_ATTR_REL_NWEON, VAS_ATTR_REL_LF, VAS_ATTR_REL_AOOI, MERCHANDISE_SERNO, NSVASTN
- 可写入 requiredFieldKeys（pipeline 能校验）：（无）
- 卡上现有 requiredFieldKeys：（空）
