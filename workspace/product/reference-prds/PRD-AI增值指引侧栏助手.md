# PRD\-AI增值指引侧栏助手

# 需求文档 — AI 增值指引侧栏助手（非标特批引导）

## 功能点概要说明

|序号|功能点概要说明|
|---|---|
|1|在「新增库内/入库增值单」「异常单处理第二步」「订单列表继续下单」等 4 个入口，客户进入页面时自动打开 AI 侧栏助手|
|2|AI 侧栏通过多轮对话追问客户需求，判断应归类到「库内/入库非标增值（特批）→ 其他服务需求」|
|3|AI 生成中英双语操作 SOP \+ 需求描述 AI 润色版，客户在侧栏「确认」后一键回填 4 个表单字段|
|4|客户提交时把三版需求描述（原始/AI 润色/客户最终版）\+ SOP \+ AI 会话 ID 一起入库；TOM 审核端读取并展示对照|
|5|AI 归类未命中时提示客户联系人工客服；Coze 不可用时降级不阻断下单|

## 修订记录

|修改人|修改日期|修改章节|修改类型|修改描述|
|---|---|---|---|---|
|金萤|2026\-08\-12|ALL|A|编写需求文档|

---

## 需求背景

### 业务需求链接

关联 BRD：`.omc/specs/brd-ai-vas-customer-guidance.md`
关联业务方案：`D6_业务会_异常单增值客户引导_0721对齐修订版_20260727.md`

### 背景说明

**当前业务现状（AS\-IS）**：

客户在万邑联新增库内/入库增值单或处理异常单时，选到「非标增值（特批）→ 其他服务需求」是最容易出错和信息填不清的入口：

- 客户分不清标准增值和非标增值，能走标准的场景也提非标

- 「需求背景说明」「需求描述」两个必填文本框，客户经常只写一句话（如「帮我处理下」），审核人员无法判断具体要求

- 客户不熟悉仓库执行流程，写的需求描述缺关键要素（SKU/数量/单据号/附件），审核退回后需要多轮补料

**存在的痛点**：

1. **审核团队痛点**：大量时间花在追客户补资料、修改「其他服务需求」里写不清的描述；有些客户找客服代写一段再提交，客服成为代写角色

2. **客户痛点**：分不清标准/非标；不知道该填什么字段、传什么附件；提交后被退回，反复补料才能通过；处理时效长

3. **仓库痛点**：拿到的需求描述含糊不清，执行时易出错、多次向审核确认

4. **成本痛点**：客服代写工作量大；审核大量时间用于沟通而非实质审核

**期望达到的目标（TO\-BE）**：

在 4 个非标特批入口引入 AI 侧栏助手（复用现有 AI 客服架构），核心能力：

- 能走标准就推标准（AI 判断），减少无必要非标

- 必须走非标时：AI 替客服问清需求 → 按 SOP 模板结构化 → 生成中英双语 SOP 供客户确认 → 一键回填 4 字段

- 需求描述保留三版（客户原始版 \+ AI 润色版 \+ 客户最终版），审核端对照展示

- 减少客户反复补料轮次，降低审核回退率

---

## 整体交互流程

### 现有流程（AS\-IS）

```Plaintext
客户在菜单点「新增库内/入库增值单」或从异常单/订单列表进入
  → 客户自选增值产品：常常选到「非标增值（特批）」
  → 客户自选增值服务：常常选到「其他服务需求」
  → 客户自由填写「需求背景说明」+「需求描述」（往往简短或不完整）
  → 客户上传附件
  → 提交
  → 审核人员发现信息不全 → 电话/工单让客户补充
  → 客户补充 → 再提交（可能多轮）
  → 通过 → 下发仓库执行
```

### 优化后流程（TO\-BE）

```Plaintext
客户进入 4 个入口页面之一
  → AI 侧栏自动打开 + 代发固定话术（含订单上下文）
  → AI 归类判断：
      · 命中标准增值 → 推荐标准产品（本期一期先不主推）
      · 命中「非标特批 → 其他服务需求」 → 继续追问
      · 归类未命中 → 提示联系人工客服
  → AI 多轮追问关键信息（处理对象/操作动作/数量/单据号/附件）
  → 客户回答 + 上传附件（图片必支持；Word/Excel 待 Coze 确认）
  → AI 输出结构化 SOP 卡片（中英双语）+ 需求描述 AI 润色版 + analysis 确认摘要
  → 客户点「确认并使用」（未确认无法一键回填）
  → 一键回填 4 字段：增值产品名称 / 增值服务 / 需求背景说明 / 需求描述
  → 客户可再手动修改（AI 不再感知，但前端本地保存三版）
  → 提交增值单，同时将三版需求 + SOP + AI 会话 ID 落库
  → TOM 审核后台读取并展示对照，审核员可基于 AI 版修改
```

（详细系统交互时序图见「附件：系统交互时序图」，业务场景脑图见「附件：业务场景脑图」）

---

## 本期场景边界

