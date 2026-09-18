# 第 0 步测试问题

目的：问题要能走进 `value-add-product-recommendation` 这条专家。**不要求推荐内容正确**，只要专家被召回，结束节点里能吐出标识。

先用下面第 1 条。若 Query 没有召回这个专家，再试第 2、第 3 条。

## 1. 主测（先发这条）

```
我有一批包裹需要换标签上架，应该选哪个增值产品？
```

为什么用它：话里同时有「换标签 / 上架 / 选哪个增值产品」，和专家登记说明里的 Use when（客户问该选哪个增值产品 / VASC）对得上。

## 2. 备选（更直白）

```
我想下一个非标增值单，帮我看下有什么推荐的增值产品？
```

## 3. 贴近 qa 库的说法

qa 库里有「入库换标签 / 无法扫描入库」这类题（例如「如何处理入库中的标签问题？海外仓是否可以帮忙换标签」）。第 0 步可以改成下面这句，更容易命中增值推荐：

```
入仓货物标签扫不了，海外仓能不能帮我换标签？应该选哪个增值产品？
```

## 怎么判断专家被召回了

在 **Query staging 副本** 点「试运行」，展开节点：

1. `post_get_solution` 的 `expert_ids` 里出现 `value-add-product-recommendation`
2. `experts_recaller_v2_staging_D` 跑起来了（本张 `staging_F_1` 画布真正接线的是 D，不是画布上另外两个没连线的 A / F）
3. 专家工作流 `value_add_product_recommendation_...` 的 **结束** 节点有输出

## 出口拆包（F_1 加完 extract_sidecar 之后）

同一条问句，在 **Query F_1 试运行**再看：

1. `extract_sidecar.has_sidecar` 为真
2. `extract_sidecar.reply_clean` 没有 `SIDECAR`
3. `extract_sidecar.sidecar` 能 parse，且带 `selectOption`
4. A1 输出没有 JSON / 没有 `<!--SIDECAR`

若 D 的 `reply_to_user` 里已经没有标记：出口是空的，不要改共享 recaller，先只确认出口接线。

## 不要用的问法

- 纯打招呼（「你好」）——不会进专家
- 只问已提交增值单进度——会进状态专家，不是推荐专家
- 把整段 JSON / 标识当用户输入发——第 0 步测的是 **专家输出** 能不能带出去，不是测用户输入
