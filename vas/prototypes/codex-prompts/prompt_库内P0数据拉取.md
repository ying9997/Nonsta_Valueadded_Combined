## §0 角色与仓库

你是执行者（Codex），负责从系统中提取库内增值的 P0 基础数据。不做方案决策，遇到歧义标记 [AMBIGUITY] 并停下。

- 仓库：https://github.com/ying9997/Vas-Nonstandard-Guide
- 分支：main
- 产出文件：`references/库内增值服务原子清单.md` 和 `references/库内增值服务原子清单.json`

## §1 任务

提取库内增值服务的完整原子清单，并按标准/免审/特批进行分类。

## §2 数据来源

### 来源 1：审核后台 SOP 下拉框（已在仓库中）

文件：`prototypes/增值单审核页面（待回填）.html`

该文件第 1467 行附近有一个 `<select name=sceneOverviewCode>` 下拉框，其中所有以 `【库内】` 开头的 option 就是库内非标增值的场景概述（即非标原子）。

**提取规则**：
- 从 HTML 中解析所有 `<option>` 标签
- 筛选文本以 `【库内】` 开头的
- 提取 `value`（场景概述编码）和文本（场景概述名称）

### 来源 2：系统 API 查询（如果有权限）

尝试查询以下数据：
- 表 `bi_dw.dwd_ord_oms_vas_order_f`，字段 `winit_product_group`（产品线）筛选库内相关
- 字段 `winit_product_name`（增值产品名称）、`service_name`（增值服务名称）
- 区分 `service_type` = 'standard'（标准）vs 'abnormal'（非标）

如果无权限访问数据库，则仅使用来源 1。

### 来源 3：线上库内增值单页面

文件：`prototypes/新增库内增值单-AI侧栏.html` 或 `prototypes/references/线上库内增值单页面快照.html`

从页面 DOM 中提取：
- 增值产品名称的 `<select>` 所有 option（筛选库内相关的）
- 增值服务的 `<select>` 所有 option

## §3 产出格式

### references/库内增值服务原子清单.md

```markdown
# 库内增值服务原子清单

> 提取日期：2026-08-04
> 数据来源：审核后台 SOP 下拉框 + 线上库内增值单页面
> 状态：待业务方确认分类

## 统计

- 总计：XX 个原子
- 标准库内增值（免审）：XX 个
- 非标库内增值（特批）：XX 个
- 待确认：XX 个

## 分类清单

### 标准库内增值（免审）

| # | 编码 | 名称 | 分类依据 |
|---|------|------|---------|
| 1 | ... | ... | ... |

### 非标库内增值（特批）

| # | 编码 | 名称 | 分类依据 |
|---|------|------|---------|
| 1 | ... | ... | ... |

### 待确认

| # | 编码 | 名称 | 需确认原因 |
|---|------|------|-----------|
| 1 | ... | ... | ... |
```

### references/库内增值服务原子清单.json

```json
{
  "extractDate": "2026-08-04",
  "source": ["审核后台SOP下拉框", "线上库内增值单页面"],
  "summary": {
    "total": 0,
    "standard": 0,
    "nonstandard": 0,
    "unconfirmed": 0
  },
  "atoms": [
    {
      "code": "编码",
      "name": "名称",
      "category": "standard | nonstandard | unconfirmed",
      "classificationBasis": "分类依据说明"
    }
  ]
}
```

## §4 分类规则

根据以下逻辑判断分类（如果无法确定，标记为 unconfirmed）：

| 判断依据 | 分类结果 |
|---------|---------|
| 在线上库内增值单页面的标准增值产品选项中出现 | standard（标准/免审） |
| 仅在审核后台场景概述中出现，且名称含"非标""特批""其他服务需求" | nonstandard（非标/特批） |
| 名称含关键词：盘点、拍照、辨识、检测、测量 | 可能 standard（待确认） |
| 名称含关键词：客制、指定、特殊、代采购 | 可能 nonstandard（待确认） |
| 无法判断 | unconfirmed |

**重要**：分类结果是初步判定，最终需要业务方确认。所有不确定的都放 unconfirmed，不要强行分类。

## §5 执行步骤

1. 读取 `prototypes/增值单审核页面（待回填）.html`，提取所有 `【库内】` 开头的 option
2. 读取 `prototypes/references/线上库内增值单页面快照.html`，尝试提取增值产品和增值服务的 select option
3. 合并去重
4. 按 §4 规则初步分类
5. 产出 .md 和 .json 两个文件
6. commit 并 push

## §6 约束

- 只产出 `references/库内增值服务原子清单.md` 和 `references/库内增值服务原子清单.json`
- 不修改任何已有文件
- 分类不确定时标记 `unconfirmed`，不自行决定
- 如遇数据矛盾标记 `[AMBIGUITY]`

## §7 Git 规范

- commit message：`feat(references): extract 库内 VAS atom inventory from system snapshots`
- push 到 main 分支
- 如果 push 失败，直接输出两个文件的完整内容