|维度|范围|
|---|---|
|入口场景|4 个：① 新增库内增值单（菜单）② 新增入库增值单（菜单）③ 异常单处理第二步（库内/入库）④ 订单列表继续下单（沿用未提交 vaOrderNo）|
|业务归类|仅覆盖「库内/入库非标增值（特批）→ 库内/入库其他服务需求」；异常单入口对应「库内其他服务需求（库内异常处理）」|
|智能体|一个 Coze 专家多入口共用（不做多智能体）|
|AI 职责|归类判断 \+ 追问补齐 \+ 生成中英双语 SOP \+ 生成需求描述润色版 \+ 引导人工咨询|
|AI 不做|不自动提交、不替代审核、不做精确报价、不做提交前硬预审、不做免审直发仓库|
|WMS 端|待定（仓库拿到 SOP 后的展示/交付方式，本期先不做）|

---

## 功能需求

### 功能模块 1：AI 侧栏自动打开与关闭记忆

**页面位置**：万邑联客户端 4 个入口页面

- 入口 1：菜单「新增库内增值单」（URL 含 `createInstockOrder`，vaSource=INHOUSE）

- 入口 2：菜单「新增入库增值单」（vaSource=INBOUND）

- 入口 3：异常单列表 → 处理异常 → 第二步「增值产品信息」（vaSource=UNUSUAL）

- 入口 4：订单列表 → 未提交增值单 → 继续下单（沿用 vaOrderNo，AI 侧栏交互与入口 1/2 保持一致，本期不单独 demo 演示但研发落地时按同一规则实现）

**页面功能**：客户进入命中入口的页面时，AI 侧栏自动展开在页面右侧，与主体表单并排。

**字段说明**：无表单字段，仅交互控制。

**业务规则**：

1. **自动打开条件**（全部满足才自动打开）：

    - 页面 URL 命中上述 4 个入口之一

    - 客户命中 30% 灰度池

    - 该客户在该入口页面无「关闭记忆」标记

2. **关闭记忆机制**：

    - 客户点侧栏右上角 × → 弹二次确认弹窗

    - 弹窗内容：「关闭后，本页面下次进入是否继续自动弹出？」\+ 复选框「本页面下次不再自动弹出（可通过侧栏入口手动打开）」

    - 勾选并确认 → 记忆保存到浏览器本地（缓存键复用 `aiChatbotOpenV2_{userId}` 并扩展场景子键）

    - 未勾选直接确认 → 仅本次关闭，下次仍自动打开

3. **手动打开入口**：侧栏收起后，页面右下角提供「AI 助手」浮动按钮，客户点击可重新打开

4. **降级**：Coze 不可用时，侧栏仍打开但显示提示「AI 暂不可用，请自行填写」，不阻断下单流程

**操作说明**：

|操作|触发|结果|
|---|---|---|
|自动打开|进入命中入口页面|侧栏右侧展开，主体内容左移|
|关闭助手|点侧栏右上角 ×|弹二次确认弹窗|
|记忆下次不再自动弹|弹窗勾选 \+ 确定|本地存储该客户该入口的关闭标记|
|手动重新打开|点右下角浮动按钮|侧栏再次展开，会话历史保留|

---

### 功能模块 2：代发固定话术与上下文注入

**页面位置**：AI 侧栏打开时自动执行

**页面功能**：侧栏打开后，前端自动向 Coze 代发一条包含订单上下文的固定开场话术，触发专家进入引导流程。

**字段说明**：传给 Coze 的上下文字段（打包为 `inputs`）：

|字段名|类型|是否必填|取值逻辑|
|---|---|---|---|
|customerCode|字符串|是|当前登录客户编码|
|customerName|字符串|是|当前登录客户名称|
|warehouseCode|字符串|是|页面选中的仓库编码|
|warehouseName|字符串|是|页面选中的仓库名称|
|vaSource|枚举|是|INBOUND / INHOUSE / UNUSUAL|
|entryScene|枚举|是|NEW\_INHOUSE / NEW\_INBOUND / UNUSUAL\_INHOUSE / UNUSUAL\_INBOUND / CONTINUE\_ORDER|
|vascList|数组|是|调 `pms.vasc.listAllVasc` 得到的当前可选增值产品列表（用于硬分流）|
|orderSnapshot|对象|否|客户在表单已经填过的字段快照，用于 AI 避免重复追问|
|eventNo|字符串|异常入口必填|异常单号（仅 UNUSUAL 入口）|
|businessOrderNo|字符串|非异常入口必填|关联单据号（入库单/出库单/库内订单等）|
|businessMerchandise|数组|非异常入口必填|关联单据里的商品信息（SKU/数量/单品编码）|

**业务规则**：

1. **固定话术模板**（前端拼接为一句话，含变量占位）：

1. 「客户 \{customerName\} 正在 \{entryScene\}，仓库 \{warehouseName\}，可选增值产品共 N 项。请判断客户需求应归类到哪个增值产品和增值服务，并按标准步骤引导。」

2. **异常入口特殊话术**：追加「异常单号 \{eventNo\}，异常类型 \{exceptionType\}，异常图片 URL 列表 \{imageUrls\}」

3. 传给 Coze 的 `inputs` 需 100% 完整；缺任一必填字段则不发起会话，侧栏显示「上下文获取失败，请刷新页面」

