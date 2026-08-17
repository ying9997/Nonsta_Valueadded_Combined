# Design Reading Notes

状态：已根据 Q1-Q6 归档包整理阅读定位。

## 归档记录

### Q1-Q2 阅读定位

- 标题：预约送仓操作指引。
- 设计定位：直发产品预约送仓的操作 SOP 分发器 + 预约单/违规费只读解读器。
- 边界：仅提供指引，不代客创建或取消预约单，不代客下载 PDF。
- 业务背景：判断是否要预约 -> 创建预约 -> 获取预约码 -> 司机凭码送仓。
- 示例调用标题可帮助把中文场景和 intent 枚举对应起来。

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q1-q2`

### Q3-Q4 阅读定位

- 最小入参表、参数提示、`inputs` 业务字段表、示例调用用于回答用户输入。
- 数据拉取与兜底、OpenAPI 预约链、`routePath=kb_only / api_chain`、边界分工用于回答系统已知事实。
- 需要区分 API 事实和 KB 规则知识。
- 需要注意顶层 `query` 与 `inputs.intent=query` 不是同一层级概念。

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q3-q4`

### Q5-Q6 阅读定位

- 调用说明的适用场景和 intent 表用于抽取可处理范围。
- 设计定位的边界分工用于抽取不能处理范围。
- 数据拉取与兜底、OpenAPI 预约链用于抽取 API 使用判断。
- `routePath=kb_only / api_chain` 是主路由判断。

来源：`current-session-sync.md` / `ARCHIVE_PACKET 2026-08-09 step2-q5-q6`
