## §0 角色与仓库

你是执行者（Codex），负责修改原型 HTML 文件。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_原始页面版.html`

## §1 任务

修正侧边栏演示原型，使其正确实现以下效果：

1. 页面自带的 AI 侧栏（`#aiChatbotRoot`）是唯一的 AI 对话区域，不新增任何额外侧栏
2. 点击"演示：非标特批场景"时，在页面自带侧栏中注入多轮对话气泡
3. 点击"模拟：一键填入表单"时，直接操作页面内的真实表单控件：
   - 增值产品名称下拉框选中"库内非标增值（特批）"
   - 增值服务下拉框选中"库内其他服务需求"（注意：这个下拉框可能在选择增值产品后才会出现/更新选项）
   - "需求背景说明" textarea 填入 AI 生成的内容
   - "需求描述" textarea 填入 AI 生成的内容
   - 选中/填入的字段用绿色边框高亮
4. 点击"模拟：审核视角"弹出模态框展示 TOM 审核页面 SOP 回填效果

## §2 前置阅读

- `prototypes/references/线上库内增值单页面快照.html`：底座页面（就是 `prototypes/新增库内增值单-AI侧栏.html` 的副本），需要理解其 DOM 结构
- `contracts/tool-calling-spec.md`：理解 Tool Calling 的 target key 和操作逻辑
- 当前 `prototypes/B_侧边栏演示_原始页面版.html`：已有的框架，需在此基础上修正

## §3 关键约束

### 页面结构理解

底座页面 `线上库内增值单页面快照.html` 是从线上 seller.winit.com.cn 导出的完整 HTML，特征如下：
- 已有 `#aiChatbotRoot` 侧栏（右侧在线咨询 AI），内含对话气泡
- 表单区域在 iframe 内页面的 main content 中
- 增值产品名称是一个 `<select>` 或 chosen/ant-design select 组件
- 增值服务是另一个 `<select>` 或类似组件
- "需求背景说明"和"需求描述"是 `<textarea>` 元素

### 实现方式

由于底座页面通过 iframe 加载，操作 iframe 内 DOM 需要同源。本演示原型假设在本地 file:// 或同域部署环境下运行。

**演示控制台**放在 iframe 外层（顶部固定条），通过 `iframe.contentDocument` 访问内部 DOM。

### 查找表单元素的策略

由于生产页面 DOM 复杂，查找策略按优先级：
1. 通过前面的 `<label>` 文本匹配（包含"增值产品名称"、"增值服务"、"需求背景说明"、"需求描述"）
2. 通过 `name` 属性匹配
3. 通过相邻文本节点内容匹配
4. 通过 chosen/ant-select 组件的 DOM 结构匹配

### 对话注入策略

在 `#aiChatbotRoot` 内的对话列表容器（class 含 `acss-10cqvkt`）中追加气泡 HTML。气泡样式需匹配页面已有的 ant-bubble 样式：
- 用户气泡：class `ant-bubble ant-bubble-end`，紫色渐变背景
- AI 气泡：class `ant-bubble ant-bubble-start`，白色背景

## §4 演示对话内容（非标特批场景 — 库内货权转移）

点击"演示"按钮后，在已有对话后面追加以下气泡（带延时动画，每条间隔 1.5s）：

**AI 开场**："您好，我看到您正在新增库内增值单。\n\n请描述您希望仓库如何处理库内的这批货物，我来帮您：\n· 判断应选择哪个增值服务\n· 生成操作 SOP\n· 一键填入表单字段"

**用户**："账户上的库存可以转移到其他账户上去吗"

**AI 追问（第一轮）**："可以，需要先判断这是走【货权转移（换标模式）】还是【货权转移（改数模式）】。\n\n为了帮您生成可执行的 SOP，请补充这几项信息：\n1. 转出账号和转入账号分别是什么？\n2. 需要转移哪些 SKU？\n3. 每个 SKU 是全部库存转移，还是只转移部分库存？\n4. 这次大概一共涉及多少个单品？\n\n判断规则是：指定 SKU 全部转移时，单次转移单品数 ≤300 个走换标模式，>300 个走改数模式；如果是部分库存转移，则走换标模式。"

**用户**："从 A10001 账号转到 B20002 账号。转 SKU-001、SKU-002、SKU-003 这 3 个 SKU，都是全部库存转移，一共 150 个单品。"

