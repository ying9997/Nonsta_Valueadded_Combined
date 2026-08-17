## §0 角色与仓库

你是执行者（Codex），负责修复原型 HTML 的跨域问题。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 目标文件：`prototypes/B_侧边栏演示_原始页面版.html`

## §1 问题

当前原型用 iframe 加载 `references/线上库内增值单页面快照.html`，然后通过 `iframe.contentDocument` 访问内部 DOM 注入对话和填入表单。

但在本地 file:// 协议下，浏览器（Chrome/Edge）对 iframe 有同源策略限制：即使两个 HTML 文件都在本地，`contentDocument` 仍会抛出跨域错误。

## §2 解决方案

**不再使用 iframe**。将底座页面直接内嵌到同一个 HTML 文件中，使 AI 对话注入和表单填入都在同一 document 中操作，彻底消除跨域问题。

具体做法：
1. 读取 `prototypes/references/线上库内增值单页面快照.html` 的完整内容
2. 将其 `<body>` 内的 DOM 内容嵌入到 `B_侧边栏演示_原始页面版.html` 中（替换原来的 iframe）
3. 将底座页面的 `<style>` 标签合并进来（注意避免样式冲突，可以用一个 wrapper div 做 scope）
4. 底座页面的 `<script>` 标签也合并（放在文件末尾，在演示脚本之前）
5. 移除 iframe 相关代码，`getIframeDoc()` 改为直接返回 `document`

## §3 实现要求

### 结构

```html
<body>
  <!-- 演示控制台（fixed，z-index 最高） -->
  <div class="demo-console">...</div>

  <!-- 底座页面内容（直接内嵌，不用 iframe） -->
  <div id="stageContent" style="padding-top:44px;">
    <!-- 这里放 线上库内增值单页面快照.html 的 body 内容 -->
  </div>

  <!-- 审核模态框（fixed） -->
  <div class="modal-overlay" id="auditModal">...</div>

  <!-- 操作提示 -->
  <div class="action-toast" id="actionToast"></div>

  <!-- 底座页面的 script -->
  <!-- 演示逻辑 script -->
</body>
```

### 修改 `getIframeDoc()`

```javascript
function getIframeDoc() {
  return document;  // 不再跨 iframe，直接操作同一 document
}
```

### 样式隔离

底座页面的样式可能与演示控制台/模态框样式冲突。处理方式：
- 演示控制台和模态框的 CSS 选择器加上更高特异性（已有 `.demo-console`、`.modal-overlay` 等 class）
- 底座页面的样式直接 `<style>` 内嵌即可，因为演示组件都用了独立 class name

### 底座页面的 JS

底座页面可能有自己的 JS（如路由、组件初始化）。处理方式：
- 如果底座 JS 不影响演示功能，直接保留
- 如果底座 JS 报错（如找不到某些后端接口），用 try-catch 包裹或移除
- 关键：保留 `#aiChatbotRoot` 侧栏结构和页面表单结构，这是演示需要操作的 DOM

### 注意事项

- 底座页面文件很大（500K+ tokens），直接内嵌会让产出文件也很大，这是预期的
- 保留底座页面中所有与表单和 AI 侧栏相关的 DOM
- 可以移除底座页面中的 `<script>` 中调用后端 API 的部分（如 fetch/axios 请求），避免控制台报错
- 但不要移除影响 DOM 渲染的 JS（如组件初始化、select option 生成等）

## §4 验证

修改完成后，确保：
1. 本地 file:// 打开 `B_侧边栏演示_原始页面版.html`
2. 点击"演示：非标特批场景"→ 页面右侧 AI 侧栏出现对话气泡
3. 点击"模拟：一键填入表单"→ 表单字段被选中/填入并高亮
4. 点击"模拟：审核视角"→ 模态框正常弹出
5. 点击"重置"→ 注入的气泡被清除

## §5 约束

- **只修改** `prototypes/B_侧边栏演示_原始页面版.html`
- 不修改 `references/线上库内增值单页面快照.html`（保留作为参考源）
- 如果底座页面内嵌后文件过大导致 git push 失败，可以精简底座页面中明显不影响演示的部分（如大段注释、重复的 CSS、analytics 脚本等），但必须保留表单区域和 AI 侧栏
- 如有歧义标记 `[AMBIGUITY]`

## §6 Git 规范

- commit message：`fix(prototype-B): inline base page to eliminate iframe cross-origin issue`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
