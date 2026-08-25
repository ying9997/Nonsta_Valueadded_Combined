## §0 角色与仓库

你是执行者（Codex），负责产出原型 HTML 文件。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`prototypes/B_特批指引-客服栏对话.html`（覆盖现有文件）

## §1 任务

基于 V4 底座页面，重新构建版本 B 原型（自动弹出侧边栏形态）。包含：
1. V4 页面作为底座（替换老页面结构）
2. 右侧侧边栏自动滑出 + 偏好设置
3. AI 对话流：基于异常配置推荐增值服务原子，含多轮追问
4. AI 判定后自动联动 V4 的 select 链路
5. 非标特批费用预估展示在 AI 对话框内（占位）
6. SOP 卡片只保留"一键填入表单"
7. "模拟审核视角"模态框
8. 演示控制台独立化
9. SVG inline AI icon

## §2 前置阅读（必须全部读取）

- `prototypes/demo-vas-order-page-v4(2).html`：**新底座页面**，包含完整的 处理方式→增值产品→增值服务 三级 select 联动 JS 逻辑和数据
- `prototypes/demo-vas-exception-config.html`：异常→场景→可用增值服务原子映射（JS 中的 EXCEPTIONS 数组）
- `prototypes/增值单审核页面（待回填）.html`：审核页面，关注 sopForm 表单中的操作SOP下拉框和 textarea

## §3 底座页面（V4）

将 `demo-vas-order-page-v4(2).html` 的完整 DOM 结构、CSS、JS 作为底座。在此基础上添加侧边栏容器和演示控制台。

**需要补充的数据**（V4 现有数据缺少非标路径）：

在 V4 的 JS 数据中补充：
```js
// METHOD_PRODUCT_MAP['上架']['原单上架'] 加入非标产品
METHOD_PRODUCT_MAP['上架']['原单上架'] = ['原单上架', '入库非标增值（特批）'];

// 新增 PRODUCT_INFO
PRODUCT_INFO['入库非标增值（特批）'] = { desc: '需求超出标准服务范围，需提交 SOP 由审核人员评估' };

// 新增 PRODUCT_SERVICE_MAP
PRODUCT_SERVICE_MAP['入库非标增值（特批）'] = {
  '原单上架': ['入库其他服务需求']
};

// 新增 SERVICE_DETAILS
SERVICE_DETAILS['入库其他服务需求'] = [
  { svc: '入库其他服务需求', icon: '⚙️', reqs: [['需求背景说明','请填写'],['需求描述','请填写']], file: { tpl: false, upload: '上传操作说明附件' }, price: '按报价' }
];
```

## §4 侧边栏容器

### 4.1 侧边栏结构
- 宽度 360px，从右侧滑入
- 打开时主内容区（`.main`）宽度自动收窄为 `calc(100% - 360px)`，用 `transition: width 0.3s ease`
- 侧栏 `position: fixed; top: 50px; right: 0; bottom: 0; width: 360px; transform: translateX(100%); transition: transform 0.3s ease`
- 打开时 `transform: translateX(0)`
- z-index: 100（在页面内容之上，在演示控制台之下）

### 4.2 侧边栏视觉风格（线上客服风格）
- 标题栏：高 48px，白色背景 `#fff`，底部 `border-bottom: 1px solid #f0f0f0`
  - 左侧：SVG AI icon（见 §4.4）+ 文字"在线咨询"，font-weight: 600
  - 右侧：checkbox "□ 不自动弹出" + 最小化按钮(—) + 关闭按钮(×)
- 对话区背景：`linear-gradient(180deg, #fff 0%, #f3f2ff 100%)`（紫色渐变）
- 对话区：`flex: 1; overflow-y: auto; padding: 16px 12px`
- 底部输入区：白色背景，`padding: 10px 12px 12px`，顶部 `border-top: 1px solid #f0f0f0`
  - 输入框外框：`min-height: 70px; border: 1px solid #d9d9d9; border-radius: 8px; background: #fff`

