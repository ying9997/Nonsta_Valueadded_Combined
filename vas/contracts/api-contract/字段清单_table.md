# 字段清单 Table

> 模块：非标页内嵌智能引导  
> 切片：中间层接口契约草案  
> 范围：request 和 response 全字段一览，标注必填/可选、来源和消费方。

## 1. Request 字段清单

### 1.1 前端 -> 中间层：`GuideSubmitRequest`

| 字段路径 | 类型 | 必填 | 来源 | 消费方 | 说明 |
|----------|------|------|------|--------|------|
| `requestId` | string | 是 | 前端生成或中间层补齐 | 中间层、前端 | 单次请求 ID，用于幂等和追踪 |
| `conversationId` | string | 否 | 前端缓存 / 中间层 | 中间层 | 已有会话 ID；首轮可为空 |
| `eventCode` | string | 是 | 页面业务上下文 | 中间层 | 当前创建增值单事件或流程标识 |
| `pageContext` | object | 是 | 前端 | 中间层 | 页面上下文 |
| `pageContext.pageCode` | string | 是 | 前端固定值 | 中间层、Agent | 页面编码，当前为非标 Step 2 |
| `pageContext.pageUrl` | string | 否 | 前端 | 中间层 | 页面路径，仅用于追踪 |
| `pageContext.locale` | string | 否 | 前端 | 中间层、Agent | 默认 `zh-CN` |
| `pageContext.timezone` | string | 否 | 前端 | 中间层 | 默认 `Asia/Shanghai` |
| `pageContext.activeServiceCodes` | string[] | 否 | 页面勾选态 | 中间层、Agent | 当前页面已选服务项 |
| `pageContext.visibleFieldIds` | string[] | 是 | 页面 DOM 映射 | 中间层、前端 | 前端允许被 `pageActions` 定位的字段 |
| `userInput` | object | 是 | 前端 | 中间层、Agent | 用户自然语言输入 |
| `userInput.text` | string | 是 | 用户输入 | Agent | 意图与候选匹配输入 |
| `userInput.inputSource` | string | 是 | 前端 | 中间层 | 如 `ai_inline_panel` |
| `userInput.submittedAt` | string | 是 | 前端 | 中间层 | ISO 8601 时间 |
| `popupContext` | object | 否 | 标准页弹窗 / 前端 | 中间层、Agent | 弹窗跳转非标页时透传的入口上下文；缺失不阻塞主模块 |
| `popupContext.conversationId` | string | 否 | 标准页弹窗 | 中间层、Agent | 弹窗会话 ID |
| `popupContext.customerInput` | string | 否 | 标准页弹窗 | Agent | 弹窗中客户描述，可作为非标页承接输入 |
| `popupContext.routeDecision` | string/null | 否 | 标准页弹窗 | Agent | `nonstandard` / `standard` / null；为 `nonstandard` 时 Agent 跳过 2d |
| `popupContext.systemScopedVascList` | array | 否 | 标准页弹窗 | 中间层、Agent | 弹窗时的候选快照，用于一致性校验 |
| `popupContext.exceptionContext` | object | 否 | 标准页弹窗 | Agent | 弹窗采集的异常单上下文 |
| `popupContext.dialogHistory` | array | 否 | 标准页弹窗 | Agent | 弹窗多轮对话记录 |
| `attachmentMetas` | array | 否 | 前端上传控件 | 中间层、Agent | 仅附件元数据，不读取附件内容 |
| `attachmentMetas[].attachmentId` | string | 否 | 前端 / 上传服务 | 中间层 | 附件 ID |
| `attachmentMetas[].fileName` | string | 是 | 前端 | Agent | 文件名 |
| `attachmentMetas[].fileExt` | string | 是 | 前端 | Agent | 文件扩展名 |
| `attachmentMetas[].fileSizeBytes` | number | 否 | 前端 / 上传服务 | 中间层 | 文件大小 |
| `attachmentMetas[].uploadFieldId` | string | 是 | 页面上传控件 | Agent、前端 | 附件对应页面字段 |
| `attachmentMetas[].uploaded` | boolean | 是 | 前端 | Agent | 是否已上传 |
| `clientState` | object | 否 | 前端缓存 | 中间层 | 客户端上一轮状态 |
| `clientState.lastRoute` | string | 否 | 上一轮响应 | 中间层、Agent | 上一轮路由 |
| `clientState.lastMatchState` | string | 否 | 上一轮响应 | 中间层、Agent | 上一轮匹配状态 |
| `clientState.draftFieldValues` | object | 否 | 页面表单 | 中间层、Agent | 当前草稿字段值 |
| `clientState.draftFieldValues.background` | string | 否 | 页面表单 | Agent | 需求背景说明草稿 |
| `clientState.draftFieldValues.description` | string | 否 | 页面表单 | Agent | 需求描述草稿 |

