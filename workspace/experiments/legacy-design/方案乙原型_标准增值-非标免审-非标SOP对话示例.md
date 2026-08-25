# 方案乙原型 - 非标页内嵌智能引导 Agent 对话示例

> 本文档是方案乙可对业务方展示的原型，展示 Agent 在三个核心分支的指引能力。  
> 每个示例包含完整对话流、结构化 JSON 输出、客户可见文案和页面动作。  
> 日期：2026-07-30
>
> **分支命名对照：** 标准增值 = 内部编码 2d | 非标免审 = 内部编码 2a | 非标SOP = 内部编码 2b

---

## 示例一：标准增值（纠偏）

### 场景说明

| 字段 | 值 |
|------|-----|
| 案例编号 | C-2d-001-2026W30-01 |
| 客户 | sierra gmbh（19832717） |
| 仓库 | DEBR2 |
| 异常单号 | VASC000000321777 |
| 客户进入页面 | 非标增值提交页（出库） |
| 客户原始需求 | 文件放置在箱内，需要仓库做增值后拍照确认 |
| 判定结论 | 客户需求可由标准增值"包裹开箱拍照"覆盖，无需走非标 |

### 完整对话流

#### Turn 1：客户输入

```
客户在非标增值提交页的智能引导输入框描述：
"包裹出库时需要将文件放置在箱内，并要求仓库做完增值后拍照确认，确认文件已经放入。"
```

#### Turn 2：Agent 判定过程

```text
1. 检查 popupContext：无 popupContext，执行 2d 标准增值纠偏检查
2. 读取 systemScopedVascList 候选清单
3. 识别客户意图关键词：拍照、确认文件放入、出库
4. 匹配候选内标准增值：
   - 发现候选内存在"包裹开箱拍照"标准增值
   - 客户需求核心是"做完操作后拍照确认"
   - 标准增值"包裹开箱拍照"可覆盖该拍照需求
5. 判定结果：route = 2d_standard_redirect
   - 建议客户返回标准增值路径
   - 不继续引导填写非标字段
```

#### Turn 3：Agent 输出

Agent 输出结构化 JSON 并展示客户可见文案，建议客户取消当前非标单并返回标准增值路径。

### Agent 输出的结构化 JSON（AgentGuideResult）

```json
{
  "requestId": "req_20260721_C2d001",
  "conversationId": "conv_VASC000000321777",
  "turnId": "turn_0001",
  "route": "2d_standard_redirect",
  "matchState": "matched",
  "matchConfidence": 0.88,
  "matchedCandidateId": "VASC_STD_OUTBOUND:outbound_photo_after_packing",
  "selectedVasc": {
    "candidateId": "VASC_STD_OUTBOUND:outbound_photo_after_packing",
    "vascCode": "VASC_STD_OUTBOUND",
    "vascName": "出库-包裹开箱拍照（标准增值）",
    "vascType": "standard"
  },
  "selectedService": {
    "serviceCode": "outbound_photo_after_packing",
    "serviceName": "包裹开箱拍照",
    "serviceKind": "standard_photo",
    "serviceDomain": "outbound"
  },
  "fieldSuggestions": {},
  "confirmationSummary": "",
  "missingFields": [
    "原非标增值单 VASC000000321777 需取消",
    "需确认标准增值-包裹开箱拍照能否拍到箱内文件放置情况"
  ],
  "attachmentRequirements": [],
  "attachmentCheck": {
    "state": "not_checked",
    "missingRequired": [],
    "warnings": []
  },
  "pageActions": [
    {
      "action": "navigate_hint",
      "target": "standard_vas_page",
      "valueRef": "selectedVasc.vascName",
      "label": "返回标准增值页面，选择「包裹开箱拍照」",
      "enabled": true
    },
    {
      "action": "copy_text",
      "target": "aiResult",
      "valueRef": "customerMessage",
      "label": "复制建议",
      "enabled": true
    }
  ],
  "displayText": "您的需求可由标准增值「包裹开箱拍照」覆盖，无需提交非标增值。",
  "customerMessage": "您好，您描述的需求（做完增值后拍照确认文件放入）可以通过标准增值服务「包裹开箱拍照」实现。建议您：\n\n1. 取消当前非标增值单 VASC000000321777\n2. 返回标准增值页面，选择「包裹开箱拍照」提交\n3. 提交前请确认：标准服务定义中开箱拍照是否能覆盖您需要拍到的「箱内文件放置」场景\n\n如标准服务定义不支持拍到箱内文件，请再回到非标页面提交。",
  "decisionTrace": {
    "intentMatched": true,
    "candidateMatched": true,
    "routeSource": "selectedCandidate.routeBranch",
    "routeRewriteApplied": false
  }
}
```

