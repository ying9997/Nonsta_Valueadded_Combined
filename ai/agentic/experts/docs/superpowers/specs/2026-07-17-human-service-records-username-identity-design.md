# Human Service Records Username Identity Design

## 目标

人工客服记录查询只使用框架注入的 `username` 匹配飞书字段 `客户邮箱`，避免把含义不同的框架 `customerCode` 错误映射为飞书 `客户id` 后漏查记录。

## 已验证事实

- 飞书表同时存在 `客户邮箱` 与 `客户id` 字段，没有名为 `customerCode` 的字段。
- 测试账号的 `username` 能命中一条记录，但该记录的 `客户id` 与框架提供的 `customerCode` 不一致。
- 当前实现要求 `username + customerCode`，并将二者映射为 `客户邮箱 + 客户id`，因此会错误过滤该账号的记录。

## 设计

- `username` 是本专家唯一必需的框架身份字段，并映射到飞书 `客户邮箱`。
- `customerCode` 保留在框架输入和内部 identity 中，仅作为可选诊断上下文，不参与飞书过滤。
- 飞书字段 `客户id` 不再是查询必需字段，也不再读取到查询结果中。
- 缺少 `username` 时停止查询；缺少或不匹配的 `customerCode` 不阻止查询。
- 对客输出、时间筛选、关键词匹配、会话上限和错误兜底保持不变。

## 验收

- 仅传 `username` 时身份校验通过。
- 缺少 `username` 时身份校验失败。
- 飞书查询过滤器只包含 `客户邮箱 is username`，不包含 `客户id`。
- manifest、设计文档、专家文档和项目计划不再声称 `customerCode` 是该专家的查询权限条件。
- 专项回归、TypeScript 类型检查、manifest 检查和 Coze 节点检查通过。