### 1.2 中间层 -> Agent：`AgentGuideRequest`

| 字段路径 | 类型 | 必填 | 来源 | 消费方 | 说明 |
|----------|------|------|------|--------|------|
| `requestId` | string | 是 | 前端 / 中间层 | Agent | 单次请求 ID |
| `conversationId` | string | 是 | 中间层 | Agent | 会话 ID |
| `turnId` | string | 是 | 中间层 | Agent | 会话轮次 ID |
| `eventCode` | string | 是 | 前端 / 中间层 | Agent | 业务流程标识 |
| `pageContext` | object | 是 | 前端 / 中间层 | Agent | 页面上下文 |
| `pageContext.pageCode` | string | 是 | 前端 | Agent | 页面编码 |
| `pageContext.activeServiceCodes` | string[] | 否 | 前端 | Agent | 当前已选服务 |
| `pageContext.visibleFieldIds` | string[] | 是 | 前端 | Agent | 可生成动作的字段白名单 |
| `userInput` | object | 是 | 前端 | Agent | 用户输入 |
| `userInput.text` | string | 是 | 用户 | Agent | 匹配输入 |
| `userInput.inputSource` | string | 是 | 前端 | Agent | 输入来源 |
| `userInput.submittedAt` | string | 是 | 前端 | Agent | 提交时间 |
| `conversationHistory` | array | 否 | 中间层 | Agent | 多轮对话历史；首轮为空数组 |
| `conversationHistory[].turnId` | string | 是 | 中间层 | Agent | 历史轮次 ID |
| `conversationHistory[].role` | string | 是 | 中间层 | Agent | `user` / `agent` |
| `conversationHistory[].content` | string | 是 | 中间层 | Agent | 该轮用户输入或 Agent `customerMessage` |
| `conversationHistory[].timestamp` | string | 是 | 中间层 | Agent | ISO 8601 时间 |
| `conversationHistory[].route` | string | 否 | 中间层 | Agent | 该轮 Agent 输出的 `route`，仅 `role=agent` 时有值 |
| `conversationHistory[].matchState` | string | 否 | 中间层 | Agent | 该轮匹配状态，仅 `role=agent` 时有值 |
| `candidateSnapshot` | object | 是 | 中间层归一化 | Agent | 候选快照 |
| `candidateSnapshot.candidateListVersion` | string | 是 | 中间层 | Agent | 候选契约版本 |
| `candidateSnapshot.normalizationGeneratedAt` | string | 是 | 中间层 | Agent | 归一化生成时间 |
| `candidateSnapshot.systemScopedVascList` | array | 是 | 中间层 | Agent | 唯一可匹配候选集合 |
| `candidateSnapshot.systemScopedVascList[].candidateId` | string | 是 | 中间层 | Agent | 候选稳定 ID |
| `candidateSnapshot.systemScopedVascList[].vascCode` | string | 是 | 原始接口 / 中间层 | Agent | 增值产品编码 |
| `candidateSnapshot.systemScopedVascList[].vascName` | string | 是 | 原始接口 / 中间层 | Agent | 增值产品名称 |
| `candidateSnapshot.systemScopedVascList[].serviceCode` | string | 是 | 原始接口 / 中间层 | Agent | 服务项编码 |
| `candidateSnapshot.systemScopedVascList[].serviceName` | string | 是 | 原始接口 / 中间层 | Agent | 服务项名称 |
| `candidateSnapshot.systemScopedVascList[].vascType` | string | 是 | 中间层注入 | Agent | `standard` / `nonstandard` / `unknown` |
| `candidateSnapshot.systemScopedVascList[].serviceKind` | string | 是 | 中间层注入 | Agent | 服务语义类型 |
| `candidateSnapshot.systemScopedVascList[].serviceDomain` | string | 否 | 中间层注入 | Agent | `inbound` / `in_warehouse` / `outbound` / `return` / `unknown` |
| `candidateSnapshot.systemScopedVascList[].sourceApi` | string | 是 | 中间层 | Agent | 来源接口 |
| `candidateSnapshot.systemScopedVascList[].normalizationStatus` | string | 是 | 中间层 | Agent | 归一化状态 |
| `candidateSnapshot.systemScopedVascList[].routeBranch` | string | 是 | 中间层 | Agent | Agent 取用为最终 `route` 的分支 |
| `candidateSnapshot.systemScopedVascList[].originalFields` | object | 是 | 中间层 | Agent | 原字段追溯 |
| `candidateSnapshot.systemScopedVascList[].normalizationNotes` | string[] | 是 | 中间层 | Agent | 归一化说明 |
| `candidateSnapshot.systemScopedVascList[].confidence` | number | 否 | 中间层 | Agent | 中间层归一置信度，不由 Agent 改写 |
| `candidateSnapshot.systemScopedVascList[].isCandidateSelectable` | boolean | 否 | 中间层 / 页面 | Agent | 是否可选择 |
| `candidateSnapshot.systemScopedVascList[].candidateScope` | string | 否 | 中间层 | Agent | 候选作用域 |
| `sopContext` | object | 否 | 中间层 | Agent | SOP 模板注入上下文；2d/2a 不需要，2b 模板库超 token 限时可注入 |
| `sopContext.injectionMode` | string | 否 | 中间层 | Agent | `prompt_embedded` / `middleware_filtered` |
| `sopContext.filteredTemplates` | array | 否 | 中间层 | Agent | 中间层预过滤后的 top-N 匹配模板 |
| `sopContext.filteredTemplates[].templateId` | string | 是 | 中间层 | Agent | SOP 模板 ID |
| `sopContext.filteredTemplates[].title` | string | 是 | 中间层 | Agent | SOP 模板标题 |
| `sopContext.filteredTemplates[].matchScore` | number | 是 | 中间层 | Agent | 0 到 1 的模板匹配分 |
| `sopContext.filteredTemplates[].templateContent` | string | 是 | 中间层 | Agent | 模板全文或摘要 |
| `sopContext.totalTemplateCount` | number | 否 | 中间层 | Agent | 模板库总数 |
| `sopContext.tokenBudgetExceeded` | boolean | 否 | 中间层 | Agent | 是否因 token 限制而走预过滤 |
| `runtimePolicy` | object | 是 | 中间层 | Agent | 运行策略 |
| `runtimePolicy.matchThresholds` | object | 是 | 中间层 | Agent | 匹配阈值 |
| `runtimePolicy.matchThresholds.matchedMin` | number | 是 | 中间层 | Agent | 默认 `0.8` |
| `runtimePolicy.matchThresholds.partialMin` | number | 是 | 中间层 | Agent | 默认 `0.6` |
| `runtimePolicy.allowFieldFillActions` | boolean | 是 | 中间层 | Agent | 是否允许输出字段填入动作 |
| `runtimePolicy.allowCandidateOutOfScope` | boolean | 是 | 中间层 | Agent | 固定 false |
| `runtimePolicy.allowRouteRewrite` | boolean | 是 | 中间层 | Agent | 固定 false |
| `runtimePolicy.defaultFallbackRoute` | string | 是 | 中间层 | Agent | 默认 `manual_fallback` |
| `runtimePolicy.returnDomainPolicy` | string | 是 | 中间层 | Agent | 默认 `manual_fallback_reserved_extension` |
| `sessionState` | object | 是 | 中间层 | Agent | 会话状态 |
| `sessionState.status` | string | 是 | 中间层 | Agent | `created` / `active` / `timed_out` / `reset` / `ended` |
| `sessionState.createdAt` | string | 是 | 中间层 | Agent | 会话创建时间 |
| `sessionState.lastActiveAt` | string | 是 | 中间层 | Agent | 最近活跃时间 |
| `sessionState.turnCount` | number | 是 | 中间层 | Agent | 当前轮次数 |
| `popupContext` | object | 否 | 前端透传 / 中间层会话服务 | Agent | 弹窗传入上下文；缺失时 Agent 正常执行 2d |
| `popupContext.conversationId` | string | 否 | 前端透传 / 中间层会话服务 | Agent | 弹窗会话 ID |
| `popupContext.customerInput` | string | 否 | 前端透传 / 中间层会话服务 | Agent | 弹窗中客户描述 |
| `popupContext.routeDecision` | string/null | 否 | 前端透传 / 中间层会话服务 | Agent | `nonstandard` / `standard` / null；为 `nonstandard` 时跳过 2d |
| `popupContext.systemScopedVascList` | array | 否 | 前端透传 / 中间层会话服务 | Agent | 弹窗时的候选快照，用于一致性校验 |
| `popupContext.exceptionContext` | object | 否 | 前端透传 / 中间层会话服务 | Agent | 弹窗采集的异常单上下文 |
| `popupContext.dialogHistory` | array | 否 | 前端透传 / 中间层会话服务 | Agent | 弹窗多轮对话记录 |