4. **硬分流约束**：Coze 专家的 Prompt 中明确「只能从 vascList 中选择推荐产品，不得凭空推荐」

**校验规则**：

- 中：「上下文获取失败，请刷新页面重试」/ EN：「Failed to load context\. Please refresh and try again\.」

---

### 功能模块 3：AI 多轮对话追问与归类判断

**页面位置**：AI 侧栏对话区

**页面功能**：AI 与客户多轮对话，追问关键信息并判断归类。

**字段说明**：AI 每轮回复对客户可见的自然语言文本（`analysis` 字段），前端渲染为对话气泡。

**业务规则**：

1. **AI 追问项清单**（Coze 专家 Prompt 内定义）：

    - 处理对象（SKU / 包裹 / 单品 / 托盘）

    - 操作动作（拍照 / 贴标 / 换包装 / 上架 / 销毁 / 其他）

    - 处理数量

    - 关联单据号（入库单 / 出库单 / 库内订单）

    - 附件（图片必要；Word/Excel 待 Coze 附件能力确认）

    - 特殊要求（时间要求、库位要求、包材要求等）

2. **归类判断分支**（AI 输出 `structured.recommendedProductCode` 和 `recommendedServiceCode`）：

    - **命中「非标特批 → 库内其他服务需求」** → 继续生成 SOP

    - **命中「非标特批 → 库内其他服务需求（库内异常处理）」** → 继续生成 SOP（异常入口专属）

    - **命中「非标特批 → 入库其他服务需求」** → 继续生成 SOP

    - **归类未命中**（客户描述的操作完全不在 vascList 范围内）→ 展示「联系人工客服」引导卡片

3. **附件上传规则**：

    - 图片支持（`.png / .jpg / .jpeg`）

    - Word / Excel：本期能否上传取决于 Coze 侧附件能力现状，PRD 标注「待 Coze 维护人确认」

    - 附件上传成功后附件 URL 传入 Coze，供 AI 辅助判断

4. **归类未命中降级卡片**：

    - 展示红色边框卡片

    - 文案：「抱歉，您描述的操作暂不在系统预设范围内，建议联系人工客服协助评估」

    - 卡片内提供「💬 联系人工客服」按钮，点击跳转到万邑联现有人工客服窗口

5. **对客话术红线**（Coze 专家 Prompt 内约束）：

    - 不得提及飞书、内部 Wiki、内部多维表、员工专用链接

    - 不得承诺「审核通过」「确认即免审」

    - 使用合同、价卡、订单约定等对外可用表述

---

### 功能模块 4：SOP 卡片生成与客户确认

**页面位置**：AI 侧栏对话区（生成到最新一条 AI 消息内）

**页面功能**：AI 追问完成后，输出结构化 SOP 卡片供客户确认。**未确认前禁用一键回填按钮**（红线）。

**字段说明**（SOP 卡片展示内容 = Coze 专家 `structured` 字段结果）：

|字段名称|类型|是否必填|展示位置|取值逻辑|
|---|---|---|---|---|
|recommendedProductName|字符串|是|前端不展示（用于回填）|AI 推荐的增值产品名称|
|recommendedServiceName|字符串|是|前端不展示（用于回填）|AI 推荐的增值服务名称|
|requirementBackground|字符串|是|前端不展示（用于回填「需求背景说明」）|AI 生成的背景说明|
|requirementDescriptionAiPolished|字符串|是|前端不展示（用于回填「需求描述」）|AI 润色版需求描述|
|sopScene|字符串|是|卡片顶部「场景」|场景概述，仅落库供 TOM 用|
|sopBackground|字符串|是|卡片「背景」|SOP 背景|
|sopStepsZh|数组|是|卡片「中文步骤」|SOP 中文操作步骤|
|sopStepsEn|数组|是|卡片「Steps in English」|SOP 英文操作步骤|
|analysis|字符串|是|卡片上方作为确认摘要展示|AI 对客户需求的自然语言确认摘要|

**操作说明**：

|操作|触发|结果|
|---|---|---|
|确认并使用|客户点卡片内「✓ 确认并使用」按钮|按钮变绿显示「✓ 已确认」；页面一键回填按钮激活|
|让 AI 再改一版|客户点卡片内「让 AI 再改一版」按钮|AI 追问客户想调整哪一段（新一轮对话）|

**业务规则**：

1. **未确认不回填（红线）**：SOP 卡片未点「确认并使用」前，页面主体的「一键回填 AI 结果」按钮 disabled \+ 灰色 \+ hover 提示「请先在侧栏确认 SOP 卡片」

2. **确认后 3 秒内**：一键回填按钮从 disabled → 激活，`AI 生成` 徽章预备就绪

3. **多次生成 SOP**：客户可让 AI 改多版 SOP，每次改动后重新点「确认」才可回填；以最新一次确认为准

4. **确认 ≠ 审核通过（红线）**：`analysis` 文本中必须明确「以上仅为 AI 对您需求的理解和 SOP 拆解，是否审核通过由审核人员决定」

5. **未确认关闭侧栏**：客户未确认就关闭侧栏，SOP 卡片状态不保留，下次打开需重新走对话

**校验规则**：

