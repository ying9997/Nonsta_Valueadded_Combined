# A2UI 命令数组生成说明（给 AI）

> 本文件由 `pnpm a2ui:catalog` 从前端内建 catalog（唯一真源）自动生成，请勿手改。
> catalog 变更后需重新运行该脚本并同步本说明到后端 / Coze 工作流 prompt。

## 目标

你（AI）需产出 `renderA2UI` 命令携带的 `commands`——一个 **A2UI v0.9 命令数组**（`XAgentCommand_v0_9[]`）。
前端 `A2UICard` 用 `@ant-design/x-card` 的 `XCard.Box` / `XCard.Card` 渲染它，并用本 catalog 校验。

绑定的 `catalogId`：`ai-chatbot-builtin`

## A2UI v0.9 命令数组规则（必须遵守）

1. **每条命令都必须含 `version: 'v0.9'`**。
2. 命令类型：
   - `createSurface`：新建一个 Surface（界面），须带 `surfaceId` 并绑定 `catalogId: 'ai-chatbot-builtin'`。
   - `updateComponents`：描述**结构**——**扁平邻接表**，`components` 为**数组**，元素形如
     `{ id, component, child?, children?, ...props }`；`component` 为**字符串**（如 'Text' / 'Button' / 'Card'）；
     子组件**仅以 id 字符串引用**（`children` 为 id 数组，`child` 为单个 id），不内嵌对象。
   - `updateDataModel`：描述**数据**——形如 `{ surfaceId, path, value }`，按 JSON Pointer 路径（如 `/keyword`）写值。
   - `deleteSurface`：删除某个 Surface。
3. **每个 Surface 有且仅有一个 `id: 'root'` 的根组件**，其余组件由 root 经 `children`/`child` 逐层引用。
4. **结构与数据分离**：组件树用 `updateComponents`，初始/更新数据用 `updateDataModel`，二者分开发。
5. **文本组件**用 `Text` + `text` 字段（字面量 `text: '你好'`，或数据绑定 `text: { path: '/xxx' }`）；
   **`children`/`child` 只能放子节点 id，不能放文本**。**Button / Tag / Checkbox 等自带文字的组件，直接用其 `text` 字段**（如 `{ component: 'Button', text: '提交' }`），**不要再用 Text 子节点包一层**。
6. **`value: { path }` + `dataPath` 双向绑定**：表单类组件（如 Input / Select）用 `value: { path: '/xxx' }`
   显示当前值；**要让用户输入/选择写回，必须再加 `dataPath: 'xxx'`——不带前导斜杠的键名**（对应 value.path `/xxx`）。
   ⚠️ dataPath 若以 `/` 开头会被当作数据绑定解析而失效，必须去掉前导斜杠。仅写 `value` 而缺 `dataPath` 会导致输入无法回写。初始值用 `updateDataModel` 设置。
7. **action 标准格式**：交互组件用 `action: { event: { name, context } }`，`name` 引用下方 functions
   中的 action（`readPage` / `operatePage`）。
8. **流式追加**：流式场景**向数组追加**命令，而不是替换整个数组。
9. **多 Surface / 多界面**：需要多个界面时，在**同一数组**里发**多条 `createSurface`**，各用**不同的 `surfaceId`**；
   前端会为每个 `surfaceId` 自动渲染一张卡片。

## 可用组件（catalog components）

- **Text**
  - `text`（string） —— 文本内容（字面量，或 { path } 数据绑定）
  - `strong`（boolean） —— 是否加粗
  - `type`（string） —— 文本语义类型
- **Button**
  - `text`（string） —— 按钮文字（推荐；字面量或 { path } 绑定）
  - `child`（string） —— 可选：复杂内容时用 child 指向子节点 id（如图标+文字）；简单文字请直接用 text
  - `type`（string） —— 按钮类型
  - `danger`（boolean） —— 危险按钮样式
  - `disabled`（boolean） —— 是否禁用
  - `block`（boolean） —— 是否为块级按钮
  - `action`（object） —— 点击触发的 action，标准格式 { event: { name, context } }，name 引用 functions 中的 readPage / operatePage