## 2. Response 字段清单

### 2.1 Agent -> 中间层：`AgentGuideResult`

| 字段路径 | 类型 | 必填 | 来源 | 消费方 | 说明 |
|----------|------|------|------|--------|------|
| `requestId` | string | 是 | Agent 回传 | 中间层 | 请求 ID |
| `conversationId` | string | 是 | Agent 回传 | 中间层 | 会话 ID |
| `turnId` | string | 是 | Agent 回传 | 中间层 | 轮次 ID |
| `route` | string | 是 | Agent 取用 `routeBranch` | 中间层、前端 | 最终路由；必须等于命中候选 `routeBranch` |
| `matchState` | string | 是 | Agent | 中间层、前端 | `matched` / `partial` / `none` |
| `matchConfidence` | number | 是 | Agent | 中间层、前端 | 0 到 1 |
| `matchedCandidateId` | string | 否 | Agent | 中间层 | 命中候选 ID |
| `selectedVasc` | object | 否 | Agent 从候选复制 | 中间层、前端 | 命中产品摘要 |
| `selectedVasc.candidateId` | string | 是 | 候选快照 | 前端 | 候选 ID |
| `selectedVasc.vascCode` | string | 是 | 候选快照 | 前端 | 产品编码 |
| `selectedVasc.vascName` | string | 是 | 候选快照 | 前端 | 产品名称 |
| `selectedVasc.vascType` | string | 是 | 候选快照 | 前端 | 产品类型 |
| `selectedService` | object | 否 | Agent 从候选复制 | 中间层、前端 | 命中服务摘要 |
| `selectedService.serviceCode` | string | 是 | 候选快照 | 前端 | 服务编码 |
| `selectedService.serviceName` | string | 是 | 候选快照 | 前端 | 服务名称 |
| `selectedService.serviceKind` | string | 是 | 候选快照 | 前端 | 服务语义类型 |
| `selectedService.serviceDomain` | string | 否 | 候选快照 | 前端 | 服务域 |
| `fieldSuggestions` | object | 是 | Agent | 中间层、前端 | 字段建议；低置信时为空字符串 |
| `fieldSuggestions.background` | string | 是 | Agent | 前端 | 需求背景说明建议 |
| `fieldSuggestions.description` | string | 是 | Agent | 前端 | 需求描述建议 |
| `confirmationSummary` | string/null | 条件必填 | Agent | 中间层、前端 | `route=2b_other_service_sop` 且 `matchState=matched` 时必填，必须包含“客户确认不等于审核通过”；2d/2a 为空字符串或 null |
| `missingFields` | array | 是 | Agent | 中间层、前端 | 追问清单；无追问时为空数组，非空时 `pageActions` 同时含 `ask_followup` |
| `missingFields[].fieldKey` | string | 是 | Agent | 前端 | 缺失信息类型标识 |
| `missingFields[].displayLabel` | string | 是 | Agent | 前端 | 前端展示的追问文案 |
| `missingFields[].priority` | string | 是 | Agent | 前端 | `required` / `recommended` |
| `missingFields[].relatedSopSection` | string | 否 | Agent | 前端 | 对应 SOP 模板章节 |
| `attachmentRequirements` | array | 否 | Agent | 前端 | 附件要求提示 |
| `attachmentRequirements[].name` | string | 是 | Agent | 前端 | 附件名称 |
| `attachmentRequirements[].required` | boolean | 是 | Agent | 前端 | 是否必需 |
| `attachmentRequirements[].acceptedFileExts` | string[] | 否 | Agent / 页面限制 | 前端 | 允许扩展名 |
| `attachmentRequirements[].targetUploadFieldId` | string | 否 | Agent / 页面字段 | 前端 | 对应上传控件 |
| `attachmentCheck` | object | 是 | Agent | 前端 | 附件元数据检查 |
| `attachmentCheck.state` | string | 是 | Agent | 前端 | `not_checked` / `metadata_checked` / `missing_required` |
| `attachmentCheck.missingRequired` | string[] | 是 | Agent | 前端 | 缺少的附件 |
| `attachmentCheck.warnings` | string[] | 是 | Agent | 前端 | 警告 |
| `pageActions` | array | 是 | Agent | 中间层、前端 | 页面动作 |
| `pageActions[].action` | string | 是 | Agent | 前端 | `fill_field` / `copy_text` / `show_message` / `ask_followup` |
| `pageActions[].target` | string | 是 | Agent | 前端 | DOM 字段 ID 或展示区域 |
| `pageActions[].valueRef` | string | 否 | Agent | 前端 | 引用响应中的字段路径 |
| `pageActions[].label` | string | 是 | Agent | 前端 | 按钮文案 |
| `pageActions[].enabled` | boolean | 是 | Agent | 前端 | 是否启用 |
| `displayText` | string | 是 | Agent | 前端 | 页面展示摘要 |
| `customerMessage` | string | 是 | Agent | 前端 | 客户可见完整文案 |
| `decisionTrace` | object | 是 | Agent | 中间层 | 决策追踪 |
| `decisionTrace.intentMatched` | boolean | 是 | Agent | 中间层 | 是否意图命中 |
| `decisionTrace.candidateMatched` | boolean | 是 | Agent | 中间层 | 是否候选命中 |
| `decisionTrace.routeSource` | string | 是 | Agent | 中间层 | 固定 `selectedCandidate.routeBranch` 或 `fallback` |
| `decisionTrace.routeRewriteApplied` | boolean | 是 | Agent | 中间层 | 固定 false |

