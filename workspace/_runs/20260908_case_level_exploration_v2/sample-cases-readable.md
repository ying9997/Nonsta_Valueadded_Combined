# Case-level 人工标注辅助样本（v2）

- 本文件是探索/标注辅助，**不是**正式 eval / 规则 / SOP 资产。
- 样本数：36
- Top 场景：(空/未知), 【尾程】winit线下尾程询价, 【出库】代理清关, 【出库】补贴/更换商品标签, 【入库】指定商品拍照暂存, 【入库】覆盖/清除标签, 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架, 【尾程】Anker Crowfoots出库, 【库内】拍摄照片/视频, 【出库】指定位置贴商品/包裹标签/快递面单
- 备注：Top10 场景抽样 + 额外 oms_direct_pass；实际样本 36 条

## S001 · `thread:omt_19320ce9e7cedcaf`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「(空/未知)」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000318522, VASC000000318615, VASC000000318636, VASC000000318684, VASC000000318666
- EB：EB0126071031172379, EB0126071031172253, EB0126071031172115, EB0126071031171575, EB0126071031171770；WI：WI51030515, WI49842960, WI51031384, WI49571886, WI51032166, WI49579110, WI51035101, WI50115307, WI51032580, WI49720028, WI50114312, WI50115033, WI50115122, WI50115276；WO：（无）；M：（无）
- 场景：（空/未知）
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000318522", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000318615", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000318636", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000318684", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000318666", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}]
- 退回原因：[{"vascNo": "VASC000000318522", "rejectReason": "标准增值支持此场景，请提交标准增值"}, {"vascNo": "VASC000000318615", "rejectReason": "标准增值支持此场景，请提交标准增值"}, {"vascNo": "VASC000000318636", "rejectReason": "标准增值支持此场景，请提交标准增值"}, {"vascNo": "VASC000000318684", "rejectReason": "标准增值支持此场景，请提交标准增值"}, {"vascNo": "VASC000000318666", "rejectReason": "标准增值支持此场景，请提交标准增值"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-07-15 20:59] 许晓妍: VASC000000318522 WI50114312 EB0126071031172379 USWC5 Warehouse
VASC000000318615 WI50115033 EB0126071031172253 USWC5 Warehouse
VASC000000318636 WI50115122 EB0126071031172115 USWC5 Warehouse
VASC000000318684 WI50115307 EB0126071031171575 USWC5 Warehouse
VASC000000318666 WI50115276 EB0126071031171770 USWC5 Warehouse 19673358 上海肖恩供应链管理有限公司@康振扬 @吴秋生 1、客户需求是：可根据 新入库单对应贴错的单号进行替换==是客户需要进行标签辨识和换标吗？2、需要客户提供新单和旧单的对应关系，以及辨识方法（照片、sop均可）；
[2026-07-16 09:03] 吴秋生: [Image: img_v3_0213l_8c010632-144c-4d82-9000-ecbd71dba1fg]
[2026-07-16 09:03] 吴秋生: [Image: img_v3_0213l_00493061-fc33-4cd1-bede-603ccd8bee8g]
[2026-07-16 09:04] 吴秋生: 包裹上有对应的标签，可以判断对应的商品的
[2026-07-16 09:05] 吴秋生: 补贴新单对应的SKU 包裹条码就可以的
[2026-07-16 09:05] 吴秋生: @许晓妍
[2026-07-16 12:20] 许晓妍: @吴秋生 客户贴错的原因是什么？这批货还有多少贴错的？
[2026-07-16 12:31] 吴秋生: @康振扬 看下这里吧，这家客户异常不是一次两次的
[2026-07-16 12:33] 康振扬: @吴秋生 先解决异常吧，客户培训问题，我抽时间给客户搞。
[2026-07-16 12:36] 吴秋生: @许晓妍 我也不清楚具体贴错的原因，和具体贴错的数量
@康振扬 和客户那边问问呢，还有多少贴错的，具体是啥原因导致的。。
[2026-07-16 14:14] 许晓妍: @康振扬 要尽快跟客户培训好，不能每次都用增值给客户兜底，这样对客户来说成本也很大
[2026-07-16 14:14] 许晓妍: @康振扬 客户对他们的包裹码没有管控计划吗？
[2026-07-16 14:21] 许晓妍: @吴秋生 @康振扬 让客户提标准增值就行
[Image: img_v3_0213l_3cd877eb-e350-4f0d-b952-3d24436b195g]
[2026-07-16 14:22] 许晓妍: @吴秋生 原来的非标我这边给退回了
[2026-07-16 14:46] 吴秋生: @许晓妍 批量异常，没办法下一个标准增值操作啊
[2026-07-16 14:47] 许晓妍: @吴秋生 有下单界面截图吗
[2026-07-16 14:50] 吴秋生: 批量异常，做标准增值的话，提增值页面，只能填写一个包裹，填写不了多个包裹
[2026-07-16 14:50] 吴秋生: 仓库那边上架只能上一个，其他的操作不了
[2026-07-16 14:55] 许晓妍: @吴秋生 是万邑联吗？是填写的还是系统带出来的？万邑联提交界面有吗
[2026-07-16 14:58] 吴秋生: @许晓妍 怎么都退了啊
[2026-07-16 14:58] 吴秋生: 给客户解释又要解释半天
[2026-07-16 14:59] 吴秋生: @许晓妍 标准增值，一个个异常只能做一个，其他异常解决不了
[2026-07-16 14:59] 吴秋生: 就是批量异常里，只能搞批量中的一个，搞不了其他的异常包裹
[2026-07-16 15:00] 许晓妍: @吴秋生 能提供下客户标准增值下单的界面截图吗？我们好去找人优化
[2026-07-16 15:00] 吴秋生: 我得先给客户解释
[2026-07-16 15:00] 吴秋生: 等下
[2026-07-16 15:01] 许晓妍: 嗯嗯@吴秋生 因为能有这个标准增值，应该是可以一起提交的，抱歉都给退回了
[2026-07-16 15:05] 许晓妍: @吴秋生 刚刚问了一下，现在没办法一个增值单处理不同入库单的异常了，还是得分开提增值，要不然其他异常单关不掉
[2026-07-16 15:32] 吴秋生: [Image: img_v3_0213l_315bfde0-2fa8-486f-a713-ecaa343bb56g]
[2026-07-16 15:32] 吴秋生: @许晓妍 客户那边无法确认这些WB具体是哪个包裹
[2026-07-16 15:37] 吴秋生: @许晓妍 等下看看应该怎么处理吧，给客户那边一个具体的处理办法
[2026-07-16 15:40] 吴秋生: 方案下来后，这里同步下，需要@康振扬 后面同步给客户
[2026-07-16 15:48] 许晓妍: @吴秋生 我明白了，这个确认没办法快速解决。@康振扬 麻烦跟客户说，让客户再重新通过异常单下非标增值
[2026-07-16 22:48] 许晓妍: @吴秋生 @康振扬 客户在途的还有多少？没库入的让客户下无箱单预报单吧cc@李颖
[2026-07-17 17:41] 康振扬: @许晓妍 @吴秋生 抱歉， 这个消息遗漏了，现在给客户解决了吗， 还需要客户重新下非标增值了吗。
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000318522 WI50114312 EB0126071031172379 USWC5 Warehouse VASC000000318615 WI50115033 EB0126071031172253 USWC5 Warehouse VASC000000318636 WI50115122 EB0126071031172115 USWC5 ...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000318522",
    "requirementDescription": "EB0126071031172379  这个重新登记非标增值  需求：可根据 新入库单对应贴错的单号进行替换  新单WI51030515--实际贴的 WI49842960"
  },
  {
    "vascNo": "VASC000000318615",
    "requirementDescription": "EB0126071031172253 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新单号WI51031384--对应实际贴的单号WI49571886"
  },
  {
    "vascNo": "VASC000000318636",
    "requirementDescription": "EB0126071031172115这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新WI51032166-- 旧WI49579110"
  },
  {
    "vascNo": "VASC000000318684",
    "requirementDescription": "EB0126071031171575 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新WI51035101-- 旧WI50115307"
  },
  {
    "vascNo": "VASC000000318666",
    "requirementDescription": "EB0126071031171770 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新WI51032580-- 旧WI49720028"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000318522",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086238"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086241"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086244"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086247"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "EB0126071031172379  这个重新登记非标增值  需求：可根据 新入库单对应贴错的单号进行替换  新单WI51030515--实际贴的 WI49842960",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086250"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "可以根据贴的标签上的sku来判断是不是同一个wint号",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086253"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086256"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086271"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086274"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086277"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086280"
  },
  {
    "vascNo": "VASC000000318522",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3086283"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087063"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087066"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087069"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087072"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "EB0126071031172253 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新单号WI51031384--对应实际贴的单号WI49571886",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087075"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "可以根据贴的标签上的sku来判断是不是同一个wint号",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087078"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087081"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087096"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087099"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087102"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087105"
  },
  {
    "vascNo": "VASC000000318615",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087108"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087318"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087321"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087324"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087327"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "EB0126071031172115这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新WI51032166-- 旧WI49579110",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087330"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "可以根据贴的标签上的sku来判断是不是同一个wint号",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087333"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087336"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087351"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087354"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087357"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087360"
  },
  {
    "vascNo": "VASC000000318636",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087363"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088650"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088653"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088656"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088659"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "EB0126071031171575 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新WI51035101-- 旧WI50115307",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088662"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "可以根据贴的标签上的sku来判断是不是同一个wint号",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088665"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088668"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088683"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088686"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088689"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088692"
  },
  {
    "vascNo": "VASC000000318684",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3088695"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087657"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087660"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087663"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087666"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "EB0126071031171770 这个重新登记非标增值 需求：可根据 新入库单对应贴错的单号进行替换 新WI51032580-- 旧WI49720028",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087669"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "可以根据贴的标签上的sku来判断是不是同一个wint号",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087672"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087675"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087690"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087693"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087696"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087699"
  },
  {
    "vascNo": "VASC000000318666",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3087702"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000318522",
    "attachmentName": "Order (76).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "073d0899d58c4040b420d92cfd02e640/2026/07/16/30bb6adaa14f47578f3bd51379a85f76.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-16T14:23:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000318522",
    "sop": "1"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S002 · `thread:omt_1969af241d0a1ce4`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「(空/未知)」边界/补充样本
- VASC：VASC000000279459, VASC000000286683
- EB：（无）；WI：WI48772626, WI48977736；WO：（无）；M：（无）
- 场景：（空/未知）
- 服务：提供海外仓监控视频-少包裹调查
- attachmentStatus：`verified`
- caseQualityFlags：["has_verified_attachments", "chat_present_but_oms_requirement_empty"]
- 审核结果：[{"vascNo": "VASC000000279459", "auditResult": "其他/未知", "isAuditThrough": "", "status": "PD"}, {"vascNo": "VASC000000286683", "auditResult": "其他/未知", "isAuditThrough": "", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-19 17:05] 刘佳: [Image: img_v3_0211r_d98b9954-0e22-4da9-a887-94270c7cfd6g]
客户：MUXUE TRADE LIMITED19011452
仓库：USKY3 Warehouse
入库单号：WI48772626
@李颖 颖姐，VASC000000279459——WI48772626这个提供海外仓监控视频-少包裹调查的增值，实际属于这个情况**（若供应商将快递包裹使用整柜投递drop到仓，海外仓无法提供包裹卸货视频）**是不是正常仓库要拒绝处理的；
目前增值仓库给客户提供了整个快递柜的卸货视频，视频客户也看不明白具体数量，也核实不到具体哪些包裹是他们的，他们不认可这个增值收费，这种可以退费处理吗，麻烦确认一下的，谢谢

@陈鑫 CC
@小灵通 帮忙看下以上场景能否申请客服退费，对应哪个退费类型
[Image: img_v3_0211r_da53eb07-f1db-40a8-8760-960f1978585g]
[2026-05-19 17:09] 未知/系统: @李颖
我先查一下相关退费规则，稍等～
[2026-05-19 17:09] 未知/系统: @李颖
根据图1增值服务规则文档，核心问题如下：
**规则明确：**
- 快递到仓场景下，**若供应商使用"整柜投递drop到仓"，海外仓无法提供包裹卸货视频**（文档红框标注）
- 且明确写明：**"若无法提供，按规则WINIT不收费"**
**实际情况：**
- USKY3仓库明知是UPS整柜投递（drop to仓），却仍然收取了监控视频-少包裹调查的增值费用
- 实际提供的视频是UPS快递柜整体卸货视频（1-2小时），而非包裹卸货视频
- 客户无法通过该视频清点具体包裹数量，也无法核实哪些是客户的
**结论：可以申请退费**
理由：仓库对"drop到仓"场景仍收取了无法提供对应服务的增值费用，属于**增值服务无法提供/不满足收费条件**，应退费。

---

@陈鑫 麻烦帮忙确认这个场景对应哪个退费类型，谢谢！
退费类型参考：建议走「**增值服务无法提供**」或「**增值服务计费有误**」类型，具体以客服退费工单系统实际可选类型为准。
出处：《WINIT增值与异常服务价格表》，海外仓增值服务-监控视频服务规则，查询时间2026-05-19
[2026-05-19 17:12] 李颖: @刘佳 你就按视频提供数量错误的
[2026-06-03 11:00] 刘佳: 增值单号：VASC000000286683
入库单号：WI48977736
@李颖 颖姐，客户此增值也是为了核实此入库单少包裹情况，提交了海外仓监控视频-少包裹调查的增值；
增值仓库给客户提供了整个快递柜的卸货视频，客户也看不明白具体数量，也核实不到具体哪些包裹是他们的，他们不认可这个增值收费，可以申请退费吧

属于（若供应商将快递包裹使用整柜投递drop到仓，海外仓无法提供包裹卸货视频）仓库未拒绝处理

@小灵通 也能申请退费对吗
[2026-06-03 11:03] 未知/系统: @李颖 收到，我先查一下退费政策
[2026-06-03 11:03] 未知/系统: @李颖 收到，我来说一下我的分析，同时这个case涉及具体的退费判断，需要您这边来把关：
**我的理解：**
这个场景的核心矛盾是——
1. 增值描述：海外仓监控视频-少包裹调查（客户期望：能看到具体包裹卸货过程）
2. 实际提供：整柜快递的卸货视频（无法对应到具体哪些是客户的包裹）
3. 结果：客户不认可这个视频能帮他核实少包裹情况，但仓库确实做了动作（提供了视频）
**我认为这个case可以申请退费，理由如下：**
增值服务的目的（帮客户核实少包裹）没有达到——视频无法帮助客户识别具体包裹和数量，属于**服务目的未达成**。而且这个场景的根因是供应商采用drop到仓模式，不是仓库问题，但**仓库接受了增值单却无法交付对应服务**，这个责任不应该由客户承担。
**但退费类型需要您来确认：**
这个case两个单都在问，是不是走同一个判断逻辑？我看到非标增值单审核SOP里有"拒接清单"和具体的场景处理规则，这几个case是否符合里面"仓库未拒绝处理→可退费"的情形？麻烦您看一下对应哪个退费类型，谢谢
@李颖
[2026-06-03 14:17] 李颖: @魏佳欣 你知道运营李雪之前维护的WINIT面签收货清单云档是哪个吗，就是哪个云档写明了UPS是Drop卸货的
[2026-06-04 15:09] 刘佳: 颖姐，这个可以退么@李颖
[2026-06-05 17:04] 刘佳: @李颖 帮忙确认下哈，谢谢
增值单号：VASC000000286683
入库单号：WI48977736
[2026-06-08 10:43] 刘佳: @李颖 [举手]颖姐~~这个帮忙看看嘞
[2026-06-08 21:44] 李颖: @魏佳欣 你看看有没有这个文档嘛
[2026-06-08 21:45] 李颖: @刘佳 你在哪查到UPS是不能签收的。
[2026-06-09 10:56] 刘佳: @李颖 对应增值服务VASC000000286683只提供了整柜卸货视频，不是属于Drop卸货么，我是看这里写明的标准，如果是Drop卸货不是直接不提供增值吗，为什么没有说明就直接给了整柜卸货视频并扣费，客户对这个视频不认可也看不懂哪些是他们的货物的，故不接收这个费用
[Image: img_v3_0212g_165a5ac2-8161-4a59-b706-fa3f86893c7g]
[2026-06-09 11:09] 魏佳欣: @李颖 我搜关键字都没查到相关文档。
[2026-06-09 11:10] 魏佳欣: ky3很少drop卸货
[2026-06-09 19:24] 刘佳: @李颖 颖姐~这个视频确实是整个柜子卸货操作，里面也不止客户的货物，看不出差异情况，这种能否退费的，帮忙再次确认哈，谢谢
[2026-06-11 10:59] 李颖: @魏佳欣 你找李雪要下那个全球卸货标准的文档，我找不到了。我们要拿到这个标准增加产品定义，开放给客户查看。并且调整我们增值单下单提示，不然增值单下了仓库提供不了，我们活干了，钱又收不回来，客户还觉的我们不对，双输
[2026-06-11 11:06] 李颖: @刘佳 你来申请客服退费要实事求是说清楚背景及原因，不要一会说是UPS不是当面签收是WINIT不该接增值，一会又说客户无法判断哪个包裹是他的货客户不认可费用。
1. 我们内部都没有一个明确的文档说明哪个供应商不能当面签收。我们产品定义缺失，我们会安排下个月价卡发布时增加定义。
2. 这个增值我们可以退费，你申请客服退费吧，原因是我们的视频可提供的产品定义不够清晰。再出现这样的场景不会退费的。
[2026-06-11 11:07] 李颖: @刘佳 这个客户恨不得所有的增值都给他白做，没有任何的价值交付
[2026-06-11 11:08] 刘佳: @李颖 如后续这种情况的话，能否增值直接拒接的，就不给她整柜视频，退掉他的增值服务

[Image: img_v3_0212i_0994689e-773f-432d-88ef-ff562f266c9g]
[2026-06-11 11:09] 李颖: @刘佳 那个是免审核的，我们不审核，系统无法控制住
[2026-06-11 11:11] 刘佳: 那这句也是有争议呀~~他们老是自己偷偷提交，也没跟我们说@李颖 仓库端能否直接拒吗
[2026-06-11 11:15] 李颖: @刘佳 所以这个视频增值费用我们同意退费了呀，我们也为定义不清晰买单了呀。
[2026-06-11 11:18] 刘佳: @李颖 我知道~只是怕后续也有这种情况发生，因为你说后面出现这个场景不是不会退费了么，他们经常偷偷自己提交增值，也没跟我们提，后续费用问题又来吵[泣不成声]所以希望仓库这种情况直接拒绝他的增值，免得白搞了还得给她退钱
```

### summaryForIndex（仅索引，不是原文）

```text
[Image: img_v3_0211r_d98b9954-0e22-4da9-a887-94270c7cfd6g] 客户：MUXUE TRADE LIMITED19011452 仓库：USKY3 Warehouse 入库单号：WI48772626 @李颖 颖姐，VASC000000279459——WI48772626这个提供海外仓监控视频-少包裹调查的增...
```

### OMS 需求描述

```text
[]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000279459",
    "fieldName": "是否仓库责任",
    "fieldKey": "VAS_ATTR_REL_TROW",
    "fieldValue": "是",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2546682"
  },
  {
    "vascNo": "VASC000000279459",
    "fieldName": "视频个数",
    "fieldKey": "VAS_ATTR_REL_NOV",
    "fieldValue": "1",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2546685"
  },
  {
    "vascNo": "VASC000000279459",
    "fieldName": "快递单号",
    "fieldKey": "TRACKING_NO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2546688"
  },
  {
    "vascNo": "VASC000000279459",
    "fieldName": "快递供应商名称",
    "fieldKey": "VAS_ATTR_REL_NOES",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2546691"
  },
  {
    "vascNo": "VASC000000279459",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001390205617",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2546694"
  },
  {
    "vascNo": "VASC000000279459",
    "fieldName": "POD",
    "fieldKey": "VAS_ATTR_REL_POD",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2546703"
  },
  {
    "vascNo": "VASC000000286683",
    "fieldName": "是否仓库责任",
    "fieldKey": "VAS_ATTR_REL_TROW",
    "fieldValue": "是",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2649534"
  },
  {
    "vascNo": "VASC000000286683",
    "fieldName": "视频个数",
    "fieldKey": "VAS_ATTR_REL_NOV",
    "fieldValue": "1",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2649537"
  },
  {
    "vascNo": "VASC000000286683",
    "fieldName": "快递单号",
    "fieldKey": "TRACKING_NO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2649540"
  },
  {
    "vascNo": "VASC000000286683",
    "fieldName": "快递供应商名称",
    "fieldKey": "VAS_ATTR_REL_NOES",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2649543"
  },
  {
    "vascNo": "VASC000000286683",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001394175620",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2649546"
  },
  {
    "vascNo": "VASC000000286683",
    "fieldName": "POD",
    "fieldKey": "VAS_ATTR_REL_POD",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "serviceSequence": "1",
    "attrId": "2649555"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000279459",
    "attachmentName": "企业微信截图_17781250812919.png",
    "attachmentType": "VAS_ATTR_REL_POD",
    "url": "2a51f785b0f04506928663ec9a7f86aa/2026/05/11/6f1c47a0f82a4574971b1395f1e30500.png",
    "attributeName": "POD",
    "attributeKey": "VAS_ATTR_REL_POD",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "created": "2026-05-11T11:44:20Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279459",
    "attachmentName": "企业微信截图_17775212678996.png",
    "attachmentType": "VAS_ATTR_REL_POD",
    "url": "c171010f24354d4ba93078423e4a6e78/2026/05/11/f499479d5e01469ab5c129fad3ba8b03.png",
    "attributeName": "POD",
    "attributeKey": "VAS_ATTR_REL_POD",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1599",
    "created": "2026-05-11T11:44:20Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279459",
    "attachmentName": "97a20e9373f74f8ca3d8a5ebfc1f66b6.mp4",
    "attachmentType": "VAS_ATTR_REL_SVL",
    "url": "150350ee48034431b23dea64b1baa80f/2026/05/13/97a20e9373f74f8ca3d8a5ebfc1f66b6.mp4",
    "attributeName": "调查视频链接",
    "attributeKey": "VAS_ATTR_REL_SVL",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1599",
    "created": "2026-05-14T07:47:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000286683",
    "attachmentName": "6c8b3f7dd8c8436bb0df8d7b079efc55.mp4",
    "attachmentType": "VAS_ATTR_REL_SVL",
    "url": "6fa4182a63ff4a17871ed8809dff2793/2026/06/01/6c8b3f7dd8c8436bb0df8d7b079efc55.mp4",
    "attributeName": "调查视频链接",
    "attributeKey": "VAS_ATTR_REL_SVL",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1599",
    "created": "2026-06-01T23:02:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000279459",
    "sop": "根据到仓订单具体情况提供对应视频："
  },
  {
    "vascNo": "VASC000000286683",
    "sop": "根据到仓订单具体情况提供对应视频："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S003 · `thread:omt_1969a76102cfdb91`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【尾程】winit线下尾程询价」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000285291, VASC000000285297, VASC000000285330, VASC000000285336, VASC000000285393
- EB：（无）；WI：（无）；WO：WO11451500674, WO11451797408；M：M010000000008635990, M010000000008635989
- 场景：【尾程】winit线下尾程询价, 【出库】补贴/更换商品标签
- 服务：Winit线下尾程服务, 出库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "possible_resubmit_after_cancel", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000285291", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000285297", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000285330", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000285336", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000285393", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-19 17:38] 钟晓环: 19263669-香港荣畅实业有限公司
仓库：UKGF Warehouse 
商品：M010000000008635990 CUV30-01UK
出库数量：50件
客户要发亚马逊订单，标准出库-卡派，客户在亚马逊这款产品有5款FNsku，要求出库10件/贴一款。系统不支持，补贴商品只支持1款FNsku，客户不愿意拆单下，要求一个出库单50件全部按照他的要求贴标发出。@郭泽纯 请问有什么方式可以解决这个问题？
 @谭超 cc
[2026-05-19 17:40] 郭泽纯: @问问 试着回复一下
[2026-05-19 17:40] 未知/系统: 【回答正文】

你好，这个需求涉及到**亚马逊多FNSKU贴标**，我来检索一下现有规则。
让我进一步检索更具体的解决方案信息：
根据检索到的信息，我来获取值班同学信息：
让我获取群成员信息来查找值班同学：
根据知识库检索结果，我来回复这个问题：---**【回答正文】**

你好！关于香港荣畅实业有限公司这个需求（同一SKU出库50件，按5款FNsku×10件的方式贴标），我查了一下现有系统规则：

**现有系统限制：**
- 标准出库的"贴商品标签"增值服务是**SKU维度**的，一个SKU只能对应**一个FNSKU贴标**
- 目前**不支持在同一出库单内**，对同一SKU的货物按多个FNSKU分别贴标**建议解决方案（请确认以下哪种可行）：**| 方案 | 说明 | 客户接受度 |
|------|------|------|
| 方案1：拆单 | 将50件拆成5个出库单，每个出库单10件+对应1个FNSKU | 客户不愿拆单 |
| 方案2：线下非标增值 | 提交非标增值服务需求，备注多FNSKU贴标要求，由仓库人工处理 | 可能增加操作成本 |
| 方案3：提前分拣入库 | 入库时按不同FNSKU分拣到不同条码值库存，出库时按条码值指定出库 | 需客户配合 |⚠️ **建议**：由于客户明确不愿拆单，可以考虑**方案2（线下非标增值）或方案3**。具体哪种更合适，建议@值班同学确认仓库是否支持此类特殊贴标需求。
[2026-05-19 17:48] 钟晓环: @郭泽纯 @陈泽森 
[新月脸]请问如果走方案二的话，出库单正常下，库内商品先上传1款FNsku，剩下4款FNsku，通过创建非标出库特批，备注贴标需求上传是么？
[2026-05-19 18:13] 郭泽纯: @钟晓环 
1. 客户为什么在FBA 5个链接，在winit 1个
2. 如果出库单10件是单独的包裹，可以考虑先拆单下自提包裹贴标，再合单
3. 如果非标就直接非标全做，不然会很乱
@陈泽森 这个了解背景后，也一起记下问题哈
[2026-05-19 18:13] 郭泽纯: @问问 问问，你可以记住我的回复，下次这种场景直接这样回复吗
[2026-05-19 18:13] 未知/系统: 好的，已经记住了！✅

下次遇到类似的场景——**同一SKU按多个FNSKU贴标出库，客户不愿拆单**——我会直接使用这个模板回复，包含：
1. 说明系统限制（SKU维度，只支持1个FNSKU）
2. 提供三种解决方案（拆单 / 线下非标增值 / 提前分拣入库）
3. 建议优先方案2或方案3
4. @值班同学确认如果后续有其他需要标准化的回复场景，随时告诉我~
---
这次答得不够好？点‘踩’直接告诉本智能体的开发者，帮助 TA 持续优化回答质量 🧐

[Button]

[Button]
[2026-05-19 18:17] 郭泽纯: @问问 你的回复里面需要先询问客户的具体场景，为什么需要这么贴，再回复方案
[2026-05-19 18:17] 未知/系统: 好的，已经更新了！✅

下次遇到这类问题，我会先询问客户具体情况：
1. **为什么要这样贴标**——是亚马逊硬性要求还是业务习惯？
2. **是否同账号**——5款FNsku是否都是同一个亚马逊账号下的？
3. **是否介意同一shipment**——客户是否介意发往同一个仓库？然后根据客户回复，再选择对应的解决方案（拆单 / 线下非标增值 / 提前分拣入库）。
---
这次答得不够好？点‘踩’直接告诉本智能体的开发者，帮助 TA 持续优化回答质量 🧐

[Button]

[Button]
[2026-05-19 18:23] 钟晓环: 1.客户在亚马逊有5个链接，所以有5个fnsku
2.如果按照拆单下5次，在合并订单，操作繁琐
3.我上面说提交1个出库单50件，收件人类型选择fba订单，下库内增值必须勾选补贴商品标签，要先上传1个fnsku，不支持不勾选，会报错。
所以非标只备注贴4款fnsku，可行吗？
[2026-05-19 20:59] 郭泽纯: @钟晓环 不行，因为你上传了的话，仓库就会打印50张SKU1的标签，这个，要么就得开下白名单了
[2026-05-20 11:07] 钟晓环: @郭泽纯 那你开个白名单给客户，下单不勾选补贴商品标签时，不要报错。
我让客户除补贴商品标签以外，其他增值正常勾选，下单后创建出库非标增值，把5款fnsku上传到增值里面，可行不？
[2026-05-20 12:15] 郭泽纯: @钟晓环 刚看了一下，这单会贴包裹标吗，会就不会报错，OK
[2026-05-20 12:20] 钟晓环: @郭泽纯 会贴包裹标签的，OK
[2026-05-20 12:21] 郭泽纯: @钟晓环 等一下，你这个SKU有维护了第三方商品条码吗
[2026-05-20 12:22] 钟晓环: @郭泽纯 有维护
[Image: img_v3_0211s_4b8d871e-0647-4788-8273-5ff28281a9bg]
[2026-05-20 12:25] 郭泽纯: @钟晓环 ok，最好把5个SKU都维护成第三方商品条码，这样仓库先换标，在打包的时候就可以直接扫实物的条码
[2026-05-20 12:27] 钟晓环: @郭泽纯 出库就1款sku，你的意思是5款fnsku都要关联到第三方商品条码里面？
[2026-05-20 12:27] 钟晓环: [Image: img_v3_0211s_7f1d5afb-efa4-4bcc-ad16-2de609bd1f0g]
[2026-05-20 14:01] 郭泽纯: @钟晓环 对，最好都维护上
[2026-05-20 14:07] 钟晓环: @郭泽纯 好的
[2026-05-20 14:07] 钟晓环: @郭泽纯还有其他地方要注意的么？没问题的话，我让客户下单了
[2026-05-20 14:14] 郭泽纯: @钟晓环 没了
[2026-05-20 16:19] 钟晓环: 增值单号
VASC000000285291 -Winit 尾程询价服务 
VASC000000285297 - 出库非标增值（特批）@陈泽森 加急审核给到仓库。
业务单据号
WO11451500674
@郭泽纯 已提交
[2026-05-20 16:25] 陈泽森: 审批了
[2026-05-20 16:57] 钟晓环: VASC000000285330 - Winit 尾程询价服务
VASC000000285336 - 出库非标增值（特批） @陈泽森 还有一单，场景一样，加急审核。
WO11451797408
[2026-05-20 17:00] 陈泽森: 客户这种场景多不多的?
[2026-05-20 17:03] 陈泽森: [Image: img_v3_0211s_22b60c4e-c5bb-43ef-927e-142f06fbea1g]
@钟晓环 文件名只有G 和P不一样,哪个标签对应哪个SKU呀
[2026-05-20 17:05] 钟晓环: @陈泽森 
[Image: img_v3_0211s_129b863a-21d3-4959-9100-75c5d92a0d5g]
客户文件名称是用的SKU编码命名的，不是用的m码
[2026-05-20 17:08] 陈泽森: 我知道,但是这个名字对不上呀. 文件名都是CUV30 商品编码也都是CUV30. CUV30-G对应CUV30-01还是CUV30-P的对应CUV30-01?
[2026-05-20 17:12] 钟晓环: @陈泽森 我写对应关系给你，你可以审核吗，还是说要客户把文件名称修改了
[2026-05-20 17:13] 陈泽森: 最好改掉名称吧,这样传到仓库会更清晰一点
[2026-05-20 17:16] 钟晓环: @陈泽森 修改为m码可以不？
[2026-05-20 17:17] 陈泽森: 可以
[2026-05-20 17:25] 钟晓环: @陈泽森 VASC000000285393 -出库非标增值（特批） WO11451797408
重新提交了，麻烦审核。
[2026-05-20 17:26] 钟晓环: 客户这种场景多不多的? -----比较多。最近都会有，
[2026-05-20 17:28] 陈泽森: 客户可以在库内标准增值补贴三方条码吗?@钟晓环 
[Image: img_v3_0211s_50498be4-a39a-44cb-81fb-a50adf84c41g]
[2026-05-20 17:44] 陈泽森: 审批了
[2026-05-20 17:48] 钟晓环: @陈泽森 客户不确定要发亚马逊那边 数量是各对应多少，只有出库时才能知晓发多少过去。
如果现在就将库内的全部产品就换第三方商品条码的话，1个sku对应多个fnsku ，这个比例客户无法确认，而且这样换以后，在库内怎么确认哪些是fnsku1哪些是fnsku2呢？
```

### summaryForIndex（仅索引，不是原文）

```text
19263669-香港荣畅实业有限公司 仓库：UKGF Warehouse 商品：M010000000008635990 CUV30-01UK 出库数量：50件 客户要发亚马逊订单，标准出库-卡派，客户在亚马逊这款产品有5款FNsku，要求出库10件/贴一款。系统不支持，补贴商品只支持1款FNsku，客户不愿意拆单下，要求一个出库单50件全部按照他的要求贴...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000285297",
    "requirementDescription": "需求描述：M010000000008635990 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。"
  },
  {
    "vascNo": "VASC000000285336",
    "requirementDescription": "需求描述：M010000000008635990 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。  M010000000008635989 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。"
  },
  {
    "vascNo": "VASC000000285393",
    "requirementDescription": "需求描述：M010000000008635990 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。 M010000000008635989 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000285291",
    "fieldName": "订单体积",
    "fieldKey": "ATTR_KEY_ORDER_VOLUME",
    "fieldValue": "1.70971992",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629038"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "订单重量",
    "fieldKey": "ATTR_KEY_ORDER_WEIGHT",
    "fieldValue": "385",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629041"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "预估托盘数",
    "fieldKey": "ATTR_KEY_ESTIMATED_PALLETS",
    "fieldValue": "1",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629044"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "国家",
    "fieldKey": "ATTR_KEY_COUNTRY",
    "fieldValue": "United Kingdom",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629047"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "州/省",
    "fieldKey": "ATTR_KEY_STATE_PROVINCE",
    "fieldValue": "South Yorkshire",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629050"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "城市",
    "fieldKey": "ATTR_KEY_CITY",
    "fieldValue": "Doncaster",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629053"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "邮编",
    "fieldKey": "ATTR_KEY_POSTAL_CODE",
    "fieldValue": "DN11 0BG",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629056"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "街道1",
    "fieldKey": "ATTR_KEY_STREET_1",
    "fieldValue": "Water Vole Way, Firstpoint Logistic Park",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629059"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "街道2",
    "fieldKey": "ATTR_KEY_STREET_2",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629062"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "门牌号",
    "fieldKey": "ATTR_KEY_HOUSE_NO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629065"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "邮箱",
    "fieldKey": "ATTR_KEY_EMAIL",
    "fieldValue": "Booking@winit.com.cn",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629068"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "公司名称",
    "fieldKey": "ATTR_KEY_COMPANY_NAME",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629071"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "姓名",
    "fieldKey": "ATTR_KEY_NAME",
    "fieldValue": "亚马逊-LBA2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629074"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "电话",
    "fieldKey": "ATTR_KEY_PHONE",
    "fieldValue": "00491727287134",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629077"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "订单收货人类型",
    "fieldKey": "ATTR_KEY_ORDER_CONSIGNEE_TYPE",
    "fieldValue": "FBA_NONVC",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629080"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "收货人地址类型",
    "fieldKey": "ATTR_KEY_CONSIGNEE_ADDRESS_TYPE",
    "fieldValue": "BUSINESS",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629083"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "是否支持垛口卸货",
    "fieldKey": "ATTR_KEY_SUPPORT_DOCK_UNLOADING",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629086"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "",
    "fieldKey": "ATTR_KEY_OPERATION_START_MODE",
    "fieldValue": "AWAITING_CONFIRMATION",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629089"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "目标派送方式",
    "fieldKey": "ATTR_KEY_DELIVERY_METHOD",
    "fieldValue": "LTL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629092"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "FBA Shipment ID",
    "fieldKey": "ATTR_KEY_FBA_SHIPMENT_ID",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629095"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "FBA Reference No.",
    "fieldKey": "ATTR_KEY_FBA_REF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629098"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "其他备注",
    "fieldKey": "ATTR_KEY_OTHER_REMARKS",
    "fieldValue": "FBA Shipment ID：FBA15LSY1LTC  FBA Reference No.：3C3N7LFI",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629101"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "FBA仓编码",
    "fieldKey": "ATTR_KEY_FBA_WAREHOUSE_CODE",
    "fieldValue": "LBA2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629104"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "期望到达时间",
    "fieldKey": "ATTR_KEY_EXPECTED_ARRIVAL_TIME",
    "fieldValue": "2026-05-27",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629107"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "预约电话",
    "fieldKey": "ATTR_KEY_APPOINTMENT_PHONE",
    "fieldValue": "00491727287134",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629110"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "预约邮箱",
    "fieldKey": "ATTR_KEY_APPOINTMENT_EMAIL",
    "fieldValue": "Booking@winit.com.cn",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629113"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "APPT",
    "fieldKey": "ATTR_KEY_ASSISTANCE_NEEDED",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629116"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "报价模式",
    "fieldKey": "ATTR_KEY_QUOTATION_MODE",
    "fieldValue": "MANUAL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629119"
  },
  {
    "vascNo": "VASC000000285291",
    "fieldName": "是否含有尾程陆运DG商品",
    "fieldKey": "HAS_LAST_MILE_LAND_DG",
    "fieldValue": "否",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629122"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629323"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629326"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629329"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需求描述：M010000000008635990 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629332"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "需求背景说明:M010000000008635990 ，在亚马逊有5个销售链接，所以有5款FNsku，每款fnsku要求贴10件。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629335"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629338"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629356"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629359"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629362"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629365"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629368"
  },
  {
    "vascNo": "VASC000000285297",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2629371"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "订单体积",
    "fieldKey": "ATTR_KEY_ORDER_VOLUME",
    "fieldValue": "3.41943984",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629779"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "订单重量",
    "fieldKey": "ATTR_KEY_ORDER_WEIGHT",
    "fieldValue": "770",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629782"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "预估托盘数",
    "fieldKey": "ATTR_KEY_ESTIMATED_PALLETS",
    "fieldValue": "2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629785"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "国家",
    "fieldKey": "ATTR_KEY_COUNTRY",
    "fieldValue": "United Kingdom",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629788"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "州/省",
    "fieldKey": "ATTR_KEY_STATE_PROVINCE",
    "fieldValue": "PLP Knowsley",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629791"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "城市",
    "fieldKey": "ATTR_KEY_CITY",
    "fieldValue": "LIVERPOOL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629794"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "邮编",
    "fieldKey": "ATTR_KEY_POSTAL_CODE",
    "fieldValue": "L33 7AP",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629797"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "街道1",
    "fieldKey": "ATTR_KEY_STREET_1",
    "fieldValue": "Unit 1 Marl Road PLP Knowsley",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629800"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "街道2",
    "fieldKey": "ATTR_KEY_STREET_2",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629803"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "门牌号",
    "fieldKey": "ATTR_KEY_HOUSE_NO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629806"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "邮箱",
    "fieldKey": "ATTR_KEY_EMAIL",
    "fieldValue": "Booking@winit.com.cn",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629809"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "公司名称",
    "fieldKey": "ATTR_KEY_COMPANY_NAME",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629812"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "姓名",
    "fieldKey": "ATTR_KEY_NAME",
    "fieldValue": "亚马逊-LPL2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629815"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "电话",
    "fieldKey": "ATTR_KEY_PHONE",
    "fieldValue": "00491727287134",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629818"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "订单收货人类型",
    "fieldKey": "ATTR_KEY_ORDER_CONSIGNEE_TYPE",
    "fieldValue": "FBA_VC",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629821"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "收货人地址类型",
    "fieldKey": "ATTR_KEY_CONSIGNEE_ADDRESS_TYPE",
    "fieldValue": "BUSINESS",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629824"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "是否支持垛口卸货",
    "fieldKey": "ATTR_KEY_SUPPORT_DOCK_UNLOADING",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629827"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "",
    "fieldKey": "ATTR_KEY_OPERATION_START_MODE",
    "fieldValue": "AWAITING_CONFIRMATION",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629830"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "目标派送方式",
    "fieldKey": "ATTR_KEY_DELIVERY_METHOD",
    "fieldValue": "LTL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629833"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "FBA Shipment ID",
    "fieldKey": "ATTR_KEY_FBA_SHIPMENT_ID",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629836"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "FBA Reference No.",
    "fieldKey": "ATTR_KEY_FBA_REF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629839"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "其他备注",
    "fieldKey": "ATTR_KEY_OTHER_REMARKS",
    "fieldValue": "FBA Shipment ID：FBA15LSNSSGQ  FBA Reference No.：6RRLEO1J",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629842"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "FBA仓编码",
    "fieldKey": "ATTR_KEY_FBA_WAREHOUSE_CODE",
    "fieldValue": "LPL2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629845"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "期望到达时间",
    "fieldKey": "ATTR_KEY_EXPECTED_ARRIVAL_TIME",
    "fieldValue": "2026-05-27",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629848"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "预约电话",
    "fieldKey": "ATTR_KEY_APPOINTMENT_PHONE",
    "fieldValue": "00491727287134",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629851"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "预约邮箱",
    "fieldKey": "ATTR_KEY_APPOINTMENT_EMAIL",
    "fieldValue": "Booking@winit.com.cn",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629854"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "APPT",
    "fieldKey": "ATTR_KEY_ASSISTANCE_NEEDED",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629857"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "报价模式",
    "fieldKey": "ATTR_KEY_QUOTATION_MODE",
    "fieldValue": "MANUAL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629860"
  },
  {
    "vascNo": "VASC000000285330",
    "fieldName": "是否含有尾程陆运DG商品",
    "fieldKey": "HAS_LAST_MILE_LAND_DG",
    "fieldValue": "否",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2629863"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630265"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630268"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630271"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需求描述：M010000000008635990 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。  M010000000008635989 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630274"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "需求背景说明:M010000000008635990 ，在亚马逊有5个销售链接，所以有5款FNsku，每款fnsku要求贴10件。  M010000000008635989 ，在亚马逊有5个销售链接，所以有5款FNsku，每款fnsku要求贴10件。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630277"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630280"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630298"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630301"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630304"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630307"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630310"
  },
  {
    "vascNo": "VASC000000285336",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2630313"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631483"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631486"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631489"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需求描述：M010000000008635990 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。 M010000000008635989 下单件数50件，这款SKU,有款FNsku，每款fnsku贴10件处理贴标签，附件是5款fnsku标签pdf文件。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631492"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "需求背景说明:M010000000008635990 ，在亚马逊有5个销售链接，所以有5款FNsku，每款fnsku要求贴10件。   M010000000008635989 ，在亚马逊有5个销售链接，所以有5款FNsku，每款fnsku要求贴10件。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631495"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631498"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631516"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631519"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631522"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631525"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631528"
  },
  {
    "vascNo": "VASC000000285393",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2631531"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000285297",
    "attachmentName": "products-CUV30-G-01-10-LBA2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "6675ed8345f544a586de291e10de120e/2026/05/20/810aebb0a27f4bcaab1dac56a8ca62c0.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:25:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285297",
    "attachmentName": "products-CUV30-G-02-10-LBA2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "744b68af1d5b4abc94bd7230305d873c/2026/05/20/21983a7834bb4d64999261430652dd56.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:25:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285297",
    "attachmentName": "products-CUV30-G-03-10-LBA2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "0aa30ac65b8a4312b7e8f0eb1f1c6e3c/2026/05/20/1eba322efa4444db8d5bc9813ff1b735.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:25:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285297",
    "attachmentName": "products-CUV30-G-04-10-LBA2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "d2e9063348a5407c8f1548c197dab34d/2026/05/20/bd9b7ba02f2b45c4a12b7f206677835c.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:25:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285297",
    "attachmentName": "products-CUV30-G-05-10-LBA2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "58932d8035a04f2996e9087348b0fcfa/2026/05/20/a94c4720cc3844d7a6ced59fabd32f79.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:25:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-G-01-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "c43cf7d4577940989b2dc4f74af06ff3/2026/05/20/3fbb76a43ee441ad9055615df9529776.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-G-02-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "b89d259534284236b9e10d101b8e2c26/2026/05/20/9557cee787394452b90d02fbbcf7eb58.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-G-03-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "670dfa28bae540b48440ef49025c655d/2026/05/20/ab743429aa2548eab0a060af3a3b6f32.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-G-04-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "4387302a86ff48e4bcac1b3e2d4d787b/2026/05/20/9a66f136591c4a7fb3a5849b59623049.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-G-05-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "054e74c26e8f4683a529a1d2b7a2c880/2026/05/20/138b987b5f534bf4a59aedfbedc2a8cf.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-P-01-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "b482dbe1a3c747dc97965537635fadfd/2026/05/20/bdbccd726c824e5bb1c8e092a8451889.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-P-02-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "6da7c88dfea34f568196b352582b62bd/2026/05/20/cc3de2db546f4b7980ea5fde4d1503a2.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-P-03-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "20104f928c9247c3bedce4861dc55569/2026/05/20/77ee139d5f184f4fb00c026d2faf483a.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-P-04-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "ddf671c7a2cb49a6879a2dd55ef05c31/2026/05/20/83941e9c7a0248afb53b66d969774543.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285336",
    "attachmentName": "products-CUV30-P-05-10-LPL2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "a9339fb12f6d41f0841aa874b1244a40/2026/05/20/45c037ea414e48378dab9155f982aab8.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T16:53:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635989-1.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "5c394b8b9aea4d1798a4f023916910f3/2026/05/20/bb230f587f4442f9ab726b8864ec0fc7.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635989-2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "c2d929e4a9d3471abf270f53243e7a2c/2026/05/20/3d00aaaea6e24294a7b2e06829eaab81.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635989-3.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "71e164084ea748e5b1ed5a2365886976/2026/05/20/c01d1fdd8b8c4b00a80fe731e613b712.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635989-4.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "09ac5e15eb2247f9b87d612b2868ab51/2026/05/20/ade8dd159b344d2f8ebc56e9fc7a9ac7.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635989-5.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "64df873c7b9c46da97ab23d7a5d9647e/2026/05/20/876e0f71485c443db938073031419031.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635990-1.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "5bc2f45cf6f841adafdb1a7542afdf5d/2026/05/20/dad775be477d4c019b6177a02306b18d.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635990-2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "2bb385fd3ab14e9b80d1e30945e31a2f/2026/05/20/d2e46d36701d490993aac2af5731d47e.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635990-3.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "2a250541794b4cd895e73bffba5f5ec2/2026/05/20/f0bcd57c84074cf1bcaa9c3f426d0347.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635990-4.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "90d862ece5614552a8e35f2a11fbea13/2026/05/20/6e4ba1d249bd448cb83868cd23436b33.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000285393",
    "attachmentName": "M010000000008635990-5.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "a353ad45a34a455eb7be05f4f041c90b/2026/05/20/3dca049b8f814846b336cd9a231e98d9.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:44:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000285291",
    "sop": "\"1、仓库/尾程SD报价；"
  },
  {
    "vascNo": "VASC000000285297",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000285330",
    "sop": "\"1、仓库/尾程SD报价；"
  },
  {
    "vascNo": "VASC000000285393",
    "sop": "操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S004 · `vasc:VASC000000286818`

- caseType：`oms_other` / caseIdType：`vasc`
- 抽样槽位：reject_or_cancel；原因：场景「【尾程】winit线下尾程询价」退回/取消相关：观察 unsupported / 转标准 / 仓库无法支持
- VASC：VASC000000286818
- EB：（无）；WI：（无）；WO：（无）；M：（无）
- 场景：【尾程】winit线下尾程询价
- 服务：Winit线下尾程服务
- attachmentStatus：`not_found_in_oms_va_execute_file`
- caseQualityFlags：[]
- 审核结果：[{"vascNo": "VASC000000286818", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}]
- 退回原因：[{"vascNo": "VASC000000286818", "rejectReason": "仓库暂时无法提供该服务"}]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000286818",
    "fieldName": "订单体积",
    "fieldKey": "ATTR_KEY_ORDER_VOLUME",
    "fieldValue": "0.859269341",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653149"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "订单重量",
    "fieldKey": "ATTR_KEY_ORDER_WEIGHT",
    "fieldValue": "135.48",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653152"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "预估托盘数",
    "fieldKey": "ATTR_KEY_ESTIMATED_PALLETS",
    "fieldValue": "1",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653155"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "国家",
    "fieldKey": "ATTR_KEY_COUNTRY",
    "fieldValue": "Canada",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653158"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "州/省",
    "fieldKey": "ATTR_KEY_STATE_PROVINCE",
    "fieldValue": "AB",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653161"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "城市",
    "fieldKey": "ATTR_KEY_CITY",
    "fieldValue": "Acheson",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653164"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "邮编",
    "fieldKey": "ATTR_KEY_POSTAL_CODE",
    "fieldValue": "T7X 2X2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653167"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "街道1",
    "fieldKey": "ATTR_KEY_STREET_1",
    "fieldValue": "YEG2 ：27383 92 Ave Acheson, AB T7X 2X2 Canada",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653170"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "街道2",
    "fieldKey": "ATTR_KEY_STREET_2",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653173"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "门牌号",
    "fieldKey": "ATTR_KEY_HOUSE_NO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653176"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "邮箱",
    "fieldKey": "ATTR_KEY_EMAIL",
    "fieldValue": "evahe@ustellar.com",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653179"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "公司名称",
    "fieldKey": "ATTR_KEY_COMPANY_NAME",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653182"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "姓名",
    "fieldKey": "ATTR_KEY_NAME",
    "fieldValue": "Amazon",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653185"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "电话",
    "fieldKey": "ATTR_KEY_PHONE",
    "fieldValue": "+8615012670401",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653188"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "订单收货人类型",
    "fieldKey": "ATTR_KEY_ORDER_CONSIGNEE_TYPE",
    "fieldValue": "FBA_NONVC",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653191"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "收货人地址类型",
    "fieldKey": "ATTR_KEY_CONSIGNEE_ADDRESS_TYPE",
    "fieldValue": "BUSINESS",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653194"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "是否支持垛口卸货",
    "fieldKey": "ATTR_KEY_SUPPORT_DOCK_UNLOADING",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653197"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "",
    "fieldKey": "ATTR_KEY_OPERATION_START_MODE",
    "fieldValue": "IMMEDIATE_PROCESSING",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653200"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "目标派送方式",
    "fieldKey": "ATTR_KEY_DELIVERY_METHOD",
    "fieldValue": "LTL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653203"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "FBA Shipment ID",
    "fieldKey": "ATTR_KEY_FBA_SHIPMENT_ID",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653206"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "FBA Reference No.",
    "fieldKey": "ATTR_KEY_FBA_REF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653209"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "其他备注",
    "fieldKey": "ATTR_KEY_OTHER_REMARKS",
    "fieldValue": "货件编号：FBA19DS6L984  货件追踪编号: 2TKTSWWT",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653212"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "FBA仓编码",
    "fieldKey": "ATTR_KEY_FBA_WAREHOUSE_CODE",
    "fieldValue": "YEG2",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653215"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "期望到达时间",
    "fieldKey": "ATTR_KEY_EXPECTED_ARRIVAL_TIME",
    "fieldValue": "2026-05-27",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653218"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "预约电话",
    "fieldKey": "ATTR_KEY_APPOINTMENT_PHONE",
    "fieldValue": "+8615012670401",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653221"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "预约邮箱",
    "fieldKey": "ATTR_KEY_APPOINTMENT_EMAIL",
    "fieldValue": "evahe@ustellar.com",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653224"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "APPT",
    "fieldKey": "ATTR_KEY_ASSISTANCE_NEEDED",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653227"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "报价模式",
    "fieldKey": "ATTR_KEY_QUOTATION_MODE",
    "fieldValue": "MANUAL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653230"
  },
  {
    "vascNo": "VASC000000286818",
    "fieldName": "是否含有尾程陆运DG商品",
    "fieldKey": "HAS_LAST_MILE_LAND_DG",
    "fieldValue": "否",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "2653233"
  }
]
```

### 上传附件 uploadedAttachments

```text
[]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000286818",
    "sop": "\"1、仓库/尾程SD报价；"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S005 · `thread:omt_19315c5533cf9c86`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【尾程】winit线下尾程询价」边界/补充样本
