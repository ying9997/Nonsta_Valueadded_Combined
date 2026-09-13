# 案例库（最小 RAG）

给场景判断用的**历史参考案例**，不是评测金标。

## 今天的范围（方案 B）

- 检索：纯 JS 内存 BM25，案例存在 JSONL 里，不引入向量库。
- 只填 **入库** `inbound-cases.jsonl`；`instock-cases.jsonl` 为空壳（暂不填库内）。
- 每场景最多 3 条**已审核通过**、需求描述相对清楚的单。
- 不放 `eval/`。金标 `5` 条 VASC 已排除。

## 文件

| 文件 | 说明 |
|------|------|
| inbound-cases.jsonl | 入库案例，一行一条 JSON |
| instock-cases.jsonl | 库内占位（空） |
| README.md | 本说明 |

## 字段

`caseId`（VASC）、`sceneKey` / `sceneName`、`customerIntent`（需求背景+需求描述）、异常名称/对象（能从原文抽出才填）、附件摘要/模板类型/hints、SOP 前两步、`auditResult=approved`。

附件 hints 只看**上传了哪种模板**，不解析 Excel 正文。

## 脱敏

- 保留 VASC / EB / WI / SKU
- 客户名 → `[客户]`
- 删除销售/客服姓名

## 和金标隔离

构建时读取 `eval/golden/t14-golden.jsonl`，重叠单号不入库。本次排除：VASC000000311652、VASC000000315774、VASC000000298617、VASC000000305805、VASC000000326061。

## 更新方式

缓存更新后重跑：

```powershell
npx tsx internal-review-copilot/scripts/build-case-library.ts --max-per-scene 3
```

不要手工把金标单写进 jsonl。库内要填时再开一轮授权。

## 最近一次构建

- 入库通过候选订单：659
- 排除金标：5
- 对不上场景卡：18
- 描述过短：16
- 写入案例：105 条，覆盖 40 个入库场景