### 4.3 气泡样式
- AI 气泡：白色背景 `#fff` + `border: 1px solid #f0f0f0` + `border-radius: 8px 8px 8px 0` + `padding: 10px 12px`
- 用户气泡：紫色渐变 `background: linear-gradient(270deg, #f1e6ff 0%, #dde0ff 100%)` + `border-radius: 8px 8px 0 8px` + `padding: 10px 12px`
- 快捷回复按钮（在 AI 气泡内）：`border: 1px solid #e5e5e5; border-radius: 6px; background: #fafafa; text-align: left; width: 100%; padding: 7px 8px; font-size: 13px; cursor: pointer; margin-top: 6px`
- 费用预估占位气泡：`border: 1px dashed #d9d9d9; background: #f9f9f9; border-radius: 8px 8px 8px 0`
- SOP 卡片在侧栏内适配 320px 宽度（垂直堆叠，`font-size: 12px`）
- SOP 卡片保留金色边框 `border: 1px solid #f0e4c0` + 暖色标题栏（与紫色背景区分）

### 4.4 SVG AI Icon
在标题栏使用 inline SVG，不用 emoji。金色渐变 AI 芯片/脑图标：
```html
<svg width="20" height="20" viewBox="0 0 24 24" fill="none">
  <defs><linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#C9952E"/><stop offset="100%" stop-color="#8B6914"/>
  </linearGradient></defs>
  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14h2v2h-2v-2zm0-10h2v8h-2V6z" fill="url(#aiGrad)"/>
</svg>
```
（参考设计，你可以替换为更合适的 AI 脑/芯片 SVG，保持 20x20，金色渐变 #C9952E → #8B6914）

### 4.5 自动弹出 + 偏好
- 页面加载后延迟 800ms 侧栏自动滑出
- 滑出后延迟 500ms 显示 AI 首条消息
- localStorage key: `ai-guide-auto-popup`，勾选 checkbox 后设为 false，下次不自动弹
- 页面上保留一个触发按钮（在 V4 页面的 question-title 旁边）："🤖 AI 指引"，点击可打开/关闭侧栏

## §5 AI 对话流

### 5.1 AI 首条消息（自动发送）

以"商品条码异常 + 有箱单"场景为例：

```
我看到您的异常单 WI46673588 是【商品条码异常(需客户处理)】，当前为有箱单入库。

基于当前场景，建议选择以下增值服务：

📦 上架方向：
  · 原单上架 - 补贴原商品条码 ⭐推荐
  · 原单上架 - 更换新商品条码
  · 原单上架 - 补贴包裹条码+补贴原商品条码
  · 原单上架 - 直接上架
  · 新单上架(Winit创建) - 补贴原商品条码
  · 新单上架(客户创建) - 补贴包裹条码+补贴原商品条码

🗑️ 销毁方向：
  · 上架前销毁

🚚 自提方向：
  · 上架前自提

📷 暂存辨识：
  · 入库-商品开箱拍照

如果以上服务都无法满足您的需求，我可以帮您走非标特批流程。

请告诉我您想怎么处理？
```

### 5.2 演示场景 — 多轮追问

**标准增值场景**（3 轮）：
1. 客户："条码扫不了 帮我处理下"
2. AI 追问："收到。您希望怎么处理这批货？是想继续上架（需要重新贴条码），还是不要了（销毁/自提）？"
3. 客户："上架吧 贴回原来那个码就行"
4. AI 推荐："好的，为您推荐【原单上架 - 补贴原商品条码】。已帮您选中，请确认后提交。"
5. **自动联动 V4 页面**

**非标免审场景**（3 轮）：
1. 客户："这个货有问题 我想看看里面什么情况"
2. AI 追问："您是想让仓库开箱拍照确认货物状态吗？还是需要其他处理？"
3. 客户："对 拍个照给我看看"
4. AI 推荐："为您推荐【入库-商品开箱拍照】，这是免审服务，提交后仓库会直接执行。"
5. **自动联动**

**非标特批场景**（4 轮，用"尺重/标签辨识后换标上架"场景）：
1. 客户："这批货尺寸跟系统登记的对不上 要重新量一下再换标签上架"
2. AI 追问："收到。您的意思是需要仓库重新测量尺重，然后根据实际情况更换标签后上架？请确认以下信息：\n- 是否需要更换商品标签？\n- 换标后上架到原入库单还是新单？"
3. 客户："对 量完换标签 上原单就行"
4. AI 判定："您的需求是【尺重/标签辨识后换标上架】，这超出当前标准服务范围，需要走非标特批流程。我来帮您生成操作 SOP。"
5. **自动联动**：选中 上架→原单上架→入库非标增值（特批）→入库其他服务需求
6. 进入 SOP 生成对话

### 5.3 AI 判定后自动联动 V4 select 链路