- VASC：VASC000000317001, VASC000000317334
- EB：（无）；WI：（无）；WO：WO12102434676, WO12102857982, WO12102797894, WO12102924332, WO12103731601, WO12103991974, WO12103884284；M：M010000000009491322
- 场景：【出库】补贴/更换商品标签, 【尾程】winit线下尾程询价
- 服务：出库其他服务需求, Winit线下尾程服务
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000317001", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000317334", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-07-13 20:05] 陈泽森: VASC000000317001 WO12102434676 DEBR2 Warehouse 19227270 自由創新(香港)有限公司 出库非标增值（特批）@孟登科 @钟晓环 这个审批了，让客户确认报价
[2026-07-14 10:07] 钟晓环: @陈泽森 VASC000000317001 已确认
[2026-07-14 14:52] 曲晓杰: @钟晓环 他家就还有其他非标吗？这两天下了好些单，目前只看到这一单的非标
[2026-07-14 14:55] 曲晓杰: WO12102857982 这单有吗？
[2026-07-14 14:55] 曲晓杰: 我们在操作这个了
[2026-07-14 15:00] 钟晓环: WO12102857982 这个没非标增值，
[2026-07-14 15:01] 曲晓杰: 好的
[2026-07-14 15:05] 钟晓环: @曲晓杰 他家就还有其他非标吗？ ---咨询客户中，还没回复，刚刚回复有误。4单不是他家的。
[2026-07-14 15:07] 曲晓杰: WO12102797894 WO12102434676 WO12102924332 还有这3单，其中WO12102434676只有这单目前有非标了
[2026-07-14 15:07] 钟晓环: @曲晓杰 客户下出库单时会同步下增值，如果任务到你那边没有的话，代表没下不需要额外操作。
[2026-07-14 15:08] 曲晓杰: 上次有一次就是没同步，我们都缠膜弄好了非标才下进来
[2026-07-14 15:08] 曲晓杰: [黑线]
[2026-07-14 15:08] 钟晓环: WO12102434676 - VASC000000317001 -这单有