### 客户看到的展示文案（customerMessage）

> 您好，您描述的需求（做完增值后拍照确认文件放入）可以通过标准增值服务「包裹开箱拍照」实现。建议您：
>
> 1. 取消当前非标增值单 VASC000000321777
> 2. 返回标准增值页面，选择「包裹开箱拍照」提交
> 3. 提交前请确认：标准服务定义中开箱拍照是否能覆盖您需要拍到的「箱内文件放置」场景
>
> 如标准服务定义不支持拍到箱内文件，请再回到非标页面提交。

### 页面动作（pageActions）

| 序号 | action | target | label | enabled |
|------|--------|--------|-------|---------|
| 1 | `navigate_hint` | `standard_vas_page` | 返回标准增值页面，选择「包裹开箱拍照」 | true |
| 2 | `copy_text` | `aiResult` | 复制建议 | true |

**注意**：2d 分支不生成非标字段建议，不启用 `fill_field` 动作，不引导客户继续填写非标页面字段。

---

## 示例二：非标免审（命名服务直选）

### 场景说明

| 字段 | 值 |
|------|-----|
| 案例编号 | C-2a-v2-2026W30-001 |
| 客户 | 上海门达科技有限公司（15908221） |
| 仓库 | DEBR2 Warehouse |
| 异常单号 | VASC000000324477 / IH000000107052 |
| 客户进入页面 | 非标增值提交页（入库） |
| 客户原始需求 | 需要提供无箱单预报单，新单入库，把不良品上架到不良品库位 |
| 命中原子 | OW01V1622「入库-提供无箱单预报单上架」 |
| 判定结论 | 需求精确命中候选内具体非标服务项，直接指引选择，不进入 SOP 追问 |

### 完整对话流

#### Turn 1：客户输入

```
客户在非标增值提交页的智能引导输入框描述：
"需要提供无箱单预报单，新单入库，把不良品上架到不良品库位。"
```

#### Turn 2：Agent 判定过程

```text
1. 检查 popupContext：无 popupContext，执行 2d 标准增值纠偏检查
2. 2d 检查结果：候选内标准增值无法覆盖"无箱单预报单上架"需求 → 跳过 2d
3. 2a 判定：
   - 候选 systemScopedVascList 中存在原子 OW01V1622「入库-提供无箱单预报单上架」
   - 原子描述："客户使用无箱单预报单入库，但是货物到仓后发现无箱单识别标识丢失，
     导致仓库无法正常上架，客户需提供原始无箱单信息，以便仓库能够正确处理货物并完成上架操作。"
   - 客户输入关键词"无箱单预报单"+"上架"精确命中该原子
   - 该原子属于产品"新单上架（客户提供预报单）"（VASC202412111831129），productType = nonstandard_no_review
   - 该原子不是"入库其他服务需求"兜底项
4. 判定结果：route = 2a_named_nonstandard_direct
   - 直接指引选择该增值产品和服务项
   - 不进入 SOP 长追问
```

#### Turn 3：Agent 输出

Agent 直接输出匹配结果，指引客户在页面选择对应产品和原子。

### Agent 输出的结构化 JSON（AgentGuideResult）

