# Offline Source References

本目录用于登记无法通过统一接口获取完整语义、只能离线沉淀的 value-add 规则源。

| 文件 | 状态 | 来源 | 用途 | 维护口径 |
|---|---|---|---|---|
| `vas-atom-hardcoded-rules.md` | 已归档，待结构化 | 产品百事通 | 原子可选性产品侧参考基线，侧重用户界面效果和宽范围覆盖；后续派生为 `atom-selectability-rules` | 不能作为唯一权威；变更说明为主、定期快照为辅。部分配置值可由运维或后台配置修改，不一定需要发版。 |
| `vas-atom-disable-logic.md` | 已归档，待结构化 | 研发百事通 | 原子不可选 / 隐藏 / 置灰执行逻辑，补充具体前后端处理器与条件 | 当前代码快照的权威离线来源；后续以具体代码变更点增量维护。 |
| `atom-selectability-rules.md` | 已生成 v0.1 | 产品百事通 + 研发百事通 | 由两份离线源合并派生的结构化规则表，供 `value-add-service-config` 检索 | 后续按产品变更说明、研发代码变更点增量更新；动态配置项必须保留 `changeMode`。 |

## 确认口径

- 两份资料合并使用：产品版作为主文档结构，研发版作为执行细节和条件补充。
- 没有统一实时接口可以返回“哪些原子在什么条件下不可选”的完整语义；产品可选性或局部配置可能有接口 / 数据库来源，但原子禁用语义仍需离线沉淀。
- 规则需区分 `effectType`：`backend_is_show_false`、`frontend_hidden`、`backend_is_disable`、`frontend_disabled`、`submit_validation_error`，不能合并成一个“不可选”。
- 规则需区分 `changeMode`：`release_required`、`db_config`、`business_whitelist`、`backend_returned_config`、`code_snapshot`。
- 入库“更换商品包装”正确原子编码为 `OW01V1561`；`OSF6V1561` 是旧文档笔误，不存在该编码。
- `OW01V1558` 采用研发版完整执行条件：无 `MERCHANDISE` 类型商品、任意商品条码为空、异常来源 + 原单上架 + 商品不在原入库单中。
- 产品版未列但研发版确认存在的原子规则应纳入结构化表：`OW01V1593`、`OW01V1794`、`OW01V1736`、`OSF6V1591`、`OSF6V1681`。