- 中：「请先在侧栏确认 SOP 卡片后再点一键回填」/ EN：「Please confirm the SOP card in the sidebar before applying to form」

---

### 功能模块 5：一键回填与三版本地保存

**页面位置**：主体表单顶部按钮 \+ 4 个表单字段

**页面功能**：客户在侧栏确认 SOP 后，点主体表单的「一键回填 AI 结果」，将 4 个字段自动填入。

**字段说明**（一键回填的目标字段）：

|字段名|类型|是否必填|回填来源|是否加「AI 生成」徽章|
|---|---|---|---|---|
|增值产品名称|Select|是|recommendedProductName|是（字段标签右侧展示紫色渐变徽章）|
|增值服务|Select|是|recommendedServiceName|是|
|需求背景说明|Textarea|是|requirementBackground|是|
|需求描述|Textarea|是|requirementDescriptionAiPolished|是|

**操作说明**：

|操作|触发|结果|
|---|---|---|
|一键回填|客户点「一键回填 AI 结果」按钮（SOP 已确认后可点）|4 字段依次填入，字段旁「AI 生成」徽章亮起，有黄色高亮动画（1\.5s）|
|修改回填后的字段|客户在字段内手动改动|前端记录该字段进入「客户改后版」；AI 不再感知；toast 提示「已记录你的修改·前端保留三版：原始/AI/客户改后」|
|提交|客户点表单底部「提交」按钮|三版内容 \+ SOP 全量结构化字段随 `wh.va.order.submit` 提交到 OMS|

**业务规则**：

1. **三版落库规则**：

    - **客户原始版 originalRequirement**：AI 对话首轮客户描述的自述文本

    - **AI 润色版 aiPolishedRequirement**：Coze 输出的 `requirementDescriptionAiPolished`

    - **客户最终版 customerFinalRequirement**：客户实际提交时「需求描述」字段的最终内容

    - 若客户未手动改 → 客户最终版 = AI 润色版

2. **落库字段一并保存**：

    - AI 生成的 SOP 各字段（sopScene / sopBackground / sopStepsZh / sopStepsEn）

    - AI 会话 ID（Coze conversationId）

    - AI 辅助标记（ai\_source\_flag = 1，用于埋点统计）

3. **修改后回填感知**：客户改动字段后，AI **不再触发新的润色**（避免打扰）；但侧栏对话仍保留，客户可主动向 AI 追问

4. **AI 生成徽章展示规则**：

    - 回填后徽章展示在字段 label 右侧

    - 客户手动修改该字段后，徽章保留（因为落库仍标记为 AI 辅助下单）

    - 客户完全清空字段后，徽章隐藏

---

### 功能模块 6：TOM 审核后台展示（复用现有页面）

**页面位置**：TOM → 订单 → 增值服务管理 → 增值订单 → 单据详情页

**页面功能**：审核人员打开待审增值单时，展示 AI 生成的场景概述 \+ 中英双语 SOP \+ 三版需求描述对照。

**字段说明**：

|字段名称|类型|是否必填|取值逻辑|是否新增|
|---|---|---|---|---|
|场景概述|Input|是|从 OMS 读 `ai_scene`，允许审核员修改后保存|复用现有字段|
|操作 SOP|Textarea|是|从 OMS 读 `ai_sop_zh` \+ `ai_sop_en` 拼接后回填，允许审核员修改后保存|复用现有字段|
|客户原始版|只读区|否|从 OMS 读 `original_requirement`|**新增只读展示区**|
|AI 润色版|只读区|否|从 OMS 读 `ai_polished_requirement`|**新增只读展示区**|
|客户最终版|只读区|否|从 OMS 读 `customer_final_requirement`|**新增只读展示区**|
|AI 会话追溯|只读文本|否|展示 conversationId \+ 专家 ID，供研发排障|**新增只读展示区**|

**业务规则**：

1. **复用字段回填**：AI 生成的 SOP 由前端提交时拼接为「中文步骤 \+ 空行 \+ Steps in English \+ 备注」写入 `操作 SOP` 字段

2. **三版对照展示**：新增只读区，三个卡片并排展示（客户原始版灰底 / AI 润色版蓝底 / 客户最终版绿底）

3. **审核员修改覆盖**：审核员在「场景概述」或「操作 SOP」字段修改后保存，覆盖 OMS 存储的对应字段（`ai_scene` / `ai_sop_zh` / `ai_sop_en` 保留原值，新增字段 `audit_scene` / `audit_sop` 存审核后版本；下轮代码探索确认是否新增字段或直接覆盖）

4. **无 AI 数据时的兼容**：若单据未走 AI 路径（`ai_source_flag = 0`），审核端不展示新增三版对照区，仍显示现有字段和交互

**操作说明**：审核端复用现有「审核通过」「退回补充」按钮，本次不改造。

---

### 功能模块 7：埋点上报

**页面位置**：客户端和 TOM 端全流程

**页面功能**：上报 AI 使用效果关键指标，供业务方评估上线效果。

**字段说明**（埋点事件列表）：