- **Card**
  - `title`（string） —— 卡片标题
  - `children`（array） —— 子组件 id 引用数组（扁平邻接表，子组件仅以 id 字符串引用）
- **Row**
  - `gutter`（number） —— 栅格间距
  - `children`（array） —— 子组件 id 引用数组（通常为 Col）
- **Col**
  - `span`（number） —— 栅格占据的列数（1-24）
  - `children`（array） —— 子组件 id 引用数组
- **Input**
  - `value`（object） —— JSON Pointer 数据绑定（用于显示当前值），形如 { path: "/xxx" }。要支持用户输入回写，须同时提供 dataPath（同一路径）。
  - `dataPath`（string） —— 用户输入的回写键名（不带前导斜杠，如 "inputText"，对应 value.path "/inputText"）。缺省则输入无法写回 dataModel。注意：不要以 "/" 开头，否则会被当作数据绑定解析而失效。
  - `placeholder`（string） —— 占位提示
  - `disabled`（boolean） —— 是否禁用
  - `allowClear`（boolean） —— 是否可清除
- **Select**
  - `value`（object） —— JSON Pointer 数据绑定（用于显示当前值），形如 { path: "/xxx" }。要支持选择回写，须同时提供 dataPath（同一路径）。
  - `dataPath`（string） —— 选择变更的回写键名（不带前导斜杠，如 "province"，对应 value.path "/province"）。缺省则选择无法写回 dataModel。注意：不要以 "/" 开头，否则会被当作数据绑定解析而失效。
  - `placeholder`（string） —— 占位提示
  - `disabled`（boolean） —— 是否禁用
  - `options`（array） —— 选项列表，元素形如 { label, value }
- **Divider**
  - `text`（string） —— 分割线中间的文字（可选）
  - `type`（string） —— 方向，默认 horizontal
  - `dashed`（boolean） —— 是否虚线
  - `orientation`（string） —— 文字位置
- **Title**
  - `text`（string） —— 标题文本（字面量或 { path } 数据绑定）
  - `level`（number） —— 标题级别 1-5，默认 1
- **Space**
  - `direction`（string） —— 排列方向，默认 horizontal
  - `size`（string） —— 间距大小
  - `wrap`（boolean） —— 是否自动换行（horizontal 时）
  - `children`（array） —— 子组件 id 引用数组
- **Tag**
  - `text`（string） —— 标签文字
  - `color`（string） —— 颜色，预设如 success/processing/error/warning/default，或色值如 #f50
  - `bordered`（boolean） —— 是否有边框，默认 true
- **Alert**
  - `message`（string） —— 提示内容（字面量或 { path } 绑定）
  - `description`（string） —— 辅助描述文字（可选）
  - `type`（string） —— 提示类型
  - `showIcon`（boolean） —— 是否显示图标
  - `banner`（boolean） —— 是否为顶部通栏样式
- **Statistic**
  - `title`（string） —— 统计标题
  - `value`（string） —— 数值（字面量或 { path } 绑定）。注意：此为展示值，非表单绑定。
  - `precision`（number） —— 小数位数
  - `prefix`（string） —— 前缀（如 ￥）
  - `suffix`（string） —— 后缀（如 %）
- **Image**
  - `src`（string） —— 图片地址（字面量或 { path } 绑定）
  - `alt`（string） —— 替代文本
  - `width`（number） —— 宽度（px）
  - `height`（number） —— 高度（px）
  - `preview`（boolean） —— 是否可点击预览，默认 true
- **Tooltip**
  - `title`（string） —— 提示文字
  - `placement`（string） —— 弹出位置，如 top / bottom / left / right
  - `child`（string） —— 被包裹的子节点 id（单个）