```json
{
  "requestId": "req_20260724_C2a001",
  "conversationId": "conv_VASC000000324477",
  "turnId": "turn_0001",
  "route": "2a_named_nonstandard_direct",
  "matchState": "matched",
  "matchConfidence": 0.95,
  "matchedCandidateId": "VASC202412111831129:OW01V1622",
  "selectedVasc": {
    "candidateId": "VASC202412111831129:OW01V1622",
    "vascCode": "VASC202412111831129",
    "vascName": "新单上架（客户提供预报单）",
    "vascType": "nonstandard"
  },
  "selectedService": {
    "serviceCode": "OW01V1622",
    "serviceName": "入库-提供无箱单预报单上架",
    "serviceKind": "named_nonstandard",
    "serviceDomain": "inbound"
  },
  "fieldSuggestions": {},
  "confirmationSummary": "",
  "missingFields": [],
  "attachmentRequirements": [],
  "attachmentCheck": {
    "state": "not_checked",
    "missingRequired": [],
    "warnings": []
  },
  "pageActions": [
    {
      "action": "select_service",
      "target": "vasc_product_selector",
      "valueRef": "selectedVasc.vascCode",
      "label": "选择增值产品「新单上架（客户提供预报单）」",
      "enabled": true
    },
    {
      "action": "select_service",
      "target": "vasc_atom_selector",
      "valueRef": "selectedService.serviceCode",
      "label": "选择服务项「入库-提供无箱单预报单上架」",
      "enabled": true
    },
    {
      "action": "copy_text",
      "target": "aiResult",
      "valueRef": "customerMessage",
      "label": "复制建议",
      "enabled": true
    }
  ],
  "displayText": "已匹配具体非标服务项「入库-提供无箱单预报单上架」，请直接选择该服务项。",
  "customerMessage": "您的需求已精确匹配到非标增值服务：\n\n增值产品：新单上架（客户提供预报单）\n服务项：入库-提供无箱单预报单上架\n\n请在页面【增值产品】中选择上述产品，并在服务项中勾选「入库-提供无箱单预报单上架」。\n\n该服务适用于：客户使用无箱单预报单入库，货物到仓后无箱单识别标识丢失，需提供原始无箱单信息以便仓库完成上架。\n\n选择后请按页面提示填写必要字段并提交。",
  "decisionTrace": {
    "intentMatched": true,
    "candidateMatched": true,
    "routeSource": "selectedCandidate.routeBranch",
    "routeRewriteApplied": false
  }
}
```

### 客户看到的展示文案（customerMessage）

> 您的需求已精确匹配到非标增值服务：
>
> **增值产品**：新单上架（客户提供预报单）  
> **服务项**：入库-提供无箱单预报单上架
>
> 请在页面【增值产品】中选择上述产品，并在服务项中勾选「入库-提供无箱单预报单上架」。
>
> 该服务适用于：客户使用无箱单预报单入库，货物到仓后无箱单识别标识丢失，需提供原始无箱单信息以便仓库完成上架。
>
> 选择后请按页面提示填写必要字段并提交。

### 页面动作（pageActions）

| 序号 | action | target | label | enabled |
|------|--------|--------|-------|---------|
| 1 | `select_service` | `vasc_product_selector` | 选择增值产品「新单上架（客户提供预报单）」 | true |
| 2 | `select_service` | `vasc_atom_selector` | 选择服务项「入库-提供无箱单预报单上架」 | true |
| 3 | `copy_text` | `aiResult` | 复制建议 | true |

**注意**：2a 分支直接指引选择，不生成 SOP 长文，不进入多轮追问，不启用 `fill_field` 写入"需求背景说明"/"需求描述"字段（该分支由具体原子自身的必填字段驱动）。

---

## 示例三：非标SOP（其他服务需求 + 追问）

### 场景说明

| 字段 | 值 |
|------|-----|
| 案例编号 | C-2b-001-2026W30-06 |
| 客户 | CREALITY 3D TECHNOLOGY LLC（16585492） |
| 仓库 | USTX Warehouse |
| 异常单号 | VASC000000323001 / IH000000106524 |
| 客户进入页面 | 非标增值提交页（入库） |
| 客户原始需求 | 需要销毁部分不良品，但仓库不知道如何辨识销毁对象 |
| 判定结论 | 需求无法命中具体非标服务项，走"入库其他服务需求"兜底，需 SOP 追问 |

### 完整对话流

#### Turn 1：客户输入

```
客户在非标增值提交页的智能引导输入框描述：
"我们需要销毁部分不良品，之前客户同事已经去仓库维修过，有拍照标记了哪些要销毁。"
```

#### Turn 2：Agent 判定过程（第一轮）

```text
1. 检查 popupContext：无 popupContext，执行 2d 标准增值纠偏检查
2. 2d 检查结果：候选内标准增值无法覆盖"销毁"需求 → 跳过 2d
3. 2a 判定：候选内无"销毁"命名的具体非标服务项（销毁属于兜底类）→ 跳过 2a
4. 2b 判定：候选内存在"入库其他服务需求"（OW01V1602）→ 进入 2b
5. SOP 模板匹配：匹配到"销毁"相关 SOP 模板
6. 信息完整度检查：
   - 缺少：销毁对象照片指示（未上传到增值单附件）
   - 缺少：操作 SOP 文档
   - 状态：matchState = partial，需追问
```