|事件名|触发时机|上报字段|
|---|---|---|
|ai\_sidebar\_open|侧栏自动或手动打开|客户编码、入口场景、打开方式（auto/manual）、灰度分组|
|ai\_sidebar\_close|侧栏关闭|客户编码、是否记忆、对话轮次|
|ai\_dialog\_complete|客户点「确认并使用」|客户编码、对话轮次、生成 SOP 用时|
|ai\_fill\_click|一键回填按钮点击|客户编码、是否 SOP 确认后点击|
|ai\_field\_modified|客户手动修改回填字段|客户编码、修改字段名、原文长度、修改后长度|
|ai\_miss\_customer\_service|归类未命中转人工|客户编码、客户描述文本|
|va\_order\_submit\_with\_ai|增值单提交且 ai\_source\_flag=1|客户编码、增值单号、专家 ID、会话 ID|
|tom\_audit\_return|TOM 审核退回|增值单号、退回原因、是否 AI 辅助|

**业务规则**：

1. 上报到万邑联现有埋点服务（研发对齐现有埋点框架）

2. 关键统计指标（对比灰度前后）：

    - **AI 使用率** = ai\_sidebar\_open 数 / 页面 PV

    - **对话完成率** = ai\_dialog\_complete 数 / ai\_sidebar\_open 数

    - **一键回填采纳率** = ai\_fill\_click（SOP 已确认）数 / ai\_dialog\_complete 数

    - **审核回退率** = tom\_audit\_return（ai\_source\_flag=1）/ va\_order\_submit\_with\_ai

3. 埋点报表由业务方在现有 BI 平台按上述指标搭建，不在本 PRD 范围

---

## 扣子工作流输入输出接口定义

### 专家契约

|项|值|备注|
|---|---|---|
|domain|`inbound`（占位）|与 Coze 维护人对齐后调整|
|id|待定（占位）|建议 `nonstandard-special-approval-guidance`|
|完整路径|`inbound/nonstandard-special-approval-guidance`（占位）|参考万邑通专家系统 design\-spec §3|
|调用方式|复用现有 AI 客服链路（前端 → 现有代理 → Coze workflow/run）|不新增独立服务|

### 请求参数（前端调 Coze 时的 `inputs` 内容）

```JSON
{
  "query": "客户 SELLER-ABC 正在 NEW_INHOUSE，仓库 DEBR2，请判断需求归类并按标准步骤引导",
  "customerIntent": "客户希望仓库处理库内货物",
  "customerCode": "SELLER-ABC",
  "customerName": "示例客户",
  "username": "seller_abc_user01",
  "language": "zh",
  "inputContext": {
    "chainId": "本次会话 uuid",
    "sourceExpertId": "",
    "previousOutput": {}
  },
  "inputs": {
    "warehouseCode": "DEBR2",
    "warehouseName": "DEBR2 Warehouse",
    "vaSource": "INHOUSE",
    "entryScene": "NEW_INHOUSE",
    "vascList": [
      { "vascCode": "IN_HOUSE_SPECIAL_APPROVAL", "vascName": "库内非标增值（特批）" },
      { "vascCode": "IN_HOUSE_STANDARD_XX", "vascName": "..." }
    ],
    "orderSnapshot": {},
    "eventNo": "",
    "businessOrderNo": "WI51339338",
    "businessMerchandise": [
      { "sku": "SKU-DE-15908221", "qty": 86 }
    ]
  }
}
```

### 响应参数（Coze 专家 `structured` \+ `analysis` \+ `outputContext` \+ `enrichedContext`）

```JSON
{
  "structured": {
    "recommendedProductCode": "IN_HOUSE_SPECIAL_APPROVAL",
    "recommendedProductName": "库内非标增值（特批）",
    "recommendedServiceCode": "IN_HOUSE_OTHER_SERVICE",
    "recommendedServiceName": "库内其他服务需求",
    "requirementBackground": "客户有一批在库商品与即将退仓入库的新货三方条码冲突...",
    "requirementDescriptionAiPolished": "操作需求：良品转不良品上架\n\n仓库：DEBR2\n...",
    "sopScene": "【库内】良品转不良品上架",
    "sopBackground": "客户 SKU-DE-15908221 与退仓新货三方条码冲突...",
    "sopStepsZh": [
      "根据出库单 WO12120399145 下架指定商品",
      "按新入库单 WI51339338 补贴包裹标签",
      "使用新入库单做不良品上架",
      "上架后登记异常，复核时确认为不良品",
      "操作完成后拍照留存"
    ],
    "sopStepsEn": [
      "De-shelve per outbound order WO12120399145",
      "Attach parcel labels per new inbound order WI51339338",
      "Shelve using WI51339338, place in defective goods location",
      "Register exception, confirm as defective during review",
      "Take photos after completion"
    ]
  },
  "analysis": "已确认您的需求为【良品转不良品上架】。以上仅为 AI 对您需求的理解和 SOP 拆解，是否审核通过由审核人员决定。请点击「确认并使用」后再一键回填。",
  "outputContext": {
    "expertId": "nonstandard-special-approval-guidance",
    "resultSummary": "非标特批-良品转不良品上架 SOP 生成完毕",
    "chainId": "本次会话 uuid"
  },
  "enrichedContext": {}
}
```