**AI 追问（第二轮）**："已判断：这次是指定 3 个 SKU 全部转移，共 150 个单品，数量 ≤300，因此建议走【货权转移（换标模式）】。\n\n请再确认：\n1. 双方是否已签署《商品库存转移协议》？\n2. 转出方是否会提交出库单（自提单）？\n3. 转入方是否已准备新入库单和新标签文件？"

**用户**："确认，协议已经签了。转出方会提交自提单，转入方会提供新入库单和新标签，数量就是这 3 个 SKU 共 150 个单品。"

**AI 判定 + SOP**："已确认：该需求为【库内货权转移】，建议选择【库内非标增值（特批）】下的【货权转移（换标模式）】。\n\n【SOP 卡片】\n操作类型：货权转移-换标模式\n转出账号：A10001\n转入账号：B20002\n转移 SKU：SKU-001、SKU-002、SKU-003\n转移数量：共 150 个单品\n\n操作步骤：\n1. 确认双方签署《商品库存转移协议》\n2. 转出方提交出库单（自提单）\n3. 转入方提供新入库单\n4. 仓库下架指定商品\n5. 更换商品标签（贴转入方标签）\n6. 按新入库单重新上架\n7. 拍照留存\n\n计费方式：按换标数量 × 单价计费\n\n请点击上方「模拟：一键填入表单」按钮查看填充效果。"

## §5 一键填入的具体内容

### 增值产品名称
选中值：包含"库内非标增值"或"非标增值"的选项

### 增值服务
选中值：包含"货权转移"的选项（优先"货权转移（换标模式）"，如无则选"库内其他服务需求"）

### 需求背景说明
```
客户希望将 A10001 账号下的库存转移到 B20002 账号。客户本次指定 SKU-001、SKU-002、SKU-003 共 3 个 SKU，均为全部库存转移，合计 150 个单品。因指定 SKU 全部转移且单品数 ≤300 个，本次按货权转移（换标模式）处理。
```

### 需求描述
```
操作需求：货权转移-换标模式

转出账号：A10001
转入账号：B20002
转移 SKU：SKU-001、SKU-002、SKU-003
转移数量：共 150 个单品，指定 SKU 全部库存转移
增值产品：库内非标增值（特批）
增值服务：货权转移（换标模式）

具体要求：
1. 请先确认双方已签署《商品库存转移协议》
2. 转出方提交出库单（自提单）
3. 转入方提供新入库单及新标签文件
4. 仓库按明细下架指定商品
5. 将商品标签更换为转入方标签
6. 按转入方新入库单重新上架
7. 操作完成后拍照留存
8. 费用按换标数量 × 单价计费
```

### 填充后的视觉效果
- 选中的 select：绿色边框 `outline: 3px solid #52c41a` + 浅绿背景 `background: #f6ffed`
- 填入的 textarea：同上
- 如果是 chosen/ant-select 组件，同时修改其显示文本和高亮样式

## §6 审核模态框

更新审核模态框内容为货权转移场景：
- 场景概述下拉框选中值改为："【库内】货权转移（换标模式）"
- 操作SOP textarea 预填内容改为：

```
操作类型：货权转移-换标模式
转出账号：A10001
转入账号：B20002
转移 SKU：SKU-001、SKU-002、SKU-003
转移数量：共 150 个单品，指定 SKU 全部库存转移

操作步骤：
1. 确认双方签署《商品库存转移协议》
2. 转出方提交出库单（自提单）
3. 转入方提供新入库单
4. 仓库下架指定商品
5. 更换商品标签（贴转入方标签）
6. 按新入库单重新上架
7. 拍照留存

计费方式：按换标数量 × 单价计费

Steps in English:
1. Confirm both parties signed "Inventory Transfer Agreement"
2. Transferor submits outbound order (self-pickup order)
3. Transferee provides new inbound order
4. Warehouse de-shelves specified products
5. Replace product labels (attach transferee labels)
6. Re-shelve according to new inbound order
7. Take photos for records

Billing: per relabeled unit × unit price
```

## §7 约束

- **只修改** `prototypes/B_侧边栏演示_原始页面版.html` 这一个文件
- 单 HTML 文件，所有 CSS/JS 内联
- 不修改底座页面 `references/线上库内增值单页面快照.html`
- iframe 内 DOM 操作需要 try-catch，失败时 toast 提示
- 如有歧义标记 `[AMBIGUITY]`，不自行决定

## §8 Git 规范

- commit message：`fix(prototype-B): inject dialog into existing sidebar, fill real form fields`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