#### Turn 3：Agent 输出追问（matchState = partial）

```json
{
  "route": "2b_other_service_sop",
  "matchState": "partial",
  "matchConfidence": 0.72,
  "missingFields": [
    "销毁对象照片指示（哪些产品需要销毁）",
    "操作SOP或书面指示文档"
  ],
  "customerMessage": "已识别为销毁需求。为了帮您完善提交信息，需要补充以下内容：\n1. 请上传销毁对象的照片指示（标记哪些产品需要销毁）\n2. 请提供操作SOP或书面指示文档\n\n您提到客户同事已去仓库拍照标记，请将这些照片上传到增值单附件中。"
}
```

#### Turn 4：客户补充

```
客户回复：
"照片在客户和仓库的维修群里，我让客户把照片发给我上传。SOP 的话就是按照片标记的产品做销毁就行。"
```

#### Turn 5：Agent 判定过程（第二轮）

```text
1. 客户已说明照片来源和操作逻辑
2. 可生成确认摘要
3. 仍需确认附件是否实际上传
4. 生成字段建议和附件要求
```

#### Turn 6：Agent 最终输出

### Agent 输出的结构化 JSON（AgentGuideResult）

```json
{
  "requestId": "req_20260722_C2b006",
  "conversationId": "conv_VASC000000323001",
  "turnId": "turn_0003",
  "route": "2b_other_service_sop",
  "matchState": "matched",
  "matchConfidence": 0.82,
  "matchedCandidateId": "VASC_NONSTD_INBOUND:OW01V1602",
  "selectedVasc": {
    "candidateId": "VASC_NONSTD_INBOUND:OW01V1602",
    "vascCode": "VASC202411192246131",
    "vascName": "入库非标增值（特批）",
    "vascType": "nonstandard"
  },
  "selectedService": {
    "serviceCode": "OW01V1602",
    "serviceName": "入库其他服务需求",
    "serviceKind": "other_service_request",
    "serviceDomain": "inbound"
  },
  "fieldSuggestions": {
    "background": "客户 CREALITY 3D TECHNOLOGY LLC（16585492）USTX Warehouse，客户同事已到仓库完成维修和不良品标记，现需仓库按照标记对指定不良品做销毁处理。",
    "description": "请按照附件中的销毁指示照片，对照片中标记的不良品进行销毁。销毁对象以客户上传的照片标记为准。客户确认不等于审核通过。"
  },
  "confirmationSummary": "客户 CREALITY 3D TECHNOLOGY LLC（16585492）需要仓库按照附件照片标记对不良品做销毁处理。操作依据：客户同事到仓库维修时拍照标记的产品。客户确认不等于审核通过。",
  "missingFields": [],
  "attachmentRequirements": [
    {
      "name": "销毁对象照片（含标记指示）",
      "required": true,
      "acceptedFileExts": [".jpg", ".jpeg", ".png", ".pdf"],
      "targetUploadFieldId": "vaAtoms_OW01V1602_vasFiles_VAS_ATTR_REL_TCRBCAL"
    },
    {
      "name": "操作SOP文档（可选，如有书面说明）",
      "required": false,
      "acceptedFileExts": [".doc", ".docx", ".pdf"],
      "targetUploadFieldId": "vaAtoms_OW01V1602_vasFiles_VAS_ATTR_REL_TCRBCAL"
    }
  ],
  "attachmentCheck": {
    "state": "metadata_checked",
    "missingRequired": [
      "销毁对象照片尚未上传到增值单附件"
    ],
    "warnings": [
      "照片目前仅在客户-仓库维修群中，建议上传到增值单附件以便审核"
    ]
  },
  "pageActions": [
    {
      "action": "fill_field",
      "target": "vaAtoms_OW01V1602_attributes_BEOR_attributeValue",
      "valueRef": "fieldSuggestions.background",
      "label": "填入需求背景说明",
      "enabled": true
    },
    {
      "action": "fill_field",
      "target": "vaAtoms_OW01V1602_attributes_VAS_ATTR_REL_RD_attributeValue",
      "valueRef": "fieldSuggestions.description",
      "label": "填入需求描述",
      "enabled": true
    },
    {
      "action": "copy_text",
      "target": "aiResult",
      "valueRef": "customerMessage",
      "label": "复制建议",
      "enabled": true
    }
  ],
  "displayText": "已匹配入库其他服务需求（销毁），字段建议已生成，请上传销毁指示照片后提交。",
  "customerMessage": "已为您匹配「入库其他服务需求」，处理方式为销毁。\n\n以下内容将填入页面【需求背景说明】字段，您也可以点击上方按钮一键填入：\n\n---\n客户 CREALITY 3D TECHNOLOGY LLC（16585492）USTX Warehouse，客户同事已到仓库完成维修和不良品标记，现需仓库按照标记对指定不良品做销毁处理。\n---\n\n以下内容将填入页面【需求描述】字段：\n\n---\n请按照附件中的销毁指示照片，对照片中标记的不良品进行销毁。销毁对象以客户上传的照片标记为准。\n---\n\n附件要求：请将销毁对象照片（含标记指示）上传到【操作说明附件】。\n\n提示：字段建议仅用于创建申请，客户确认不等于审核通过。",
  "decisionTrace": {
    "intentMatched": true,
    "candidateMatched": true,
    "routeSource": "selectedCandidate.routeBranch",
    "routeRewriteApplied": false
  }
}
```

