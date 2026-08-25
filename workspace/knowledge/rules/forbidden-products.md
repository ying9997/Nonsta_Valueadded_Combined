# Forbidden Products

本文件记录禁推、降级、转人工校准项。它不是产品圈定权威；运行时必须以中间层 `listAllVasc` 注入的 `systemScopedVascList` 为产品范围边界。

来源：

- `test_prompt_B0102E23.json.enrichedContext.forbiddenProducts`
- `一期业务系统映射关系矩阵_定稿.md` §3.3 冲突清单
- `一期业务系统映射关系矩阵_定稿.md` §5 H 类校准规则

## 运行时规则

- `forbiddenProducts` 中的产品不得推荐。
- 产品级禁推项对所有 eventCode 生效；即使某个 eventCode 的矩阵行标记该产品可用，也必须按产品级禁推排除。
- `H.block` 命中的产品不得进入 `finalRecommendable`。
- `H.downgrade` 命中时，必须降级到规则指定的非标路径或等待中间层提供替代候选。
- `H.manual` 命中时，必须 `needsHumanReview=true`。
- xlsx 备注只做校准参考，不可替代系统候选。

## 产品级全局禁推项

用户裁决：`入库商品拍照` 的 forbidden 作用域为产品级。

含义：

- `VASC202407031507376 入库商品拍照` 全局禁推，不限于 B0102E23。
- B03E03 继承该产品级禁推；即使映射矩阵 §3.2 对 B03E03 × 入库商品拍照标为可用，也不得推荐该产品。
- 拍照需求统一引导到系统候选内的替代路径；B0102E23 已验证替代路径为 `入库非标拍照或提供视频`，其他 eventCode 需以运行时 `systemScopedVascList` 为准。

| vascCode | vascName | 动作 | 原因 | 来源 | 状态 |
|----------|----------|------|------|------|------|
| VASC202407031507376 | 入库商品拍照 | block_global | xlsx【入库】异常解决方案 sheet 第 6 行客服备注：标准增值已失效，只有非标增值。拍照需求引导至“入库非标拍照或提供视频”。 | test_prompt_B0102E23.json.forbiddenProducts + 用户裁决产品级作用域 | copied_and_scoped |

## B0102E23 已验证禁推继承

| eventCode | vascCode | vascName | 作用域 | 替代方向 | 状态 |
|-----------|----------|----------|--------|----------|------|
| B0102E23 | VASC202407031507376 | 入库商品拍照 | 产品级全局禁推 | 入库非标拍照或提供视频 | copied_from_test_prompt |

## B03E03 禁推继承

| eventCode | vascCode | vascName | 作用域 | 对矩阵 §3.2 的处理 | 状态 |
|-----------|----------|----------|--------|---------------------|------|
| B03E03 | VASC202407031507376 | 入库商品拍照 | 产品级全局禁推 | 矩阵标可用但被产品级 forbidden 覆盖，最终不得推荐 | acceptance_fix_P0 |

## §3.3 冲突项

### name_mismatch

| 异常 / 产品组合 | xlsx 表述 | 预期 PMS vascName | 动作 | 原因 | 来源状态 |
|----------------|-----------|-------------------|------|------|----------|
| B05E013 × 库内商品拍照 | 库内商品拍照 | 库内商品拍照 | block | xlsx 标记可用，但 Sheet1 备注“实际不支持库内商品拍照”。 | structured_from_matrix |
| B06E1628 × 库内销毁 | 库内销毁 | 库内销毁 | block | xlsx 标记不可用，备注“不支持库内销毁异常”。 | structured_from_matrix |
| B0102E21 × 原单直接上架 | 原单直接上架 | 原单直接上架 | defer | xlsx 标记不可用，但语义对照表列为推荐项；待 PMS 抽样，暂不进推荐池。 | structured_from_matrix_pending |

### xlsx_orphan

| 项 | xlsx 表述 | 动作 | 原因 | 来源状态 |
|----|-----------|------|------|----------|
| B01E1614 包裹多条码（需客户处理） | 整行为不可用 | manual | xlsx 备注“实际未生效”。 | structured_from_matrix |
| B02E04 单品包装不符合要求 | 整行为不可用 | manual | xlsx 备注“实际未产生异常”。 | structured_from_matrix |
| B01E1387 商品已到禁售/失效时间-中转 | 整行为不可用 | manual | xlsx 备注“实际未产生异常”。 | structured_from_matrix |
| B01E1435 货品查验与注册不符 | 整行为不可用 | manual | xlsx 备注“实际未产生异常”。 | structured_from_matrix |
| B06E1370 2B箱内多单品 | 部分产品被标不可用 | block | xlsx 备注“暂未产生异常”。 | structured_from_matrix |
| B06E1371 2B箱内少单品 | 部分产品被标不可用 | block | xlsx 备注“5月之后未产生异常”。 | structured_from_matrix |
| B05E1382 库存批次号错误 | 部分产品被标可用 | manual | xlsx 备注“暂未产生异常”。 | structured_from_matrix |
| B05E1383 计划外批次 | 部分产品被标可用 | manual | xlsx 备注“24年5月之后未产生异常”。 | structured_from_matrix |
| B07E1339 自提单取消出库 | 部分产品被标可用 | manual | xlsx 备注“异常真的有效吗？2025-10-16之后无异常单”。 | structured_from_matrix |
| B0809E05 库内单品条码异常--人工不可识别 | 仅库内销毁可用 | manual | xlsx 备注“异常真的有效吗？”。 | structured_from_matrix |
| B0809E03 库内商品包装破损 | 仅库内销毁可用 | block | xlsx 备注“异常无效，仓库不登记”。 | structured_from_matrix |
| B05E012 单品外包装破损 | 部分产品被标可用 | block | xlsx 备注“异常无效，仓库不登记”。 | structured_from_matrix |

## H 规则映射到 forbidden / manual / downgrade

| 规则ID | 动作 | 进入 forbiddenProducts | 处理 |
|--------|------|------------------------|------|
| H01 | block | 是 | 排除库内商品拍照相关候选 |
| H02 | block | 是 | 排除 B06E1370 标准增值候选 |
| H03 | block | 是 | 排除 B06E1371 标准增值候选 |
| H04 | manual | 否 | `needsHumanReview=true` |
| H05 | manual | 否 | `needsHumanReview=true` |
| H06 | block | 是 | 排除 B06E1628 库内销毁 |
| H07 | manual | 否 | `needsHumanReview=true` |
| H08 | manual | 否 | `needsHumanReview=true` |
| H09 | block | 是 | 排除 B0809E03 库内销毁 |
| H10 | block | 是 | 排除 B05E012 相关候选 |
| H11 | manual | 否 | `needsHumanReview=true` |
| H12 | manual | 否 | `needsHumanReview=true` |
| H13 | manual | 否 | `needsHumanReview=true` |
| H14 | manual | 否 | `needsHumanReview=true` |
| H15 | downgrade | 否 | 入库拍照暂存降级到非标拍照或提供视频；替代产品仍需在系统候选内 |
| H16 | ask_intent | 否 | 追加必问意图 |
| H17 | block | 是 | 包装方式=客制包材或箱产品时排除库内轻加工 |
| H18 | downgrade | 否 | 库内错装拍照暂存降级到库内非标增值（特批）；替代产品仍需在系统候选内 |

## Pending

- `B0102E21 × 原单直接上架` 需要 PMS 抽样后决定是否进入推荐池。
- 全量 xlsx 备注未在本 MVP 中逐行搬运；本文件只覆盖矩阵 §3.3 与 B0102E23 已知禁推项。