### 2.2 中间层 -> 前端：`GuideSubmitResponse`

| 字段路径 | 类型 | 必填 | 来源 | 消费方 | 说明 |
|----------|------|------|------|--------|------|
| `requestId` | string | 是 | 中间层 | 前端 | 请求 ID |
| `conversationId` | string | 是 | 中间层 | 前端 | 会话 ID |
| `status` | string | 是 | 中间层 | 前端 | `ok` / `error` |
| `route` | string | 是 | Agent / 中间层兜底 | 前端 | 最终路由 |
| `matchState` | string | 是 | Agent / 中间层兜底 | 前端 | `matched` / `partial` / `none` |
| `matchConfidence` | number | 是 | Agent / 中间层兜底 | 前端 | 0 到 1 |
| `selectedVasc` | object | 否 | Agent 校验后透传 | 前端 | 命中产品摘要 |
| `selectedService` | object | 否 | Agent 校验后透传 | 前端 | 命中服务摘要 |
| `fieldSuggestions` | object | 是 | Agent 校验后透传 | 前端 | 字段建议 |
| `fieldSuggestions.background` | string | 是 | Agent | 前端 | 需求背景说明 |
| `fieldSuggestions.description` | string | 是 | Agent | 前端 | 需求描述 |
| `confirmationSummary` | string/null | 条件必填 | Agent 校验后透传 | 前端 | `route=2b_other_service_sop` 且 `matchState=matched` 时必填，必须包含“客户确认不等于审核通过”；2d/2a 为空字符串或 null |
| `missingFields` | array | 是 | Agent 校验后透传 | 前端 | 追问清单；无追问时为空数组，非空时 `pageActions` 同时含 `ask_followup` |
| `missingFields[].fieldKey` | string | 是 | Agent | 前端 | 缺失信息类型标识 |
| `missingFields[].displayLabel` | string | 是 | Agent | 前端 | 前端展示的追问文案 |
| `missingFields[].priority` | string | 是 | Agent | 前端 | `required` / `recommended` |
| `missingFields[].relatedSopSection` | string | 否 | Agent | 前端 | 对应 SOP 模板章节 |
| `attachmentRequirements` | array | 是 | Agent 校验后透传 | 前端 | 附件要求 |
| `attachmentCheck` | object | 是 | Agent 校验后透传 | 前端 | 附件检查 |
| `pageActions` | array | 是 | Agent 输出 + 中间层过滤 | 前端 | 前端唯一可执行动作来源 |
| `displayText` | string | 是 | Agent / 中间层兜底 | 前端 | 展示摘要 |
| `customerMessage` | string | 是 | Agent / 中间层兜底 | 前端 | 客户可见文案 |
| `error` | object/null | 是 | 中间层 | 前端 | 错误信息；成功时为 null |
| `error.code` | string | 否 | 中间层 | 前端 | 错误码 |
| `error.message` | string | 否 | 中间层 | 前端 | 兜底提示 |
| `error.retryable` | boolean | 否 | 中间层 | 前端 | 是否可重试 |
| `error.fallbackRoute` | string | 否 | 中间层 | 前端 | 默认 `manual_fallback` |
| `session` | object | 是 | 中间层 | 前端 | 会话状态 |
| `session.status` | string | 是 | 中间层 | 前端 | 当前会话状态 |
| `session.expiresAt` | string | 否 | 中间层 | 前端 | 过期时间 |
| `session.nextExpectedAction` | string | 否 | 中间层 | 前端 | 建议下一步，如 `user_confirm_or_fill` |

