## §0 角色与仓库

你是执行者（Codex），负责从仓库中提取库内增值的 P0 基础数据。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：
  - `references/库内增值_系统事实_VASC清单.md`
  - `references/库内增值_系统事实_VASC清单.json`
  - `references/库内增值_知识库_SOP模板场景清单.md`

## §1 任务

提取库内增值的两类互补数据：
1. **系统事实**：线上库内增值单页面中客户可选的增值产品 + 增值服务（VASC list）
2. **知识库场景**：非标增值单审核 SOP 知识库中已有模板的库内场景

## §2 两类数据的关系说明

```
系统事实（VASC list）= 页面上客户可以选的东西
  → AI 推荐后通过 Tool Calling 帮客户"选中"

知识库模板 = 审核人员总结的 SOP 写作经验
  → AI 生成 SOP 时"参考"这些模板输出

两者互补：
  系统事实告诉 AI "推荐选哪个增值产品/增值服务"
  知识库告诉 AI "选了之后，需求描述/SOP 怎么写"
```

**注意**：审核后台的 `sceneOverviewCode` 下拉框是第三种数据 — 它是审核端的场景分类（用于审核回填），不等于客户端可选的增值服务原子。本 prompt 不提取它。

## §3 来源 1：系统事实（从线上页面提取）

### 文件
`prototypes/references/线上库内增值单页面快照.html`
或 `prototypes/新增库内增值单-AI侧栏.html`

### 提取目标
从页面 DOM 中找到：
1. **增值产品名称**的 `<select>` 或类似组件（可能是 chosen/ant-select），提取所有 option（value + 显示文本）
2. **增值服务**的 `<select>` 或类似组件，提取所有 option

### 查找策略
页面是生产环境导出的完整 HTML，DOM 复杂。按以下策略查找：
- 搜索包含"增值产品"或"产品名称"的 label/text 附近的 select 元素
- 搜索包含"增值服务"或"服务名称"的 label/text 附近的 select 元素
- 如果是 chosen 组件，找 `<select>` 标签内的 `<option>` 列表
- 如果是 ant-select，找对应的 data source 或 dropdown options

### 分类规则
提取出的选项按以下规则初步分类：
- 名称含"标准"或出现在标准增值区域的 → `standard`（标准/免审）
- 名称含"非标""特批""其他服务需求" → `nonstandard`（非标/特批）
- 无法判断 → `unconfirmed`

## §4 来源 2：知识库 SOP 模板场景（从知识库文档提取）

### 文件
知识库文档不在本仓库中，但仓库外部路径为：
`D:\DA\AI_EXPERT\增值配置AI化\增值单ai指引助手\docs\非标增值单审核SOP\非标增值单审核SOP知识库-新版.md`

如果 Codex 无法访问该路径，使用以下已知信息：

#### 库内 Top 场景（来自知识库 §3.2 及后续章节）

已知库内有模板的场景包括（约 90 个场景，以下为 Top 场景）：
- 审计盘点（57条历史）
- 货权转移
- 良品/不良品检测
- 代采购包材
- 拆分SKU
- 商品尺重测量辨识
- 指定库位开箱拍照
- 商品组合
- 库间调拨
- 更换客制包装
- 商品包装加固
- 指定单品销毁
- 特殊商品销毁（DG、带电、药物）

### 提取目标
如果可以访问知识库文件：
1. 提取所有 `### X.X 【库内】XXX` 格式的章节标题
2. 提取每个场景的：场景名称、历史条数、是否有标准 SOP 模板
3. 如果有 SOP 模板内容，记录模板的字段结构

## §5 产出格式

### references/库内增值_系统事实_VASC清单.md

```markdown
# 库内增值 — 系统事实 VASC 清单

> 提取日期：2026-08-04
> 数据来源：线上库内增值单页面（seller.winit.com.cn）
> 性质：系统真实配置，客户在页面上可选的增值产品和增值服务

## 增值产品列表

| # | 产品编码/value | 产品名称 | 分类 |
|---|--------------|---------|------|
| 1 | ... | ... | standard/nonstandard/unconfirmed |

## 增值服务列表

| # | 服务编码/value | 服务名称 | 所属产品 | 分类 |
|---|--------------|---------|---------|------|
| 1 | ... | ... | ... | standard/nonstandard/unconfirmed |

## 统计
- 增值产品数：XX
- 增值服务数：XX
- 标准(免审)：XX
- 非标(特批)：XX
- 待确认：XX
```

### references/库内增值_系统事实_VASC清单.json

```json
{
  "extractDate": "2026-08-04",
  "source": "线上库内增值单页面快照",
  "dataType": "system_fact",
  "products": [
    { "code": "", "name": "", "category": "standard|nonstandard|unconfirmed" }
  ],
  "services": [
    { "code": "", "name": "", "parentProduct": "", "category": "standard|nonstandard|unconfirmed" }
  ]
}
```

### references/库内增值_知识库_SOP模板场景清单.md

```markdown
# 库内增值 — 知识库 SOP 模板场景清单

> 提取日期：2026-08-04
> 数据来源：非标增值单审核SOP知识库-新版
> 性质：知识库（尚未入系统），LLM 生成 SOP 时参考

## 说明

这些场景是审核人员基于历史经验总结的 SOP 模板。
当客户需求匹配到某个场景时，AI 可以参考对应模板生成 SOP。
这些模板目前不在系统中，是对系统事实的补充。

## 场景列表

| # | 场景名称 | 历史条数 | 有标准模板 | 模板字段 |
|---|---------|---------|-----------|---------|
| 1 | 审计盘点 | 57 | ✅ | 盘点范围/时间/方式/监督方式/... |
| 2 | 货权转移 | ? | ? | ? |
| ... |

## 与系统事实的对应关系

| 知识库场景 | 对应的系统增值服务（如有） | 备注 |
|-----------|------------------------|------|
| 审计盘点 | [待确认] | 可能对应"库内其他服务需求" |
| ... |
```

## §6 执行步骤

1. 读取 `prototypes/references/线上库内增值单页面快照.html`（或 `prototypes/新增库内增值单-AI侧栏.html`）
2. 搜索并提取增值产品和增值服务的 select options
3. 初步分类（standard/nonstandard/unconfirmed）
4. 如果可以访问知识库文件，提取库内场景列表
5. 如果无法访问，使用 §4 中已知的 Top 场景列表
6. 产出 3 个文件
7. commit 并 push

## §7 约束

- 产出 3 个文件到 `references/` 目录
- 不修改任何已有文件
- 系统事实和知识库分开存放，不混为一谈
- 分类不确定时标记 `unconfirmed`
- 如遇歧义标记 `[AMBIGUITY]`

## §8 Git 规范

- commit message：`feat(references): extract 库内 VAS system facts + knowledge base scenes`
- push 到 main 分支
- 如果 push 失败，直接输出文件完整内容