- **Popconfirm**
  - `title`（string） —— 确认框标题
  - `description`（string） —— 确认框描述（可选）
  - `okText`（string） —— 确认按钮文字
  - `cancelText`（string） —— 取消按钮文字
  - `child`（string） —— 触发气泡的子节点 id（通常为 Button）
  - `action`（object） —— 确认后触发的 action，标准格式 { event: { name, context } }
- **Modal**
  - `title`（string） —— 对话框标题
  - `open`（object） —— 是否显示（布尔，建议用 { path } 绑定到 dataModel 控制显隐）
  - `footer`（object） —— 底部内容，传 null 可隐藏默认按钮
  - `children`（array） —— 对话框内容的子组件 id 引用数组
- **Descriptions**
  - `title`（string） —— 列表标题
  - `column`（number） —— 一行显示的项数
  - `bordered`（boolean） —— 是否带边框
  - `items`（array） —— 描述项数组，元素形如 { key, label, children }（children 为该项的值文本）
- **Table**
  - `columns`（array） —— 列定义数组，元素形如 { title, dataIndex, key }
  - `dataSource`（array） —— 数据行数组（字面量或 { path } 绑定），每行对象的键对应 columns 的 dataIndex
  - `size`（string） —— 表格尺寸
  - `bordered`（boolean） —— 是否带边框
- **Tabs**
  - `items`（array） —— 标签页数组，元素形如 { key, label, children }。children 为该页内容文本（复杂内容建议用其它容器组件承载）。
  - `type`（string） —— 页签样式
- **Dropdown**
  - `menu`（object） —— 菜单配置，形如 { items: [{ key, label }] }
  - `placement`（string） —— 弹出位置，如 bottomLeft / bottomRight
  - `child`（string） —— 触发下拉的子节点 id（通常为 Button）
- **Switch**
  - `checked`（object） —— 开关状态数据绑定，形如 { path: "/xxx" }（布尔）
  - `dataPath`（string） —— 回写键名（不带前导斜杠，如 "enabled"，对应 checked.path "/enabled"）。
  - `disabled`（boolean） —— 是否禁用
- **Checkbox**
  - `text`（string） —— 复选框右侧文字
  - `checked`（object） —— 勾选状态数据绑定，形如 { path: "/xxx" }（布尔）
  - `dataPath`（string） —— 回写键名（不带前导斜杠，如 "agree"，对应 checked.path "/agree"）。
  - `disabled`（boolean） —— 是否禁用
- **Radio**
  - `value`（object） —— 当前选中值数据绑定，形如 { path: "/xxx" }
  - `dataPath`（string） —— 回写键名（不带前导斜杠，如 "gender"，对应 value.path "/gender"）。
  - `options`（array） —— 选项数组，元素形如 { label, value }
  - `optionType`（string） —— 选项样式
  - `disabled`（boolean） —— 是否禁用
- **DatePicker**
  - `dataPath`（string） —— 回写键名（不带前导斜杠，如 "date"）。选择后写入格式化日期字符串。
  - `placeholder`（string） —— 占位提示
  - `format`（string） —— 日期格式，如 YYYY-MM-DD
  - `picker`（string） —— 选择粒度
  - `disabled`（boolean） —— 是否禁用
- **Form**
  - `layout`（string） —— 表单布局，默认 vertical
  - `children`（array） —— 子组件 id 引用数组。注意：A2UI 表单数据绑定由各输入组件的 value/dataPath 承担，Form 仅作布局。

## 可引用的 actions（catalog functions）

交互组件（通常是 Button）用 `action: { event: { name, context } }` 触发，`name` 取以下之一：

- **readPage**：读取当前宿主页面的脱水 DOM（Dehydrated_DOM），成功后直接经 workflow 上报后端（不经 toolCalled 载荷）。
  - `reason`（string）—— 触发读取的原因（可选，用于日志 / 调试）