## 3. 页面动作字段白名单

| `pageActions[].action` | 允许状态 | 必填字段 | 说明 |
|------------------------|----------|----------|------|
| `fill_field` | 仅 `matchState=matched` 且 `matchConfidence>=0.80` | `target`、`valueRef`、`label`、`enabled` | 用户点击后填入页面字段 |
| `copy_text` | `matched` / `partial` / `none` | `target`、`valueRef` 或可复制文本、`label`、`enabled` | 复制建议或兜底文案 |
| `show_message` | `matched` / `partial` / `none` | `target`、`label`、`enabled` | 展示提示，不写字段 |
| `ask_followup` | `partial` / `none` | `target`、`label`、`enabled` | 引导用户补充信息 |

## 4. 错误码字段

| `error.code` | 来源 | 前端处理 | 是否可重试 |
|--------------|------|----------|------------|
| `AGENT_INVALID_JSON` | 中间层校验 Agent 输出 | 展示兜底文案，不写字段 | 是 |
| `AGENT_TIMEOUT` | 中间层调用 Agent 超时 | 展示重试和人工入口 | 是 |
| `AGENT_REFUSAL` | Agent 拒答或无法回答 | 展示人工确认入口 | 否 |
| `CANDIDATE_SNAPSHOT_MISSING` | 中间层候选快照缺失 | 提示稍后重试或人工处理 | 是 |
| `CANDIDATE_CONFLICT` | 中间层或 Agent 检测候选冲突 | 提示人工确认 | 否 |
| `LOW_CONFIDENCE` | Agent 低置信输出 | 展示追问 | 是 |
