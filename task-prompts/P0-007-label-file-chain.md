# P0-007 Prompt：梳理标签文件下载/上传链路

请执行根目录 `TASK.md` 中的 `P0-007`：

`梳理标签文件链路：确认标签文件从哪个 OMS/TOM/附件接口下载、是否需要转存/上传、SOP/卡片里如何引用（注意要区分客户上传的文件，要在文件名加个前缀“AI上传-”）`

## 任务边界

1. 本会话先做链路梳理和最小验证；未确认接口前不要大改。
2. 区分客户原始上传附件和 AI/系统生成后上传的标签文件。
3. AI 上传文件必须设计命名前缀：`AI上传-`。
4. 不部署 40，不写 OMS，不改 Query / recaller。

## 必读文件/证据

- `TASK.md`
- `internal-review-copilot/lib/oms-adapter.ts`
- `internal-review-copilot/lib/check-scene-completeness.ts`
- `internal-review-copilot/lib/generate-text.ts`
- `internal-review-copilot/lib/auto-oms-write.ts`
- `internal-review-copilot/scripts/poll-and-assess.ts`
- `internal-review-copilot/scripts/listen-card-actions.ts`
- 现有 `_runs` 中含“标签文件”的样本报告或数据

## Agent 自验证

1. 梳理当前标签文件来源：客户上传、OMS/TOM 附件、系统生成标签、AI 转存上传。
2. 找到当前代码中附件读取、附件状态、文件名传入 SOP 的位置。
3. 明确“系统生成后下载上传”的标签文件，是否已经有接口/脚本支持。
4. 若改代码，必须有最小本机测试覆盖：
   - 客户上传文件不加 `AI上传-`。
   - AI 上传/转存文件加 `AI上传-`。
   - SOP/卡片能区分两类附件。
5. 运行相关测试；若接口只能只读验证，则输出请求/响应字段证据，不得实际上传到生产。
6. 运行 `git diff -- <相关文件>`，说明范围。

## 人工验收

产出链路报告，至少包含：

1. 标签文件来源表。
2. 下载接口/上传接口候选。
3. 文件命名规则。
4. 样本单号。
5. 哪些步骤已验证，哪些需要 40 或测试环境授权。

## 40 部署准入

不得部署 40，不得向生产上传测试文件。若需要 40 验证，必须先给出 dry-run 方案、回滚/清理方案，并等待用户明确授权。

## TASK.md 回写

结束前在 `P0-007` 后补：执行会话、链路报告路径、验证方式、是否等待接口/40 授权。

