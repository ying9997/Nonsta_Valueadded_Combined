# 案例库（最小 RAG）

给场景判断用的**历史参考案例**，不是评测金标。

## 今天的范围（方案 B）

- 检索：纯 JS 内存 BM25，案例存在 JSONL 里，不引入向量库。
- 入库 `inbound-cases.jsonl` 与库内 `instock-cases.jsonl` 分文件存放。本次只重建 **库内** `instock-cases.jsonl`，另一份不改。
- 每场景最多 3 条**已审核通过**、需求描述相对清楚的单。
- 不放 `eval/`。金标 `5` 条 VASC 已排除。

## 文件

| 文件 | 说明 | 当前条数 | 覆盖场景 |
|------|------|----------|----------|
| inbound-cases.jsonl | 入库案例，一行一条 JSON | 105 | 40 |
| instock-cases.jsonl | 库内案例，一行一条 JSON | 113 | 44 |
| README.md | 本说明 |  |  |

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

```powershell
npx tsx internal-review-copilot/scripts/build-case-library.ts --category inbound --max-per-scene 3
npx tsx internal-review-copilot/scripts/build-case-library.ts --category instock --max-per-scene 3
```

不要手工把金标单写进 jsonl。`--category` 只写对应 jsonl，不会清空另一份。

## 最近一次构建（库内）

- 库内通过候选订单：839
- 排除金标：0
- 对不上场景卡：193
- 描述过短：129
- 写入案例：113 条，覆盖 44 个库内场景（场景卡 25 个，OMS 未建卡兜底 19 个）