### 状态枚举说明

|枚举字段|值|含义|
|---|---|---|
|entryScene|NEW\_INHOUSE|主动新增库内增值单入口|
|entryScene|NEW\_INBOUND|主动新增入库增值单入口|
|entryScene|UNUSUAL\_INHOUSE|库内异常单处理第二步入口|
|entryScene|UNUSUAL\_INBOUND|入库异常单处理第二步入口|
|entryScene|CONTINUE\_ORDER|订单列表继续下单入口|
|recommendedServiceCode|IN\_HOUSE\_OTHER\_SERVICE|库内其他服务需求|
|recommendedServiceCode|IN\_HOUSE\_UNUSUAL\_OTHER\_SERVICE|库内其他服务需求（库内异常处理）|
|recommendedServiceCode|INBOUND\_OTHER\_SERVICE|入库其他服务需求|
|recommendedServiceCode|NOT\_MATCHED|归类未命中 → 前端展示人工客服卡片|

---

## 扣子工作流系统提示词和用户提示词

### 系统提示词（Coze 专家 Prompt 主体，供 AI 侧编排人员配置）

```Plaintext
你是「非标特批增值引导专家」，隶属万邑通增值订单模块。

# 目标
1. 根据客户描述和上下文（客户/仓库/vaSource/vascList/单据信息），判断客户需求应归类到哪个「非标增值（特批）」+「其他服务需求」组合
2. 追问客户补齐关键信息（处理对象/操作动作/数量/单据号/附件/特殊要求）
3. 生成结构化的中英双语操作 SOP + 需求描述 AI 润色版
4. 输出 analysis 自然语言确认摘要供客户在侧栏查看

# 处理原则（红线）
1. **只能从 inputs.vascList 中推荐产品**，不得凭空扩推
2. 客户描述完全不在 vascList 范围时，输出 recommendedServiceCode = "NOT_MATCHED"，引导客户联系人工客服
3. analysis 中**不得**提及飞书、内部 Wiki、内部多维表、员工专用链接
4. analysis 必须包含「以上仅为 AI 理解，是否审核通过由审核人员决定」
5. **不得**承诺「审核通过」「确认即免审」

# 归类路径矩阵
- vaSource=INHOUSE 且业务描述属于库内操作 → recommendedProductCode=IN_HOUSE_SPECIAL_APPROVAL, recommendedServiceCode=IN_HOUSE_OTHER_SERVICE
- vaSource=UNUSUAL 且异常源为库内 → recommendedProductCode=IN_HOUSE_SPECIAL_APPROVAL, recommendedServiceCode=IN_HOUSE_UNUSUAL_OTHER_SERVICE
- vaSource=INBOUND → recommendedProductCode=INBOUND_SPECIAL_APPROVAL, recommendedServiceCode=INBOUND_OTHER_SERVICE
- 归类未命中 → recommendedServiceCode=NOT_MATCHED

# 追问项（客户填写层）
在归类判断出结论前，通过多轮对话收集：
1. 处理对象（SKU / 包裹 / 单品 / 托盘）
2. 操作动作（拍照 / 贴标 / 换包装 / 上架 / 销毁 / 其他）
3. 处理数量
4. 关联单据号（入库单 / 出库单 / 库内订单）
5. 附件（图片；Word/Excel 视 Coze 附件能力而定）
6. 特殊要求

# 输出格式（严格按 structured / analysis 契约）
输出字段见接口定义章节，遵循万邑通专家 design-spec §7「三层输出统一约定」。

# 场景概述（sopScene）命名规则
【库内/入库】+ 场景名（如「良品转不良品上架」「补贴包裹标签换单上架」等）

# 中英双语 SOP 结构固定
sopStepsZh 和 sopStepsEn 均为字符串数组，一一对应，步骤数一致。
```

### 用户提示词（Coze 侧模板，供每次调用替换变量）

```Plaintext
请根据以下上下文和客户对话，输出结构化 SOP 和确认摘要。

# 上下文
- 客户编码：{{customerCode}}
- 客户名称：{{customerName}}
- 仓库：{{warehouseCode}} · {{warehouseName}}
- 入口场景：{{entryScene}}
- 可选增值产品列表（硬分流范围）：{{vascList}}
- 关联单据号：{{businessOrderNo}}
- 关联商品：{{businessMerchandise}}
- 异常单号（仅异常入口）：{{eventNo}}
- 订单已填字段快照：{{orderSnapshot}}

# 客户对话历史
{{conversationHistory}}

# 输出要求
严格按 structured / analysis 契约输出，不允许自然语言解释、Markdown 或额外前后缀。
若客户描述已足够生成 SOP，直接输出；若信息不足，输出下一轮追问文本到 analysis，此时 structured 可保留部分字段为空字符串，recommendedServiceCode 输出 "AWAITING_MORE_INFO"。
```

---

## 非功能性需求

