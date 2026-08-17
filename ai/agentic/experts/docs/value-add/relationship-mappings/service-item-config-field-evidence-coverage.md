# 服务项配置字段证据覆盖

本文件是 `value-add-service-config` 输出字段证据状态和 blocked claims 的主依据。

## 覆盖口径

| 指标 | 当前口径 |
|---|---|
| 编排引用服务项 | 52 个 |
| 普通属性字段有证据 | 42 个 |
| 普通属性字段缺证据 | 10 个 |

## 证据状态

| 状态 | 含义 | 输出要求 |
|---|---|---|
| `partial_field_evidence` | 普通属性字段有部分来源，可提示已知字段或客户准备资料 | 必须声明不是完整字段校验清单 |
| `missing_field_evidence` | 当前没有普通属性字段证据 | 只能列为待确认，不能说“不需要字段” |
| `not_full_config_mapping` | 当前表不能覆盖附件、模板、上传关系 | 必须进入 `blockedClaims` |

## 来源边界

- `pms.BaseAttrRelService_findBaseAttrRelPage` 只能支撑普通属性字段。
- `wh.va.order.getVasList` 的 `vaAtomAttrs` 和 `vaAtomFiles` 只能解释已提交增值单事实。
- 附件、模板和上传要求仍需字段级来源补齐。