WO12102924332 ，WO12102797894 这两个没有
[2026-07-14 16:01] 曲晓杰: WO12102857982 @钟晓环 这单也没吧WO12103731601 WO12103991974 还有这3单
[2026-07-14 16:02] 钟晓环: @曲晓杰 这三个都没有增值
[2026-07-14 16:02] 曲晓杰: ok
[2026-07-14 16:36] 曲晓杰: @钟晓环 WO12103884284 VASC000000317334 这个询价的，有些托盘指定打4件，这个欧标也可以打的，系统下的是英标托盘，这样到时候装车其实浪费很多装车空间了
[2026-07-14 16:37] 曲晓杰: [Image: img_v3_0213j_ac2fce2b-a94b-44fa-9db3-cc74a72a1a3h]
这些3 件 4件的都可以用欧标打托的。
[2026-07-14 16:40] 钟晓环: @曲晓杰 所以你的意思是3件或者4件的，建议客户用欧标打，剩下的用英标打，这可以的话，装车空间不浪费是么？
[2026-07-14 16:41] 钟晓环: @曲晓杰 我理解正确吗
[2026-07-14 16:41] 钟晓环: 还是说我理解错误
[2026-07-14 16:47] 曲晓杰: 是这样的，英托大但是打托数量都一样
[2026-07-14 16:49] 钟晓环: @曲晓杰 我问一下客户后回复你
[2026-07-14 17:17] 曲晓杰: 好的，等确认后我用准确数据去询价。还有如果用欧标了，得找IT去掉打托尺寸限制
[2026-07-14 17:23] 钟晓环: @曲晓杰 客户接受你这个提议，
麻烦询价
[2026-07-15 20:56] 曲晓杰: @钟晓环 为啥现在下单都选英标了呢？只能打托又大部分一托只打4件
[2026-07-16 10:32] 钟晓环: @曲晓杰 我不是很清楚，后续是要客户修改下欧标托吗？
[2026-07-16 20:40] 曲晓杰: @钟晓环 WO12103884284今天给报价了
[2026-07-17 19:13] 曲晓杰: @钟晓环 @Lu Shi
[2026-07-17 19:14] 钟晓环: @曲晓杰 什么问题
[2026-07-17 19:14] Lu Shi: 一车装不下，都是英标托盘
[2026-07-17 19:14] 曲晓杰: WO12103731601这单22托装不下
[2026-07-17 19:16] 钟晓环: @曲晓杰 那现在要怎么处理，在预约一个车来吗？
[2026-07-17 19:17] Lu Shi: 有的托盘可能要改欧标
[2026-07-17 19:18] Lu Shi: 客户订车要跟车行说明是英标的
[2026-07-17 19:20] Lu Shi: 而且这种打托方式已经超出了英标
[2026-07-17 19:25] 钟晓环: @Lu Shi WO12103731601 现在提货车队来了是吗？
一共要改几个托盘为欧的，我让客户联系那边沟通
[2026-07-17 19:25] 钟晓环: @孟登科 cc
[2026-07-17 19:26] Lu Shi: @钟晓环 是啊，现在正在试着装，装到最后就知道几托需要改了
[2026-07-17 19:28] Lu Shi: 刚才装满了装不下，拉出来重新装的
[2026-07-17 19:29] 钟晓环: @Lu Shi 如果是改欧标的话，能否全部装下呢，还是说等最后装完才知晓，
需要客户这边联系司机稍等吗？
[2026-07-17 19:29] Lu Shi: 跟客户说说最好用欧标托盘，我们可以预判装车情况
[2026-07-17 19:31] Lu Shi: @钟晓环 装着看，不能预判，因为车上还有3托空托盘，司机也不知道我们是英标托盘
[2026-07-17 19:32] 钟晓环: @Lu Shi 客户说装不下就直接改托，他没关系，别让这个司机跑了，不然在安排一车过来收剩下的话，太贵了！
麻烦了，谢谢
[2026-07-17 19:35] 钟晓环: @Lu Shi 如果改托以后还是放不下，就比如拆托，将货物堆放在其他托上，货物不会掉下来就可以了。
[Image: img_v3_0213m_1cbcd4b8-8388-42ae-942b-122329b136ag]
[2026-07-17 19:38] 钟晓环: [Image: img_v3_0213m_6a4f4445-c8cc-4368-aa44-0e3c6ae07fdg]
[2026-07-17 19:39] 钟晓环: [笑哭]@Lu Shi 现场想办法 尽量一车走 ，谢谢
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000317001 WO12102434676 DEBR2 Warehouse 19227270 自由創新(香港)有限公司 出库非标增值（特批）@孟登科 @钟晓环 这个审批了，让客户确认报价
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000317001",
    "requirementDescription": "出库下架单：WO12102434676  1.M010000000009491322（7件），按照附件SOP操作，覆盖旧的EAN条形码标签，补贴新EAN条形码标签。操作：只覆盖旧EAN码里面的“条形码”，新的条形码尺寸按照（5*2.5）进行打印出来贴在旧条形码上，不要覆盖EAN的注意事项说明以及“条形码”下面的客户公司网址（www.libernovo.com）。 附件上传了覆盖/补贴SOP流程，新的EAN条形码标签PDF文件也上传附件，还有商品与EAN条形对应关系文件。   2.M010000000009491322 （7件中任选1件），补贴EAN条形码后，再额外补贴一张箱唛。箱唛尺寸热敏纸10*6cm，贴在侧面空白位置就可以。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000317001",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055746"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055749"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055752"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "出库下架单：WO12102434676  1.M010000000009491322（7件），按照附件SOP操作，覆盖旧的EAN条形码标签，补贴新EAN条形码标签。操作：只覆盖旧EAN码里面的“条形码”，新的条形码尺寸按照（5*2.5）进行打印出来贴在旧条形码上，不要覆盖EAN的注意事项说明以及“条形码”下面的客户公司网址（www.libernovo.com）。 附件上传了覆盖/补贴SOP流程，新的EAN条形码标签PDF文件也上传附件，还有商品与EAN条形对应关系文件。   2.M010000000009491322 （7件中任选1件），补贴EAN条形码后，再额外补贴一张箱唛。箱唛尺寸热敏纸10*6cm，贴在侧面空白位置就可以。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055755"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "商品：M010000000009491322（7件）由于实物产品介绍标签更新，所以要补贴。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055758"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055761"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055779"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055782"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055785"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055788"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055791"
  },
  {
    "vascNo": "VASC000000317001",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3055794"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "订单体积",
    "fieldKey": "ATTR_KEY_ORDER_VOLUME",
    "fieldValue": "32.19918",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060807"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "订单重量",
    "fieldKey": "ATTR_KEY_ORDER_WEIGHT",
    "fieldValue": "2553.48",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060810"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "预估托盘数",
    "fieldKey": "ATTR_KEY_ESTIMATED_PALLETS",
    "fieldValue": "17",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060813"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "国家",
    "fieldKey": "ATTR_KEY_COUNTRY",
    "fieldValue": "Sweden",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060816"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "州/省",
    "fieldKey": "ATTR_KEY_STATE_PROVINCE",
    "fieldValue": "Skåne",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060819"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "城市",
    "fieldKey": "ATTR_KEY_CITY",
    "fieldValue": "Löddeköpinge",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060822"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "邮编",
    "fieldKey": "ATTR_KEY_POSTAL_CODE",
    "fieldValue": "246 43",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060825"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "街道1",
    "fieldKey": "ATTR_KEY_STREET_1",
    "fieldValue": "Kontorsvägen 11",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060828"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "街道2",
    "fieldKey": "ATTR_KEY_STREET_2",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060831"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "门牌号",
    "fieldKey": "ATTR_KEY_HOUSE_NO",
    "fieldValue": "a",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060834"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "邮箱",
    "fieldKey": "ATTR_KEY_EMAIL",
    "fieldValue": "Philip.tegstam@trigono.se",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060837"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "公司名称",
    "fieldKey": "ATTR_KEY_COMPANY_NAME",
    "fieldValue": "Trigono AB",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060840"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "姓名",
    "fieldKey": "ATTR_KEY_NAME",
    "fieldValue": "Philip Tegstam",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060843"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "电话",
    "fieldKey": "ATTR_KEY_PHONE",
    "fieldValue": "+46 768 85 05 17",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060846"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "订单收货人类型",
    "fieldKey": "ATTR_KEY_ORDER_CONSIGNEE_TYPE",
    "fieldValue": "OTHER",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060849"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "收货人地址类型",
    "fieldKey": "ATTR_KEY_CONSIGNEE_ADDRESS_TYPE",
    "fieldValue": "BUSINESS",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060852"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "是否支持垛口卸货",
    "fieldKey": "ATTR_KEY_SUPPORT_DOCK_UNLOADING",
    "fieldValue": "Y",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060855"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "",
    "fieldKey": "ATTR_KEY_OPERATION_START_MODE",
    "fieldValue": "AWAITING_CONFIRMATION",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060858"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "目标派送方式",
    "fieldKey": "ATTR_KEY_DELIVERY_METHOD",
    "fieldValue": "LTL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060861"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "FBA Shipment ID",
    "fieldKey": "ATTR_KEY_FBA_SHIPMENT_ID",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060864"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "FBA Reference No.",
    "fieldKey": "ATTR_KEY_FBA_REF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060867"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "其他备注",
    "fieldKey": "ATTR_KEY_OTHER_REMARKS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060870"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "报价模式",
    "fieldKey": "ATTR_KEY_QUOTATION_MODE",
    "fieldValue": "MANUAL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060873"
  },
  {
    "vascNo": "VASC000000317334",
    "fieldName": "是否含有尾程陆运DG商品",
    "fieldKey": "HAS_LAST_MILE_LAND_DG",
    "fieldValue": "否",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1620",
    "serviceSequence": "1",
    "attrId": "3060876"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000317001",
    "attachmentName": "示例图.pdf",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "7ad5008faad040e4a8ee323a30b55654/2026/07/13/088eae0a866d44b7b2b4b47d37aa6842.pdf",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-07-13T20:04:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000317001",
    "attachmentName": "6978343440378--CP-GW-0000015-00-01EAN+label+replacement.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "2251f6ea5ecf4d5585882e7c8f4e017f/2026/07/13/d5e84989e5994a79ab4362327fa3828d.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-07-13T20:04:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000317001",
    "attachmentName": "Carton Label.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "91bd8a2e4e9e48be83f2f155e5ad8f1e/2026/07/13/055adfd847974cfe9fdf97e45f981af5.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-07-13T20:04:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000317001",
    "attachmentName": "WO12102434676=商品标签对应关系.xlsx",
    "attachmentType": "VAS_ATTR_REL_TCRBCAL",
    "url": "ee98a306b3ae4482b8955e163d9f4ad0/2026/07/13/aa990092ed724434990f710e025be628.xlsx",
    "attributeName": "商品和标签的对应关系",
    "attributeKey": "VAS_ATTR_REL_TCRBCAL",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-07-13T20:04:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000317001",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000317334",
    "sop": "\"1、仓库/尾程SD报价；"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S006 · `vasc:VASC000000268386`

- caseType：`oms_direct_pass` / caseIdType：`vasc`
- 抽样槽位：boundary；原因：场景「【出库】代理清关」边界/补充样本
- VASC：VASC000000268386
- EB：（无）；WI：（无）；WO：WO11312437983；M：（无）
- 场景：【出库】代理清关
- 服务：代理清关
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000268386", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000268386",
    "fieldName": "备注说明",
    "fieldKey": "VAS_ATTR_REL_RI",
    "fieldValue": "WO11312437983 清关文件",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "serviceSequence": "1",
    "attrId": "2405310"
  },
  {
    "vascNo": "VASC000000268386",
    "fieldName": "附件",
    "fieldKey": "EVENT02",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "serviceSequence": "1",
    "attrId": "2405313"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000268386",
    "attachmentName": "WO11312437983.zip",
    "attachmentType": "EVENT02",
    "url": "76413c4a27ba4272873cbe62beaaae97/2026/04/17/6446818473dc408994712bd62a95ce00.zip",
    "attributeName": "附件",
    "attributeKey": "EVENT02",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "created": "2026-04-21T20:00:59Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000268386",
    "attachmentName": "VASC000000268386 WO11312437983.pdf",
    "attachmentType": "EVENT02",
    "url": "b80f0eaa24094528aaba031221012245/2026/04/21/c18b61918c374de1911df0b8aab41292.pdf",
    "attributeName": "附件",
    "attributeKey": "EVENT02",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "created": "2026-04-21T20:00:59Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000268386",
    "sop": "打印附件的清关文件，交付尾程供应商，完成出库"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S007 · `vasc:VASC000000320478`

- caseType：`oms_direct_pass` / caseIdType：`vasc`
- 抽样槽位：补足；原因：场景「【出库】代理清关」补足
- VASC：VASC000000320478, VASC000000318420
- EB：（无）；WI：（无）；WO：WO12102337365；M：（无）
- 场景：【出库】代理清关
- 服务：库内其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000320478", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000320478",
    "requirementDescription": "客户出库单WO12102337365  已经完成代理清关，VASC000000318420  但是由于出库单被作废，导致增值单取消  无法收取代理清关增值费 ，故需提交一个非标补收，麻烦协助处理"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000320478",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117762"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117765"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117768"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117771"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117774"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "客户出库单WO12102337365  已经完成代理清关，VASC000000318420  但是由于出库单被作废，导致增值单取消  无法收取代理清关增值费 ，故需提交一个非标补收，麻烦协助处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117777"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "客户出库单WO12102337365  已经完成代理清关，VASC000000318420  但是由于出库单被作废，导致增值单取消  无法收取代理清关增值费 ，故需提交一个非标补收，麻烦协助处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117780"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117783"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117795"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117798"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117801"
  },
  {
    "vascNo": "VASC000000320478",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3117804"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000320478",
    "attachmentName": "52603ccf8e42496a852b1e5cfdf8e94e.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/ecd2be457a4f4c28a5638775212bc6fc/2026/07/24/52603ccf8e42496a852b1e5cfdf8e94e.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-24T16:30:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000320478",
    "sop": "【背景】客户出库单WO12102337365  已经完成代理清关，VASC000000318420  但是由于出库单被作废，导致增值单取消  无法收取代理清关增值费。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S008 · `vasc:VASC000000269523`

- caseType：`oms_direct_pass` / caseIdType：`vasc`
- 抽样槽位：补足；原因：场景「【出库】代理清关」补足
- VASC：VASC000000269523
- EB：（无）；WI：（无）；WO：WO11316994322；M：（无）
- 场景：【出库】代理清关
- 服务：代理清关
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000269523", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000269523",
    "fieldName": "备注说明",
    "fieldKey": "VAS_ATTR_REL_RI",
    "fieldValue": "WO11316994322  清关文件",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "serviceSequence": "1",
    "attrId": "2418882"
  },
  {
    "vascNo": "VASC000000269523",
    "fieldName": "附件",
    "fieldKey": "EVENT02",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "serviceSequence": "1",
    "attrId": "2418885"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000269523",
    "attachmentName": "WO11316994322-.zip",
    "attachmentType": "EVENT02",
    "url": "3930c579f7af4148b777deb6ab50e070/2026/04/21/c66811b57f304b5393a8150d5b73a672.zip",
    "attributeName": "附件",
    "attributeKey": "EVENT02",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "created": "2026-04-23T18:47:31Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000269523",
    "attachmentName": "VASC000000269523 WO11316994322.pdf",
    "attachmentType": "EVENT02",
    "url": "e21c62482d1040dca01b2488a934028e/2026/04/23/e837107d75f845a38c4a8a125f888f47.pdf",
    "attributeName": "附件",
    "attributeKey": "EVENT02",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1657",
    "created": "2026-04-23T18:47:31Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000269523",
    "sop": "打印附件的清关文件，交付尾程供应商，完成出库"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S009 · `thread:omt_190502ef9ccfdb86`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【出库】补贴/更换商品标签」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000322965, VASC000000323067, VASC000000323097, VASC000000323205, VASC000000323202, VASC000000323199, VASC000000323196, VASC000000323193, VASC000000323190, VASC000000323187, VASC000000323184, VASC000000323181, VASC000000266145
- EB：（无）；WI：（无）；WO：WO12116857042, WO12116878856, WO12116937701, WO12116919336, WO12116977803, WO12116919868, WO12117040051, WO12117031006, WO12116949715, WO11303781900, WO11303894492；M：（无）
- 场景：【出库】补贴/更换商品标签
- 服务：出库其他服务需求
- attachmentStatus：`text_mention_only`
- caseQualityFlags：["possible_chat_completion_then_pass", "possible_resubmit_after_reject", "possible_resubmit_after_cancel"]
- 审核结果：[{"vascNo": "VASC000000322965", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000323067", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000323097", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000323205", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000323202", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000323199", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000323196", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000323193", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000323190", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000323187", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000323184", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000323181", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}]
- 退回原因：[{"vascNo": "VASC000000323205", "rejectReason": "需求描述不清晰，请线下与客服沟通"}, {"vascNo": "VASC000000323199", "rejectReason": "需求描述不清晰，请线下与客服沟通"}, {"vascNo": "VASC000000323193", "rejectReason": "需求描述不清晰，请线下与客服沟通"}, {"vascNo": "VASC000000323184", "rejectReason": "需求描述不清晰，请线下与客服沟通"}, {"vascNo": "VASC000000323181", "rejectReason": "需求描述不清晰，请线下与客服沟通"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-07-22 17:15] 刘燕春: VASC000000322965
VASC000000323067
VASC000000323097
出库非标增值（特批）
您好，这个几个增值都是每个产品包裹需要覆盖原WINT条码，因为客户多个出库单放在一个增值里面了，有的出库单仓库已经拣选了，帮先审核，谢谢@陈泽森
[2026-07-22 17:44] 陈泽森: 一个出库单一个增值，不要这样提交，这样仓库不好找。而且容易一个单里面部分做了，部分没做出问题@刘燕春
现在有部分是打包完成状态了，这种也会卡着不能下发增值的
[2026-07-22 17:51] 刘燕春: @陈泽森 好的，我和客户说看看
[2026-07-22 18:17] 刘燕春: VASC000000323205
VASC000000323202
VASC000000323199
VASC000000323196
VASC000000323193
VASC000000323190
VASC000000323187
VASC000000323184
VASC000000323181@陈泽森 客户重新下了，打包完成也下了，这种还有什么办法可以传递给仓库这个信息吗
[2026-07-22 18:18] 陈泽森: 打包完成的传不过去了，不暂存的订单的话
[2026-07-22 18:19] 刘燕春: @陈泽森 好的，帮先审核吧，谢谢
[2026-07-22 18:20] 刘燕春: [WO12117040051](https://cnomstom.winit.com.cn/OverseasOBOrder/detail/orderNo/WO12117040051)
[WO12116857042](https://cnomstom.winit.com.cn/OverseasOBOrder/detail/orderNo/WO12116857042)
打包完成：
[2026-07-22 18:24] 陈泽森: 就是上面的非标增值里面对应的出库单都已经线下 覆盖补贴标签了？@刘燕春
[2026-07-22 18:25] 刘燕春: 其实重复问了客户，客户是说单品包装上的标签都需要清除/覆盖，应该是只有一个WINIT商品条码的标签的，，
[Image: img_v3_0213r_4b5d977c-7ca0-4728-84aa-7423fd91483g]
[2026-07-22 18:25] 刘燕春: @陈泽森
[2026-07-22 18:26] 刘燕春: 刚好这几单出库有来问其他信息，就问下仓库有没有覆盖WINIT商品条码的标签
[2026-07-22 18:26] 陈泽森: 所以这些单实物上线下是否做完覆盖商品条码了？
[2026-07-22 18:27] 陈泽森: 这种标准增值 补贴商品条码的增值可以做的，为啥客户要在非标里提？
[2026-07-22 18:27] 刘燕春: 覆盖了WINIT商品条码的标签@陈泽森 ‘
[2026-07-22 18:29] 刘燕春: 客户不需要补贴商品条码，是加贴了个这种条码@陈泽森 这种条码在补贴商品条码的位置上传不了，
示例的，知道就行
[Image: img_v3_0213r_becdc14f-6bc1-4995-96e6-eba382de247g]
[2026-07-22 18:30] 陈泽森: 客户这个场景的单多吗，要补贴这种标签，然后覆盖M码标签的
[2026-07-22 18:31] 陈泽森: 收货仓是哪家的？
[Image: img_v3_0213r_46c7b01c-73ad-4699-ae02-bb711956dd1g]
[2026-07-22 18:34] 刘燕春: 我问问呢
[2026-07-22 18:37] 刘燕春: @陈泽森 后面可能比较多，发京东仓库
[2026-07-22 18:43] 陈泽森: 每个月大概有多少的单量呀
[2026-07-22 18:43] 陈泽森: 这种能一批下过去吗，不要这样拆的零零散散的出库单
[2026-07-22 18:44] 陈泽森: 既然是转3方仓的，我理解是直接一托一个出库单过去不是更合适吗？
[2026-07-22 18:54] 陈泽森: [WO12116977803](https://cnomstom.winit.com.cn/OverseasOBOrder/detail/orderNo/WO12116977803)
[WO12116949715](https://cnomstom.winit.com.cn/OverseasOBOrder/detail/orderNo/WO12116949715)
WO12116919868
[WO12116878856](https://cnomstom.winit.com.cn/OverseasOBOrder/detail/orderNo/WO12116878856)
这4个的审批了抓紧确认报价吧，晚了又不行了。。@刘燕春 另外几个的走一个库内非标补收吧
[2026-07-22 18:56] 陈泽森: 打包完成的5个单我退回吧，下不去仓库的。系统会自动退回
[2026-07-22 18:59] 陈泽森: @刘燕春 这个之前有个需求的，你收集下看看单量，我看看能不能提高下优先级
[2026-07-22 19:10] 刘燕春: @黄璐 这里
[2026-07-22 19:15] 黄璐: @陈泽森 这个历史报价我们是支持一个非标增值下多个出库单的，你现在让客户按出库单下非标增值，一个非标增值按45美金报价，这个客户怎么承担的了费用？本身这个是我们系统缺陷导致，非标增值的目的是传递仓库处理，应该是无费用的吧
[2026-07-22 19:16] 黄璐: 我找一下上次的记录
[2026-07-22 19:18] 黄璐: 我转了之前的记录给你了，非标增值不收费的
[2026-07-22 19:20] 陈泽森: 这些出库单作业顺序是不一样的，不是连续的，所以得将出库单分开下增值呀
[2026-07-22 19:21] 黄璐: @陈泽森 是可以实现用一个非标增值去关联所有入库单去操作的，客户每个po 3箱货，我们英国不支持一单多面单后打单的模式，所以没法下到1个单里
[2026-07-22 19:22] 黄璐: 每个出库单作业的时候都可以关联到增值单的，他操作出库单就能看到指令啊
[2026-07-22 19:23] 陈泽森: 非标只能关联一个出库单号的呀。
[2026-07-22 19:23] 黄璐: 还有费用的问题看下哈
[2026-07-22 19:24] 黄璐: 你等我找下他历史的单哈
[2026-07-22 19:24] 陈泽森: 系统里面关联，不是备注里面填写
[2026-07-22 19:29] 黄璐: @刘燕春 客户是不是下出库单没勾选非标增值[泪奔]
[2026-07-22 19:35] 黄璐: VASC000000266145 =这个客户用出库单：
WO11303781900提的增值，然后出库单：**WO11303894492 是可以查到：**
[Image: img_v3_0213r_2a2f8c72-25e5-4a4d-89bb-a284f5ebb80g]
关联的非标增值单的
[2026-07-22 19:35] 黄璐: @陈泽森
[2026-07-22 19:58] 陈泽森: 不是一个东西呀，4492这个出库单是审核出库单，因为勾选了非标，被卡住状态了，需要审核出库单的非标才能同步云仓
[2026-07-22 19:58] 陈泽森: [Image: img_v3_0213r_d5d7f5c5-107d-4ce5-84d9-aabc122655eg]
@黄璐 得要这种的，有具体的非标操作需求的
[2026-07-22 19:59] 黄璐: 嗯，我上面问了，是不是下单没有选非标
[2026-07-22 19:59] 黄璐: 仓库本来就有找我们说这个客户的问题了，我先找仓库救火一下
[2026-07-22 20:00] 陈泽森: 所以非标的就是要一个订单一个增值单的。这样每个出库单仓库作业的时候才能知道这些出库单有增值需要去完成
[2026-07-22 20:01] 黄璐: 可是有时候客户要出几十箱也， 每个po就几箱，搞不了卡车，这非标增值要提好多个，这个又不能批量..
[2026-07-22 20:02] 陈泽森: 如果按照他这个转京东仓的场景，我理解托盘出库更合适的吧，那不是应该一个出库单下完吗？
[2026-07-22 20:02] 黄璐: 这3个po，9箱货
[2026-07-22 20:02] 黄璐: 咋用托盘呀
[2026-07-22 20:02] 黄璐: 而且我们现在托盘dhl freight问题很多
[2026-07-22 20:03] 黄璐: 上次客户发cd仓，用这个渠道，派送搞了一个月[新月脸]
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000322965 VASC000000323067 VASC000000323097 出库非标增值（特批） 您好，这个几个增值都是每个产品包裹需要覆盖原WINT条码，因为客户多个出库单放在一个增值里面了，有的出库单仓库已经拣选了，帮先审核，谢谢@陈泽森
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000322965",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323067",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323097",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323205",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323202",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323199",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323196",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323193",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323190",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323187",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323184",
    "requirementDescription": "产品标签需要覆盖"
  },
  {
    "vascNo": "VASC000000323181",
    "requirementDescription": "产品标签需要覆盖"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000322965",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157170"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157173"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157176"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157179"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "WO12116857042 WO12116878856每个产品包裹需要覆盖原WINT条码",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157182"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157185"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157203"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157206"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157209"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157212"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157215"
  },
  {
    "vascNo": "VASC000000322965",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157218"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157545"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157548"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157551"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157554"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "WO12116937701 WO12116919336 WO12116977803 WO12116919868每个产品包裹需要覆盖原WINT条码",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157557"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157560"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157578"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157581"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157584"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157587"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157590"
  },
  {
    "vascNo": "VASC000000323067",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3157593"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158190"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158193"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158196"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158199"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "WO12117040051 WO12117031006 WO12116949715每个产品包裹需要覆盖原WINT条码",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158202"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158205"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158223"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158226"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158229"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158232"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158235"
  },
  {
    "vascNo": "VASC000000323097",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3158238"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162579"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162582"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162585"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162588"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162591"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162594"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162612"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162615"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162618"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162621"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162624"
  },
  {
    "vascNo": "VASC000000323205",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162627"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162477"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162480"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162483"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162486"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162489"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162492"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162510"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162513"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162516"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162519"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162522"
  },
  {
    "vascNo": "VASC000000323202",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162525"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162375"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162378"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162381"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162384"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162387"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162390"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162408"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162411"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162414"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162417"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162420"
  },
  {
    "vascNo": "VASC000000323199",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162423"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162273"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162276"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162279"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162282"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162285"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162288"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162306"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162309"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162312"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162315"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162318"
  },
  {
    "vascNo": "VASC000000323196",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162321"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162171"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162174"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162177"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162180"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162183"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162186"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162204"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162207"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162210"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162213"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162216"
  },
  {
    "vascNo": "VASC000000323193",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162219"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162069"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162072"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162075"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162078"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162081"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162084"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162102"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162105"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162108"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162111"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162114"
  },
  {
    "vascNo": "VASC000000323190",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162117"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161967"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161970"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161973"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161976"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161979"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161982"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162000"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162003"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162006"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162009"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162012"
  },
  {
    "vascNo": "VASC000000323187",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3162015"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161865"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161868"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161871"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161874"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161877"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161880"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161898"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161901"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161904"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161907"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161910"
  },
  {
    "vascNo": "VASC000000323184",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161913"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161763"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161766"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161769"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "产品标签需要覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161772"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "单品包装上的标签都需要清除覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161775"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161778"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161796"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161799"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161802"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161805"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161808"
  },
  {
    "vascNo": "VASC000000323181",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "3161811"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "attachmentName": "text_mention_only",
    "attachmentType": "unknown",
    "url": "",
    "source": "text_mention_in_chat_or_requirement_or_sop",
    "verification": "text_mention_only"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000323202",
    "sop": "WO12116878856  实物已覆盖原winit商品条码标签，补收费用"
  },
  {
    "vascNo": "VASC000000323196",
    "sop": "WO12116919868　实物已覆盖原winit商品条码标签，补收费用"
  },
  {
    "vascNo": "VASC000000323190",
    "sop": "WO12116949715 实物已覆盖原winit商品条码标签，补收费用"
  },
  {
    "vascNo": "VASC000000323187",
    "sop": "WO12116977803 实物已覆盖原winit商品条码标签，补收费用"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S010 · `thread:omt_19667c35f10e5c97`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【出库】补贴/更换商品标签」边界/补充样本
- VASC：VASC000000280836, VASC000000280833, VASC000000280830, VASC000000280827, VASC000000280746, VASC000000284619, VASC000000284652, VASC000000284715, VASC000000284718
- EB：（无）；WI：（无）；WO：WO11448053101, WO11448112020, WO11420180376, WO11420175180, WO11420169305, WO11420156974, WO11419758574, WO11420088096, WO11447943907；M：（无）
- 场景：【出库】补增值后补包裹/托盘级标签, 【出库】补贴/更换商品标签
- 服务：出库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "possible_resubmit_after_reject", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000280836", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000280833", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000280830", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000280827", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000280746", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000284619", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000284652", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000284715", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000284718", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[{"vascNo": "VASC000000280836", "rejectReason": "仓库暂时无法提供该服务"}, {"vascNo": "VASC000000280833", "rejectReason": "仓库暂时无法提供该服务"}, {"vascNo": "VASC000000280830", "rejectReason": "仓库暂时无法提供该服务"}, {"vascNo": "VASC000000280827", "rejectReason": "仓库暂时无法提供该服务"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-13 11:50] 张淼: VASC000000280836 WO11420180376 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司 出库非标增值（特批） 出库其他服务需求 
VASC000000280833 WO11420175180 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司 出库非标增值（特批） 出库其他服务需
VASC000000280830 WO11420169305 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司 出库非标增值（特批） 出库其他服务需求
VASC000000280827 WO11420156974 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司 出库非标增值（特批） 出库其他服务需求 
@程飞 @陈志颖 这四单都出库了，做不了增值退回了
[2026-05-13 11:58] 张淼: VASC000000280746 WO11419758574 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司这单审核了，让客户确认吧
[2026-05-13 11:59] 张淼: @程飞 @陈志颖
[2026-05-19 16:30] 陈志颖: WO11420088096
VASC000000284619 同个场景的增值，麻烦加急审核下以免订单出库无法操作@陈泽森
[2026-05-19 16:53] 陈泽森: @陈志颖 客户后面这种需求多吗? 所以只需要提醒仓库补贴商品标签的时候覆盖原来的winit标签就行是吧? cc @郭泽纯
[2026-05-19 16:55] 陈志颖: @陈泽森 多，这个客户经常做转仓到京东仓的
[2026-05-19 16:55] 陈志颖: WO11447943907
VASC000000284652还有这个也审核下
[2026-05-19 16:55] 陈泽森: [Image: img_v3_0211r_3b1ee959-7242-46b3-9b36-3deb197ec92g]
这个文件名的-吗? 我看标签里面没有-呀
[Image: img_v3_0211r_5e24acdd-08bd-444f-b783-89e2f8515deg]
[2026-05-19 16:57] 陈志颖: @陈泽森 他以前提增值有的标签是有带符号-的，直接按之前的模板复制提增值了:Lark_Emoji_Enough_0:
[Image: img_v3_0211r_ff11017b-8812-458b-9ba3-d37b542e428g]
[2026-05-19 16:58] 陈泽森: 那他这个新标签没有- 也不能在补贴商品标签上传吗?
[2026-05-19 17:00] 陈志颖: WO11447943907
VASC000000284652=这单不行，这单标签的确有-符号，
WO11420088096
VASC000000284619 =这单我问下客户是否接受补贴商品标签
[2026-05-19 17:14] 陈志颖: @陈泽森 客户说他不确定我们生成的标签对bol平台仓是否会有扫描影响，还是先审核操作吧，这个订单现在已经拣选完成了
[Image: img_v3_0211r_87cd1dac-ccf6-4b9e-a733-7e7302f8e7dg]
[2026-05-19 17:26] 陈泽森: WO11447943907 扬哥,你看看这个单,需要补贴覆盖的商品标签是带"-" 的
我试了下,带 - 的三方条码是可以使用的. 可以使用 -的情况下,覆盖商品标签为啥不能使用带- 的呀:Lark_Emoji_Facepalm_0:
[Image: img_v3_0211r_70f97f92-19f1-4528-8f24-dcafd8bac3bg]
[Image: img_v3_0211r_a688320f-a998-4714-81f8-5a6c7352bcbg]

@刘扬
[2026-05-19 17:33] 陈志颖: @陈泽森 这个增值能否先审核下，另外我们能否找到bol平台确认是否支持使用我们系统生成的标签文件？或者是否有客户做过没有问题？
如果没有案例，即便系统支持识别客户也不肯使用我们标签，他们不肯承担无法上架被退货回来的风险
[2026-05-19 17:37] 陈泽森: @陈志颖 我先审过去了
[2026-05-19 17:41] 刘扬: @陈泽森 应该支持，待优化
[2026-05-19 17:49] 陈志颖: @陈泽森 WO11448053101
VASC000000284715 

WO11448112020
VASC000000284718 又发来两单要审核[新月脸]
[2026-05-19 17:55] 郭泽纯: @陈志颖 不确定是否可用，那就确定啊，客户上传的跟我们系统生成的有什么区别？你可以在增值生成文件那里看一下
[2026-05-19 17:55] 郭泽纯: 不能因为不确定然后就走非标呀，非标也会收最低收，对客户来说也不划算
[2026-05-19 17:58] 郭泽纯: @陈泽森 这个痛点可以先记在表里，商品标签的问题我们汇总起来一起提需求，我记得还有几个
[2026-05-19 18:06] 陈志颖: @郭泽纯 客户想要我们海外仓去找平台方了解，他们找平台都是直接回复建议使用他们标签文件的
[2026-05-19 18:09] 郭泽纯: @陈志颖 我们去问，也会是一样的结果，他的标签有什么特殊的吗，我看上面，不就是一个编号一个条码吗
[Image: img_v3_0211r_b259d504-367f-468f-bade-4e3040b0303g]
[2026-05-19 18:14] 陈志颖: @郭泽纯 没有什么特殊，只是客户不想承担这个风险，这些货都是寄往荷兰的，如果标签识别不了无法上架bol是不支持换标，只能退回来由我们重新操作再出库
[2026-05-19 18:21] 郭泽纯: @陈志颖 这个直接下个单看下，生成文件有什么差异，然后作废，或者直接拿生成的文件问平台也可以呀，不能因为这个走非标呀，这个需要跟客户说清楚，-的是我们系统缺陷，我们可以批，但是标准增值能走的，我们不能走非标
[2026-05-19 18:31] 陈志颖: @郭泽纯 已经跟客户说过了，他只回了会跟运营沟通然后就不理人了[新月脸]
[2026-05-19 18:31] 陈泽森: [Sticker]
[2026-05-25 16:59] 陈泽森: @郭泽纯
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000280836 WO11420180376 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司 出库非标增值（特批） 出库其他服务需求 VASC000000280833 WO11420175180 DEBR2 Warehouse 11109517 深圳市乐转赢电子有限公司 出库非标增值（特批） 出库其他服务需 VA...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000280836",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000280833",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000280830",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000280827",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000280746",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000284619",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000284652",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000284715",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  },
  {
    "vascNo": "VASC000000284718",
    "requirementDescription": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000280836",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562252"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562255"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562258"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562261"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562264"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562267"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562285"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562288"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562291"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562294"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562297"
  },
  {
    "vascNo": "VASC000000280836",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562300"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562150"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562153"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562156"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562159"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562162"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562165"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562183"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562186"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562189"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562192"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562195"
  },
  {
    "vascNo": "VASC000000280833",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562198"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562048"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562051"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562054"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562057"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562060"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562063"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562081"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562084"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562087"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562090"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562093"
  },
  {
    "vascNo": "VASC000000280830",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2562096"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561946"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561949"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561952"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561955"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款 因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561958"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561961"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561979"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561982"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561985"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561988"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561991"
  },
  {
    "vascNo": "VASC000000280827",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561994"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560791"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560794"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560797"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560800"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560803"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560806"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560824"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560827"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560830"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560833"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560836"
  },
  {
    "vascNo": "VASC000000280746",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2560839"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611872"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611875"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611878"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611881"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611884"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611887"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611905"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611908"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611911"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611914"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611917"
  },
  {
    "vascNo": "VASC000000284619",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2611920"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612814"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612817"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612820"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612823"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款  因提供的第三方编码有”-“字符，系统不支持识别，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612826"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612829"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612847"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612850"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612853"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612856"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612859"
  },
  {
    "vascNo": "VASC000000284652",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2612862"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614752"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614755"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614758"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614761"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614764"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614767"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614785"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614788"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614791"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614794"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614797"
  },
  {
    "vascNo": "VASC000000284715",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614800"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614956"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614959"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614962"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614965"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "如果实物有winit商品标签，收件方无法正常上架，且可能还会有罚款，因此无法勾选补贴商品标签-覆盖原商品条码，只能提补贴商品其他标签上传标签文件，线下提增值要求仓库覆盖标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614968"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614971"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614989"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614992"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614995"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2614998"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2615001"
  },
  {
    "vascNo": "VASC000000284718",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2615004"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000284652",
    "attachmentName": "7a0056aa35404b69ae702f7a3c73672a.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/1692d45c87f14dfc9594430bf50c3ea2/2026/05/19/7a0056aa35404b69ae702f7a3c73672a.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-19T22:22:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000280746",
    "sop": "1、注意：在做【补贴商品其他标签（非商品条码）】时，要覆盖原标签"
  },
  {
    "vascNo": "VASC000000284619",
    "sop": "1、注意：在做【补贴商品其他标签（非商品条码）】时，要覆盖原标签"
  },
  {
    "vascNo": "VASC000000284652",
    "sop": "1、注意：在做【补贴商品其他标签（非商品条码）】时，要覆盖原标签"
  },
  {
    "vascNo": "VASC000000284715",
    "sop": "1、注意：在做【补贴商品其他标签（非商品条码）】时，要覆盖原标签   出库单 WO11448053101"
  },
  {
    "vascNo": "VASC000000284718",
    "sop": "WO11448112020  1、注意：在做【补贴商品其他标签（非商品条码）】时，要覆盖原标签"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S011 · `thread:omt_19641a7b9b4adb8b`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【入库】指定商品拍照暂存」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000279312, VASC000000279456, VASC000000279468, VASC000000279474, VASC000000281274
- EB：EB0326042829105601, EB0326043029163189, EB0326043029163033, EB0326043029163039；WI：WI48529320, WI48655204, WI48657006, WI48657188；WO：（无）；M：M010000000006269604, M010000000006269591, M010000000006269589, M010000000006269596, M010000000006269598, M010000000006269597, M010000000006269593, M010000000006269599
- 场景：【入库】指定包裹拍照, 【入库】指定商品拍照暂存
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000279312", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000279456", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000279468", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000279474", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000281274", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-11 16:26] 许晓妍: VASC000000279312 WI48529320 EB0326042829105601 
VASC000000279456 WI48655204 EB0326043029163189
VASC000000279468 WI48657006 EB0326043029163033
VASC000000279474 WI48657188 EB0326043029163039
UKTW Warehouse 18087443 DREAM PAIRS EUROPE INC - 1
@刘燕春 @黄东渊 1、这些单因为是通过异常下的增值，需要客户下新的入库单；2、这些单的需求是用第三方条码入库吗？
[2026-05-11 16:29] 刘燕春: @许晓妍 好的，我尝试问问知不知道大概的SKU
2:是的
[2026-05-12 11:50] 刘燕春: @许晓妍 1.因为现在登记了计划外的异常，客户怀疑是黑膜上的标签贴错了，客户现在也不知道这个货物实际是哪个sku，无法下新单下正确的SKU，
仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上没有下/无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单处理的
[2026-05-12 11:53] 许晓妍: @刘燕春 那就是先做拆包裹+拍照辨识，等客户后续下新的入库单和增值单再进行处理
[2026-05-12 11:59] 刘燕春: @许晓妍 可以直接辨识出上架的直接上的，不能的再反馈给客户处理的
[2026-05-12 21:43] 许晓妍: @刘燕春 这几单，我先按全部异常商品的总数算了拆黑膜的费用+拍照费用+换winit包装袋的操作费用+winit包装袋包材费+贴商品标签费用。因为客户商品都是鞋子且其他商品用黑膜包好上架，所以我们仓库入库也要用包装袋包好才能上架。
[2026-05-12 21:46] 许晓妍: @刘燕春 实际费用以最终仓库操作动作为准，如果有多余收费可以走客服退费。
[2026-05-12 21:59] 许晓妍: @Jessica Chu 这两个是VASC000000279468的商品标签，请提供给仓库
[2026-05-13 12:30] 刘燕春: @许晓妍 您好，VASC000000279474==EB0326043029163039 单品数量：11
这个帮看下费用组成的，好像是不是都是按照了8个单品收费了的，帮看下，谢谢
[Image: img_v3_0211l_8fd26660-b85c-46af-bfd1-5497ff66651g]
[Image: img_v3_0211l_2e08fc5b-447d-4255-844e-a29ee6a6941g]
[2026-05-13 12:44] 许晓妍: @刘燕春 
[Image: img_v3_0211l_bea41577-d6db-4ceb-9db9-925607220b4g]
我点的是这里
[2026-05-13 12:45] 许晓妍: @刘燕春 客户有疑问的话那就取消一下我按按异常单登记的数量来算吧
[2026-05-13 13:55] 刘燕春: @许晓妍 好的，谢谢
[2026-05-13 14:01] 许晓妍: @刘燕春 让客户取消下重新下单吧
[2026-05-13 14:02] 刘燕春: @许晓妍 她不太愿意，我再和她说说
[2026-05-13 14:05] 刘燕春: 增值-拍照费是不是也错了，8个正常应该8*3=24
[Image: img_v3_0211l_5a0a44c2-b502-4cd6-980d-82de7a7021eg]
[2026-05-13 14:06] 许晓妍: @刘燕春 要看入库
[2026-05-13 14:08] 刘燕春: 有个增值-增加/更换/清除包装1.36是拆黑膜的费用对吧，这个是看哪个费用项啊
[2026-05-13 14:08] 刘燕春: @许晓妍
[2026-05-13 14:10] 刘燕春: 换winit包装袋的操作费用+winit包装袋包材费 都按照0.6算，所以8个单品是16对吧
[2026-05-13 14:11] 许晓妍: 看清除包装@刘燕春
[2026-05-13 14:13] 刘燕春: [Image: img_v3_0211l_32a7ffe3-bc78-4781-bec4-14e1d2e1c96g]
这个？@许晓妍
[2026-05-13 14:13] 刘燕春: 那1.36对不上
[2026-05-13 14:14] 许晓妍: winit包装袋包材费，看快递袋包材费用啊
[2026-05-13 14:15] 许晓妍: winit包装袋的操作费用，拆黑膜是看清除包装
[2026-05-13 14:20] 刘燕春: @许晓妍 好的，对上了，谢谢
[2026-05-13 15:25] 刘燕春: VASC000000281274@许晓妍 您好，帮先审核下，谢谢
[2026-05-13 18:27] Jessica Chu: @刘燕春 VASC000000279456我們拆掉黑膜後裡面的SKU都不在新入庫單WI48655204裡,辛苦再提供一個新入庫單上架
[Image: img_v3_0211l_bb8a4786-c238-41f8-b77a-8e5490dddf8h]
M010000000006269604, M010000000006269591, M010000000006269589, M010000000006269596, M010000000006269598, M010000000006269597, M010000000006269593, M010000000006269599
[2026-05-13 18:35] 刘燕春: @Jessica Chu 好的，我联系客户提供下
[2026-05-13 18:35] 许晓妍: @刘燕春 VASC000000281274已审批
[2026-05-13 19:08] 刘燕春: @许晓妍 拆黑膜的费用+拍照费用+换winit包装袋的操作费用+winit包装袋包材费+贴商品标签费用
VASC000000279468=EB0326043029163033=单品数量：8，这单是不是看错单品数量了，好像按照11个算了，客户着急先确认订单了的
正确应该是：
拆黑膜的费用和换winit包装袋的操作费用：16*0.6=9.6
增值-拍照费：8*2.5=20
winit包装袋包材费：0.17*8=1.36
贴商品标签费用：0.4*8=3.2
合计应该是：34.16GBP，预估收了42.24GBP
[Image: img_v3_0211l_f40ca840-ab66-4152-86d8-8aac593548bg]
[2026-05-13 20:33] Jessica Chu: @刘燕春 我們發現把3個增值裡提供的新入庫單互相對換就沒有問題可以上架, 我們可以這樣操作嗎?
[2026-05-13 20:36] 刘燕春: @Jessica Chu 可以的，谢谢啦
[2026-05-14 18:22] 刘燕春: @许晓妍 您好，这四个单仓库都已经上架了，目前异常单是暂存待客户反馈的，因为是非标的，全部增值订单-暂存待处理里面没有增值单的，帮看下怎么下增值单关闭异常单的，谢谢
VASC000000279456==EB0326043029163189=单品数量：8上架到了WI48657188
VASC000000281274==EB0326043029163039=单品数量：11上架到了WI48657006
VASC000000279468==EB0326043029163033=单品数量：8上架到了WI48655204
VASC000000279312==EB0326042829105601=单品数量：1上架到了WI48529320
[2026-05-14 18:22] 刘燕春: [Image: img_v3_0211m_db4deff2-7a8b-4956-b09e-5d01c934be3g]
[2026-05-14 18:23] 许晓妍: @刘燕春 @Jessica Chu 可以手动关闭异常吗
[2026-05-14 18:53] Jessica Chu: @许晓妍 
[Image: img_v3_0211m_35fdefef-eb32-42ff-812d-b07a3bd6d3bh]
我關不到...
[2026-05-14 21:27] 许晓妍: @罗澳 这四单增值的异常单你可以帮忙手动关闭吗
[2026-05-15 15:19] 罗澳: @许晓妍 关不了,需要开发开权限.这个为啥会走到暂存的[我想静静]上架的动作收费了是吗
[2026-05-15 15:20] 许晓妍: @罗澳 因为本来是要重新下新增值单，但是仓库发现这四个原单可以互相上架，仓库就操作上架了，但是原单的增值都下的暂存
[2026-05-15 15:21] 罗澳: @刘燕春 @许晓妍 这个增值不是确实应该走到暂存的吗?最后仓库上架到了新单,这个也是应该有上架的增值的?
[Image: img_v3_0211n_de50b696-96e6-43b7-8962-981d0c9ad92g]
[2026-05-15 15:21] 罗澳: 哦哦
[2026-05-15 15:23] 罗澳: @许晓妍 对于原异常单来说是不是也是应该走新单上架的?
[2026-05-15 15:23] 许晓妍: @罗澳 是的
[2026-05-15 15:24] 罗澳: 那还是需要客户补下增值才是关闭流程是吗
[2026-05-15 15:24] 许晓妍: @罗澳 你这边也没办法关闭的话，那就只能重新下四个增值单和新入库单@刘燕春 来关闭异常单
[2026-05-15 15:25] 刘燕春: @许晓妍 那这个都是只能提入库非标特批吧，费用可以直接收0吧
[2026-05-15 15:26] 罗澳: 我关闭也是这个报错
[Image: img_v3_0211n_a8908005-a229-4ab8-b534-87eac79b03bg]
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000279312 WI48529320 EB0326042829105601 VASC000000279456 WI48655204 EB0326043029163189 VASC000000279468 WI48657006 EB0326043029163033 VASC000000279474 WI48657188 EB03260430...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000279312",
    "requirementDescription": "1.拆黑膜；  2.根据鞋盒标签SKU/条码值入库  3.鞋盒标签匹配不到的，反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片，参考标签文件的模板"
  },
  {
    "vascNo": "VASC000000279456",
    "requirementDescription": "1.拆黑膜;  2.根据鞋盒标签SKU/条码值入库；  3.鞋盒标签匹配不到的,反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片,参考标签文件的模板。"
  },
  {
    "vascNo": "VASC000000279468",
    "requirementDescription": "1.拆黑膜;  2.根据鞋盒标签SKU/条码值入库；  3.鞋盒标签匹配不到的,反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片,参考标签文件的模板。"
  },
  {
    "vascNo": "VASC000000279474",
    "requirementDescription": "1.拆黑膜;  2.根据鞋盒标签SKU/条码值入库；  3.鞋盒标签匹配不到的,反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片,参考标签文件的模板。"
  },
  {
    "vascNo": "VASC000000281274",
    "requirementDescription": "仓库操作流程：  1、撕掉EB0326043029163039中包裹的外部黑膜，图片见附件。  2、根据鞋盒标签sku条码进行扫描，如果该条码无异常，可直接上架的，需要用wini包装袋打包并补贴商品条码，上架到原单WI48657188，后将异常单状态变更为仓库已完成，关闭异常单，鞋盒图片见附件，商品条码见附件。  3、如果该条码无法识别或上架，需要对该包裹进行拍照后暂存，照片以鞋盒标签sku条码命名，等待客户进行后续处理。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000279312",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546121"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546124"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI48529320",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546127"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546130"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "1.拆黑膜；  2.根据鞋盒标签SKU/条码值入库  3.鞋盒标签匹配不到的，反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片，参考标签文件的模板",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546133"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库扫描时匹配不到入库单信息",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546136"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546139"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546154"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546157"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546160"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546163"
  },
  {
    "vascNo": "VASC000000279312",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546166"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546265"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546268"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI48655204",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546271"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546274"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "1.拆黑膜;  2.根据鞋盒标签SKU/条码值入库；  3.鞋盒标签匹配不到的,反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片,参考标签文件的模板。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546277"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库扫描时匹配不到入库单信息",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546280"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546283"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546298"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546301"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546304"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546307"
  },
  {
    "vascNo": "VASC000000279456",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546310"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546409"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546412"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI48657006",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546415"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546418"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "1.拆黑膜;  2.根据鞋盒标签SKU/条码值入库；  3.鞋盒标签匹配不到的,反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片,参考标签文件的模板。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546421"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库扫描时匹配不到入库单信息",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546424"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546427"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546442"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546445"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546448"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546451"
  },
  {
    "vascNo": "VASC000000279468",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546454"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546580"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546583"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI48657188",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546586"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546589"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "1.拆黑膜;  2.根据鞋盒标签SKU/条码值入库；  3.鞋盒标签匹配不到的,反馈鞋盒带SKU/条码值的照片/黑膜照片/与外箱标签照片,参考标签文件的模板。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546592"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库扫描时匹配不到入库单信息",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546595"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546598"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546613"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546616"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546619"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546622"
  },
  {
    "vascNo": "VASC000000279474",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2546625"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569506"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569509"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI48657188",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569512"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569515"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "仓库操作流程：  1、撕掉EB0326043029163039中包裹的外部黑膜，图片见附件。  2、根据鞋盒标签sku条码进行扫描，如果该条码无异常，可直接上架的，需要用wini包装袋打包并补贴商品条码，上架到原单WI48657188，后将异常单状态变更为仓库已完成，关闭异常单，鞋盒图片见附件，商品条码见附件。  3、如果该条码无法识别或上架，需要对该包裹进行拍照后暂存，照片以鞋盒标签sku条码命名，等待客户进行后续处理。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569518"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "仓库登记了计划外的异常EB0326043029163039，客户需要辨识这个货物实际是哪个sku，因此无法下新单下正确的SKU。仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上、没有下、无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单进行后续处理。  实际费用以最终仓库操作动作为准，如果有多余收费请走客服退费处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569521"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569524"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569539"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569542"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569545"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569548"
  },
  {
    "vascNo": "VASC000000281274",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2569551"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "外箱照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "05dabfb389b443b29896641708fe45e2/2026/05/11/e626a111b87c4b46a6a3bec9f9dfd2df.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T17:56:02Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "鞋盒照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "60093912f2e94d51a81c26167bd19b38/2026/05/11/4acc9977ada34086b8df942b89b771e9.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T17:56:02Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "黑膜照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "2168a03afefe492189b124b14806c4b0/2026/05/11/580123dcedba457fa422d5985de47d94.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T17:56:02Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "SDPU26011W-BL02-PU22-WU09  商品条码.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "dff7fbe150de48feb89a2a7f09ba5039/2026/05/12/f6488e89ff874ae0aad6c9ab4152cf78.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T17:56:02Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "2cb4755569ee4932be58f83dda22cd9e.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/cb222dca10c34a26844d963a75509669/2026/05/13/2cb4755569ee4932be58f83dda22cd9e.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "5c1c1621907e47a1a0a7549f7e918b12.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/8fadd264efd34b5ea3af72e45d46ad3a/2026/05/13/5c1c1621907e47a1a0a7549f7e918b12.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "0f3e8c2aa1704c809ec03a57aa5023b7.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/d0c62851ac5b4a84b49e1e574565ce1b/2026/05/13/0f3e8c2aa1704c809ec03a57aa5023b7.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279312",
    "attachmentName": "922febda10dd44859ed04963cacf4f32.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/97448af645974420b332dbc5ad5e92e3/2026/05/13/922febda10dd44859ed04963cacf4f32.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "外箱照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "c8db4dfcb69e45bd91ba0847e0f211b1/2026/05/11/39b240cd9723402791808ccf0f8228b9.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:07:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "鞋盒照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "ccb467cb556e49fca03aead24914cc5a/2026/05/11/1d1315c0ef284db3a8e5bfca3559b9c5.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:07:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "黑膜照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "95a63762bab04cebbb69eb7f4a7545d6/2026/05/11/cf7bbb80f43644dbafaf6855c6d00be4.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:07:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "PRINCE-03-BLACK-SZ-14.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "74512573e54f44e4abe09667f6703fd2/2026/05/12/e548d850708142949e19fe889ac19d89.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:07:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "PRINCE-03-BLACK-SZ-13.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "98421308a8764770bdfc54d9e8e9a7b0/2026/05/12/04d6d4cc5ee04e8f81eea8b94f681699.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:07:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "PRINCE-03-BROWN-SZ-13.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "65a449ee50b3471488a742f841c4c74b/2026/05/12/afc7b1d28d63492f839bab1a19003288.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:07:15Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "03f903e7ae8c4ce0ba2648cf98891e92.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/b48332eecb8347eaadfd04a91288425a/2026/05/13/03f903e7ae8c4ce0ba2648cf98891e92.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "275064a4ff874bd4b964582e97dc9161.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/4ca6cafb796d4278bb43408b5fb6c7bc/2026/05/13/275064a4ff874bd4b964582e97dc9161.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "5c71f48d08bf4db9b5419510222f770d.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/9f312b5425db4221ae3ee9f4fba4381a/2026/05/13/5c71f48d08bf4db9b5419510222f770d.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "37486dd9c32d475eb2a4f41eb3d765ef.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/448002ade6524241be5d474b8baf9148/2026/05/13/37486dd9c32d475eb2a4f41eb3d765ef.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279456",
    "attachmentName": "b890b5ae17974b66adf90f2c430d0968.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/0f8b7aa9c789472c850064a95042bb83/2026/05/13/b890b5ae17974b66adf90f2c430d0968.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "外箱照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "ef09265d66db4d8783142bf366b8b3d1/2026/05/11/a22fd0dd4eb043e391aa99810c3ca0dc.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:49:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "鞋盒照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "862ef56d86b94f899fc9e0a42c1046b0/2026/05/11/0e1b9901b14a4b39a0fd90e2dabda723.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:49:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "黑膜照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "09ed9f03e309463e91c8d398a776e3db/2026/05/11/026bbe287eb941c19de9479f27f726b7.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T21:49:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "748e94e37efb4da89c2c17106d8e2324.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/4a039ed6a98d4cdb8434574434eb0721/2026/05/13/748e94e37efb4da89c2c17106d8e2324.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "8ff3bc1b66664a05a14e3415bf43557c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/cc07023628024bcea02a56a60db26352/2026/05/13/8ff3bc1b66664a05a14e3415bf43557c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "8d425390dead4cc1a1203f0a9fb5d66a.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/bb48bba0b8254240b296bb434671f81a/2026/05/13/8d425390dead4cc1a1203f0a9fb5d66a.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279468",
    "attachmentName": "a5e9355e951c49db8a1c89b85b94a48a.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/8117dbb4398641d7a6647f1a31691dd9/2026/05/13/a5e9355e951c49db8a1c89b85b94a48a.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "外箱照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "b14cd4aed5c34fdc88f21ae4b5dcb697/2026/05/11/9b70c1682ee04f329416edabb09166cb.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "鞋盒照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "746de689262d43bca14afca82b10872f/2026/05/11/b3953ea487fe4bef83095f7de65ce4ee.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "黑膜照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "e245247d64654c74b78cebdae5305da5/2026/05/11/9cb95712b1e74f78a4ed9c5355dff652.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-G12WJ-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "effdee8d8d4b4557ab0cf2dba756578e/2026/05/12/bf72cb34f05f4c4b8383b568486cd94a.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-H55WG-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "3b2d728a9a27480aa48f7eacb8c7d25f/2026/05/12/1ddd8082c56943b8b8cb274cde7b5a8d.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-H55WI-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "6c76cea64013425bab6038875868dee3/2026/05/12/9f6d1587aa5942d694092fdc68938537.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-I22WG-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "c0dbffeab945427d8f28042452f8cd00/2026/05/12/61ff3b85f0514228916905146709df46.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-H55WE-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "1c4ae2fb49bd4b6caafd09fe1d01088b/2026/05/12/392c932866ad482dbff198d125d4c34b.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-G12WF-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "9897abd9fbd441888edbafc9b2368189/2026/05/12/f11ca9044c874e4eb4fa85855a920dcf.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-H55WF-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "3c1ebf53d7054e02b1e66984074f1d6f/2026/05/12/56ca78c64e8c4233881129d800c0fd47.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000279474",
    "attachmentName": "D192-1B9CC16-G12WH-03FPAI.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "5f05f096a1d4431fa06f1b19bdaf968a/2026/05/12/f6905c81397a4ac49eb652fc7a51ee34.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-12T22:14:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "黑膜照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "ab5718a2501d47dd87725ff78ea5f3cf/2026/05/13/e0f4162bd6d845459283f6423a3a8876.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:08:18Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "外箱照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "89d642b9e2ab4cacbff5d46b7d137248/2026/05/13/8525e117be0f4ab58a0d7bd67b702065.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:08:18Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "鞋盒照片.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "0959dc1dd80542348853344c7dd40727/2026/05/13/27543cc1ab4f4673a216abcb1842937c.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:08:18Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "商品标签 (5).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "b0f08e78e4ce462292eba1b518e5e974/2026/05/13/b1ce8bb8a2114902b81111fbe4abfec2.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T18:08:18Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "9170ad7852564f9492b99df19c851188.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/4152cf4b12464b83b00e03aa1aa472e3/2026/05/13/9170ad7852564f9492b99df19c851188.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "860a2e80fe0f4995ab4147cc3358cd97.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/04937a81325c47f29bff7708361f9eb6/2026/05/13/860a2e80fe0f4995ab4147cc3358cd97.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000281274",
    "attachmentName": "573e055d31cb4e3fa12e2a8c8cfec27b.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/a96ae78c30f048ebb2fcd9e4880515ea/2026/05/13/573e055d31cb4e3fa12e2a8c8cfec27b.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-13T21:00:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000279312",
    "sop": "【背景】仓库登记了计划外的异常EB0326042829105601，客户需要辨识这个货物实际是哪个sku，因此无法下新单下正确的SKU。仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上、没有下、无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单进行后续处理。"
  },
  {
    "vascNo": "VASC000000279456",
    "sop": "【背景】仓库登记了计划外的异常EB0326043029163189，客户需要辨识这个货物实际是哪个sku，因此无法下新单下正确的SKU。仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上、没有下、无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单进行后续处理。"
  },
  {
    "vascNo": "VASC000000279468",
    "sop": "【背景】仓库登记了计划外的异常EB0326043029163033，客户需要辨识这个货物实际是哪个sku，因此无法下新单下正确的SKU。仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上、没有下、无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单进行后续处理。"
  },
  {
    "vascNo": "VASC000000279474",
    "sop": "【背景】仓库登记了计划外的异常EB0326043029163039，客户需要辨识这个货物实际是哪个sku，因此无法下新单下正确的SKU。仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上、没有下、无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单进行后续处理。"
  },
  {
    "vascNo": "VASC000000281274",
    "sop": "【背景】仓库登记了计划外的异常EB0326043029163039，客户需要辨识这个货物实际是哪个sku，因此无法下新单下正确的SKU。仓库拆掉黑膜，以鞋盒的标签为准的，扫描鞋盒的SKU标签上架，鞋盒的SKU标签无法在原单上、没有下、无法识别的，需要拍照回传下给客户辨识对应的SKU，客户再下新单进行后续处理。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S012 · `thread:omt_195c7a17ff4f5cba`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：reject_or_cancel；原因：场景「【入库】指定商品拍照暂存」退回/取消相关：观察 unsupported / 转标准 / 仓库无法支持
- VASC：VASC000000303981, VASC000000305556
- EB：EB0126061930546906, EB0126061930546936, EB0126061930546948, EB0126062030578226；WI：（无）；WO：（无）；M：（无）
- 场景：【入库】指定商品拍照暂存
- 服务：库内其他服务需求, 入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_resubmit_after_reject", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000303981", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000305556", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[{"vascNo": "VASC000000303981", "rejectReason": "非标增值场景不符，请按照指示提交正确的非标增值"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-06-23 10:43] 许晓妍: VASC000000303981 IH000000100353 USWC Warehouse 11177690 广州德诺汽配有限公司
@石凯 @吴杰 1、该增值单应提交入库非标特批，请让客户重新提交。2、提交增值单时，不要通过异常单创建，不然拍照完成后异常单就关闭了，容易遗漏异常货物流处理。或者提交入库非标拍照或提供视频 -【入库-异常包裹开箱拍照】这个非标增值单
[2026-06-24 13:55] 吴杰: @许晓妍 VASC000000305556 已重新提交
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000303981 IH000000100353 USWC Warehouse 11177690 广州德诺汽配有限公司 @石凯 @吴杰 1、该增值单应提交入库非标特批，请让客户重新提交。2、提交增值单时，不要通过异常单创建，不然拍照完成后异常单就关闭了，容易遗漏异常货物流处理。或者提交入库非标拍照或提供视频 -【入库-异常包裹开箱拍照】这个非...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000303981",
    "requirementDescription": "需分别对其异常单开箱拍照查验，检查其中的产品是否有损坏。注：提供的增值结果展示图片请一一对应异常单，好方便我们后续处理。"
  },
  {
    "vascNo": "VASC000000305556",
    "requirementDescription": "需分别对其异常单开箱拍照查验，检查其中的产品是否有损坏。注：提供的增值结果展示图片请一一对应异常单，好方便我们后续处理。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000303981",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881326"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881329"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881332"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881335"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126061930546906,EB0126061930546936,EB0126061930546948,EB0126062030578226",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881338"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需分别对其异常单开箱拍照查验，检查其中的产品是否有损坏。注：提供的增值结果展示图片请一一对应异常单，好方便我们后续处理。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881341"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "A+包裹质量异常，看异常单中的图片无法辨别里面的产品是否有损坏，因此，需要开箱拍照查验里面的产品是否有损坏。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881344"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881347"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881359"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881362"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881365"
  },
  {
    "vascNo": "VASC000000303981",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2881368"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899011"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899014"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899017"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126061930546906,EB0126061930546936,EB0126061930546948,EB0126062030578226",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899020"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需分别对其异常单开箱拍照查验，检查其中的产品是否有损坏。注：提供的增值结果展示图片请一一对应异常单，好方便我们后续处理。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899023"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "A+包裹质量异常，看异常单中的图片无法辨别里面的产品是否有损坏，因此，需要开箱拍照查验里面的产品是否有损坏。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899026"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899029"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899044"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899047"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899050"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899053"
  },
  {
    "vascNo": "VASC000000305556",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2899056"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "a847511c0aa34997a7a16cd945ed2a19.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/9a9134382b5a45dc9166f28f63d63937/2026/06/25/a847511c0aa34997a7a16cd945ed2a19.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "d2159e47a3bc4e0c8e3c09f7c453fa6f.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/7b917dbd2cfe4130868ec0038d673422/2026/06/25/d2159e47a3bc4e0c8e3c09f7c453fa6f.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "2a1765b4f5c04dbd934b824247b4f254.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/6ed5121b58b34468b1a5a7273d608247/2026/06/25/2a1765b4f5c04dbd934b824247b4f254.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "0be480a41dee4378b475adeb051686d6.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/e9af57ee2b2745f9b4ef64d7147f550c/2026/06/25/0be480a41dee4378b475adeb051686d6.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "cda1d2298c1f49c2bc5072464931e826.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/4e5a9bb2e63946b098ed221a9f3c044e/2026/06/25/cda1d2298c1f49c2bc5072464931e826.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "38f0e5d1940e4229b105366bc3690029.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/2f8f695aff464a919dc05ff4faa8333b/2026/06/25/38f0e5d1940e4229b105366bc3690029.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "09bff78340264562b707547d1fecebce.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/dc03fdfcb62a4bcfbe22175c38691a72/2026/06/25/09bff78340264562b707547d1fecebce.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "f506ae170cd744e786baeaaa761fbe92.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/22a8695e6b294fd580178b0d519882ce/2026/06/25/f506ae170cd744e786baeaaa761fbe92.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "2be15dc5791f4742bb200a08a725eb49.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/2b72334b966b4ccdacddbe12d4ba8c7c/2026/06/25/2be15dc5791f4742bb200a08a725eb49.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "741e104dfd184c1cb0bd1252e91be056.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/5e1a2925694e433a81e195c74426b4c1/2026/06/25/741e104dfd184c1cb0bd1252e91be056.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "37d796edce5d4afcb53a8397ac6f66c3.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/27c6b5fa02a54f25849be729fc398161/2026/06/25/37d796edce5d4afcb53a8397ac6f66c3.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "505985df83334f00a27fbff7a9d3027c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/c18f2b95e45942ffae102715ee1e13f6/2026/06/25/505985df83334f00a27fbff7a9d3027c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "84c9fbd76d1e4cb99fc06cb45275c0c9.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/2e34d147291c4ab9b665bca3eb2580c5/2026/06/25/84c9fbd76d1e4cb99fc06cb45275c0c9.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "a58352473bd943c3932427e6391bd85e.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/cca8309148694f04b88b5220af049f7b/2026/06/25/a58352473bd943c3932427e6391bd85e.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305556",
    "attachmentName": "5daeb00218e947ec8376924b8fd05bcf.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/4dda29af5c354aa1818db1a4313df056/2026/06/25/5daeb00218e947ec8376924b8fd05bcf.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T05:22:11Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000305556",
    "sop": "仓库操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S013 · `thread:omt_1929596998cddbe6`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【入库】指定商品拍照暂存」边界/补充样本
- VASC：VASC000000313293, VASC000000313416
- EB：EB0126070731097040, EB0126070731097046, EB0126070731096728；WI：WI49727828；WO：（无）；M：M010000000008442556
- 场景：【入库】指定包裹拍照, 【入库】指定商品拍照暂存
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000313293", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000313416", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-07-07 18:14] 耿文文: VASC000000313293 WI49727828 EB0126070731097040
EB0126070731097046
EB0126070731096728 AU Warehouse 10003946 Haoquan (HK) Limited 入库非标增值（特批） 
这个异常拍照的增值，帮忙了解下为什么不下 入库非标拍照或提供视频 的增值？@李娟 @李依宣
[2026-07-07 18:17] 李依宣: [Image: img_v3_0213c_6929189e-d65e-4702-b965-4cdd3056c6cg]
[2026-07-07 18:17] 李依宣: 提不了..
[2026-07-07 18:18] 李依宣: VASC000000313293这个客户自己提的，我看已经报价了
[2026-07-07 18:19] 李依宣: 他说提不了的时候，我给他提了VASC000000313416，看下是否要退回 @耿文文
[2026-07-07 18:19] 耿文文: 再异常单页面只能提入库非标吗？没有可以选择 入库非标拍照或提供视频 这个的选项吗？
[2026-07-07 18:20] 耿文文: @李依宣 我审了 但是想到有这个标准的可以选，所以问问是不是有什么下单问题
[2026-07-07 18:21] 李依宣: @耿文文 异常单界面只能提非标特批增值，没有入库前拍照--这个选项
[2026-07-07 18:21] 李依宣: [Image: img_v3_0213c_54cf93b7-6020-46ee-b30d-eaae5f75c94g]
[Image: img_v3_0213c_0a5f59ae-eba5-4f77-92a4-38bf223109dg]
[Image: img_v3_0213c_8d6eaf6d-7515-4190-be62-556b2350a3bg]
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000313293 WI49727828 EB0126070731097040 EB0126070731097046 EB0126070731096728 AU Warehouse 10003946 Haoquan (HK) Limited 入库非标增值（特批） 这个异常拍照的增值，帮忙了解下为什么不下 入库非标拍照或提供视频 的增值？@李娟...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000313293",
    "requirementDescription": "确认产品状态是否完好，拍摄产品附件"
  },
  {
    "vascNo": "VASC000000313416",
    "requirementDescription": "B0400000001408151443  M010000000008442556  可能贴错标签，没有异常单 ，需要找到这个商品拍摄实物辨识"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000313293",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006051"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006054"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006057"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006060"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "确认产品状态是否完好，拍摄产品附件",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006063"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "包裹运输途中被拆开，拍照确认商品是否完好，附件是否完整",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006066"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006069"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006084"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006087"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006090"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006093"
  },
  {
    "vascNo": "VASC000000313293",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3006096"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001408151443",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008358"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "M010000000008442556",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008361"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008364"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008367"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "B0400000001408151443  M010000000008442556  可能贴错标签，没有异常单 ，需要找到这个商品拍摄实物辨识",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008370"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库单已有异常，按入库单提交非标增值报错",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008373"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008376"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008391"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008394"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008397"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008400"
  },
  {
    "vascNo": "VASC000000313416",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3008403"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000313293",
    "attachmentName": "0ed7d2bb12544537a9df486c65556dc2.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://aufmsstream.winit.com.cn/679218d2446e4a5992cdd42c3dc391b1/2026/07/09/0ed7d2bb12544537a9df486c65556dc2.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T13:35:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000313293",
    "attachmentName": "893ff280a1b5498581608bd0bc178da8.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://aufmsstream.winit.com.cn/c8da1a7ed62d449fb535f7d841a9e85d/2026/07/09/893ff280a1b5498581608bd0bc178da8.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T13:35:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000313293",
    "attachmentName": "c75f65dffb72418796292f5a629a94d8.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://aufmsstream.winit.com.cn/07bfc4eed539475bb2318cd917a54b04/2026/07/09/c75f65dffb72418796292f5a629a94d8.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T13:35:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000313293",
    "sop": "仓库操作步骤："
  },
  {
    "vascNo": "VASC000000313416",
    "sop": "背景：B0400000001408151443--M010000000008442556 可能贴错标签，需要找到这个商品拍摄实物辨识；"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S014 · `thread:omt_19427f614acfdc93`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【入库】覆盖/清除标签」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000295353, VASC000000295401, VASC000000294594
- EB：（无）；WI：WI50299262, WI49894956, WI49894986；WO：（无）；M：（无）
- 场景：【入库】上架前拆包装, 【入库】覆盖/清除标签
- 服务：入库其他服务需求, 入库-清除商品标签
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000295353", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000295401", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000294594", "auditResult": "其他/未知", "isAuditThrough": "", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-06-09 19:23] 许晓妍: VASC000000295353 WI50299262 USWC Warehouse 13947840 FANTASIA TRADING LLC
VASC000000295401 WI49894956 USWC Warehouse 13947840 FANTASIA TRADING LLC
@李超亮 @Zha.Xinge Anker拆彩盒包装和清除电池标签这两个增值仓库发现问题了为什么没登记异常呢？CC@李颖
[2026-06-09 19:30] 许晓妍: @Zha.Xinge 这单仓库拆彩盒之后是商品裸货上架的吗？花了多少工时啊，需要报价
[2026-06-09 19:43] 李超亮: [2026-06-03T18:33:51+08:00] Shuzhen Wu:
 A1695H12
 1ZV532G30311062165
 这个sku预计6/3 送仓， 收到说下 目前我不知道数据 没法找人建单 谢谢@Huang Jiajun @Haoxian Lai @Chen feiyu
[2026-06-04T06:28:40+08:00] Chen feiyu:
 今天关注了一下UPS送仓，还没有见到这个包裹
[2026-06-04T09:28:10+08:00] Shuzhen Wu:
 [Image: img_v3_0212g_6ba60393-1771-490c-a23a-1746995cf19g]
[2026-06-04T09:28:13+08:00] Shuzhen Wu:
 物流是显示签收了
[2026-06-04T09:31:49+08:00] Chen feiyu:
 明天应该就有卸货记录了，我明天查一下哈
[2026-06-04T09:44:30+08:00] Shuzhen Wu:
 好的
[2026-06-05T02:00:36+08:00] Chen feiyu:
 我看到已经到了异常组，做完包裹预分拣了。用了包裹码WB00926060300428 你看看你们那边有没有收到里面的内容信息？
[2026-06-05T09:23:17+08:00] Shuzhen Wu:
 好的
[2026-06-05T09:23:23+08:00] Shuzhen Wu:
 我等下找人建入库单
[2026-06-05T09:33:19+08:00] Shuzhen Wu:
 @袁帅 帅哥 帮忙建下入库单，无箱码 预报单： sku：A1695H12， 数量1650pcs
 客户单号 ： A1695H12-Kama Chen需求杂项入库-2026-06-05
 [Image: img_v3_0212g_1f6f83ff-7c9b-485e-9f07-6b7af87e2edg]
[2026-06-05T09:40:53+08:00] 袁帅:
 @Shuzhen Wu USWC是不
[2026-06-05T09:41:21+08:00] Shuzhen Wu:
 @袁帅 是的
[2026-06-05T09:44:34+08:00] 袁帅:
 @Shuzhen Wu @Chen feiyu 
 WI50299262入库单号
[2026-06-06T00:26:51+08:00] Wang.Yanhua:
 @袁帅 @Shuzhen Wu 包裹内商品是套盒包装，需要拆除套盒吗，请核实后答复仓库执行操作
 [Image: img_v3_0212g_263755da-43bb-4248-be2d-d7ff5c18229g]
 [Image: img_v3_0212g_39d23004-f75b-4a52-9641-393f5f7a820g]
 [Image: img_v3_0212g_cc95d651-c0f6-454c-bc9a-df37997a166g]
[2026-06-08T09:37:13+08:00] Shuzhen Wu:
 彩盒外贴有sku不
[2026-06-08T09:37:16+08:00] Shuzhen Wu:
 @Wang.Yanhua
[2026-06-08T11:14:10+08:00] Shuzhen Wu:
 上班后彩盒开箱看看里面的商品是不是也有彩盒包装贴有sku条码的 @Wang.Yanhua 
 [Image: img_v3_0212g_8849d224-945b-41f4-bc29-3805523a5a7g]
[2026-06-08T23:26:17+08:00] Wang.Yanhua:
 @Shuzhen Wu 没有
[2026-06-08T23:29:57+08:00] Wang.Yanhua:
 @Shuzhen Wu 也没有
 [Image: img_v3_0212g_d398f83d-bccb-405c-b892-8ae9bd16b48g]
 [Image: img_v3_0212g_8f661a3a-7e18-4717-9fff-3e9f08c9254g]
 [Image: img_v3_0212g_b287af78-f2a9-4926-bc9e-fc18043e25cg]
[2026-06-09T09:21:18+08:00] Shuzhen Wu:
 @Wang.Yanhua 我关联三方条码值 你们入库吧
[2026-06-09T09:25:07+08:00] Shuzhen Wu:
 SKU: A1695H12
 条码值：6931571071929
 @袁帅 帅哥关联下条码值 谢谢
[2026-06-09T09:25:26+08:00] Shuzhen Wu:
 @Wang.Yanhua 然后辛苦今天上班帮忙优先上架 谢谢
[2026-06-09T09:32:53+08:00] Wang.Yanhua:
 @Shuzhen Wu 请确认商品都是要拆除彩盒包装的对吧
[2026-06-09T09:33:03+08:00] Wang.Yanhua:
 @Zha.Xinge
[2026-06-09T09:34:47+08:00] Shuzhen Wu:
 [Image: img_v3_0212g_d02958b4-96e5-4ca4-a4f2-9113515407bg]
 前端回复要的
[2026-06-09T09:35:04+08:00] Shuzhen Wu:
 [Image: img_v3_0212g_b9a3724b-78ec-404b-af09-b84c96273d8g]
 按这个销售的
[2026-06-09T09:40:49+08:00] Wang.Yanhua:
 @Shuzhen Wu @徐丽红 WI50299262订单共计要拆除彩盒包装有275盒，属于包中包商品，数量较多，耗费人力工时，请下拆除商品包装彩盒增值单，感谢cc@Zha.Xinge
[2026-06-09T09:42:49+08:00] Shuzhen Wu:
 @徐丽红 提吧 然后今天上班一定要操作哈 着急等着出库 ，谢谢@Wang.Yanhua
[2026-06-09T09:43:21+08:00] Shuzhen Wu:
 A1695H12==出库包装耗材 辛苦维护成纸箱 @袁帅 
 [Image: img_v3_0212g_a98cbf3c-9607-4b4e-a3c0-cd1c1b24817g]
[2026-06-09T09:43:49+08:00] Wang.Yanhua:
 @Shuzhen Wu 嗯嗯嗯
[2026-06-09T09:47:14+08:00] 袁帅:
 已处理
[2026-06-09T09:47:27+08:00] Shuzhen Wu:
 好的
[2026-06-09T10:25:27+08:00] 徐丽红:
 VASC000000295353增值已提
[2026-06-09 19:45] 李超亮: [2026-06-06T02:39:37+08:00] Wang.Yanhua:
 @Shuzhen Wu 柜号jxlu4321164内订单WI49894986——WI49894956内A+包裹外箱贴有电池标签是否移除
 [Image: img_v3_0212g_3acab85f-4451-46ae-b857-eda69cb775eg]
 [Image: img_v3_0212g_a7346375-e6a2-4c45-88a6-54a5973daf5g]
[2026-06-08T09:38:12+08:00] Shuzhen Wu:
 @徐丽红 丽红提下增值 谢谢
[2026-06-08T10:34:42+08:00] 徐丽红:
 OK 已提VASC000000294594
[2026-06-09T01:25:28+08:00] Wang.Yanhua:
 @徐丽红 @Shuzhen Wu [WI49894956](https://uscwmtom.winit.com.cn/Inbound/detail/orderNo/WI49894956)订单的撕标增值单未看到，请核实

[2026-06-09T09:19:35+08:00] Shuzhen Wu:
 [Image: img_v3_0212g_ed36fce5-5449-48e3-89c0-9fd4635fd22g]
 VASC000000294594==我看完成了呀
[2026-06-09T09:20:00+08:00] Shuzhen Wu:
 @徐丽红 丽红 你看下呗
[2026-06-09T09:34:56+08:00] Wang.Yanhua:
 @Shuzhen Wu @徐丽红 增值单内只有WI49894986订单
 [Image: img_v3_0212g_41546aec-b288-4888-aa29-cb65b9c0233g]
[2026-06-09T10:44:38+08:00] 徐丽红:
 VASC000000295401=WI49894956
[2026-06-09 19:45] 许晓妍: @李超亮 为什么没登记异常呢？都到异常组。拆彩盒花了多少工时？
[2026-06-09 19:47] 李超亮: 我印象中这两个没有专门的异常类型可登，你们认为要登什么异常可以同步到仓库。@许晓妍
[2026-06-09 19:53] 许晓妍: @李超亮 彩盒的，因为彩盒上没有商品条码所以要拆彩盒对吧，为什么没登记商品条码异常呢
[Image: img_v3_0212g_dba33920-c87c-405d-be8b-eefede67f37g]
[2026-06-09 19:59] 李超亮: @许晓妍 确认登这个异常那就同步给仓库
[2026-06-09 20:11] 许晓妍: @龚林晓 @徐丽红 我们现在下入库单的时候可以选择入库覆盖DG标签的方案，这个可以跟客户培训下，让客户在下单的时候选择这个方案，就不用每次提非标增值了
[2026-06-09 20:17] 李颖: @王鑫隆 @徐献勇 
**背景：**WI50299262包裹内商品是套盒包装，商品包装上没有商品条码及第三方商品条码，仓库没有登记异常直接通知Anker话题群，Anker要求现场做清除商品包装操作，然后按箱内商品做上架。
**存在问题：**
1. 当商品无条码时，仓库应该登记“商品条码异常（需客户处理）”的异常单。
2. 登记异常单后客户提交增值单给处理方案，而不是话题里先干活了再通知产品补收增值费用。运营一再强调需要有相应的单据才能干活，产品也是一直按这个标准Push客户及执行的。
**解决方案：**peter，鑫隆这个CASE发生的问题你们看下，看如何规范仓库登记异常单及按单据作业。
@洪毓卿 CC
[2026-06-09 20:18] 洪毓卿: @汤佳 @王鑫隆 跟今天的问题一样，你们不是要分享今天的那个case，以及让仓库签字吗？把这个一起加上去吧
[2026-06-10 02:12] Zha.Xinge: @许晓妍 @李颖 两个问题
1）你们说的第一个问题，盲盒的事情。是anker自己没建单，我们反馈情况，然后下单，那个时候就已经把商品无条码关联好了，不设计报异常的问题。是anker在话题里直接说需要拆到彩盒。所以他们下了增值
2）A+包裹电池标签的事情，是没有这个异常选项的，如果要我们登记，是否应该给我们登记权限？
[2026-06-10 10:23] 许晓妍: @Zha.Xinge @李超亮 1、拆彩盒花了多少工时？
2、拆彩盒后是裸货吗？后续还做了什么操作吗？
3、电池标你看聊天记录，已经跟销售讲了跟客户培训，他们可以在下入库单的时候维护覆盖DG标的方案
[2026-06-10 10:25] Zha.Xinge: @许晓妍 1 2 明天答复
3 ok
[2026-06-11 02:58] Zha.Xinge: @许晓妍 工时：3.26
不是裸货有彩盒包装，出库加纸箱包材
[2026-06-11 10:59] 许晓妍: @Zha.Xinge 你们说的第一个问题，盲盒的事情。是anker自己没建单，我们反馈情况，然后下单====有几个问题请问下，1、货物到仓后客户没有下单，仓库已经拉到异常区了为什么没有按照标准流程登记包裹条码异常或者商品条码异常呢？2、为什么要仓库线下反馈给Anker，原因是什么？单都没有，包裹上的条码自然无法识别，就登记包裹条码异常呀
[2026-06-11 11:03] Zha.Xinge: @许晓妍 话题私发你了，那个群你也可以进去翻翻聊天记录，anker一直以来都会直接找仓库。我理解你们说的要登记异常要搞这些东西，这是标准流程。如果是这样，建议你应该和商务客服沟通，这种全部下增值。
这个事情，我们出于对客户满意度的考虑，定位包裹，但是增值我们都会让anker下。毕竟紧急程度不同。
[2026-06-11 11:24] 许晓妍: @徐丽红 @龚林晓@Zha.Xinge @李超亮 Anker没有入库单入库，按照标准流程是需要仓库登记包裹条码异常的，有标准流程就要按标准流程走的哈
[2026-06-11 11:36] 徐丽红: @许晓妍 登记包裹条码异常，如果客户关联了第三方箱唛，可以整成标准增值吗？不然客户关联了第三方箱唛，还是需要提非标特批增值关闭异常，anker都是第三方箱唛入库的，无需补贴winit箱唛
[2026-06-11 11:46] 李颖: @徐丽红 可以，我们登记优化需求
[2026-06-11 11:46] 许晓妍: @李颖 登记了
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000295353 WI50299262 USWC Warehouse 13947840 FANTASIA TRADING LLC VASC000000295401 WI49894956 USWC Warehouse 13947840 FANTASIA TRADING LLC @李超亮 @Zha.Xinge Anker拆彩盒包装和清除电池标签...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000295353",
    "requirementDescription": "入库单：WI50299262   包裹内商品是套盒包装，客户要求拆除彩盒入库，共计要拆除彩盒包装有275盒，收取拆彩盒费"
  },
  {
    "vascNo": "VASC000000295401",
    "requirementDescription": "WI49894956  A+包裹一共120箱    A+包裹外箱贴有电池标签申请移除"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000295353",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784462"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784465"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50299262",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784468"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784471"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "入库单：WI50299262   包裹内商品是套盒包装，客户要求拆除彩盒入库，共计要拆除彩盒包装有275盒，收取拆彩盒费",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784474"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784477"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784480"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784495"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784498"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784501"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784504"
  },
  {
    "vascNo": "VASC000000295353",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784507"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784624"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784627"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49894956",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784630"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784633"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WI49894956  A+包裹一共120箱    A+包裹外箱贴有电池标签申请移除",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784636"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库单已更新到仓，暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784639"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784642"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784657"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784660"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784663"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784666"
  },
  {
    "vascNo": "VASC000000295401",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2784669"
  },
  {
    "vascNo": "VASC000000294594",
    "fieldName": "增值单品数量",
    "fieldKey": "VAS_ATTR_REL_VOIC",
    "fieldValue": "360",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1652",
    "serviceSequence": "1",
    "attrId": "2769033"
  },
  {
    "vascNo": "VASC000000294594",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49894986",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1652",
    "serviceSequence": "1",
    "attrId": "2769036"
  },
  {
    "vascNo": "VASC000000294594",
    "fieldName": "示例图片",
    "fieldKey": "VAS_ATTR_REL_SP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1652",
    "serviceSequence": "1",
    "attrId": "2769039"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000295353",
    "attachmentName": "20260609-102306.jpg",
    "attachmentType": "CEO_SOA",
    "url": "1752c6f505af4fd9b2587c408ffb007f/2026/06/09/1c0ea72672c44092af1503867eecba66.jpg",
    "attributeName": "CEO审批截图",
    "attributeKey": "CEO_SOA",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-11T21:24:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000295353",
    "attachmentName": "企业微信截图_20260609102417.png",
    "attachmentType": "CEO_SOA",
    "url": "562b7f0c956f4c93b085cfc4b8979cee/2026/06/09/76df6480b59e4a49a7991482f3fdd892.png",
    "attributeName": "CEO审批截图",
    "attributeKey": "CEO_SOA",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-11T21:24:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000295353",
    "attachmentName": "3eacad0967c942399e698bcd1970cd18.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/f99e8101cbd14a4f8c6a3a14ae5c76e5/2026/06/12/3eacad0967c942399e698bcd1970cd18.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-13T02:21:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000295353",
    "attachmentName": "0cc9e6dfdecc40e5828c30f3b765f87b.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/707a105ffea94cbb9284ec19c8bc2bed/2026/06/12/0cc9e6dfdecc40e5828c30f3b765f87b.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-13T02:21:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000295401",
    "attachmentName": "0b74a99d8e454b0eb6eee5dd971acd73.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/08949d0744a3441fbfc2ca5e7da9576e/2026/06/10/0b74a99d8e454b0eb6eee5dd971acd73.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-11T00:45:51Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000294594",
    "attachmentName": "20260608-103421.jpg",
    "attachmentType": "VAS_ATTR_REL_SP",
    "url": "a8cc099ebdeb4ac6bf9475545093bff9/2026/06/08/eed0b3a85d5d440b92ca6a49c7fd1627.jpg",
    "attributeName": "示例图片",
    "attributeKey": "VAS_ATTR_REL_SP",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1652",
    "created": "2026-06-08T10:34:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000294594",
    "attachmentName": "886d0208ad364b56aede15d45c4c9c04.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/bcf4e5268391417884393dcb22e2359a/2026/06/08/886d0208ad364b56aede15d45c4c9c04.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1652",
    "created": "2026-06-09T03:05:24Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000295353",
    "sop": "【背景】 包裹内商品是套盒包装，客户要求拆除彩盒入库，共计要拆除彩盒包装有275盒。"
  },
  {
    "vascNo": "VASC000000295401",
    "sop": "【背景】WI49894956，A+包裹一共120箱，A+包裹外箱贴有电池标签申请移除。"
  },
  {
    "vascNo": "VASC000000294594",
    "sop": "按照客户提供的示例图，清除标签"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S015 · `thread:omt_1961b6d8cc8c1ce4`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：reject_or_cancel；原因：场景「【入库】覆盖/清除标签」退回/取消相关：观察 unsupported / 转标准 / 仓库无法支持
- VASC：VASC000000280917, VASC000000280953
- EB：EB0126051229407443, EB0126051229407392；WI：WI49176152, WI49224696；WO：（无）；M：（无）
- 场景：【入库】覆盖/清除标签
- 服务：入库其他服务需求
- attachmentStatus：`not_found_in_oms_va_execute_file`
- caseQualityFlags：[]
- 审核结果：[{"vascNo": "VASC000000280917", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000280953", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}]
- 退回原因：[{"vascNo": "VASC000000280917", "rejectReason": "非标增值场景不符，请按照指示提交正确的非标增值"}, {"vascNo": "VASC000000280953", "rejectReason": "非标增值场景不符，请按照指示提交正确的非标增值"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-13 17:02] 许晓妍: VASC000000280917 WI49176152 EB0126051229407443
VASC000000280953 WI49224696 EB0126051229407392 
USWC Warehouse 19814650 无锡铂轩科技有限公司
@李依宣 @孙雅 这两个增值单的客户背景和需求具体是什么？需求没太看明白
[2026-05-13 17:10] 李依宣: [Image: img_v3_0211l_d81d9b5c-8679-4057-aa24-9daddae6686g]
[2026-05-13 17:10] 李依宣: @许晓妍 就是这个哈
[2026-05-13 21:57] 许晓妍: @李依宣 需要客户提供新的入库单，因为是通过异常单下的增值单。
[2026-05-15 12:20] 许晓妍: @李依宣 @孙雅 新入库单单有了吗
[2026-05-15 12:21] 李依宣: 没有诶，现在才看到@孙雅 我现在申请权限，让客户下午下单
[2026-05-15 12:22] 李依宣: @许晓妍 覆盖原箱的商品标签就可以了 必须要用新入库单吗?
[2026-05-15 12:22] 李依宣: 如果用新入库单的话，直接做标准增值换成新单箱唛也行哦?
[2026-05-15 13:15] 许晓妍: @李依宣 看我上面说的，因为这两单是从异常单下的增值单，所以需要新的入库单
[2026-05-15 13:16] 许晓妍: @李依宣 新单如果包裹标签换了，那也要补贴包裹标签
[2026-05-15 13:31] 李依宣: [了解]
[2026-05-15 22:52] 许晓妍: @孙雅 @李依宣 如沟通，这两单商品需要通过异常单重新提交库内的覆盖包裹标签非标增值特批，入库的增值我给你们退回了哈CC@耿文文
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000280917 WI49176152 EB0126051229407443 VASC000000280953 WI49224696 EB0126051229407392 USWC Warehouse 19814650 无锡铂轩科技有限公司 @李依宣 @孙雅 这两个增值单的客户背景和需求具体是什么？需求没太看明白
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000280917",
    "requirementDescription": "清除外箱的商品标签，按原单原箱拆箱上架"
  },
  {
    "vascNo": "VASC000000280953",
    "requirementDescription": "清除外箱的商品标签，按原单原箱拆箱上架"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000280917",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565828"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565831"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565834"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565837"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "清除外箱的商品标签，按原单原箱拆箱上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565840"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "没有对应的标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565843"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565846"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565861"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565864"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565867"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565870"
  },
  {
    "vascNo": "VASC000000280917",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565873"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565936"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565939"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565942"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565945"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "清除外箱的商品标签，按原单原箱拆箱上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565948"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "没有对应的标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565951"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565954"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565969"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565972"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565975"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565978"
  },
  {
    "vascNo": "VASC000000280953",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2565981"
  }
]
```

### 上传附件 uploadedAttachments

```text
[]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000280917",
    "sop": "【背景】WI49176152一百多个包裹，外箱基本上都贴了箱唛+商品标签，现在要覆盖(或者清除)掉商品标签做入库。"
  },
  {
    "vascNo": "VASC000000280953",
    "sop": "【背景】WI49224696，外箱基本上都贴了箱唛+商品标签，现在要覆盖(或者清除)掉商品标签做入库。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S016 · `thread:omt_192615748b0f9be8`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【入库】覆盖/清除标签」边界/补充样本
- VASC：VASC000000308991, VASC000000308997, VASC000000310833
- EB：（无）；WI：WI50319990, WI50408167；WO：（无）；M：M010000000006403661
- 场景：【入库】覆盖/清除标签
- 服务：入库其他服务需求, 库内其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "possible_resubmit_after_cancel", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000308991", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000308997", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000310833", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-06-30 18:43] 耿文文: VASC000000308991/VASC000000308997 WI50408167 USWC Warehouse 13947840 FANTASIA TRADING LLC 入库非标增值（特批）
这个入库覆盖电池标签的不是已经做好系统配置了嘛，为什么还有你们来提交增值的？@徐丽红 @龚林晓
[2026-06-30 20:35] 耿文文: VASC000000308991 这个增值单是只有23个包裹才有电池标签吗？@徐丽红
[2026-07-01 10:04] 徐丽红: 嗯是的，只有sku：M010000000006403661需要覆盖
[2026-07-01 15:59] 耿文文: @徐丽红 那系统配置入库覆盖标签的是没生效吗？
[2026-07-01 16:01] 耿文文: 那得收个辨识费了
[2026-07-01 16:05] 徐丽红: 又为啥收辨识费 这个需求一直都不一定整单覆盖
[2026-07-01 16:08] 耿文文: @徐丽红 原本不都是所有的A+包覆盖吗？这个又要得在A+包里面做辨识找出来覆盖 还是有区别的
[2026-07-01 16:08] 耿文文: 要么就把指定的23个包裹码绑定在增值单里面，仓库能扫描的时候弹出来
[2026-07-01 20:34] 耿文文: @徐丽红 能下个关联包裹的不？
[2026-07-02 11:00] 徐丽红: [Image: img_v3_02137_8f9c4c51-f653-4c61-85fa-d7d2cacfc33g]
入库单已上架完成了，还能提入库增值吗@耿文文
[2026-07-02 15:20] 耿文文: 上架完了就只能提库内了 ，入库有批次管理吗？@徐丽红 有批次管理的话库内根据入库批次跟SKU指定下架覆盖标签
[2026-07-02 15:23] 徐丽红: 目前库存就只有一个批次
[2026-07-02 15:25] 徐丽红: VASC000000308991已取消，VASC000000310833重提了
[2026-07-02 15:27] 耿文文: @徐丽红 为什么anker还没走偏好配置提增值的？还是你们来提？
[2026-07-02 15:37] 耿文文: @许晓妍
[2026-07-03 10:35] 许晓妍: @徐丽红 Anker已经设置好偏好设置了吗？
[2026-07-03 10:37] 许晓妍: @Zha.Xinge VASC000000308991==VASC000000310833这单仓库为啥在没有增值的情况下直接操作了啊？
[2026-07-03 10:43] 许晓妍: @Zha.Xinge 这单辨识需要覆盖的DG标签花了多少工时
[2026-07-03 10:44] Zha.Xinge: 我们发现了06/29报了，然后丽红回复了增值单号，我们就撕标操作上架了。我们不知道你们昨天取消了
[2026-07-03 10:44] Zha.Xinge: 辨识啥？不需要辨识啊，就是我们入库的时候会按照sku分堆，分堆之后发现有电池标，就直接汇报了。撕标大概话一个小时吧
[2026-07-03 10:47] 耿文文: 那这种情况以后都是入库环节的话都不用辨识吗？ 当时考虑到他原本的增值没有关联包裹信息，原入库单有上百个A+包只覆盖23个的话仓库还得挑@Zha.Xinge
[2026-07-03 10:48] Zha.Xinge: 不用 本来就会分堆
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000308991/VASC000000308997 WI50408167 USWC Warehouse 13947840 FANTASIA TRADING LLC 入库非标增值（特批） 这个入库覆盖电池标签的不是已经做好系统配置了嘛，为什么还有你们来提交增值的？@徐丽红 @龚林晓
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000308991",
    "requirementDescription": "入库单：WI50319990  sku：M010000000006403661  一共23箱，A+包裹贴有电池标签，申请覆盖"
  },
  {
    "vascNo": "VASC000000308997",
    "requirementDescription": "入库单：WI50408167  A+包裹共530箱，贴有电池标签，申请覆盖"
  },
  {
    "vascNo": "VASC000000310833",
    "requirementDescription": "入库单：WI50319990  sku：M010000000006403661  一共23箱，A+包裹贴有电池标签，申请覆盖，已覆盖完成上架，补收费用"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000308991",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948031"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948034"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948037"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948040"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "入库单：WI50319990  sku：M010000000006403661  一共23箱，A+包裹贴有电池标签，申请覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948043"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库单已到仓，无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948046"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948049"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948064"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948067"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948070"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948073"
  },
  {
    "vascNo": "VASC000000308991",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948076"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948109"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948112"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50408167",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948115"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948118"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "入库单：WI50408167  A+包裹共530箱，贴有电池标签，申请覆盖",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948121"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库单已更新到仓，暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948124"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948127"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948142"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948145"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948148"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948151"
  },
  {
    "vascNo": "VASC000000308997",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2948154"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974179"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974182"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974185"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974188"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974191"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "入库单：WI50319990  sku：M010000000006403661  一共23箱，A+包裹贴有电池标签，申请覆盖，已覆盖完成上架，补收费用",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974194"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "入库单已上架完成，暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974197"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974200"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974212"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974215"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974218"
  },
  {
    "vascNo": "VASC000000310833",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2974221"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000308997",
    "attachmentName": "92073ea7b3e04cc4bfab05139c9a1bd7.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/df36e201b65f45e4bf936587322f059c/2026/07/01/92073ea7b3e04cc4bfab05139c9a1bd7.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-02T00:38:23Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000308997",
    "attachmentName": "9906e55f1f9c4f62b70ea61c22faa31b.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/9d94386faf844db191eaa581d358a7be/2026/07/01/9906e55f1f9c4f62b70ea61c22faa31b.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-02T00:38:23Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000310833",
    "attachmentName": "749be02bde5c4836a899746621caa743.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/e14fab9cd7a24654b235b3a7f5683f73/2026/07/06/749be02bde5c4836a899746621caa743.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-07T01:27:34Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000308991",
    "sop": "背景：入库单已更新到仓，需要覆盖电池标签；"
  },
  {
    "vascNo": "VASC000000308997",
    "sop": "背景：入库单已更新到仓，需要覆盖电池标签；"
  },
  {
    "vascNo": "VASC000000310833",
    "sop": "入库单：WI50319990，sku：M010000000006403661，一共23箱，A+包裹贴有电池标签，申请覆盖，已覆盖完成上架，补收费用。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S017 · `thread:omt_19433472cd0f5b99`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000295161, VASC000000295986, VASC000000296325, VASC000000299166
- EB：EB0126060330030603；WI：WI49685137, WI49040703, WI50450527；WO：（无）；M：（无）
- 场景：【入库】包裹类异常换商品标签上架, 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架
- 服务：库内其他服务需求, 入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "possible_resubmit_after_reject", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000295161", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000295986", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000296325", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000299166", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[{"vascNo": "VASC000000295161", "rejectReason": "需求描述不清晰，请线下与客服沟通"}, {"vascNo": "VASC000000295986", "rejectReason": "仓库暂时无法提供该服务"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-06-08 20:59] 耿文文: VASC000000295161 IH000000097827 USWC2 Warehouse 19376789 深圳市逸文科技有限公司 库内非标增值（特批）
咨询下客户这是对应了哪个异常单？没有任何商品信息@卢艺元 @史绍玉 
[Image: img_v3_0212f_f2f1ccdd-e8a5-44fc-9d09-96440b27020g]
[2026-06-08 21:00] 卢艺元: @耿文文 啊 我让他们把入库单和异常单号写上
[2026-06-09 17:10] 耿文文: 有答复了么？没答复的话我先退回了@卢艺元
[2026-06-09 17:10] 卢艺元: @耿文文 退回吧 我让客户重新提交了
[2026-06-09 17:22] 卢艺元: @耿文文 文文 你看客户这么重新写可以吗 还有什么需要补充的吗？？
背景：异常单号EB0126060330030603因包裹条码被涂改导致难以分辨条码扫描上架描述：异常单号EB0126060330030603辨认条码信息重新打印条码上架
[2026-06-09 17:26] 耿文文: @卢艺元 
这是要拆包辨识吗？客户不知道实际是什么商品是不
如果是拆包辨识的话，辨识方法要说明清楚
[2026-06-09 17:27] 卢艺元: @耿文文 不需要拆包辨识 客户之前贴的包裹码上面都被划了一道黑线 只是没办法扫描 但是是可以识别包裹码的 直接重新打印贴好就行了
[2026-06-09 17:28] 卢艺元: @耿文文 包裹码现在是这个状态
[Image: img_v3_0212g_d8d04937-2f8a-403d-ae20-7f4283a612dg]
[2026-06-09 17:31] 耿文文: @卢艺元 那走标准增值不行吗？入库补贴包裹标签
cc@许晓妍
[2026-06-09 17:32] 许晓妍: @卢艺元 让客户提个入库标准增值
[2026-06-09 17:33] 卢艺元: @许晓妍 直接在异常单上面提吗？
[2026-06-09 17:33] 许晓妍: @卢艺元 对
[2026-06-09 17:33] 卢艺元: @许晓妍 行 我和客户说下
[2026-06-09 17:37] 卢艺元: @许晓妍 不行哦 我刚让客户投屏看了下 仓库登记的是包裹条码批量异常 给到的是WB码 客户没办法通过WB码锁定原包裹码是哪个 是不是还是需要非标？
cc@耿文文
[2026-06-09 17:38] 许晓妍: @卢艺元 下入库非标吧
[2026-06-09 17:38] 卢艺元: @耿文文 文文 下非标的话你看下按照客户那么写可以吗？
[2026-06-09 17:41] 许晓妍: @卢艺元 异常单号EB0126060330030603辨认条码信息重新打印条码上架==每个A包之间的sku都是同一个吗
[2026-06-09 17:42] 卢艺元: @许晓妍 A包里面肯定SKU都是一样的 但是这个订单不止一个SKU
[2026-06-09 17:43] 许晓妍: @卢艺元 那需要客户再提供辨识方法和包裹标签的对应关系，这个会收辨识费
[2026-06-09 17:44] 卢艺元: @许晓妍 仓库直接对着原包裹条码就能辨识了 包裹码只是被涂抹没办法扫描 但是字是可以看清的
[2026-06-09 17:44] 卢艺元: @许晓妍 现在是这个样子
[Image: img_v3_0212g_31c24c72-918b-4a0b-8d18-58822b4cd73g]
[2026-06-09 17:44] 许晓妍: @卢艺元 好的
[2026-06-09 20:30] 耿文文: @卢艺元 不是让客户下入库非标嘛 怎么又下到库内来了呀，异常单是发生在入库环节的就指引客户下入库增值
[2026-06-09 20:30] 耿文文: VASC000000295986
[2026-06-09 20:31] 卢艺元: @耿文文 客户下错了 我和他们说下
[2026-06-10 14:14] 许晓妍: @卢艺元 让客户操作一下，把新的入库单状态改成运输中
[Image: img_v3_0212h_b9c1ef86-1b61-4fb9-9028-c4e671e2492g]
[2026-06-10 14:31] 卢艺元: @许晓妍 客户说单号写错了 重新提交了
[2026-06-11 14:41] 卢艺元: @许晓妍 这个是什么原因啊？客户都确认报价了 怎么又给退回了
[Image: img_v3_0212i_a998916a-78be-4488-984e-23c1727eacdg]
[2026-06-11 14:55] 卢艺元: @许晓妍 帮忙看下呗 谢谢
[2026-06-11 15:04] 耿文文: @卢艺元VASC000000296325客户是不是没有下新单？增值单里面的新入库单跟原入库单还是同一个WI49040703；
使用异常单创建的非标增值只能通过新单上架，重新提一个吧
[2026-06-11 15:05] 许晓妍: @卢艺元 需要提供新的入库单
[2026-06-11 15:09] 卢艺元: @许晓妍 这样搞的话太麻烦了吧 客户原本是自验货的商品 现在还要下库内上架的海外验
[2026-06-11 15:54] 许晓妍: @卢艺元 云仓的逻辑就是，通过异常单下的增值单要新入库单入库
[2026-06-11 16:06] 卢艺元: @许晓妍 那买家就要多花钱啊 补贴一个包裹码就行 现在还有额外做海外验
[2026-06-11 16:15] 许晓妍: @卢艺元 下商品仓内上架，不含验货，下不了吗
[2026-06-11 16:15] 卢艺元: @许晓妍 我让客户试下
[2026-06-11 17:47] 卢艺元: @许晓妍 没这个入库单选项啊
[2026-06-11 17:52] 许晓妍: @卢艺元 客户的权限开了吗
[2026-06-11 17:53] 卢艺元: @许晓妍 我们权限只有仓库内上架含查验货 没有不含查验货啊
[2026-06-11 17:54] 许晓妍: @卢艺元 那就重新下一个新的自验入库单吧，异常单下的增值单都要提供新的入库单，不单单是你这个客户
[2026-06-16 20:08] 卢艺元: @许晓妍 客户昨天增值单上传的文件有问题被仓库拒绝了 他们重新提交了VASC000000299166这个增值 麻烦帮忙加急审核下 客户一直在催 谢谢
[2026-06-16 20:11] 许晓妍: @卢艺元 你再帮客户检查一下增值单的提交内容和附件
[2026-06-16 20:14] 卢艺元: @许晓妍 我看了 没问题 麻烦帮忙批下吧 谢谢
[2026-06-16 20:45] 卢艺元: @许晓妍 晓研 你就帮他们批了吗？他们着急让仓库今天晚上做
[2026-06-16 20:57] 许晓妍: @卢艺元 看到了
[2026-06-16 21:04] 许晓妍: @卢艺元 已审批
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000295161 IH000000097827 USWC2 Warehouse 19376789 深圳市逸文科技有限公司 库内非标增值（特批） 咨询下客户这是对应了哪个异常单？没有任何商品信息@卢艺元 @史绍玉 [Image: img_v3_0212f_f2f1ccdd-e8a5-44fc-9d09-96440b27020g]
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000295161",
    "requirementDescription": "辨认条码信息重新打印条码上架"
  },
  {
    "vascNo": "VASC000000295986",
    "requirementDescription": "异常单号EB0126060330030603辨认条码信息重新打印条码上架"
  },
  {
    "vascNo": "VASC000000296325",
    "requirementDescription": "异常单号EB0126060330030603辨认条码信息重新打印条码上架"
  },
  {
    "vascNo": "VASC000000299166",
    "requirementDescription": "原入库单号\t  WI49040703：异常单号EB0126060330030603辨认条码信息重新打印条码上架"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000295161",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780556"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780559"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49685137",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780562"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780565"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780568"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "辨认条码信息重新打印条码上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780571"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "因包裹条码被涂改导致难以分辨条码扫描上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780574"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780577"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780589"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780592"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780595"
  },
  {
    "vascNo": "VASC000000295161",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2780598"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792829"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792832"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49685137",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792835"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792838"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792841"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单号EB0126060330030603辨认条码信息重新打印条码上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792844"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单号EB0126060330030603因包裹条码被涂改导致难以分辨条码扫描上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792847"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792850"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792862"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792865"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792868"
  },
  {
    "vascNo": "VASC000000295986",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2792871"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796738"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796741"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49040703",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796744"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126060330030603",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796747"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单号EB0126060330030603辨认条码信息重新打印条码上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796750"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单号EB0126060330030603因包裹条码被涂改导致难以分辨条码扫描上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796753"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796756"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796771"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796774"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796777"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796780"
  },
  {
    "vascNo": "VASC000000296325",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2796783"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834223"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834226"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50450527",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834229"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126060330030603",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834232"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "原入库单号\t  WI49040703：异常单号EB0126060330030603辨认条码信息重新打印条码上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834235"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "原入库单号\t  WI49040703：异常单号EB0126060330030603因包裹条码被涂改导致难以分辨条码扫描上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834238"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834241"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834256"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834259"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834262"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834265"
  },
  {
    "vascNo": "VASC000000299166",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2834268"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000295161",
    "attachmentName": "包裹条码.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "2874956f433441229afeedb569ff7975/2026/06/08/dd95304b2daf42928600308a6f61fcdb.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-06-08T18:52:09Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000295986",
    "attachmentName": "包裹条码2.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "937fe942808c48cab3930fdf19e937c9/2026/06/09/9c21ee09dcc6492da5ab894c24513d88.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-06-09T19:22:46Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000296325",
    "attachmentName": "包裹条码2.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "e824046431754db98f4808d2cdcea792/2026/06/10/51adc413e014435fb27e35b170948ecf.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-10T21:53:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299166",
    "attachmentName": "条码对应表.xlsx",
    "attachmentType": "TRPP",
    "url": "0e62f8532dac49128e244211554f0e89/2026/06/16/7795ca5534b94a0ca276c5eee4db9181.xlsx",
    "attributeName": "包裹和标签的对应关系",
    "attributeKey": "TRPP",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-16T21:04:24Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299166",
    "attachmentName": "f14bea293d61423baa52cb744860f95c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/b337f18cb9a44cbca7de8a3581c8bfaf/2026/06/17/f14bea293d61423baa52cb744860f95c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T00:27:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299166",
    "attachmentName": "714c2fd899c04ee9adde04fef23262d1.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/9f788d36bf004993af79c0848f764273/2026/06/17/714c2fd899c04ee9adde04fef23262d1.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T00:27:04Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000296325",
    "sop": "仓库操作步骤："
  },
  {
    "vascNo": "VASC000000299166",
    "sop": "【背景】异常单号EB0126060330030603因包裹条码被涂改导致难以分辨条码扫描上架。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S018 · `thread:omt_19261b39530d1b81`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架」边界/补充样本
- VASC：VASC000000309171, VASC000000310593
- EB：EB0126063030830214；WI：WI50758237, WI49274672；WO：（无）；M：（无）
- 场景：【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000309171", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000310593", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-06-30 18:01] 耿文文: VASC000000309171 WI49274672 EB0126063030830214 UKGF Warehouse 19884444 佛山小龙人科技有限公司 入库非标增值（特批）
@谢宝漫 @郭锦萍 
这个增值帮忙确认下，客户商品外箱上的这个标签是会打钩么？还是有什么标记？
另外通过异常单下的非标增值要用新入库单上架，麻烦提供
[Image: img_v3_02135_ea72817a-199f-412d-a9a8-f7885783915g]
[2026-06-30 18:01] 郭锦萍: 打勾 增值单需求描述客户有备注新单@耿文文
[2026-07-02 11:13] 郭锦萍: VASC000000309171 异常终止 仓库返回：39个包裹（22个白色，17个灰色），已经重新提交增值单，帮忙再次审核 谢谢
新增值单号: VASC000000310593：新入库单号：WI50758237@耿文文
[2026-07-02 11:46] 耿文文: [泪奔]仓库不能部分上架的么
[2026-07-02 11:49] 郭锦萍: @耿文文 [微笑]这个我也想问
[2026-07-02 12:05] 耿文文: @郭锦萍 已审核 
@Joanna 帮忙核实下，原增值单是辨识后贴标上架，因客户不知道具体两个SKU的数量，所以入库单每个SKU的数量都提的是39个，这种情况仓库没法做部分上架嘛？
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000309171 WI49274672 EB0126063030830214 UKGF Warehouse 19884444 佛山小龙人科技有限公司 入库非标增值（特批） @谢宝漫 @郭锦萍 这个增值帮忙确认下，客户商品外箱上的这个标签是会打钩么？还是有什么标记？ 另外通过异常单下的非标增值要用新入库单上架，麻烦提供 [Image: img...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000309171",
    "requirementDescription": "根据外包装勾选标记对应补贴A+包裹标签，新入库单：WI50758237                           CS102-GRAYB=GRAY  CS102-WHITE=WHITE"
  },
  {
    "vascNo": "VASC000000310593",
    "requirementDescription": "VASC000000309171 异常终止 仓库返回：39个包裹（22个白色，17个灰色）  灰色对应sku：CS102-GRAYB  白色对应sku：CS102-WHITE  A+包裹条码损坏需根据颜色补贴A+包裹标签"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000309171",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951772"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951775"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50758237",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951778"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951781"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "根据外包装勾选标记对应补贴A+包裹标签，新入库单：WI50758237                           CS102-GRAYB=GRAY  CS102-WHITE=WHITE",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951784"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "EB0126063030830214        包裹条码批量异常（需客户处理）  A+包裹条码损坏需根据外包装勾选标记对应补贴A+包裹标签，",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951787"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951790"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951805"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951808"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951811"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951814"
  },
  {
    "vascNo": "VASC000000309171",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2951817"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970966"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970969"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50758237",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970972"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970975"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "VASC000000309171 异常终止 仓库返回：39个包裹（22个白色，17个灰色）  灰色对应sku：CS102-GRAYB  白色对应sku：CS102-WHITE  A+包裹条码损坏需根据颜色补贴A+包裹标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970978"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "EB0126063030830214        包裹条码批量异常（需客户处理）  A+包裹条码损坏需根据外包装勾选标记对应补贴A+包裹标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970981"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970984"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2970999"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2971002"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2971005"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2971008"
  },
  {
    "vascNo": "VASC000000310593",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2971011"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000309171",
    "attachmentName": "文字文稿1.docx标签对应关系.docx",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "16472bcf009c437292c96441f7cff7a6/2026/06/30/faaaf649691946aa8b42dd5ec670e9cb.docx",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-30T18:07:51Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000309171",
    "attachmentName": "fileDownload.pdf包裹条码.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "6cfefdeb886143a2839d333510b36aec/2026/06/30/6ce8b08b01fb45928ea8dbddecea69a2.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-30T18:07:51Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000310593",
    "attachmentName": "fileDownload.pdf包裹条码.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "45e3e40b15dc4046a875048afb90f782/2026/07/02/450de921ede8480d955862a55d51725e.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-02T12:02:16Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000309171",
    "sop": "背景：EB0126063030830214        包裹条码批量异常（需客户处理）；A+包裹条码损坏需根据外包装勾选标记对应补贴A+包裹标签。"
  },
  {
    "vascNo": "VASC000000310593",
    "sop": "背景：EB0126063030830214        包裹条码批量异常（需客户处理）；A+包裹条码损坏需根据外包装勾选标记对应补贴A+包裹标签。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S019 · `eb:EB0126062630749667`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：补足；原因：场景「【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架」补足
- VASC：VASC000000308103, VASC000000315261
- EB：EB0126062630749667；WI：WI50709156, WI50709187；WO：（无）；M：M010000000011798383, M010000000012488723
- 场景：【入库】异常商品/包裹数量与实际不符，按照实际贴标上架, 【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000308103", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000315261", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000308103",
    "requirementDescription": "异常单：EB0126062630749667   登记的异常是：包裹条码异常(需客户处理) 拍的产品sku：9B073516E6     和仓库核实实际此异常是有2个不同的sku，客户下了2个新入库单    WI50709156 下单sku：M010000000011798383 =2043815228349190 第三方产品编码：9B073516E6  WI50709187  下单sku：M010000000012488723 =2043815239097094 第三方产品编码：0A829F9107  按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。"
  },
  {
    "vascNo": "VASC000000315261",
    "requirementDescription": "异常单：EB0126062630749667   登记的异常是：包裹条码异常(需客户处理) 拍的产品sku：9B073516E6     和仓库核实实际此异常是有2个不同的sku，客户下了2个新入库单    WI50709156 下单sku：M010000000011798383 =2043815228349190 第三方产品编码：9B073516E6  WI50709187  下单sku：M010000000012488723 =2043815239097094 第三方产品编码：0A829F9107  按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000308103",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949441"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949444"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50709156",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949447"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949450"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单：EB0126062630749667   登记的异常是：包裹条码异常(需客户处理) 拍的产品sku：9B073516E6     和仓库核实实际此异常是有2个不同的sku，客户下了2个新入库单    WI50709156 下单sku：M010000000011798383 =2043815228349190 第三方产品编码：9B073516E6  WI50709187  下单sku：M010000000012488723 =2043815239097094 第三方产品编码：0A829F9107  按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949453"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单：EB0126062630749667   登记的异常是：包裹条码异常(需客户处理)   和仓库核实实际是有2个不同的产品，客户下了2个新单，标准无法一起操作，需要非标处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949456"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949459"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949474"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949477"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949480"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949483"
  },
  {
    "vascNo": "VASC000000308103",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2949486"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "WB02926061900052",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029643"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029646"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50709156",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029649"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029652"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单：EB0126062630749667   登记的异常是：包裹条码异常(需客户处理) 拍的产品sku：9B073516E6     和仓库核实实际此异常是有2个不同的sku，客户下了2个新入库单    WI50709156 下单sku：M010000000011798383 =2043815228349190 第三方产品编码：9B073516E6  WI50709187  下单sku：M010000000012488723 =2043815239097094 第三方产品编码：0A829F9107  按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029655"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单：EB0126062630749667   登记的异常是：包裹条码异常(需客户处理)   和仓库核实实际是有2个不同的产品，客户下了2个新单，标准无法一起操作，需要非标处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029658"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029661"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029676"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029679"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029682"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029685"
  },
  {
    "vascNo": "VASC000000315261",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029688"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000308103",
    "attachmentName": "WI50709187 包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "7cae2230efcd4ede9709bc55e997b964/2026/06/30/381f8716cd5f4a07b13fb42fd34741ad.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-30T17:23:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000308103",
    "attachmentName": "WI50709156 包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "b4304ff4316e45c69306dd5419714bb6/2026/06/30/d4b083085533440a951e7a43636b909c.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-30T17:23:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315261",
    "attachmentName": "Order (62).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "6c7da3e9a1ab4a4693a07e69dc71fa46/2026/07/09/0342918c8cc849d09279e482e6a55a08.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T16:48:10Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315261",
    "attachmentName": "Order (61).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "c4b60e245b1843e7be46223268ad58a2/2026/07/09/1095cc92ee8c411187ab0353ad782f43.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T16:48:10Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315261",
    "attachmentName": "2fbab1c066404b96bf8d694398abb57b.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/897861a75aa5475f95b1d3edfb3d9aec/2026/07/10/2fbab1c066404b96bf8d694398abb57b.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-10T12:27:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315261",
    "attachmentName": "3dd213de11034dda861c59fee9af1ae9.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/fa1de983e3dc45dbbc0240b96a02d1ac/2026/07/10/3dd213de11034dda861c59fee9af1ae9.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-10T12:27:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000308103",
    "sop": "仓库操作步骤："
  },
  {
    "vascNo": "VASC000000315261",
    "sop": "仓库操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S020 · `vasc:VASC000000269400`

- caseType：`oms_other` / caseIdType：`vasc`
- 抽样槽位：boundary；原因：场景「【尾程】Anker Crowfoots出库」边界/补充样本
- VASC：VASC000000269400
- EB：（无）；WI：（无）；WO：（无）；M：（无）
- 场景：【尾程】Anker Crowfoots出库
- 服务：逆向取货
- attachmentStatus：`not_found_in_oms_va_execute_file`
- caseQualityFlags：[]
- 审核结果：[{"vascNo": "VASC000000269400", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000269400",
    "fieldName": "预约要求",
    "fieldKey": "RESERVE_REQUEST",
    "fieldValue": "无",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1671",
    "serviceSequence": "1",
    "attrId": "2417703"
  },
  {
    "vascNo": "VASC000000269400",
    "fieldName": "备注说明",
    "fieldKey": "VAS_ATTR_REL_RI",
    "fieldValue": "背景：英国逆向DG 收费。 单据号：\"DL20260420000533     DL20260415000374   \"      \"提货地址：  Lineus Ltd, Unit 77 Lincoln Road, Cressex Business Park, High Wycombe, England, HP12 3RL, GB  联系人：Andy Cao  电话：07999506125  sku信息：T2081B11 *63    运费630GBP",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1671",
    "serviceSequence": "1",
    "attrId": "2417706"
  }
]
```

### 上传附件 uploadedAttachments

```text
[]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000269400",
    "sop": "仅收费，无需仓库操作"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S021 · `thread:omt_197cd54b8d8d5c97`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【库内】拍摄照片/视频」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000290166, VASC000000290163, VASC000000290160, VASC000000290136, VASC000000290358, VASC000000291702, VASC000000292314
- EB：（无）；WI：（无）；WO：WO11486057588, WO11486384011, WO11486101654, WO11485984471, WO11505184418；M：（无）
- 场景：【出库】交货时拍照, 【库内】拍摄照片/视频
- 服务：出库其他服务需求, 库内其他服务需求
- attachmentStatus：`text_mention_only`
- caseQualityFlags：["possible_chat_completion_then_pass"]
- 审核结果：[{"vascNo": "VASC000000290166", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000290163", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000290160", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000290136", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000290358", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000291702", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000292314", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-29 17:33] 刘佳: 客户：arashi vision (u.s.) llc19173941
VASC000000290166 WO11486384011
VASC000000290163 WO11486101654
VASC000000290160 WO11486057588
VASC000000290136 WO11485984471
这几个出库非标增值要求：拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照；麻烦协助加急审核哈，谢谢@陈泽森 

对应非标主要是针对客户之前出库单有UN标签错贴漏贴的情况，客户要进一步校验仓库改善后贴标的准确性；标准增值选包裹开箱拍照类型客户不需要开箱，故非标申请

@王紫薇 @李超亮 @Zha.Xinge CC
[2026-05-29 20:21] 陈泽森: @刘佳 @王紫薇 每个包裹拍3张照片,对应上面ASN 电池 运输标签?
[2026-05-29 20:23] 陈泽森: 用包裹开箱拍照费用还更低,如果包裹只需要拍一张照片的话,非标还有最低收费@刘佳 @王紫薇
[2026-05-29 20:24] 王紫薇: @陈泽森 主要是拍上面的危险品标签的粘贴是否正确，历史发货的时候有给客户漏贴和错贴，导致他们被平台罚款的情况，此次客户拍照目的拍照是为了校验我们un电池标签贴标已经完成优化
[2026-05-29 20:25] 陈泽森: 我知道,我的意思是,如果开箱拍照能拍到对应的标签照片,其实走标准的更合适,非标你用了4个非标增值做,收费太高了
[2026-05-29 20:27] 王紫薇: @陈泽森 下标准增值仓库不一定就刚好拍到UN标签吧
[2026-05-29 20:27] 王紫薇: @陈泽森 这个费用我们到时候会给客户做商务补贴
[2026-05-29 21:08] 陈泽森: VASC000000290358 WO11486057588 这个出库单换了个增值单号,都审批了,可以让客户确认了@刘佳 @王紫薇
[2026-06-01 10:52] 刘佳: @Zha.Xinge对应增值都异常终止了，实际照片也没有拍到对吗
@李超亮 帮忙看下能否监控查看的，谢谢

VASC000000290166 WO11486384011
VASC000000290163 WO11486101654
VASC000000290358 WO11486057588
VASC000000290136 WO11485984471
[2026-06-02 10:50] 刘佳: @Zha.Xinge @李超亮 这几单可以帮忙看下有没有打包监控可以查看标签贴标情况吗
[2026-06-02 10:50] 刘佳: WO11486384011
WO11486101654
WO11486057588
WO11485984471
[2026-06-02 10:50] 刘佳: @王紫薇 还在确认
[2026-06-02 10:51] Zha.Xinge: @刘佳 我明天让现场啦，你这边下增值？
[2026-06-02 10:58] 刘佳: @陈泽森 因为增值确认时间是在打包完成后故仓库没有拍到贴标签情况，客户要校验仓库有没有正常贴标，这种可以免费导出打包视频核实吗，还是得走增值调取视频的，麻烦确认下哈，谢谢
[2026-06-02 11:03] 陈泽森: 你问我,肯定是需要走增值去获取的[新月脸]
[2026-06-02 11:12] 刘佳: @陈泽森 订单已经发走，如果是增值是要怎么申请的
[2026-06-02 11:30] 陈泽森: 用库内的非标去获取
[2026-06-02 17:08] 刘佳: 对应库内增值：VASC000000291702已申请，麻烦协助审批的，谢谢@陈泽森
[2026-06-02 17:08] 陈泽森: cc @耿文文
[2026-06-02 17:18] 耿文文: 一个出库单一个视频么？@刘佳
[2026-06-02 17:19] 刘佳: @耿文文 按4个视频会按4个视频的费用收吗，，，能否一个视频汇总的，打包视频应该没有很久吧
[2026-06-02 17:25] 耿文文: @Zha.Xinge 仓库的监控视频可以做打包或剪辑吗
[2026-06-02 21:34] 耿文文: [Image: img_v3_02129_b1cdb63a-fed2-437c-8933-5d43588513eg]
@刘佳 可以在TOM里面新建任务去查询视频，客户那边也可以申请
[2026-06-02 21:35] 刘佳: @耿文文 有增值服务的好像查不了
[2026-06-02 21:35] 刘佳: 明天试试
[2026-06-02 21:37] 耿文文: WO11486384011、
WO11486101654、
WO11486057588、
WO11485984471 @李超亮 明天帮忙看看能否调出这个四个出库单的打包视频，谢谢
[2026-06-03 09:57] Zha.Xinge: @刘佳 懒得弄视频了
[Image: img_v3_0212a_579a00c5-0e61-45dc-8b02-83a676cb6e2h]
BOX-WO11486384011-001
[Image: img_v3_0212a_6a054b2d-4097-4ce9-8d4e-f0a70cf1112h]
[Image: img_v3_0212a_7878c17e-6e5a-4a5f-b9c8-201cd5ae89ch]
BOX-WO11486384011-002
[Image: img_v3_0212a_cb4ca000-1e2f-480f-9164-4a039fb039eh]
BOX-WO11486384011-003
[Image: img_v3_0212a_9cee0543-fc48-488c-9e4b-70b97f08eafh]
[Image: img_v3_0212a_e2bb38fb-dc67-4757-a6dc-3d6348c1386h]
BOX-WO11486384011-004
[Image: img_v3_0212a_31079384-c8cd-4783-a8c0-357f5893e5bh]
BOX-WO11486384011-005
[Image: img_v3_0212a_7e0e3970-d052-4fe4-9327-6a1bf498867h]
BOX-WO11486101654-001
[Image: img_v3_0212a_d16a1f19-02f8-4eb9-908a-31a237d0fd2h]
BOX-WO11486101654-002
[Image: img_v3_0212a_0e211157-fc3d-44f4-8398-260677f0e6eh]
[Image: img_v3_0212a_8dd88c02-a7dd-421d-a10b-2da33cab0f3h]
BOX-WO11486101654-003
[Image: img_v3_0212a_49d03785-ad44-40b0-beda-95bbcee2e57h]
BOX-WO11486101654-004
[Image: img_v3_0212a_7514668a-4870-4aa8-9db2-0b29e5239fah]
[Image: img_v3_0212a_681aa78f-6cb5-4019-8226-7f94775fb61h]
BOX-WO11486101654-005

[Image: img_v3_0212a_cb3c2405-acb1-4f9a-b629-bb33a1e1aebh]
BOX-WO11486057588-001
[Image: img_v3_0212a_c16fc93a-bfc8-4882-a935-b0c943736c3h]
BOX-WO11486057588-002
[Image: img_v3_0212a_09d53611-3631-4764-821b-afeed83a64dh]
WO11485984471
[2026-06-03 12:38] 刘佳: @Zha.Xinge 其他单的有吗[脸红]
[2026-06-03 13:30] Zha.Xinge: 不是只要了4个吗
[2026-06-03 13:31] Zha.Xinge: 这里面4个单都有
[2026-06-03 13:46] 刘佳: @Zha.Xinge 不好意思，，我看漏了[泣不成声]谢谢
[2026-06-03 15:16] 刘佳: @陈泽森 帮忙再审核下，客户这个新单也要拍，谢谢
VASC000000292314 WO11505184418
[2026-06-03 15:35] 陈泽森: 审批了
[2026-06-03 16:08] 刘佳: [Image: img_v3_0212a_75f42dbb-7f62-45e8-9151-2c562328886g]
[Image: img_v3_0212a_e64bd364-2085-46c1-bced-915338e5488g]
BOX-WO11486057588-001 是配件无需贴电池标签
BOX-WO11486057588-002 是相机需贴电池标签 ——客户反馈这两个不对，看看是不是截图给反了哈@Zha.Xinge @李超亮
[2026-06-03 16:27] 刘佳: [Image: img_v3_0212a_e6cf6ad3-2de3-426c-a823-d36ade621d8g]
WO11486101654贴标顺序好像对不上
包裹1 3 4要贴，图片里面是包裹3 5贴了@李超亮 @Zha.Xinge 这个也麻烦看下，谢谢
[2026-06-03 16:32] 李超亮: @刘佳 你咋通过箱子判断包裹号的...
[2026-06-03 16:33] 刘佳: @李超亮 charlie备注的呀
[Image: img_v3_0212a_126ca603-9351-4993-97bc-79106a43f68g]
[2026-06-03 16:48] 李超亮: @刘佳 
[Image: img_v3_0212a_064d7a77-aaa8-495e-914f-5c569f5f8cdg]
WO11486057588 看操作记录是先操作的BOX2（5件） 再操作的BOX1（2件），应该是截图给反了
[2026-06-03 17:21] 李超亮: @刘佳 WO11486101654 这单贴的箱子是BOX3 BOX4 BOX5 ，操作记录后三个操作的箱子是要贴的
[Image: img_v3_0212a_9e34d988-5d5d-443a-9b4c-20f626d6147g]
[Image: img_v3_0212a_a01cfa89-8007-45bd-858c-faf43f238c0g]
[2026-06-03 18:43] 刘佳: VASC000000292314 WO11505184418@Zha.Xinge 客户这次提交了增值拍照，帮忙留意处理哈，谢谢~
[2026-06-03 19:44] 耿文文: @李颖
```

### summaryForIndex（仅索引，不是原文）

```text
客户：arashi vision (u.s.) llc19173941 VASC000000290166 WO11486384011 VASC000000290163 WO11486101654 VASC000000290160 WO11486057588 VASC000000290136 WO11485984471 这几个出库非标增值要求：拍外箱标签（A...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000290166",
    "requirementDescription": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照"
  },
  {
    "vascNo": "VASC000000290163",
    "requirementDescription": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照"
  },
  {
    "vascNo": "VASC000000290160",
    "requirementDescription": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照"
  },
  {
    "vascNo": "VASC000000290136",
    "requirementDescription": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照"
  },
  {
    "vascNo": "VASC000000290358",
    "requirementDescription": "操作步骤：  1、出库单 WO11486057588 打包贴标后拍照外箱  需要 拍照这部分标签 ASN标签/电池标签/运输标签"
  },
  {
    "vascNo": "VASC000000291702",
    "requirementDescription": "WO11486384011  WO11486101654  WO11486057588  WO11485984471  对应这几个出库单之前要求打包完成后：拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照；    但是因非标增值没有及时确认导致仓库打包完成就发走了，没操作到拍摄；  目前需要提供这几单的打包操作视频确认贴标情况"
  },
  {
    "vascNo": "VASC000000292314",
    "requirementDescription": "出库单 WO11505184418 打包贴标后拍照外箱 需要 拍照这部分标签 ASN标签/电池标签/运输标签"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000290166",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700540"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700543"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700546"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700549"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "检查贴标签的准确度",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700552"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700555"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700573"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700576"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700579"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700582"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700585"
  },
  {
    "vascNo": "VASC000000290166",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700588"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700285"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700288"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700291"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700294"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "检查贴标签的准确度",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700297"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700300"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700318"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700321"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700324"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700327"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700330"
  },
  {
    "vascNo": "VASC000000290163",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700333"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700132"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700135"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700138"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700141"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "检查贴标签的准确度",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700144"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700147"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700165"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700168"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700171"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700174"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700177"
  },
  {
    "vascNo": "VASC000000290160",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2700180"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699775"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699778"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699781"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699784"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "检查贴标签的准确度",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699787"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699790"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699808"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699811"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699814"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699817"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699820"
  },
  {
    "vascNo": "VASC000000290136",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2699823"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702277"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702280"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702283"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "操作步骤：  1、出库单 WO11486057588 打包贴标后拍照外箱  需要 拍照这部分标签 ASN标签/电池标签/运输标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702286"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "操作步骤：  1、出库单 WO11486057588 打包贴标后拍照外箱  需要 拍照这部分标签 ASN标签/电池标签/运输标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702289"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702292"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702310"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702313"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702316"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702319"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702322"
  },
  {
    "vascNo": "VASC000000290358",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2702325"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718783"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718786"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718789"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718792"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718795"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11486384011  WO11486101654  WO11486057588  WO11485984471  对应这几个出库单之前要求打包完成后：拍外箱标签（ASN标签/电池标签/运输标签），每箱都需要拍照；    但是因非标增值没有及时确认导致仓库打包完成就发走了，没操作到拍摄；  目前需要提供这几单的打包操作视频确认贴标情况",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718798"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "因客户之前有过订单因贴UN标签漏贴贴错的情况，故需要校验此次这批出库单的贴标是否准确，看下仓库改善成果；    因之前非标增值没有处理到拍照；只能再次非标增值导出打包操作视频检验贴标情况，麻烦审批处理，谢谢",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718801"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718804"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718816"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718819"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718822"
  },
  {
    "vascNo": "VASC000000291702",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2718825"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730690"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730693"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730696"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "出库单 WO11505184418 打包贴标后拍照外箱 需要 拍照这部分标签 ASN标签/电池标签/运输标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730699"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "出库单 WO11505184418 打包贴标后拍照外箱 需要 拍照这部分标签 ASN标签/电池标签/运输标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730702"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730705"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730723"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730726"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730729"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730732"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730735"
  },
  {
    "vascNo": "VASC000000292314",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2730738"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "attachmentName": "text_mention_only",
    "attachmentType": "unknown",
    "url": "",
    "source": "text_mention_in_chat_or_requirement_or_sop",
    "verification": "text_mention_only"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000290166",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000290163",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000290160",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000290136",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000290358",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000291702",
    "sop": "仓库操作步骤："
  },
  {
    "vascNo": "VASC000000292314",
    "sop": "操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S022 · `eb:EB0126062330653514`

- caseType：`oms_other` / caseIdType：`eb`
- 抽样槽位：reject_or_cancel；原因：场景「【库内】拍摄照片/视频」退回/取消相关：观察 unsupported / 转标准 / 仓库无法支持
- VASC：VASC000000305550, VASC000000306900
- EB：EB0126062330653514, EB0126062330654204；WI：WI49408206；WO：（无）；M：M010000000009098837, M010000000006391509
- 场景：【库内】拍摄照片/视频
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000305550", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000306900", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[{"vascNo": "VASC000000305550", "rejectReason": "需求描述不清晰，请线下与客服沟通"}]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000305550",
    "requirementDescription": "测试是否能出声音   打气筒开机运转后声音很大 是否在运转"
  },
  {
    "vascNo": "VASC000000306900",
    "requirementDescription": "测试是否能出声音   打气筒开机运转后声音很大 是否在运转，提供测试视频"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000305550",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001402392232 B0400000001402392506",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900487"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "M010000000009098837 M010000000006391509",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900490"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49408206",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900493"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126062330653514  EB0126062330654204",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900496"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "测试是否能出声音   打气筒开机运转后声音很大 是否在运转",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900499"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "两个异常单到仓破损了，需要测试是否正常",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900502"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900505"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900520"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900523"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900526"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900529"
  },
  {
    "vascNo": "VASC000000305550",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900532"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001402392232 B0400000001402392506",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917494"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "M010000000009098837 M010000000006391509",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917497"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49408206",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917500"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126062330653514  EB0126062330654204",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917503"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "测试是否能出声音   打气筒开机运转后声音很大 是否在运转，提供测试视频",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917506"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "两个异常单到仓破损了，需要测试是否正常",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917509"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917512"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917527"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917530"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917533"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917536"
  },
  {
    "vascNo": "VASC000000306900",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2917539"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000305550",
    "attachmentName": "M010000000006391509操作示例.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "abb30cf9d4334c849ba6f31bc3b7daf0/2026/06/24/c6249d9426b34a9cab26a5851d25080b.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-24T14:20:06Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305550",
    "attachmentName": "M010000000009098837操作示例.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "5b566f21301d40a3ac9677294b65d308/2026/06/24/fc43be3edcfc4c3891026debc2042a88.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-24T14:20:06Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000306900",
    "attachmentName": "M010000000006391509操作示例.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "b11c01a937a7437287201347794937ed/2026/06/26/d8b89aac902841eea7598bcd97b9473d.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T18:12:34Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000306900",
    "attachmentName": "M010000000009098837操作示例.png",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "242bf5be37824b62a6a37f32ad9d1e42/2026/06/26/145fd7c2106c4a67911f740218de0b41.png",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T18:12:34Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000306900",
    "attachmentName": "1f9a20ed6b734ead8fc983002e5b81b2.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/5cc55bdcd240402e8e3e9a3621fcc928/2026/06/29/1f9a20ed6b734ead8fc983002e5b81b2.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-29T16:02:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000306900",
    "sop": "背景：两个异常单到仓破损了，需要测试是否正常，提供视频；"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S023 · `thread:omt_1a8ab86efe0f9b9b`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【库内】拍摄照片/视频」边界/补充样本
- VASC：VASC000000272418, VASC000000273150, VASC000000273309
- EB：（无）；WI：WI49583348；WO：WO11364406262, WO11366220423；M：M010000000000345735, M010000000000345720
- 场景：【库内】商品外观辨识+贴标上架, 【库内】拍摄照片/视频, 【入库】上架前盘点
- 服务：库内其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "possible_resubmit_after_reject", "possible_resubmit_after_cancel", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000272418", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000273150", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000273309", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[{"vascNo": "VASC000000273150", "rejectReason": "需求描述不清晰，请线下与客服沟通"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-04-27 17:47] 耿文文: VASC000000272418 IH000000089475 AU Warehouse 1007434 广州国睿电子科技有限公司 库内非标增值（特批） 库内其他服务需求
需求：客户要求拆箱辨识后根据提供的辨识结果SOP做上架
1、该增值单里面没有上架单，需要客户提供哈
2、另外客户要求用快递袋做包装，考虑实物有玻璃或者零碎物品，用快递袋子有破损的风险，可以考虑使用WINIT1号箱，填充防震物做包装
@石凯 @杨娟
[2026-04-27 18:54] 杨娟: 好的 我找客户要下
[2026-04-28 15:54] 耿文文: @杨娟 VASC000000273150 这个客户今天重新提了一个增值单，还是没有新入库单的哦
[2026-04-28 15:55] 杨娟: 不好意思我让她处理下
[2026-04-28 15:56] 耿文文: 包装材料的那个也确认下哈
[2026-04-28 16:07] 杨娟: 背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。（辨识方式请查看下方图片）
需求：
1将SKU：M010000000000345735下架后
2将SKU 称重，通过SKU 对应的重量辨识实际SKU，M010000000000345735 重量段为0.48KG-0.7KG， M010000000000345720 重量段为0.05KG-0.15KG
3将称重结果为0.05KG-0.15KG的产品换标为：M010000000000345720通过新入库单补贴商品条码上架。
4.将称重结果为0.48KG-0.7KG的产品为SKU：M010000000000345735的货物，重新上架回去。
5.如果所有产品通过称重都是正确的SKU0.48KG-0.7KG，麻烦随机抽一个拍一张照片回传国内留底

实际需求是这个 她自己增值没写对，麻烦将增值给客户退回我让他重新提交
[2026-04-28 16:12] 耿文文: 已退回@杨娟
[2026-04-28 18:49] 杨娟: VASC000000273309
[2026-04-28 18:49] 杨娟: 客户重新提交了
[2026-04-28 18:49] 杨娟: 辛苦再看看~
[2026-04-28 18:50] 耿文文: 1、VASC000000273309 这个新的增值下的入库单WI49583348 为什么只有一种SKU，辨识后不该是2个嘛？
2、另外原SKU也补个下架单吧@杨娟
[2026-04-28 18:53] 杨娟: @耿文文 
原SKU 是：M010000000000345735
它可能会有一部分是M010000000000345720这个SKU 
客户那边的意思是没有问题的是原SKU M010000000000345735就上架回去 有问题的M010000000000345720--这个SKU 的通过新单上架~
不一定全部是有问题的所以客户就没下下架单 
看下是否可以通过盘亏的方式啥的
[2026-04-29 10:38] 耿文文: [捂脸]提供个完整的下架单仓库好操作一些
[2026-04-29 10:40] 杨娟: 她不一定干 目前只是询价 能先给个报价 客户确定要做在提供下架单过来吗----因为客户她自己提错了好几次 有点炸毛
[2026-04-29 15:35] 杨娟: @耿文文 [可怜]可以不可以不 小姐姐
[2026-04-29 17:54] 杨娟: [捂脸]可以嘛 ，可以先帮忙审核下不先帮忙审核下~@耿文文
[2026-04-29 18:02] 耿文文: 如果客户只是询价的话，可以按以下费用项计算：
公开价卡中的出库处理费、入库处理费、贴商品/包裹标签费用、以及尺重测量费用（客户仅测量重量，可按3AUD/件）收取；
增值单里面单据不全确实不好直接审核。@杨娟
[2026-04-29 21:34] 杨娟: 下架单：WO11364406262 
入库单客户那边已更新：WI49583348@耿文文
[2026-04-29 21:35] 杨娟: 辛苦明天上班帮忙审核下报价谢谢~
[2026-04-30 13:52] 杨娟: @耿文文 小姐姐 麻烦帮忙先审核下谢谢~
[2026-04-30 14:41] 耿文文: 来了 我看看
[2026-04-30 14:45] 杨娟: [Sticker]
[2026-04-30 14:49] 耿文文: @杨娟 
1、下架单：WO11364406262 是不是给错了呀，里面的SKU跟增值单描述的不是一个SKU；
2、入库单：WI49583348 里面两个包裹都是M010000000000345720，另外一个M010000000000345735也没有哇；
你看看呢
[2026-04-30 14:50] 杨娟: 对不起 下架单给错了
[2026-04-30 14:50] 杨娟: WO11366220423
[2026-04-30 14:50] 杨娟: 下架单是这个
[2026-04-30 14:50] 杨娟: 入库单我让客户在调整下
[2026-04-30 14:51] 耿文文: 好呢
[2026-04-30 14:52] 杨娟: @耿文文 我让客户调整入库单 这个增值单能先给审核下报价不
[2026-04-30 15:16] 耿文文: @杨娟 VASC000000273309--WO11366220423 --WI49583348 入库单记得让客户更改，另外客户有确认报价后同步我一下
[2026-04-30 15:17] 杨娟: @耿文文 好的谢谢~
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000272418 IH000000089475 AU Warehouse 1007434 广州国睿电子科技有限公司 库内非标增值（特批） 库内其他服务需求 需求：客户要求拆箱辨识后根据提供的辨识结果SOP做上架 1、该增值单里面没有上架单，需要客户提供哈 2、另外客户要求用快递袋做包装，考虑实物有玻璃或者零碎物品，用快递袋子有破损的风险，可...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000272418",
    "requirementDescription": "10704001分选"
  },
  {
    "vascNo": "VASC000000273150",
    "requirementDescription": "10704001 库存分选"
  },
  {
    "vascNo": "VASC000000273309",
    "requirementDescription": "10704001 分选"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000272418",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456499"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456502"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456505"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456508"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456511"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "10704001分选",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456514"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。（辨识方式请查看下方图片）  需求：  1将SKU：M010000000000345735开箱后辨识  2根据以下提供的SKU 对应的实物照片辨识产品SKU  3将辨识结果为M010000000000345720的产品换标为：M010000000000345720通过新入库单，重新包装好，补贴新单的包裹条码+商品条码上架。  4.将辨识结果为SKU：M010000000000345735的货物，重新用快递袋包装好上架回去。  5.如果所有产品开箱辨识都是正确的SKU，麻烦随机拍张开箱后的图片回传国内谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456517"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456520"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456532"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456535"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456538"
  },
  {
    "vascNo": "VASC000000272418",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2456541"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468766"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468769"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468772"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468775"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468778"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "10704001 库存分选",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468781"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。（辨识方式请查看下方图片）  需求：  1将SKU：M010000000000345735开箱后辨识  2根据以下提供的SKU 对应的重量辨识，M010000000000345735 重量段为0.48KG-0.7KG，  M010000000000345720 重量段为0.05KG-0.15KG  3将辨识结果为M010000000000345720的产品换标为：M010000000000345720通过新入库单，重新包装好，补贴新单的包裹条码+商品条码上架。  4.将辨识结果为SKU：M010000000000345735的货物，重新用快递袋包装好上架回去。  5.如果所有产品开箱辨识都是正确的SKU，麻烦随机拍张开箱后的图片回传国内谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468784"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468787"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468799"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468802"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468805"
  },
  {
    "vascNo": "VASC000000273150",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2468808"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472267"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472270"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49583348",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472273"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "WO11366220423",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472276"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472279"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "10704001 分选",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472282"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。（辨识方式请查看下方图片）  需求：  1、根据下架单：WO11364406262 将SKU：M010000000000345735开箱后辨识  2根据以下提供的SKU 对应的重量辨识，M010000000000345735 重量段为0.48KG-0.7KG，  M010000000000345720 重量段为0.05KG-0.15KG  3将辨识结果为M010000000000345720的产品换标为：M010000000000345720通过新入库单补贴商品条码上架。  4.将辨识结果为SKU：M010000000000345735的货物，重新上架回去。  5.如果所有产品开箱辨识都是正确的SKU，麻烦随机拍张开箱后的图片回传国内谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472285"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472288"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472300"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472303"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472306"
  },
  {
    "vascNo": "VASC000000273309",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "2472309"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000272418",
    "attachmentName": "辨识SOP.xlsx",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "5063f9cab999441dbba0b5420954ea5a/2026/04/27/3cd3cbe2aaa24f3da462ea278d21d202.xlsx",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-04-27T18:05:57Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000273150",
    "attachmentName": "辨识SOP.xlsx",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "b94be8066922499ead6e239683080df8/2026/04/28/1981a6a523d9417cbc3070b217532a85.xlsx",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-04-28T15:56:47Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000273309",
    "attachmentName": "商品标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "531b6700c53249369823a4efa48feefe/2026/04/28/7c7cc9c483504a70bb6f10a723b5df57.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-04-30T15:15:10Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000273309",
    "attachmentName": "Order (25).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "00e7bc7a60714b9db3a72d274e07784b/2026/04/30/67ec9595360944308134a11578ecbe41.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-04-30T15:15:10Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000273309",
    "attachmentName": "36ee43c6d5734508abdc029db5d9d9f0.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://aufmsstream.winit.com.cn/ab98425b7152476fa7697f74fa2181fe/2026/05/01/36ee43c6d5734508abdc029db5d9d9f0.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF6V1603",
    "created": "2026-05-01T14:55:31Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000272418",
    "sop": "背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。（辨识方式请查看下方图片）"
  },
  {
    "vascNo": "VASC000000273150",
    "sop": "背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。（辨识方式请查看下方图片）"
  },
  {
    "vascNo": "VASC000000273309",
    "sop": "背景：怀疑仓库贴错标签，目前通过外观无法识别，需要仓库帮忙开箱辨识，在根据辨识结果处理上架。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S024 · `thread:omt_1961c9000fc9dcb9`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：chat_driven；原因：场景「【出库】指定位置贴商品/包裹标签/快递面单」chat_driven：有完整群聊，观察补全链路
- VASC：VASC000000280767, VASC000000280959, VASC000000280962, VASC000000280965
- EB：（无）；WI：（无）；WO：WO11420014410, WO11420108310, WO11420224890, WO11420240316；M：（无）
- 场景：【出库】补贴/更换商品标签, 【出库】指定位置贴商品/包裹标签/快递面单
- 服务：出库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000280767", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000280959", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000280962", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000280965", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-13 17:18] 陈泽森: VASC000000280767 WO11420014410 DEBR2 Warehouse 16757165 Anker Technology (UK) Ltd.-2 VASC000000280959 WO11420108310 VASC000000280962 WO11420224890 VASC000000280965 WO11420240316 @徐丽红 @龚林晓 这些单为啥客户不在补贴其他商品条码和补贴其他包裹条码的标准增值里面上传透明标签的补贴呀？ cc @张淼
[2026-05-13 17:20] 徐丽红: @陈泽森 因为内外贴的标签需要是同一张，如果传到这两个位置，仓库无法保证可以贴的是一样的
[2026-05-13 17:21] 徐丽红: 所以仓库让提非标增值做
[2026-05-13 18:06] 陈泽森: 审批了，仓库操作的同事知道这个非标的操作吧，VASC000000280962 这个单里面操作步骤的出库单错了 你看是取消在提交一个，还是你跟仓库说一下？@徐丽红
[2026-05-13 18:09] 徐丽红: 仓库知道的
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000280767 WO11420014410 DEBR2 Warehouse 16757165 Anker Technology (UK) Ltd.-2 VASC000000280959 WO11420108310 VASC000000280962 WO11420224890 VASC000000280965 WO11420240316 @...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000280767",
    "requirementDescription": "WO11420014410  出库的都是A+包，需要开箱在产品上贴一张，外箱贴一张，贴一样的透明标签，标签见附件"
  },
  {
    "vascNo": "VASC000000280959",
    "requirementDescription": "WO11420108310  出库的都是A+包，需开箱补贴透明标签，产品上贴一张，外箱贴一张，贴一样的透明标签"
  },
  {
    "vascNo": "VASC000000280962",
    "requirementDescription": "WO11420224890  出库的都是A+包，需开箱补贴透明标签，产品上贴一张，外箱贴一张，贴一样的透明标签"
  },
  {
    "vascNo": "VASC000000280965",
    "requirementDescription": "WO11420240316  出库的都是A+包，需开箱补贴透明标签，产品上贴一张，外箱贴一张，贴一样的透明标签"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000280767",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561202"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561205"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561208"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11420014410  出库的都是A+包，需要开箱在产品上贴一张，外箱贴一张，贴一样的透明标签，标签见附件",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561211"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标签增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561214"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561217"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561235"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561238"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561241"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561244"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561247"
  },
  {
    "vascNo": "VASC000000280767",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2561250"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2565984"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2565987"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2565990"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11420108310  出库的都是A+包，需开箱补贴透明标签，产品上贴一张，外箱贴一张，贴一样的透明标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2565993"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2565996"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2565999"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566017"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566020"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566023"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566026"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566029"
  },
  {
    "vascNo": "VASC000000280959",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566032"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566035"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566038"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566041"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11420224890  出库的都是A+包，需开箱补贴透明标签，产品上贴一张，外箱贴一张，贴一样的透明标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566044"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566047"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566050"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566068"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566071"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566074"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566077"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566080"
  },
  {
    "vascNo": "VASC000000280962",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566083"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566086"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566089"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566092"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11420240316  出库的都是A+包，需开箱补贴透明标签，产品上贴一张，外箱贴一张，贴一样的透明标签",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566095"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566098"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566101"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566119"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566122"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566125"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566128"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566131"
  },
  {
    "vascNo": "VASC000000280965",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2566134"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000280767",
    "attachmentName": "T2880GA1透明标-99pcs-1.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "9ddc96d7d3f349aaa024bd252116e476/2026/05/12/7519e7a08af94b808f65072b73c042fb.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-13T17:49:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280767",
    "attachmentName": "68587127beed449f94d17470590572b1.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/b57ad5355c064c109aef4d3cd88f5465/2026/05/18/68587127beed449f94d17470590572b1.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-18T22:44:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280767",
    "attachmentName": "d563701981af437a961609cbd5c8a17d.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/768cb4a8421445e29fb007fd57338872/2026/05/18/d563701981af437a961609cbd5c8a17d.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-18T22:44:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280959",
    "attachmentName": "T2880GA1透明标-99pcs-2.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "b6db2eb760aa42f89155384968baf3e4/2026/05/13/e588fc450b764179b935f462d4754962.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-13T17:58:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280959",
    "attachmentName": "0a363437408e4e0b80078b0cb0e26d3f.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/ad83274ecfc84981ad5de1729a7aabbc/2026/05/19/0a363437408e4e0b80078b0cb0e26d3f.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-19T19:35:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280959",
    "attachmentName": "704c35dfc6a44ab9a0e9ef56c00d726a.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/b2ed17c2baad48799b10dc9f890b3dd3/2026/05/19/704c35dfc6a44ab9a0e9ef56c00d726a.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-19T19:35:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280962",
    "attachmentName": "T2880GA1透明标-99pcs-3.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "560343ac456b4376b14e79d0fc5ba137/2026/05/13/b55ab89cb1f04c44ac7b02287f3b352a.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-13T18:01:13Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280962",
    "attachmentName": "9e6d157e41b44ba2a7dc5206a629691f.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/42b0dfabed4542b897ec267ff722a5e9/2026/05/20/9e6d157e41b44ba2a7dc5206a629691f.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T14:19:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280962",
    "attachmentName": "5c54df58b4234ba98548ae22dc0bb6fa.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/157977066edd4033a9523185b4cfbb56/2026/05/20/5c54df58b4234ba98548ae22dc0bb6fa.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T14:19:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280965",
    "attachmentName": "T2880GA1透明标-99pcs-4.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "57f24b9619ca4dbc98ca4c1eb321cf58/2026/05/13/ff88dc668f12496887eca4b90854e357.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-13T18:04:43Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280965",
    "attachmentName": "fc7e3b982cf14ddc97b997f9960a4a8c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/52e373e6e0ab4afd95be2c42224551ff/2026/05/20/fc7e3b982cf14ddc97b997f9960a4a8c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:55:13Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000280965",
    "attachmentName": "4396484d2ec74792979737d09bd0fb12.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/c2cfa3256ddb4cd5a53a395bb449657a/2026/05/20/4396484d2ec74792979737d09bd0fb12.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-20T17:55:13Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000280767",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000280959",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000280962",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000280965",
    "sop": "操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S025 · `thread:omt_19633fe9b70f1b91`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：reject_or_cancel；原因：场景「【出库】指定位置贴商品/包裹标签/快递面单」退回/取消相关：观察 unsupported / 转标准 / 仓库无法支持
- VASC：VASC000000282606, VASC000000282603, VASC000000282600
- EB：（无）；WI：（无）；WO：WO11419506514；M：（无）
- 场景：【出库】指定位置贴商品/包裹标签/快递面单
- 服务：出库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_resubmit_after_reject", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000282606", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000282603", "auditResult": "退回", "isAuditThrough": "N", "status": "CD"}, {"vascNo": "VASC000000282600", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[{"vascNo": "VASC000000282603", "rejectReason": "标准增值支持此场景，请提交标准增值"}]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-15 14:03] 张曼: 17806402 NOTHING TECHNOLOGY HK LIMITED

VASC000000282606
USKY3 Warehouse

VASC000000282603
VASC000000282600
USWC2 Warehouse
客户如上这几个出库非标特批增值需要操作的原因是：需要改其他FBA仓库发，需要重新补贴新的包裹条码标签且需覆盖掉包裹上已经粘贴好的FBA箱唛标签。箱唛标签不用指定箱号贴，箱唛箱号不指定随机粘贴即可，但一定要覆盖原箱唛

麻烦帮忙加急审批下，谢谢@陈泽森 @张淼
[2026-05-15 14:56] 陈泽森: VASC000000282603 WO11419506514 这个单我看原增值里面没有补贴包裹其他标签的增值，让客户在标准增值那边提交覆盖FBA箱唛的增值 @张曼 其他审批了
[Image: img_v3_0211n_79372bb1-a094-4086-9ae6-83d640c8c03g]
[2026-05-15 14:57] 张曼: @陈泽森 好
```

### summaryForIndex（仅索引，不是原文）

```text
17806402 NOTHING TECHNOLOGY HK LIMITED VASC000000282606 USKY3 Warehouse VASC000000282603 VASC000000282600 USWC2 Warehouse 客户如上这几个出库非标特批增值需要操作的原因是：需要改其他FBA仓库发，需要重新补贴新的包裹条码标签且需覆盖掉包裹...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000282606",
    "requirementDescription": "新箱唛覆盖旧箱唛"
  },
  {
    "vascNo": "VASC000000282603",
    "requirementDescription": "新箱唛覆盖旧箱唛"
  },
  {
    "vascNo": "VASC000000282600",
    "requirementDescription": "新箱唛覆盖旧箱唛"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000282606",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586252"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586255"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586258"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "新箱唛覆盖旧箱唛",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586261"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "新箱唛覆盖旧箱唛",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586264"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586267"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586285"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586288"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586291"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586294"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586297"
  },
  {
    "vascNo": "VASC000000282606",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2586300"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585916"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585919"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585922"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "新箱唛覆盖旧箱唛",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585925"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "新箱唛覆盖旧箱唛",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585928"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585931"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585949"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585952"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585955"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585958"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585961"
  },
  {
    "vascNo": "VASC000000282603",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585964"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585763"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585766"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585769"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "新箱唛覆盖旧箱唛",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585772"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "新箱唛覆盖旧箱唛",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585775"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585778"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585796"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585799"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585802"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585805"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585808"
  },
  {
    "vascNo": "VASC000000282600",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2585811"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000282606",
    "attachmentName": "NTUS20260523-1D98YRKR-43628769371-cartonLabels_48846044482.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "32bc093c18274f088d2b09484f3bb581/2026/05/15/57711bc22ec3477db3a31d94f39e8c5a.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-15T14:56:47Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282606",
    "attachmentName": "db7ccc0e781d4bd89b1a6e04802db99c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/448081b40e474f4f94ba6cf6772fe6f3/2026/05/15/db7ccc0e781d4bd89b1a6e04802db99c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-16T02:28:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282606",
    "attachmentName": "49562b44cb364708b8c4a806c327d919.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/3f1a9858fad14abba6a7776d9f73fc49/2026/05/15/49562b44cb364708b8c4a806c327d919.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-16T02:28:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282606",
    "attachmentName": "e82c4e15021c4084b20f17980f773377.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/c40e07c61df644d2be1c46e5766f2ea1/2026/05/15/e82c4e15021c4084b20f17980f773377.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-16T02:28:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282606",
    "attachmentName": "ab80e999810549989110a9dec303ad31.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/6044750769b5443ab450ce9ad0b463d8/2026/05/15/ab80e999810549989110a9dec303ad31.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-16T02:28:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282606",
    "attachmentName": "e76aac3d633d46289d3caa2f75215413.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/75a1971c93614d54a59805ee2484a003/2026/05/15/e76aac3d633d46289d3caa2f75215413.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-16T02:28:33Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282603",
    "attachmentName": "NTUS20260521-3O759QZN-cartonLabels_48845662102.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "68d0fafda9a64812ad39348287c1133a/2026/05/15/40d3e9558ac44c2a802a0e34251bc3cb.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-15T12:10:29Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282600",
    "attachmentName": "NTUS20260522-1D98YRKR-43628688061-cartonLabels_48845541022.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "2507634fb4ee44c89dcab88c6a949a23/2026/05/15/49001557eb12498e961ab66770d3be72.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-15T14:52:26Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000282606",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000282600",
    "sop": "操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S026 · `thread:omt_1a982909d0905c89`

- caseType：`chat_driven` / caseIdType：`thread`
- 抽样槽位：boundary；原因：场景「【出库】指定位置贴商品/包裹标签/快递面单」边界/补充样本
- VASC：VASC000000278169, VASC000000278349, VASC000000278436
- EB：（无）；WI：（无）；WO：WO11399725238, WO11395371093, WO11398272842；M：（无）
- 场景：【出库】指定位置贴商品/包裹标签/快递面单
- 服务：出库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["possible_chat_completion_then_pass", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000278169", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000278349", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000278436", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`found`

```text
[2026-05-08 16:41] 陈泽森: VASC000000278169 WO11399725238 DEBR2 Warehouse 16757165 Anker Technology (UK) Ltd.-2 出库非标增值（特批） @徐丽红 这个单，标准增值已经完成了开箱补贴商品标签的操作了是吧，这个只是补收开箱费用？ cc @张淼 
[Image: img_v3_0211g_b4f523e5-36b6-4388-8a95-429b54811b8g]
[2026-05-08 16:42] 徐丽红: @陈泽森是的
[2026-05-08 16:44] 陈泽森: VASC000000278349 WO11395371093 DE Warehouse 16758605 Anker Technology (UK) Ltd.-3 出库非标增值（特批） 这个装箱清单和发票每个托盘都贴一张是吧？@徐丽红 我看是有2个托的
[2026-05-08 16:51] 徐丽红: 是的
[2026-05-08 16:57] 徐丽红: VASC000000278349 @陈泽森 这单先审核一下吧 货物刚提走了，等确认完增值仓库再更新出库
[2026-05-08 16:57] 陈泽森: 审批了
[2026-05-08 16:59] 徐丽红: 好的谢谢
[2026-05-08 17:02] 陈泽森: VASC000000278436 WO11398272842 DEBR2 Warehouse 16757165 Anker Technology (UK) Ltd.-2 出库非标增值（特批）@徐丽红 这个让客户在标准增值里面下透明标签吧，出库单我看还没拣选，还能改。仓库已经打印的那个标签就不要了，用标准增值里面的标签打印补贴吧
[2026-05-08 17:04] 张淼: VASC000000278349 这个单标准出库无需暂存打包完成了，审核下发不到仓库的，会异常终止
[2026-05-08 17:05] 张淼: @徐丽红 补个库内增值吧 cc@陈泽森
[2026-05-08 17:05] 徐丽红: @陈泽森 这会可能已经拣选了。。
[2026-05-08 17:09] 陈泽森: 。。。。
[Image: img_v3_0211g_4b1bbbb2-6e2e-4d77-9e6e-70867dd8a9fg]
[2026-05-08 17:22] 徐丽红: @陈泽森 是的 你先审核给仓库操作吧 仓库在催
[2026-05-08 17:22] 陈泽森: 审批了
[2026-05-08 17:23] 徐丽红: okk
```

### summaryForIndex（仅索引，不是原文）

```text
VASC000000278169 WO11399725238 DEBR2 Warehouse 16757165 Anker Technology (UK) Ltd.-2 出库非标增值（特批） @徐丽红 这个单，标准增值已经完成了开箱补贴商品标签的操作了是吧，这个只是补收开箱费用？ cc @张淼 [Image: img_v3_0211g_b4f523e5-3...
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000278169",
    "requirementDescription": "WO11399725238  有40件是A+包，需要开箱更换商品标签，补收开箱费"
  },
  {
    "vascNo": "VASC000000278349",
    "requirementDescription": "出库单：WO11395371093  目前订单打包完成，因客户没有选择暂存，订单无法变暂存完成状态，但是需要更新箱单和发票，重新补贴，标准见附件"
  },
  {
    "vascNo": "VASC000000278436",
    "requirementDescription": "WO11398272842  需要每个sku贴一张透明标签，因下单的时候没有选，但是标签有同步仓库已打印好，如重新下单标签会作废需要重新打印，需提非标补收贴标费"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000278169",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529936"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529939"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529942"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11399725238  有40件是A+包，需要开箱更换商品标签，补收开箱费",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529945"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529948"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529951"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529969"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529972"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529975"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529978"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529981"
  },
  {
    "vascNo": "VASC000000278169",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2529984"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531694"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531697"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531700"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "出库单：WO11395371093  目前订单打包完成，因客户没有选择暂存，订单无法变暂存完成状态，但是需要更新箱单和发票，重新补贴，标准见附件",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531703"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531706"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531709"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531727"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531730"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531733"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531736"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531739"
  },
  {
    "vascNo": "VASC000000278349",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2531742"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532444"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532447"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532450"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "WO11398272842  需要每个sku贴一张透明标签，因下单的时候没有选，但是标签有同步仓库已打印好，如重新下单标签会作废需要重新打印，需提非标补收贴标费",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532453"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "详情请参考话题沟通",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532456"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532459"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532477"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532480"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "标签类型",
    "fieldKey": "LABEL_TYPE",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532483"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532486"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "托盘和标签的对应关系",
    "fieldKey": "TRPL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532489"
  },
  {
    "vascNo": "VASC000000278436",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "serviceSequence": "1",
    "attrId": "2532492"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000278169",
    "attachmentName": "企业微信截图_20260508103907.png",
    "attachmentType": "LABEL_TYPE",
    "url": "febd7cd6386448fbb9406cafb08636f6/2026/05/08/014eb1291a4d41e792a4d5657dc3626a.png",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-08T16:55:35Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000278349",
    "attachmentName": "CI26056050 .pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "948fe4b636af49fbb8f451bcab5d30dd/2026/05/08/7abed21994114503b1952a0a5c87c5fe.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-08T16:47:32Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000278349",
    "attachmentName": "AK1166-PL.pdf",
    "attachmentType": "LABEL_TYPE",
    "url": "b6943d7c74df4621875f60aa38a4a0f4/2026/05/08/bd4cecb236414dd7909c5411f7c8b1c2.pdf",
    "attributeName": "标签类型",
    "attributeKey": "LABEL_TYPE",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-08T16:47:32Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000278436",
    "attachmentName": "企业微信截图_20260508153831.png",
    "attachmentType": "CEO_SOA",
    "url": "40366e45a85e4260b8b0d670decaf6a0/2026/05/08/ad489e8081b7485dbd5b41573f4836a6.png",
    "attributeName": "CEO审批截图",
    "attributeKey": "CEO_SOA",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF8V1601",
    "created": "2026-05-08T17:17:21Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000278169",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000278349",
    "sop": "操作步骤："
  },
  {
    "vascNo": "VASC000000278436",
    "sop": "操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S027 · `eb:EB0126062630783117`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000309168, VASC000000309810, VASC000000313200
- EB：EB0126062630783117, EB0126062430662607；WI：WI50189730；WO：（无）；M：（无）
- 场景：仓库已完成 需补收费用
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat"]
- 审核结果：[{"vascNo": "VASC000000309168", "auditResult": "通过", "isAuditThrough": "Y", "status": "ES"}, {"vascNo": "VASC000000309810", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000313200", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000309168",
    "requirementDescription": "异常单:EB0126062630783117,EB0126062430662607,一共1450个包裹，去除已登记的两个包裹，实际应补收1448*2.5=3620EUR"
  },
  {
    "vascNo": "VASC000000309810",
    "requirementDescription": "由于客户缺货着急催上架，仓库没有按照原本的流程一箱一箱扫描登记异常：包裹条码未贴最小面。异常单：EB0126062630783117，EB0126062430662607，一共1450个包裹，去除已登记的两个包裹，实际应补收1448*2.5=3620EUR。"
  },
  {
    "vascNo": "VASC000000313200",
    "requirementDescription": "VASC000000309810  已完成，漏关闭异常，二次补增值关闭，免增值费！  EB0126062630783117   关闭异常单"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000309168",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950272"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950275"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50189730",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950278"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950281"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单:EB0126062630783117,EB0126062430662607,一共1450个包裹，去除已登记的两个包裹，实际应补收1448*2.5=3620EUR",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950284"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "由于客户缺货着急催上架,仓库没有按照原本的流程一箱一箱扫描登记异常:包裹条码未贴最小面。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950287"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950290"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950305"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950308"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950311"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950314"
  },
  {
    "vascNo": "VASC000000309168",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2950317"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960481"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960484"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960487"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960490"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "由于客户缺货着急催上架，仓库没有按照原本的流程一箱一箱扫描登记异常：包裹条码未贴最小面。异常单：EB0126062630783117，EB0126062430662607，一共1450个包裹，去除已登记的两个包裹，实际应补收1448*2.5=3620EUR。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960493"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "由于客户缺货着急催上架，仓库没有按照原本的流程一箱一箱扫描登记异常：包裹条码未贴最小面。异常单：EB0126062630783117，EB0126062430662607，一共1450个包裹，去除已登记的两个包裹，实际应补收1448*2.5=3620EUR。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960496"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960499"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960514"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960517"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960520"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960523"
  },
  {
    "vascNo": "VASC000000309810",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2960526"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003069"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003072"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003075"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003078"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "VASC000000309810  已完成，漏关闭异常，二次补增值关闭，免增值费！  EB0126062630783117   关闭异常单",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003081"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "VASC000000309810  已完成，漏关闭异常，二次补增值关闭，免增值费！  EB0126062630783117   关闭异常单",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003084"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003087"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003102"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003105"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003108"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003111"
  },
  {
    "vascNo": "VASC000000313200",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3003114"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000309810",
    "attachmentName": "a730d6aa40e9414f96e54cb6fdac7b87.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/448331dea9c14f88b99428bb0e9b8ff8/2026/07/02/a730d6aa40e9414f96e54cb6fdac7b87.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-02T15:49:12Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000309810",
    "attachmentName": "3df1133f262e462ca87430626c9fb58e.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/09732abf0c5043eda8fa7bbe0d719e25/2026/07/02/3df1133f262e462ca87430626c9fb58e.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-02T15:49:12Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000313200",
    "attachmentName": "1359191745804bdabfcd6b3c73eb125e.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/16e32ed65c65434187119b2a73b4591b/2026/07/08/1359191745804bdabfcd6b3c73eb125e.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T14:38:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000313200",
    "attachmentName": "4c04a7252602411ba5e899d66d695f76.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://eufmsstream.winit.com.cn/fa130275fef741028a82df6917c96506/2026/07/08/4c04a7252602411ba5e899d66d695f76.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T14:38:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000309168",
    "sop": "背景：由于客户缺货着急催上架,仓库没有按照原本的流程一箱一箱扫描登记异常：包裹条码未贴最小面。"
  },
  {
    "vascNo": "VASC000000309810",
    "sop": "背景：由于客户缺货着急催上架,仓库没有按照原本的流程一箱一箱扫描登记异常：包裹条码未贴最小面。"
  },
  {
    "vascNo": "VASC000000313200",
    "sop": "背景：VASC000000309810  已完成，漏关闭异常，二次补增值关闭，免增值费！"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S028 · `eb:EB0126070831116696`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000316035, VASC000000317529, VASC000000318747
- EB：EB0126070831116696；WI：WI51042812；WO：（无）；M：M010000000009526667
- 场景：【入库】上架前采集条码（含SN码、A+包第三方包裹码等）
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000316035", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000317529", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000318747", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000316035",
    "requirementDescription": "异常的4个单品，需采集彩盒上的SN返还给我们便于后续采购纸箱，（SN在彩盒外侧，如附件），另这些异常货物先保持现状更换sku上架到新单WIxxx，等纸箱采购到仓后，再做库内增值更换客制纸箱"
  },
  {
    "vascNo": "VASC000000317529",
    "requirementDescription": "异常的4个单品，需采集彩盒上的SN返还给我们便于后续采购纸箱，（备注一下SN在彩盒上哪个位置，最好提供下示例图），另这些异常货物先保持现状更换sku上架到新单WIxxx，等纸箱采购到仓后，再做库内增值更换客制纸箱"
  },
  {
    "vascNo": "VASC000000318747",
    "requirementDescription": "扫描SN返回（sn示例如附件），先提供SN再添加包材补贴标签上架"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000316035",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001432004104",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064071"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "M010000000009526667",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064074"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51042812",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064077"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126070831116696",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064080"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常的4个单品，需采集彩盒上的SN返还给我们便于后续采购纸箱，（SN在彩盒外侧，如附件），另这些异常货物先保持现状更换sku上架到新单WIxxx，等纸箱采购到仓后，再做库内增值更换客制纸箱",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064083"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "这些异常货物为外包装破损，需采购客制包材过来更换上架，现需要仓库记录箱内SN返还给我司，才能根据sn去采购对应的纸箱",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064086"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064089"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064104"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064107"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064110"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064113"
  },
  {
    "vascNo": "VASC000000316035",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3064116"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001432004104",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063057"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "M010000000009526667",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063060"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51042812",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063063"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126070831116696",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063066"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常的4个单品，需采集彩盒上的SN返还给我们便于后续采购纸箱，（备注一下SN在彩盒上哪个位置，最好提供下示例图），另这些异常货物先保持现状更换sku上架到新单WIxxx，等纸箱采购到仓后，再做库内增值更换客制纸箱",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063069"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "这些异常货物为外包装破损，需采购客制包材更换上架，现需要仓库记录箱内SN返还给我，才能根据sn去采购对应的纸箱",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063072"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063075"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063090"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063093"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063096"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063099"
  },
  {
    "vascNo": "VASC000000317529",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3063102"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "B0400000001432004104",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090486"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "M010000000009526667",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090489"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51042812",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090492"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126070831116696",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090495"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "扫描SN返回（sn示例如附件），先提供SN再添加包材补贴标签上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090498"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "这些异常货物为外包装破损，需加winit包材上架，现需要仓库扫描SN给我司",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090501"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090504"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090519"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090522"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090525"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090528"
  },
  {
    "vascNo": "VASC000000318747",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3090531"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000316035",
    "attachmentName": "示例图，彩盒背面.xlsx",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "918f4d0491fc4921be59d1d6e2cf1166/2026/07/14/6f6139dbbea74e9cbb05c6f826c6df62.xlsx",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-14T18:21:31Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "SN.xlsx",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "12fd4c30b9df4b4f9a2e8420a94b0de3/2026/07/15/c82a065eb9684a56b15eaef47bcbd989.xlsx",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-15T21:33:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "Order (72).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "d2292b3d7c3c4f6cbaa0dccfe0c13c97/2026/07/15/b90248ab1d404f08b4bd23a81fcfedd2.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-15T21:33:28Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "985e1db845b44a9993dceb07a30080f8.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/616c4d15fc7a4c7f92478f2c7b735e38/2026/07/17/985e1db845b44a9993dceb07a30080f8.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-17T23:59:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "3516b2153d9040f880d44354ad7b44d5.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/9f535c86a325437da124271284b3841a/2026/07/17/3516b2153d9040f880d44354ad7b44d5.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-17T23:59:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "ded7651d922f4811a4063d6c74692869.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/53be52b3d67e4f0dbd995af471fd2713/2026/07/17/ded7651d922f4811a4063d6c74692869.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-17T23:59:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "54aa45da8b67493d83dfaa01340d8aae.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/7eb23dd69e4649208509e2400689ff44/2026/07/17/54aa45da8b67493d83dfaa01340d8aae.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-17T23:59:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318747",
    "attachmentName": "939f55b8bd2a4f6eb3b8435b5bf34edf.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/b741d54c6955456cb06a6eec01e5120d/2026/07/17/939f55b8bd2a4f6eb3b8435b5bf34edf.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-17T23:59:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000316035",
    "sop": "背景：这些异常货物为外包装破损，需采购客制包材过来更换上架，现需要仓库记录箱内SN返还给我司，才能根据sn去采购对应的纸箱；"
  },
  {
    "vascNo": "VASC000000318747",
    "sop": "【背景】EB0126070831116696这些异常货物为外包装破损，需加winit包材上架，现需要仓库扫描SN给客户。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S029 · `eb:EB0526062730797031`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000314061, VASC000000318489, VASC000000318543
- EB：EB0526062730797031；WI：WI50905925；WO：（无）；M：（无）
- 场景：【库内】单品条码状态异常换新入库单上架, 【库内】拆分SKU
- 服务：库内其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat"]
- 审核结果：[{"vascNo": "VASC000000314061", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000318489", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}, {"vascNo": "VASC000000318543", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000314061",
    "requirementDescription": "将异常EB0526062730797031的货物在新入库单WI50905925上架"
  },
  {
    "vascNo": "VASC000000318489",
    "requirementDescription": "将异常EB0526062730797031的货物在新入库单WI51067890，WI51067532上架 处理完成将异常单关闭。"
  },
  {
    "vascNo": "VASC000000318543",
    "requirementDescription": "将异常EB0526062730797031的货物 目前核实有6个完好的 以及5个彩盒破损的  麻烦将6个完好的在在新入库单在WI51068760 上架，  5个破损的 加快递袋在WI51067532上架  处理完成将异常单关闭。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000314061",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015483"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015486"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015489"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015492"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015495"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "将异常EB0526062730797031的货物在新入库单WI50905925上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015498"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "由于仓库原因导致箱产品货物破损，目前需要将箱产品作为一个新SKU 上架区分开",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015501"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015504"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015516"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015519"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015522"
  },
  {
    "vascNo": "VASC000000314061",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3015525"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082782"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082785"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082788"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082791"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082794"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "将异常EB0526062730797031的货物在新入库单WI51067890，WI51067532上架 处理完成将异常单关闭。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082797"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "由于仓库原因导致箱产品货物破损，目前需要将箱产品作为一个新SKU 上架区分开",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082800"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082803"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082815"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082818"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082821"
  },
  {
    "vascNo": "VASC000000318489",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3082824"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084924"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084927"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084930"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084933"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084936"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "将异常EB0526062730797031的货物 目前核实有6个完好的 以及5个彩盒破损的  麻烦将6个完好的在在新入库单在WI51068760 上架，  5个破损的 加快递袋在WI51067532上架  处理完成将异常单关闭。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084939"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单核实是由于仓库原因导致破损 目前需要将货物分开上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084942"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084945"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084957"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084960"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084963"
  },
  {
    "vascNo": "VASC000000318543",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3084966"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000318543",
    "attachmentName": "Order (66).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "c7698aab3d29481d88bbb4b7e0131ec5/2026/07/15/1cf80ca4e30749b0bee9645d248ac97f.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-15T15:51:20Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318543",
    "attachmentName": "Order (67).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "4a115d8bb7934bde8b13755293f57108/2026/07/15/1d7375d3c04c4499a32e263f414a8dd5.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-15T15:51:20Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318543",
    "attachmentName": "OrderWI51068760  (69).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "3edb0f8bff1a42089b308ea0ffab6b10/2026/07/15/024bdf21a456474c9c6c9313d624870d.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-15T15:51:20Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318543",
    "attachmentName": "OrderWI51068760  (68).pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "0fbec4a1bf4947838b0a09324ffae024/2026/07/15/b24d1e29c81544d68bf8b284c42cf326.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-15T15:51:20Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318543",
    "attachmentName": "de11e850397d43e9b97f172005e12c90.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/a0d19c9250c14005b8ef79d3e069de56/2026/07/16/de11e850397d43e9b97f172005e12c90.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-17T02:33:31Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000318543",
    "attachmentName": "9f7c08db0da548859d2aa0d9cc72d38c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/2aa3af634edd41dba11a408561638a3d/2026/07/16/9f7c08db0da548859d2aa0d9cc72d38c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OSF6V1603",
    "created": "2026-07-17T02:33:31Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000314061",
    "sop": "【背景】由于仓库原因导致箱产品货物破损，目前需要将箱产品作为一个新SKU 上架区分开。"
  },
  {
    "vascNo": "VASC000000318543",
    "sop": "【背景】EB0526062730797031异常单核实是由于仓库原因导致破损，目前需要将货物分开上架。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S030 · `eb:EB0126050529237535`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000281805, VASC000000282480
- EB：EB0126050529237535；WI：WI49709070, WI49816026；WO：（无）；M：（无）
- 场景：【入库】	商品异常更换包裹标签商品标签新单上架
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000281805", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000282480", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000281805",
    "requirementDescription": "需要补贴A81G7041-F0商品标签，标签见附件，分别上架到两个预报单中  WI49709070上架1pcs，WI49816026上架14pcs"
  },
  {
    "vascNo": "VASC000000282480",
    "requirementDescription": "需要补贴A81G7041-F0商品标签，标签见附件，分别上架到两个预报单中  WI49709070上架1pcs，WI49816026上架14pcs"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000281805",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576490"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576493"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49709070",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576496"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576499"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需要补贴A81G7041-F0商品标签，标签见附件，分别上架到两个预报单中  WI49709070上架1pcs，WI49816026上架14pcs",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576502"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "anker端需分开下单，无法提标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576505"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576508"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576523"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576526"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576529"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576532"
  },
  {
    "vascNo": "VASC000000281805",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2576535"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585163"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585166"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI49709070",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585169"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585172"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需要补贴A81G7041-F0商品标签，标签见附件，分别上架到两个预报单中  WI49709070上架1pcs，WI49816026上架14pcs",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585175"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585178"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585181"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585196"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585199"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585202"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585205"
  },
  {
    "vascNo": "VASC000000282480",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2585208"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000281805",
    "attachmentName": "UPC-彩盒标签-A81G7041-F0.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "1ae7ded613cc4cfa9178f32dc9521c95/2026/05/14/ea1d22d9eadd4708a882ae7a19fa8649.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-14T23:40:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282480",
    "attachmentName": "UPC-彩盒标签-A81G7041-F0.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "cdec792a0e2440c2a91a6593347c0296/2026/05/15/60071bfeee3b4020ac329707ab356702.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-05-15T11:04:05Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282480",
    "attachmentName": "5062861bfcc74a13a63d18a4de424cc4.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/711325b0f55a45e3823d4c867d30aea6/2026/05/15/5062861bfcc74a13a63d18a4de424cc4.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-16T02:18:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000282480",
    "attachmentName": "e110d680c5f749a4a175f3a81697e3cd.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/0a0db091b44e4aebb5914d15e035cab4/2026/05/15/e110d680c5f749a4a175f3a81697e3cd.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-05-16T02:18:54Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000281805",
    "sop": "【背景】EB0126050529237535商品有条码但无法识别，需要需要补贴A81G7041-F0商品标签，标签见附件，分别上架到两个预报单中WI49709070上架1pcs，WI49816026上架14pcs"
  },
  {
    "vascNo": "VASC000000282480",
    "sop": "【背景】EB0126050529237535商品有条码但无法识别，需要需要补贴A81G7041-F0商品标签，标签见附件，分别上架到两个预报单中WI49709070上架1pcs，WI49816026上架14pcs"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S031 · `eb:EB0126061330390564`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000299262, VASC000000303633
- EB：EB0126061330390564, EB0126061330390555, EB0126061330390549, EB0126061330390540, EB0126061330390537, EB0126061330390522, EB0126061330390519, EB0126061330390510, EB0126061330390507, EB0126061330390498, EB0126061330390495, EB0126061330390489, EB0126061330390486, EB0126061330390477, EB0126061330390471, EB0126061330390462, EB0126061330390459, EB0126061330390453, EB0126061330390450, EB0126061330390447, EB0126061330390444, EB0126061330390438, EB0126061330390435, EB0126061330390423, EB0126061330390420, EB0126061330390414, EB0126061330390411, EB0126061330390402, EB0126061330390399, EB0126061330390390, EB0126061330390393, EB0126061330390375, EB0126061330390372, EB0126061330390357, EB0126061330390354, EB0126061330390348, EB0126061330390345, EB0126061330390336, EB0126061330390330, EB0126061330390321, EB0126061330390318, EB0126061330390315, EB0126061330390312, EB0126061330390303, EB0126061330390300, EB0126061330390282, EB0126061330390285, EB0126061330390276, EB0126061330390273, EB0126061330390243, EB0126061330390237, EB0126061330390228, EB0126061330390222, EB0126061330390198, EB0126061330390180, EB0126061330390159, EB0126061330390153, EB0126061330390147, EB0126061330390120, EB0126061330390114；WI：（无）；WO：（无）；M：（无）
- 场景：【入库】A+包质量异常需开箱辨识
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000299262", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000303633", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000299262",
    "requirementDescription": "EB0126061330390564  EB0126061330390555  EB0126061330390549  EB0126061330390540  EB0126061330390537  EB0126061330390522  EB0126061330390519  EB0126061330390510  EB0126061330390507  EB0126061330390498  EB0126061330390495  EB0126061330390489  EB0126061330390486  EB0126061330390477  EB0126061330390471  EB0126061330390462  EB0126061330390459  EB0126061330390453  EB0126061330390450  EB0126061330390447  EB0126061330390444  EB0126061330390438  EB0126061330390435  EB0126061330390423  EB0126061330390420  EB0126061330390414  EB0126061330390411  EB0126061330390402  EB0126061330390399  EB0126061330390390  EB0126061330390393  EB0126061330390375  EB0126061330390372  EB0126061330390357  EB0126061330390354  EB0126061330390348  EB0126061330390345  EB0126061330390336  EB0126061330390330  EB0126061330390321  EB0126061330390318  EB0126061330390315  EB0126061330390312  EB0126061330390303  EB0126061330390300  EB0126061330390282  EB0126061330390285  EB0126061330390276  EB0126061330390273  EB0126061330390243  EB0126061330390237  EB0126061330390228  EB0126061330390222  EB0126061330390198  EB0126061330390180  EB0126061330390159  EB0126061330390153  EB0126061330390147  EB0126061330390120  EB0126061330390114  以上都是A+包质量异常，仓库反馈包裹都有受潮后的水印，需开箱查看里面的彩盒是否有破损，如有破损，请回传破损数量，谢谢"
  },
  {
    "vascNo": "VASC000000303633",
    "requirementDescription": "1 将以上异常单的货物根据入库单WI50591614上架到不良品。麻烦帮忙操作下谢谢~  2操作完成后请帮忙关闭异常"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000299262",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831046"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831049"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831052"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831055"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "EB0126061330390564  EB0126061330390555  EB0126061330390549  EB0126061330390540  EB0126061330390537  EB0126061330390522  EB0126061330390519  EB0126061330390510  EB0126061330390507  EB0126061330390498  EB0126061330390495  EB0126061330390489  EB0126061330390486  EB0126061330390477  EB0126061330390471  EB0126061330390462  EB0126061330390459  EB0126061330390453  EB0126061330390450  EB0126061330390447  EB0126061330390444  EB0126061330390438  EB0126061330390435  EB0126061330390423  EB0126061330390420  EB0126061330390414  EB0126061330390411  EB0126061330390402  EB0126061330390399  EB0126061330390390  EB0126061330390393  EB0126061330390375  EB0126061330390372  EB0126061330390357  EB0126061330390354  EB0126061330390348  EB0126061330390345  EB0126061330390336  EB0126061330390330  EB0126061330390321  EB0126061330390318  EB0126061330390315  EB0126061330390312  EB0126061330390303  EB0126061330390300  EB0126061330390282  EB0126061330390285  EB0126061330390276  EB0126061330390273  EB0126061330390243  EB0126061330390237  EB0126061330390228  EB0126061330390222  EB0126061330390198  EB0126061330390180  EB0126061330390159  EB0126061330390153  EB0126061330390147  EB0126061330390120  EB0126061330390114  以上都是A+包质量异常，仓库反馈包裹都有受潮后的水印，需开箱查看里面的彩盒是否有破损，如有破损，请回传破损数量，谢谢",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831058"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "暂无标准增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831061"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831064"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831079"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831082"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831085"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831088"
  },
  {
    "vascNo": "VASC000000299262",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2831091"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878614"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878617"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878620"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878623"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "1 将以上异常单的货物根据入库单WI50591614上架到不良品。麻烦帮忙操作下谢谢~  2操作完成后请帮忙关闭异常",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878626"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "EB0126061330390564  EB0126061330390555  EB0126061330390549  EB0126061330390540  EB0126061330390537  EB0126061330390522  EB0126061330390519  EB0126061330390510  EB0126061330390507  EB0126061330390498  EB0126061330390495  EB0126061330390489  EB0126061330390486  EB0126061330390477  EB0126061330390471  EB0126061330390462  EB0126061330390459  EB0126061330390453  EB0126061330390450  EB0126061330390447  EB0126061330390444  EB0126061330390438  EB0126061330390435  EB0126061330390423  EB0126061330390420  EB0126061330390414  EB0126061330390411  EB0126061330390402  EB0126061330390399  EB0126061330390390  EB0126061330390393  EB0126061330390375  EB0126061330390372  EB0126061330390357  EB0126061330390354  EB0126061330390348  EB0126061330390345  EB0126061330390336  EB0126061330390330  EB0126061330390321  EB0126061330390318  EB0126061330390315  EB0126061330390312  EB0126061330390303  EB0126061330390300  EB0126061330390282  EB0126061330390285  EB0126061330390276  EB0126061330390273  EB0126061330390243  EB0126061330390237  EB0126061330390228  EB0126061330390222  EB0126061330390198  EB0126061330390180  EB0126061330390159  EB0126061330390153  EB0126061330390147  EB0126061330390120  EB0126061330390114  以上异常单的货物运输被水打湿。因此需要按照预报单上架到不良品。因异常单提了增值做了辨识，因此无法直接在原异常单直接提交增值上架到不良品。  因此申请非标特批增值",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878629"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878632"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878647"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878650"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878653"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878656"
  },
  {
    "vascNo": "VASC000000303633",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2878659"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "254b8975f1f14ef995b08a8eb4aa9370.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/65e500dcae8645248a02c567946b4c77/2026/06/16/254b8975f1f14ef995b08a8eb4aa9370.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "3841d90844e84988a41bb88f6d02aadd.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/30f086582fc14e18965a4de6f651211c/2026/06/16/3841d90844e84988a41bb88f6d02aadd.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "3527b9ed8fe8411faa69864e8a9bf13b.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/9f375abbfce14d2cbd35268573fad07d/2026/06/16/3527b9ed8fe8411faa69864e8a9bf13b.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "68af31951d424749b9c367461d8380a9.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/2c47b29cd376438a9a3fa83571050dce/2026/06/16/68af31951d424749b9c367461d8380a9.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "aa9244f1998541d59fdb564b7f592f1c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/2472ce6f256f4b62b924020498a19316/2026/06/16/aa9244f1998541d59fdb564b7f592f1c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "ebba4621bc2a452d95a719db8c7998f0.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/01297044ce4c4744b59081fa4979d34a/2026/06/16/ebba4621bc2a452d95a719db8c7998f0.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "7d1eeec6-a219-4f01-ab3f-9b90f24d465d.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "http://usfile.winit.com.cn/uploads/who/images/USLA/2026/06/16/OW01V1602/7d1eeec6-a219-4f01-ab3f-9b90f24d465d.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "187944b8-f5c8-4380-b7c4-15390a8cbef5.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "http://usfile.winit.com.cn/uploads/who/images/USLA/2026/06/16/OW01V1602/187944b8-f5c8-4380-b7c4-15390a8cbef5.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "b9309364b9aa49ea9f93b4d1e9b80cc6.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/e187ade8badd487386bf25da3c6d373e/2026/06/16/b9309364b9aa49ea9f93b4d1e9b80cc6.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "1705961c35a3455589632c7be373c95e.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/b8f2a6332d4d43beb5af29092c0d237b/2026/06/16/1705961c35a3455589632c7be373c95e.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "a481469cd2634fc7b21c139f1bccf114.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/9c0676d1685942d3877aa24ff5b27e7f/2026/06/16/a481469cd2634fc7b21c139f1bccf114.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "ac19aed40c1f4cb1967e8961647ecb25.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/e36d9b36b6954a369c49185c25230052/2026/06/16/ac19aed40c1f4cb1967e8961647ecb25.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "71aded3ffefd40d0a2a0df4325791ecb.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/a101a5b23b594174b07846570d791a85/2026/06/16/71aded3ffefd40d0a2a0df4325791ecb.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "cfbdfcd9edc1408297175876369c5247.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/fddb5bd0e44d460c9facee8b472a1c30/2026/06/17/cfbdfcd9edc1408297175876369c5247.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "ffb26bb3a66842e7b30d40c724299650.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/cab9eb55b2da465c88204292a2b6e758/2026/06/17/ffb26bb3a66842e7b30d40c724299650.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "921c46d323b847c49359ba2d60d4cbbc.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/134730d02065419283743c5ca3f697e4/2026/06/17/921c46d323b847c49359ba2d60d4cbbc.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000299262",
    "attachmentName": "65e2400a93d74698878ce6f1b40fed32.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/3a42e2362ef74ee79ff0e09bd025f646/2026/06/17/65e2400a93d74698878ce6f1b40fed32.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-18T02:41:53Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000299262",
    "sop": "【背景】以上都是A+包质量异常，仓库反馈包裹都有受潮后的水印，需开箱查看里面的彩盒是否有破损，如有破损，请回传破损数量。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S032 · `eb:EB0126062430664491`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000305634, VASC000000315381
- EB：EB0126062430664491, EB0126062430664470；WI：（无）；WO：（无）；M：（无）
- 场景：【入库】指定商品拍照暂存, 【库内】指定单品销毁
- 服务：入库其他服务需求, 库内其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000305634", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000315381", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000305634",
    "requirementDescription": "需分别对其异常单开箱拍照查验，检查其中的产品是否有损坏。注：提供的增值结果展示图片请一一对应异常单，好方便我们后续处理。"
  },
  {
    "vascNo": "VASC000000315381",
    "requirementDescription": "需销毁这两个异常单。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000305634",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900379"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900382"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900385"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126062430664491，EB0126062430664470",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900388"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需分别对其异常单开箱拍照查验，检查其中的产品是否有损坏。注：提供的增值结果展示图片请一一对应异常单，好方便我们后续处理。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900391"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "A+包裹质量异常，看异常单中的图片无法辨别里面的产品是否有损坏，因此，需要开箱拍照查验里面的产品是否有损坏。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900394"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900397"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900412"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900415"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900418"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900421"
  },
  {
    "vascNo": "VASC000000305634",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2900424"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031344"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031347"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031350"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "下架出库单号",
    "fieldKey": "OONFRFTS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031353"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "EB0126062430664491,EB0126062430664470",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031356"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需销毁这两个异常单。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031359"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "因为这两个异常单绑定了其他的增值单，无法直接提交销毁的增值单，然后你们建议另外提交库内增值--非标（特批）。",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031362"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031365"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031377"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031380"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031383"
  },
  {
    "vascNo": "VASC000000315381",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OSF6V1603",
    "serviceSequence": "1",
    "attrId": "3031386"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "ff9249b84a1940dbb03dcb17783ad162.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/25d377d0830b4d63a1e8153ca3687941/2026/06/25/ff9249b84a1940dbb03dcb17783ad162.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "11757cc6996b4cebaca758bfcee16858.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/516f712aba324e4a8d10ebbc9501a2a2/2026/06/25/11757cc6996b4cebaca758bfcee16858.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "faf6fa9880764918a1e26485fbb42edd.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/7a7c8408abdc41b7a0f3a264d0945f64/2026/06/25/faf6fa9880764918a1e26485fbb42edd.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "cf74159d528b41e78354ed11196b20cd.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/4aa4fda2d5374a08b55724e90e39dfae/2026/06/25/cf74159d528b41e78354ed11196b20cd.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "0235065c62e94eeba868b3492a768b4d.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/a323c85c63d74c39935e761ce61edd0a/2026/06/25/0235065c62e94eeba868b3492a768b4d.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "559f17ba1c464dcc9f7d863124b684d9.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/49a7ac1bf4184752a6bf4c9f687f1d72/2026/06/25/559f17ba1c464dcc9f7d863124b684d9.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "e5c35bb81e9c43cb9ce584c39d97abbd.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/b35931c23f2e4adaa3ee10ea1c9c17d1/2026/06/25/e5c35bb81e9c43cb9ce584c39d97abbd.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "0f16b476ccac4c949f82a2ac2998c67c.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/fee5090e1d7e4406a77121de9b5e1398/2026/06/25/0f16b476ccac4c949f82a2ac2998c67c.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000305634",
    "attachmentName": "1e9b78de21be469a9a4202579214132a.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/8893019034a1451292a9a510287533f7/2026/06/25/1e9b78de21be469a9a4202579214132a.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-06-26T02:11:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000305634",
    "sop": "仓库操作步骤："
  },
  {
    "vascNo": "VASC000000315381",
    "sop": "【背景】EB0126062430664491,EB0126062430664470需要销毁。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S033 · `eb:EB0126062730786666`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000312402, VASC000000315264
- EB：EB0126062730786666；WI：WI50748482, WI50748427, WI50748516, WI50748457；WO：（无）；M：M010000000012166666, M010000000012166668, M010000000012166667, M010000000012166663
- 场景：【入库】“包裹条码批量异常（需客户处理）”辨识后补贴包裹标签上架
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000312402", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000315264", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000312402",
    "requirementDescription": "异常单：B0126062730786666    登记的异常是：包裹条码异常(需客户处理)   异常拍照看不清楚是哪个产品条码    和仓库核实实际此异常是有4个不同的sku，客户下了4个新入库单    WI50748482 下单sku: M010000000012166666  ==2081114506664454\t  WI50748427  下单sku: M010000000012166668 ==2081109223938566\t  WI50748516   下单sku：M010000000012166667 ==2081101207050758\t  WI50748457   下单sku：M010000000012166663 ==2081118692317702\t    按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。"
  },
  {
    "vascNo": "VASC000000315264",
    "requirementDescription": "异常单：B0126062730786666    登记的异常是：包裹条码异常(需客户处理)   异常拍照看不清楚是哪个产品条码    和仓库核实实际此异常是有4个不同的sku，客户下了4个新入库单    WI50748482 下单sku: M010000000012166666  ==2081114506664454\t  WI50748427  下单sku: M010000000012166668 ==2081109223938566\t  WI50748516   下单sku：M010000000012166667 ==2081101207050758\t  WI50748457   下单sku：M010000000012166663 ==2081118692317702\t    按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000312402",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998107"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998110"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50748482",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998113"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998116"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单：B0126062730786666    登记的异常是：包裹条码异常(需客户处理)   异常拍照看不清楚是哪个产品条码    和仓库核实实际此异常是有4个不同的sku，客户下了4个新入库单    WI50748482 下单sku: M010000000012166666  ==2081114506664454\t  WI50748427  下单sku: M010000000012166668 ==2081109223938566\t  WI50748516   下单sku：M010000000012166667 ==2081101207050758\t  WI50748457   下单sku：M010000000012166663 ==2081118692317702\t    按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998119"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单：EB0126062730786666   登记的异常是：包裹条码异常(需客户处理)   和仓库核实实际是有4个不同的产品，客户下了4个新单，标准无法一起操作，需要非标处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998122"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998125"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998140"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998143"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998146"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998149"
  },
  {
    "vascNo": "VASC000000312402",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "2998152"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029724"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029727"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI50748482",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029730"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029733"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "异常单：B0126062730786666    登记的异常是：包裹条码异常(需客户处理)   异常拍照看不清楚是哪个产品条码    和仓库核实实际此异常是有4个不同的sku，客户下了4个新入库单    WI50748482 下单sku: M010000000012166666  ==2081114506664454\t  WI50748427  下单sku: M010000000012166668 ==2081109223938566\t  WI50748516   下单sku：M010000000012166667 ==2081101207050758\t  WI50748457   下单sku：M010000000012166663 ==2081118692317702\t    按标准只能填写一个入库单无法操作上架，只能通过非标处理  产品标签不用贴，仓库帮忙按新单补贴新单的包裹标签操作上架，帮忙更新非标报价，谢谢。",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029736"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "异常单：EB0126062730786666   登记的异常是：包裹条码异常(需客户处理)   和仓库核实实际是有4个不同的产品，客户下了4个新单，标准无法一起操作，需要非标处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029739"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029742"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029757"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029760"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029763"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029766"
  },
  {
    "vascNo": "VASC000000315264",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3029769"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000312402",
    "attachmentName": "WI50748482 包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "ecec2f8ee036451bb8ba24759af22a0b/2026/07/06/df2c2668af9a4925bee0c69c713fe69c.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-06T18:10:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000312402",
    "attachmentName": "WI50748427 包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "44b8faecaea34e029c084b391aefda7e/2026/07/06/d36c006221de4bb5b6dcf26c478d6c16.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-06T18:10:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000312402",
    "attachmentName": "WI50748516 包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "3b8b7b58d0ac4059a48a452e11677f6d/2026/07/06/5eb22a15f17149f186c36f8fe2aaadc5.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-06T18:10:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000312402",
    "attachmentName": "WI50748457 包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "d2bcece006014806aea55f3967dacdbc/2026/07/06/0109b4926e5f45ad94dc90a61623cd4f.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-06T18:10:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "WI50748457+包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "b16077265f704f949d65df6fb5a55ae4/2026/07/09/a98cb2f87a254759aa6a03e65f40e0f0.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T16:42:45Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "WI50748516+包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "5c1ebfc47d1e44f6a565843fe16f4ce9/2026/07/09/13603aad443345bfa05593d9d3541b1c.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T16:42:45Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "WI50748427+包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "d47943db96284269807755da1d151988/2026/07/09/cf7cb30e4c164d27b00e79acf3cadf47.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T16:42:45Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "WI50748482+包裹标签.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "fc25af8a90c448579021b4da1df0dd28/2026/07/09/57b1e48cfce541898771860f4d82f578.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-09T16:42:45Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "c241db8959ef49508165a9f2a088393f.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/f9df1eca5e674240a070e97c05d7eb22/2026/07/10/c241db8959ef49508165a9f2a088393f.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-10T12:44:51Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "00aa492f0ef14a2fb2a740d12a0e54da.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/caeb10e56f6b4038a56e0f2cc2108255/2026/07/10/00aa492f0ef14a2fb2a740d12a0e54da.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-10T12:44:51Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000315264",
    "attachmentName": "6b773230c84846d2a4b79e1b3a8ade2a.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/d9b8be42693744aa83a6cd95b17b7e28/2026/07/10/6b773230c84846d2a4b79e1b3a8ade2a.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-10T12:44:51Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000312402",
    "sop": "仓库操作步骤："
  },
  {
    "vascNo": "VASC000000315264",
    "sop": "仓库操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S034 · `eb:EB0126070831111026`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000316719, VASC000000323472
- EB：EB0126070831111026；WI：WI51290978；WO：（无）；M：（无）
- 场景：【入库】批量辨识商品后补贴商品条码及包裹条码上架
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000316719", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}, {"vascNo": "VASC000000323472", "auditResult": "取消", "isAuditThrough": "", "status": "CD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000316719",
    "requirementDescription": "按新单上架两个不同的SKU"
  },
  {
    "vascNo": "VASC000000323472",
    "requirementDescription": "按新单上架两个不同的SKU"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000316719",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185271"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185274"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51290978",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185277"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185280"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "按新单上架两个不同的SKU",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185283"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "EB0126070831111026异常登记1个SKU，无法按标准增值处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185286"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185289"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185304"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185307"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185310"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185313"
  },
  {
    "vascNo": "VASC000000316719",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3185316"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165753"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165756"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51290978",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165759"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165762"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "按新单上架两个不同的SKU",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165765"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "EB0126070831111026异常登记1个SKU，无法按标准增值处理",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165768"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165771"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165786"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165789"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165792"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165795"
  },
  {
    "vascNo": "VASC000000323472",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3165798"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000316719",
    "attachmentName": "上架前辨识需求提交模板.xlsx",
    "attachmentType": "VAS_ATTR_REL_AOOI",
    "url": "53516c6f04474a8bb57e8e2ab8597879/2026/07/27/5c9129f95c1e4acd8ade4f958884eba1.xlsx",
    "attributeName": "操作说明附件",
    "attributeKey": "VAS_ATTR_REL_AOOI",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-27T20:30:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000316719",
    "attachmentName": "【商品和标签对应关系】模板.xlsx",
    "attachmentType": "VAS_ATTR_REL_TCRBCAL",
    "url": "723f2b6463e44c469071a6d0d4672347/2026/07/27/7e8694fe8f3b48ad831fb7abf80337ab.xlsx",
    "attributeName": "商品和标签的对应关系",
    "attributeKey": "VAS_ATTR_REL_TCRBCAL",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-27T20:30:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000316719",
    "attachmentName": "【包裹和标签的对应关系】模板.xlsx",
    "attachmentType": "TRPP",
    "url": "20c2d7afa4884065af7a64a501f7e963/2026/07/27/f2c443487be34ae3ae54d61d76f94abf.xlsx",
    "attributeName": "包裹和标签的对应关系",
    "attributeKey": "TRPP",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-27T20:30:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000316719",
    "attachmentName": "Order - 2026-07-27T201604.745.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "58a1daa1fee843a890a1885828d68c76/2026/07/27/f1621fb8a5f24e7aabfc748afa67af71.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-27T20:30:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000316719",
    "attachmentName": "Order - 2026-07-27T201555.390.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "5a0b585c3a374f0da922ef976c6505a0/2026/07/27/f7a14d77c9dd44e0a2f2d7b8b6245cf7.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-27T20:30:44Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000323472",
    "attachmentName": "【包裹和标签的对应关系】模板.xlsx",
    "attachmentType": "TRPP",
    "url": "f5db8c50b97645e581802fd23f168b6c/2026/07/23/a6d8fc2986fc40d8bea5ba6cf367a546.xlsx",
    "attributeName": "包裹和标签的对应关系",
    "attributeKey": "TRPP",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-23T12:07:17Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000316719",
    "sop": "仓库操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S035 · `eb:EB0126070931145721`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000315483, VASC000000316731
- EB：EB0126070931145721；WI：（无）；WO：（无）；M：（无）
- 场景：【入库】上架前采集条码（含SN码、A+包第三方包裹码等）
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat"]
- 审核结果：[{"vascNo": "VASC000000315483", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000316731", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000315483",
    "requirementDescription": "需求：异常单里的46箱货物，需仓库每箱打开记录sku信息汇总反馈（记录箱内sku的EAN，69码即可）  然后告知每个WB条码，对应的箱内69码是哪个，做成表格反馈，不需要拍照"
  },
  {
    "vascNo": "VASC000000316731",
    "requirementDescription": "需求：异常单里的46箱货物，需仓库每箱打开记录sku信息汇总反馈（记录箱内sku的EAN，69码即可）  然后告知每个WB条码，对应的箱内69码是哪个，做成表格反馈，不需要拍照"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000315483",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033357"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033360"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033363"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033366"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需求：异常单里的46箱货物，需仓库每箱打开记录sku信息汇总反馈（记录箱内sku的EAN，69码即可）  然后告知每个WB条码，对应的箱内69码是哪个，做成表格反馈，不需要拍照",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033369"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "背景：EB0126070931145721这个异常单一共46箱货物存在包裹条码异常  需仓库每箱打开，核实下箱内的sku反馈，才能识别对应的包裹条码处理上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033372"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033375"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033390"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033393"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033396"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033399"
  },
  {
    "vascNo": "VASC000000315483",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3033402"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050184"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050187"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050190"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050193"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "需求：异常单里的46箱货物，需仓库每箱打开记录sku信息汇总反馈（记录箱内sku的EAN，69码即可）  然后告知每个WB条码，对应的箱内69码是哪个，做成表格反馈，不需要拍照",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050196"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "背景：EB0126070931145721这个异常单一共46箱货物存在包裹条码异常  需仓库每箱打开，核实下箱内的sku反馈，才能识别对应的包裹条码处理上架",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050199"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050202"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050217"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050220"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050223"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050226"
  },
  {
    "vascNo": "VASC000000316731",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3050229"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000316731",
    "attachmentName": "45fd4ec031bc45bfb81391e37c822ec5.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/65421da20dd84128bba4ba15b9e5fcae/2026/07/14/45fd4ec031bc45bfb81391e37c822ec5.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-15T02:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000316731",
    "attachmentName": "bb07624bcd74401f927150b3ae8e56dd.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/ee54c55d01dd4aeeb5369ab4d8d459d2/2026/07/14/bb07624bcd74401f927150b3ae8e56dd.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-15T02:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000316731",
    "attachmentName": "8a025c085e9e441a814c2290885e30e7.xlsx",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "cf883351a53b4cd0a133d80affc21cc5/2026/07/14/8a025c085e9e441a814c2290885e30e7.xlsx",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-15T02:04:22Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000315483",
    "sop": "背景：EB0126070931145721这个异常单一共46箱货物存在包裹条码异常；需仓库每箱打开，核实下箱内的sku反馈，才能识别对应的包裹条码处理上架。"
  },
  {
    "vascNo": "VASC000000316731",
    "sop": "背景：EB0126070931145721这个异常单一共46箱货物存在包裹条码异常；需仓库每箱打开，核实下箱内的sku反馈，才能识别对应的包裹条码处理上架。"
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---

## S036 · `eb:EB0126071831409586`

- caseType：`oms_direct_pass` / caseIdType：`eb`
- 抽样槽位：oms_direct_pass；原因：oms_direct_pass 正样本：无群聊、审核通过、有 SOP，适合 L4 sop_generate
- VASC：VASC000000324369, VASC000000324204, VASC000000324561
- EB：EB0126071831409586；WI：WI51329944, WI50216828；WO：（无）；M：M010000000008905018
- 场景：【入库】海运整柜100%A+无包裹条码异常，新单无箱单或100%A+包直接上架, 【入库】批量辨识商品后补贴商品条码及包裹条码上架
- 服务：入库其他服务需求
- attachmentStatus：`verified`
- caseQualityFlags：["direct_pass_no_chat", "has_verified_attachments"]
- 审核结果：[{"vascNo": "VASC000000324369", "auditResult": "通过", "isAuditThrough": "Y", "status": "CD"}, {"vascNo": "VASC000000324561", "auditResult": "通过", "isAuditThrough": "Y", "status": "PD"}]
- 退回原因：[]

### 完整群聊原文

- conversationRawStatus：`not_found`

（无群聊原文 / not_found）

### summaryForIndex（仅索引，不是原文）

```text
（空）
```

### OMS 需求描述

```text
[
  {
    "vascNo": "VASC000000324369",
    "requirementDescription": "此异常：EB0126071831409586对应SKU标签贴错了，实际是这个SKU：M010000000008905018；麻烦覆盖住原标签，补贴新标签按新单WI51329944上架的，谢谢    数量1个"
  },
  {
    "vascNo": "VASC000000324561",
    "requirementDescription": "此异常：EB0126071831409586对应SKU标签贴错了，实际是这个SKU：M010000000008905018；麻烦覆盖住原标签，补贴新标签按新单WI51329944上架的，谢谢    数量1个"
  }
]
```

### 实际填写字段 submittedFields

```text
[
  {
    "vascNo": "VASC000000324369",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178833"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178836"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51329944",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178839"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178842"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "此异常：EB0126071831409586对应SKU标签贴错了，实际是这个SKU：M010000000008905018；麻烦覆盖住原标签，补贴新标签按新单WI51329944上架的，谢谢    数量1个",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178845"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "VASC000000324204原入库单[WI50216828]是100%A+/A包无包裹条码入库单，不支持原单上架;整单退回    [海运整柜100%A+包裹]场景订单系统功能不支持标准增值，故非标申请，麻烦审核，谢谢",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178848"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178851"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178866"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178869"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178872"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178875"
  },
  {
    "vascNo": "VASC000000324369",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3178878"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "包裹条码",
    "fieldKey": "PACKAGE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181839"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "商品条码",
    "fieldKey": "MERCHANDISE_SERNO",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181842"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "上架入库单号",
    "fieldKey": "VAS_ATTR_REL_NWEON",
    "fieldValue": "WI51329944",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181845"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "非标增值来源单号",
    "fieldKey": "NSVASTN",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181848"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "需求描述",
    "fieldKey": "VAS_ATTR_REL_RD",
    "fieldValue": "此异常：EB0126071831409586对应SKU标签贴错了，实际是这个SKU：M010000000008905018；麻烦覆盖住原标签，补贴新标签按新单WI51329944上架的，谢谢    数量1个",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181851"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "需求背景说明",
    "fieldKey": "BEOR",
    "fieldValue": "VASC000000324204原入库单[WI50216828]是100%A+/A包无包裹条码入库单，不支持原单上架;整单退回    [海运整柜100%A+包裹]场景订单系统功能不支持标准增值，故非标申请，麻烦审核，谢谢",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181854"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "操作说明附件",
    "fieldKey": "VAS_ATTR_REL_AOOI",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181857"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "CEO审批截图",
    "fieldKey": "CEO_SOA",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181872"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "商品和标签的对应关系",
    "fieldKey": "VAS_ATTR_REL_TCRBCAL",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181875"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "包裹和标签的对应关系",
    "fieldKey": "TRPP",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181878"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "视频拍摄SOP（中文+英文）",
    "fieldKey": "VSS",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181881"
  },
  {
    "vascNo": "VASC000000324561",
    "fieldName": "标签文件",
    "fieldKey": "VAS_ATTR_REL_LF",
    "fieldValue": "",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "serviceSequence": "1",
    "attrId": "3181884"
  }
]
```

### 上传附件 uploadedAttachments

```text
[
  {
    "vascNo": "VASC000000324369",
    "attachmentName": "Order.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "265ab861b02e4c27be7e56b3e6b0e24d/2026/07/24/b75fc8c4caa54193b7d291959942c92c.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-24T19:06:52Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000324561",
    "attachmentName": "Order.pdf",
    "attachmentType": "VAS_ATTR_REL_LF",
    "url": "aa59d36fccf94728a5d1db7a10722e7f/2026/07/24/1a2a16f1793c494f92592f1d4fb65089.pdf",
    "attributeName": "标签文件",
    "attributeKey": "VAS_ATTR_REL_LF",
    "inputNode": "SUBMIT",
    "serviceCode": "OW01V1602",
    "created": "2026-07-24T19:37:14Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  },
  {
    "vascNo": "VASC000000324561",
    "attachmentName": "a7ebe386f869473f8a1532fec2563944.JPEG",
    "attachmentType": "VAS_ATTR_REL_RDP",
    "url": "https://usfmsstream.winit.com.cn/0814c0389a30461ca4fd822d20d125d3/2026/07/27/a7ebe386f869473f8a1532fec2563944.JPEG",
    "attributeName": "结果展示照片",
    "attributeKey": "VAS_ATTR_REL_RDP",
    "inputNode": "FINISH",
    "serviceCode": "OW01V1602",
    "created": "2026-07-28T03:44:41Z",
    "source": "oms.oms_va_execute_file",
    "verification": "verified"
  }
]
```

### SOP 原文

```text
[
  {
    "vascNo": "VASC000000324369",
    "sop": "背景:VASC000000324204异常包裹直接上架,[海运整柜100%A+/A包裹],不支持异常[B01E1615包裹条码批量异常(需客户处理),B0102E21包裹条码异常(需客户处理);整单退回."
  },
  {
    "vascNo": "VASC000000324561",
    "sop": "仓库操作步骤："
  }
]
```

### 需要人工判断的问题

- 这条 case 在 check-requirement 节点应该 pass 还是 fail？为什么？（注意：群聊补全后通过 ≠ 原始提交完整）
- normalizedRequirement 应从客户原文 / 群聊 / OMS 字段中抽出哪些对象、动作、目的、数量、仓库、附件信号？
- match-template 应判 supported / unsupported / ambiguous？依据是场景名、服务，还是群聊澄清后的需求？
- check-completeness 还缺哪些字段或附件？哪些信息其实只存在于群聊而非 OMS submittedFields？
- sop_generated 应参考哪些历史 SOP？哪些是审核员事后补写、不能当作客户原始输入？
- 最终 expectedOutputPath 是什么？是否存在重提 VASC / 转标准增值 / 仓库无法支持？

### humanLabelPlaceholder

```json
{
  "expectedTrace": {
    "checkRequirement": {
      "complete": null,
      "normalizedRequirement": null,
      "signals": {},
      "boundBypasses": []
    },
    "matchTemplate": {
      "decision": null,
      "querySignals": {},
      "expectedScores": {},
      "expectedGap": null,
      "reason": null
    },
    "checkCompleteness": {
      "missingFields": [],
      "missingAttachments": [],
      "reason": null
    },
    "sopGenerated": {
      "expectedStyle": null,
      "referenceSopPattern": null,
      "doNotCopyNotes": []
    },
    "finalDecision": {
      "expectedOutputPath": null,
      "reason": null
    }
  },
  "source": "needs_human_label",
  "verifiedBy": null,
  "verifiedAt": null
}
```

---