### 客户看到的展示文案（customerMessage）

> 已为您匹配「入库其他服务需求」，处理方式为销毁。
>
> 以下内容将填入页面【需求背景说明】字段，您也可以点击上方按钮一键填入：
>
> ---
> 客户 CREALITY 3D TECHNOLOGY LLC（16585492）USTX Warehouse，客户同事已到仓库完成维修和不良品标记，现需仓库按照标记对指定不良品做销毁处理。
> ---
>
> 以下内容将填入页面【需求描述】字段：
>
> ---
> 请按照附件中的销毁指示照片，对照片中标记的不良品进行销毁。销毁对象以客户上传的照片标记为准。
> ---
>
> 附件要求：请将销毁对象照片（含标记指示）上传到【操作说明附件】。
>
> 提示：字段建议仅用于创建申请，客户确认不等于审核通过。

### 页面动作（pageActions）

| 序号 | action | target | label | enabled |
|------|--------|--------|-------|---------|
| 1 | `fill_field` | `vaAtoms_OW01V1602_attributes_BEOR_attributeValue` | 填入需求背景说明 | true |
| 2 | `fill_field` | `vaAtoms_OW01V1602_attributes_VAS_ATTR_REL_RD_attributeValue` | 填入需求描述 | true |
| 3 | `copy_text` | `aiResult` | 复制建议 | true |

**注意**：2b 分支经过 SOP 追问补齐信息后才启用 `fill_field`；确认摘要必须包含"客户确认不等于审核通过"。

---

## 三分支行为对比总结

| 维度 | 标准增值（纠偏） | 非标免审（命名直选） | 非标SOP（其他服务需求） |
|------|-----------------|-------------|----------------------|
| 判定条件 | 候选内标准增值可覆盖 | 候选内具体非标服务项命中 | 无具体服务项命中，走兜底 |
| 多轮追问 | 不追问 | 不追问 | 需追问补齐信息 |
| 字段建议 | 不生成（不填非标字段） | 不生成 SOP 长文 | 客户确认后生成 |
| 核心 pageAction | `navigate_hint` | `select_service` | `fill_field` |
| confirmationSummary | 空 | 空 | 必须含"客户确认不等于审核通过" |
| 附件检查 | 不检查 | 按原子自身要求 | SOP 驱动轻量检查 |

---

## 附录：原子清单依据

| 示例 | 对应产品 | 原子编码 | 原子名称 | 分支归属 |
|------|----------|----------|----------|----------|
| 标准增值 | 出库标准增值-包裹开箱拍照 | （出库段标准） | 包裹开箱拍照 | standard |
| 非标免审 | 新单上架（客户提供预报单）VASC202412111831129 | OW01V1622 | 入库-提供无箱单预报单上架 | 2a_named |
| 非标SOP | 入库非标增值（特批）VASC202411192246131 | OW01V1602 | 入库其他服务需求 | 2b_catchall |
