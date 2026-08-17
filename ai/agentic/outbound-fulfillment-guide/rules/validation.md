# 校验规则

## 校验层次

校验按 profile 执行：

- `phase0-skeleton`：项目规则、目录、路径、命令和空库边界。
- `business-knowledge`：实体、事实、关系、适用范围和来源。
- `source-snapshot`：哈希、闭包、敏感等级和派生关系。
- `generated-view`：生成器、输入摘要和漂移检查。
- `runtime-artifact`：发布状态、来源、披露和包内路径。

Phase 0 校验通过不表示业务知识或发布包已经可用。

## 必查项

- 必需根文件和目录存在。
- `AGENTS.md` 引用的所有规则实际存在。
- 文件名、目录名、编码和换行符合约定。
- Markdown 链接和项目内来源可解析。
- 相对路径解析后仍位于项目根内。
- 不含本机绝对路径、用户目录、包外运行时依赖和敏感路径。
- JSON 可解析，Schema 标识和受控枚举有效。
- 关系起点、终点和来源存在。
- active/runtime 内容满足事实级和关系级门禁。
- 生成输出与 Canonical 输入摘要一致。

## 命令报告

机器报告至少包含：

- `$schema`
- `command`
- `tool_version`
- `validation_profile`
- `input_digest`
- `started_from_commit`
- `status`
- `errors`
- `warnings`
- `written_paths`

退出码：`0` 表示全部门禁通过，`1` 表示校验失败，`2` 表示参数或配置错误，其他非零表示工具内部失败。

## Phase 0 防误报

- 报告必须声明 `business_content_status: empty` 和 `release_ready: false`。
- 发现业务 Canonical、来源快照或业务生成页时，Phase 0 validator 必须以 `VALIDATOR_SCOPE_EXCEEDED` 失败。
- 未实现的命令必须写 `status: not_implemented` 并返回非零，不能假成功。