|需求项|要求|
|---|---|
|AI 响应时效|首次响应 ≤ 3 秒，后续每轮 ≤ 5 秒|
|多语言|支持中文/英文交互，根据客户 `language` 参数返回对应语言|
|并发|支持多客户同时使用，互不干扰|
|会话生命周期|客户未提交前重复进入同一入口 → 沿用 conversationId；客户提交增值单 → 会话结束；下次新增 → 新起 conversationId|
|数据安全|Coze API 密钥保存在后端（复用现有 AI 客服代理），不暴露给浏览器|
|降级可用性|Coze 服务不可用时，AI 侧栏显示「AI 暂不可用，请自行填写」，不阻断客户下单|
|灰度控制|客户维度 30% 灰度，通过现有灰度框架控制|
|埋点上报|上报 8 类关键事件到万邑联现有埋点服务|

---

## 上线方案

### 业务配置信息

|配置项|说明|负责方|
|---|---|---|
|Coze 专家 domain / id|「非标特批增值引导专家」的最终命名|Coze 维护人|
|vascList 硬分流参数|页面通过 `pms.vasc.listAllVasc` 已经能拉到，无需额外配置|复用现有接口|
|灰度客户名单|30% 灰度客户池（按客户 hash 分组或指定客户名单）|万邑联产品|
|埋点服务对接|8 类事件的埋点服务端点|前端研发 \+ 埋点服务方|
|Coze 附件能力|Word/Excel 支持能力确认（图片确定支持）|Coze 维护人|
|TOM 审核端字段扩展|是否新增 `audit_scene` / `audit_sop` 字段区分审核后版本|审核业务方 \+ OMS 研发|

### 历史数据处理方案

- 存量增值单**不回填** AI 字段，`ai_scene / ai_sop_zh / ai_sop_en / original_requirement / ai_polished_requirement / customer_final_requirement / ai_session_id` 均保持 NULL

- `ai_source_flag` 存量数据默认 0（非 AI 辅助下单）

- TOM 审核端在 `ai_source_flag = 0` 时不展示新增三版对照区

### 上线切换方案

|阶段|内容|时间|
|---|---|---|
|第一阶段|Coze 专家配置完成 \+ 前端联调 \+ 内部 UAT|2026\-08 上旬|
|第二阶段|客户 30% 灰度上线|2026\-08 中旬|
|灰度扩量|观察埋点数据，逐步扩大到 60% / 100%|2026\-08 下旬 \- 2026\-09|
|回滚方案|关闭灰度开关 → 客户端不再自动打开 AI 侧栏，客户手动仍可打开（不阻断）|随时可回滚|
|监控告警|监控 AI 使用率、Coze 调用错误率、审核回退率变化趋势|上线后持续|

---

## 关联影响的系统或模块

|系统|模块/功能|影响说明|
|---|---|---|
|seller|新增库内增值单页面|新增 AI 侧栏组件挂载、上下文组装、一键回填、三版本地保存、埋点|
|seller|新增入库增值单页面|同上|
|seller|异常单处理第二步页面|同上，额外携带异常单号和异常图片|
|seller|订单列表继续下单页面|同上（不做 demo 演示，按同规则实现）|
|seller|现有 AI 客服组件|复用打开机制（`postMessage OPEN_AI_CHATBOT`）\+ 复用侧栏样式（`aiChatbot_open` / `ai-chatbot-width`）|
|Coze|现有 AI 客服 workflow|新增「非标特批增值引导专家」，编排上挂到 experts\_recaller|
|OMS|增值单表 `va_order`|新增 8 个字段落库 AI 生成内容和三版需求描述|
|OMS|增值单提交接口 `wh.va.order.submit`|扩 7 个入参传入 AI 内容|
|TOM|订单/增值服务管理/增值订单详情页|场景概述\+操作 SOP 字段回填 AI 内容；新增三版需求描述对照只读区|
|埋点服务|万邑联现有埋点框架|新增 8 类事件上报|
|灰度框架|万邑联现有灰度平台|新增客户维度 30% 灰度配置|

---

## 验收场景用例

