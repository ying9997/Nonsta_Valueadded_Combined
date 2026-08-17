# KB：解禁条件深判

> 来源：flows/05 · 相对 registration-guide `guide_unban` 浅层

## 分工

| 层级 | 专家 | 覆盖 |
|------|------|------|
| 浅层 | registration-guide | 已有明确禁止标记：补资料、改属性、看待办路径 |
| 深判 | 本专家 | 无现成标记或规则未覆盖：品类/国别细则、证书是否齐备、解禁**条件是否满足** |

## 判定原则

1. 若 `profileSnapshot` / 合规摘要显示 `prohibitSource=manual` → **优先 `need_human`**，勿教客户自助解人工禁。
2. 系统规则类（缺证、缺 GPSR、禁限运命中）→ 列出 `missingDocuments` 与补齐路径；条件未满足则 `complianceVerdict=fail`。
3. 客户称「资料已齐仍禁」→ `need_human` 排查拦截明细。
4. 禁售数量在库存查询；本专家解释原因与条件，不报库存数量。

## 常见条件

- 有效期内 MSDS + UN38.3（电池/DG）
- GPSR 关联完成
- WEEE / 说明书等国别勾选项完成
- 禁限运品类本身不可解 → `fail` + 说明不可发