- **operatePage**：对宿主页面执行操作（薄直通 page-agent 原生方法）。通过交互组件的 action.event.context 传入下列入参（context 内容由 AI 按用户意图与当前页面动态生成）。支持单操作（method+args）或批量（actions 数组，按顺序执行，每步前自动刷新元素索引）。敏感操作可 requireConfirmation 先弹确认卡（批量时作用于整批）。
  - `method`（string，可选值：clickElement / inputText / selectOption / scroll / scrollHorizontally）—— 单操作模式的 page-agent 方法名（executeJavascript 禁用；批量模式改用 actions）。各方法及其 args：
- clickElement: args=[index:number] 点击该编号元素（按钮/链接/复选框）。
- inputText: args=[index:number, text:string] 向该编号输入框填文本。
- selectOption: args=[index:number, optionText:string] 按选项可见文本选中下拉项。
- scroll: args=[{ down:boolean, numPages:number, pixels?:number, index?:number }] 垂直滚动。
- scrollHorizontally: args=[{ right:boolean, pixels:number, index?:number }] 水平滚动。
  - `args`（array）—— 单操作模式的参数数组，与所选 method 一一对应，如 [5] / [3,"张三"] / [7,"广东省"] / [{ down:true, numPages:1 }]。
  - `actions`（array）—— 批量模式：操作列表，按顺序依次执行；每项为 { method, args }（含义同上）。提供 actions 时优先于 method。适合“连续填多个字段后点提交”等多步场景。
  - `requireConfirmation`（boolean）—— 是否需要用户确认后再执行（敏感操作，批量时作用于整批）。
  - `confirmationText`（string）—— 确认卡文案。

> `operatePage` 的 `context` 形如 `{ method, args, requireConfirmation?, confirmationText? }`（单操作）
> 或 `{ actions: [{ method, args }, ...], requireConfirmation?, confirmationText? }`（批量，按顺序执行）。
> `method`/`args` 取上面各方法的契约；`executeJavascript` 禁用。标记 `requireConfirmation: true` 会先弹确认卡。

## Few-shot 示例（含多 Surface）

下面是一个合法的 `commands` 数组示例：一个表单 Surface（`form`，含输入框 + “读取页面”按钮）和一个操作 Surface（`ops`，含“点击元素”按钮，需确认）：

```json
[
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "form",
      "catalogId": "ai-chatbot-builtin"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "form",
      "components": [
        {
          "id": "root",
          "component": "Card",
          "title": "筛选条件",
          "children": [
            "keywordInput",
            "submitBtn"
          ]
        },
        {
          "id": "keywordInput",
          "component": "Input",
          "placeholder": "请输入关键词",
          "value": {
            "path": "/keyword"
          },
          "dataPath": "keyword"
        },
        {
          "id": "submitBtn",
          "component": "Button",
          "type": "primary",
          "text": "读取当前页面",
          "action": {
            "event": {
              "name": "readPage",
              "context": {
                "reason": "用户点击读取"
              }
            }
          }
        }
      ]
    }
  },
  {
    "version": "v0.9",
    "updateDataModel": {
      "surfaceId": "form",
      "path": "/keyword",
      "value": ""
    }
  },
  {
    "version": "v0.9",
    "createSurface": {
      "surfaceId": "ops",
      "catalogId": "ai-chatbot-builtin"
    }
  },
  {
    "version": "v0.9",
    "updateComponents": {
      "surfaceId": "ops",
      "components": [
        {
          "id": "root",
          "component": "Card",
          "title": "页面操作",
          "children": [
            "tip",
            "clickBtn"
          ]
        },
        {
          "id": "tip",
          "component": "Text",
          "text": "点击下方按钮执行页面操作"
        },
        {
          "id": "clickBtn",
          "component": "Button",
          "text": "点击第 0 个元素",
          "action": {
            "event": {
              "name": "operatePage",
              "context": {
                "method": "clickElement",
                "args": [
                  0
                ],
                "requireConfirmation": true
              }
            }
          }
        }
      ]
    }
  }
]
```