```js
function aiAutoSelect(method, subMethod, product, service) {
  // 1. 选中处理方式卡片
  const card = document.querySelector(`[data-method="${method}"]`);
  if (card) selectMethod(card);
  
  // 2. 如果是上架，选子方式
  if (method === '上架' && subMethod) {
    setTimeout(() => {
      document.getElementById('subMethodSelect').value = subMethod;
      onSubMethodChange();
      
      // 3. 选增值产品
      setTimeout(() => {
        document.getElementById('productSelect').value = product;
        onProductChange();
        
        // 4. 选增值服务
        setTimeout(() => {
          document.getElementById('serviceSelect').value = service;
          onServiceChange();
        }, 300);
      }, 300);
    }, 300);
  } else {
    // 非上架类型（销毁/自提/暂存）直接联动
    setTimeout(() => {
      document.getElementById('productSelect').value = product;
      onProductChange();
      setTimeout(() => {
        document.getElementById('serviceSelect').value = service;
        onServiceChange();
      }, 300);
    }, 300);
  }
}
```
每步之间加 300ms 延迟，让用户看到联动过程。

## §6 非标特批 SOP 流程

### 6.1 SOP 生成对话
AI 判定非标后，在侧栏对话区继续：
- AI："我来帮您生成 SOP。根据您的描述，操作步骤大致如下："
- 展示 SOP 卡片（只有"操作步骤"章节内容）
- SOP 卡片适配 320px 宽度，垂直堆叠
- SOP 卡片底部**只有一个按钮**：`[一键填入表单]`

### 6.2 费用预估占位
SOP 卡片下方、"一键填入表单"按钮上方，展示一条 AI 气泡：
```
💰 费用预估（基于 SOP 动作拆解）：
[待知识库接入] 当前无法自动预估费用。
接入报价知识库后，将基于以下逻辑计算：
SOP 动作 → 匹配仓库动作库 → 工时×单价 = 预估费用

您提交后，审核人员会给出正式报价。
```
样式：虚线边框 + 浅灰背景

### 6.3 一键填入
点击"一键填入表单"后：
- 将 SOP 操作步骤内容填入 V4 页面的"需求背景说明"和"需求描述"textarea
- 侧栏内 AI 气泡："✅ 已成功填入表单。提交后 SOP 将自动同步至审核后台的【操作SOP】字段。"
- 气泡下方显示按钮：`[模拟审核视角 →]`

### 6.4 模拟审核视角
点击后弹出模态框（独立于侧栏，居中显示）：
- 标题："审核后台预览 — SOP 已自动回填"（灰色背景 `#f7f8fa`）
- 内容模拟审核表单：
  - 表单行 1：label "操作SOP"（下拉框 disabled），已选中"【入库】尺重/标签辨识后换标上架"
  - 表单行 2：label "操作SOP"（textarea），预填 AI 生成的操作步骤
  - textarea 上方蓝色提示条："💡 以下内容由 AI 生成并经客户确认，审核人员可在此基础上修改"
  - textarea 可编辑
- 底部只有 `[关闭预览]`
- 样式：白色背景，宽 750px，max-height 80vh，圆角 8px，阴影 `0 8px 32px rgba(0,0,0,0.2)`

## §7 演示控制台

页面最顶部 `position:fixed; top:0; left:0; right:0; z-index:9999`：
- 背景 `#2d2d2d`，高度 44px
- 左侧："🎬 原型演示控制台（仅开发/评审可见，非线上真实界面）"白色 12px
- 右侧按钮：`[标准增值场景]` `[非标免审场景]` `[非标特批场景]` `[重置]`
- 按钮样式：`background:#4a4a4a; color:#fff; border:1px solid #666; border-radius:4px; padding:5px 14px; font-size:12px; cursor:pointer`
- body 加 `padding-top:44px`
- **侧栏内不放任何演示按钮**

## §8 约束

- **产出一个文件**：`prototypes/B_特批指引-客服栏对话.html`（覆盖现有）
- 单 HTML 文件，所有 CSS/JS 内联，不引入第三方库
- 底座基于 V4 页面完整结构（保留其全部 CSS/JS/数据），叠加侧边栏
- 侧栏打开/关闭用 CSS transform + transition，JS 切换 class
- 如有歧义标记 `[AMBIGUITY]`，不自行决定

## §9 Git 规范

- commit message：`feat(prototype-B): rebuild on V4 base with sidebar, multi-turn dialog, audit preview`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
