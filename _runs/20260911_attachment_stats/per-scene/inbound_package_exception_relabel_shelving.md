# 附件统计：【入库】包裹类异常换商品标签上架
- sceneKey：`inbound_package_exception_relabel_shelving`
- omsSceneCode：`20250407008`
- 订单数：15（原子 15）
- 旧人工卡：是（只对照，不覆盖）
| attributeKey | attributeName | 出现率 | 非空率 | 建议 |
|-------------|---------------|-------|-------|------|
| VAS_ATTR_REL_NWEON | 上架入库单号 | 100.0% (15/15) | 100.0% (15/15) | 必填 |
| VAS_ATTR_REL_RD | 需求描述 | 100.0% (15/15) | 100.0% (15/15) | 表单正文，不作为附件门 |
| BEOR | 需求背景说明 | 100.0% (15/15) | 100.0% (15/15) | 表单正文，不作为附件门 |
| PACKAGE_SERNO | 包裹条码 | 100.0% (15/15) | 13.3% (2/15) | 可选 |
| MERCHANDISE_SERNO | 商品条码 | 100.0% (15/15) | 13.3% (2/15) | 可选 |
| NSVASTN | 非标增值来源单号 | 100.0% (15/15) | 6.7% (1/15) | 不列入 |
| VAS_ATTR_REL_AOOI | 操作说明附件 | 100.0% (15/15) | 0.0% (0/15) | 不列入 |
| CEO_SOA | CEO审批截图 | 100.0% (15/15) | 0.0% (0/15) | 不列入 |
| VAS_ATTR_REL_TCRBCAL | 商品和标签的对应关系 | 100.0% (15/15) | 0.0% (0/15) | 不列入 |
| TRPP | 包裹和标签的对应关系 | 100.0% (15/15) | 0.0% (0/15) | 不列入 |
| VSS | 视频拍摄SOP（中文+英文） | 100.0% (15/15) | 0.0% (0/15) | 不列入 |
| VAS_ATTR_REL_LF | 标签文件 | 100.0% (15/15) | 0.0% (0/15) | 不列入 |
## 建议必填 / 可选
- 建议必填：VAS_ATTR_REL_NWEON
- 建议可选：PACKAGE_SERNO, MERCHANDISE_SERNO
- 可写入 requiredFieldKeys（pipeline 能校验）：VAS_ATTR_REL_NWEON
- 卡上现有 requiredFieldKeys：VAS_ATTR_REL_LF