|场景大类|场景用例描述|预期结果|
|---|---|---|
|自动打开侧栏|命中灰度客户进入「新增库内增值单」页面|AI 侧栏自动展开，代发固定话术，AI 首轮问候可见|
|关闭记忆|客户在库内入口关闭侧栏并勾选「下次不再自动弹出」，再次进入同一页面|侧栏不自动打开，客户可通过右下角浮动按钮手动打开|
|灰度未命中|客户不在 30% 灰度池|侧栏不自动打开，页面交互与现有一致|
|Coze 降级|Coze 服务不可用|侧栏打开但显示「AI 暂不可用，请自行填写」，客户可正常提交|
|AI 归类命中库内|客户描述「良品转不良品上架」|AI 输出 recommendedProductName=库内非标增值（特批），recommendedServiceName=库内其他服务需求|
|AI 归类命中异常|UNUSUAL 入口客户描述库内异常处理|AI 输出 recommendedServiceName=库内其他服务需求（库内异常处理）|
|AI 归类命中入库|INBOUND 入口客户描述换标上架|AI 输出 recommendedServiceName=入库其他服务需求|
|AI 归类未命中|客户描述「用微波炉加热货物」不在 vascList 范围|AI 输出 recommendedServiceCode=NOT\_MATCHED，侧栏展示「联系人工客服」红色卡片|
|SOP 未确认禁用回填|AI 已生成 SOP 卡片，客户未点确认|页面「一键回填」按钮 disabled，hover 提示「请先确认 SOP 卡片」|
|SOP 确认后回填|客户点「✓ 确认并使用」，再点「一键回填」|4 字段自动填入，字段旁显示紫色渐变「AI 生成」徽章，高亮动画 1\.5s|
|客户修改回填字段|客户在「需求描述」字段追加内容|前端 toast「已记录你的修改·前端保留三版」，字段旁徽章保留|
|三版落库|客户提交增值单|OMS `va_order` 三个字段分别存客户原始版 / AI 润色版 / 客户最终版|
|TOM 审核端展示|审核员打开 AI 辅助下单的增值单|场景概述\+操作 SOP 已回填 AI 版；新增只读区展示三版需求对照|
|TOM 审核端修改 SOP|审核员在「操作 SOP」textarea 里修改并保存|保存后覆盖到审核后版本字段，OMS 原始 `ai_sop_*` 字段保留|
|TOM 非 AI 单据|审核员打开 `ai_source_flag=0` 的存量单据|不展示三版对照区，其他交互与现有一致|
|多语言（英文客户）|客户 language=en，进入侧栏|AI 首轮问候和后续回复均为英文，analysis 也是英文|
|埋点上报|客户完整走完流程（打开→对话→确认→回填→提交）|埋点服务收到 5 类事件（open / dialog\_complete / fill\_click / va\_order\_submit\_with\_ai \+ 审核后的 tom\_audit\_return）|

---

## 待确认事项

|\#|问题|优先级|影响|责任方|
|---|---|---|---|---|
|1|Coze 专家的 domain 和 id 最终命名|P0|阻塞专家开发|Coze 维护人|
|2|Coze 侧对 Word / Excel 附件的支持能力|P1|附件上传范围|Coze 维护人|
|3|TOM 审核端是否新增 `audit_scene` / `audit_sop` 字段区分审核后版本，还是直接覆盖 AI 字段|P1|审核端数据模型|审核业务方 \+ OMS 研发|
|4|现有 AI 客服代理是否能透明复用（新增专家挂到 experts\_recaller 后能否直接被现有前端触达）|P0|阻塞前端改造范围评估|AI 客服研发 \+ Coze 维护人|
|5|WMS 端仓库拿到 SOP 后的展示/交付方式|P2|本期不做，二期评估|仓库业务方|
|6|30% 灰度的客户名单/分组算法（按 customerCode hash 还是指定名单）|P1|灰度配置|万邑联产品|
|7|客户端埋点服务端点与字段规范|P1|埋点落地|前端研发 \+ 埋点服务方|
|8|「订单列表继续下单」入口的 UI 演示是否补做原型|P2|一致性确认|万邑联产品|

---

## 一期不承诺项

|不承诺项|原因|何时可做|
|---|---|---|
|免审 / AI 生成 SOP 自动通过审核|一期保留人工审核，避免误批|二期，需稳定质量 \+ 业务授权|
|自动提交增值单|AI 只帮客户拆解需求，客户自己点提交|二期评估|
|精确报价承诺|一期不接价卡链路|二期打通价卡后|
|提交前硬预审|一期不做前端拦截，AI 只在对话内提醒|二期，需前端大改和规则库|
|多套智能体|一期一个专家多入口共用|无长期规划|
|WMS 端 SOP 展示/交付|本期范围外|二期与仓库业务方对齐|

---

## 附件

|附件|路径|说明|
|---|---|---|
|业务场景脑图|`.omc/specs/ui/ai-vas-sidebar-assistant-scenarios-mindmap.html`|12 个业务分支（3 类场景 \+ 4 类入口 \+ 7 项 AI 能力）|
|系统交互时序图|`.omc/specs/ui/ai-vas-sidebar-assistant-system-sequence.html`|9 阶段 · 6 个参与者的完整时序|
|功能改造范围脑图|`.omc/specs/ui/ai-vas-sidebar-assistant-scope-mindmap.html`|5 大改造模块 \+ 本期不做清单|
|前端交互原型|`.omc/specs/ui/ai-vas-sidebar-assistant-prototype.html`|4 个 Tab \+ 6 步演示 \+ 关闭确认弹窗|
|关联 BRD|`.omc/specs/brd-ai-vas-customer-guidance.md`|AI 智能客服引导 BRD 全文|
|关联业务方案|`.cc-connect/attachments/D6_业务会_异常单增值客户引导_0721对齐修订版_20260727.md`|0721 业务会对齐版方案|
|Coze 专家规范参考|用户 2026\-08\-12 发送的 `expert-design-spec.md`|万邑通 Coze 专家系统设计规格|

**附件\-业务场景脑图**

\[ai\-vas\-sidebar\-assistant\-scenarios\-mindmap\.html\]

**附件\-系统交互时序图**

\[ai\-vas\-sidebar\-assistant\-system\-sequence\.html\]

**附件\-功能改造范围脑图**



\[ai\-vas\-sidebar\-assistant\-scope\-mindmap\.html\]

**附件\-前端交互原型截图**



\[ai\-vas\-sidebar\-assistant\-prototype\.html\]

