# Expert Coze 工作流测试全流程

> 基于 `agentic/experts/` 项目的实际实现梳理，覆盖从静态校验到线上追溯的完整测试链路。

## 总览：8 层测试体系

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer A: 静态检查（无网络）                                          │
│    npm run check:experts:manifest / check:coze-io / ...             │
├─────────────────────────────────────────────────────────────────────┤
│  Layer B: 本地运行（Mock 或 Real LLM）                               │
│    npm run dev:expert <id> -- --field value                         │
├─────────────────────────────────────────────────────────────────────┤
│  Layer C: Smoke 测试（注入 Mock JSON，断言关键输出）                   │
│    npm run smoke:<expert>                                           │
├─────────────────────────────────────────────────────────────────────┤
│  Layer D: 节点级单测（单独验证某 expert 数据处理逻辑）                  │
│    scripts/test-<expert>.ts                                         │
├─────────────────────────────────────────────────────────────────────┤
│  Layer E: 线上工作流探测（调用已发布 Coze workflow）                    │
│    npm run test:expert:online -- --fixture ...                      │
├─────────────────────────────────────────────────────────────────────┤
│  Layer F: Coze 执行追溯（拉取节点级 trace）                           │
│    npm run inspect:coze-run-history -- --url <debug_url>            │
├─────────────────────────────────────────────────────────────────────┤
│  Layer G: 回归检查（线上回归测试）                                     │
│    scripts/check-*-regressions.ts                                   │
├─────────────────────────────────────────────────────────────────────┤
│  Layer H: 注册 Dry-run（预览注册表写入，不实际执行）                    │
│    npm run sync:expert-register:dry-run                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Layer A：静态检查

**作用**：编码阶段即发现结构错误，无需网络。

| 命令 | 检查内容 |
|------|---------|
| `npm run check:experts:manifest` | 所有 manifest.json 字段合规性 |
| `npm run check:coze-io` | Coze IO schema 一致性 |
| `npm run check:coze-node-code` | 可执行节点内无 `import`/`export`（Coze FaaS 不支持） |
| `npm run check:coze-bundled-code-compile` | bundled 代码可编译 |
| `npm run check:format-output-contract` | format-output 四字段契约（structured/analysis/outputContext/enrichedContext） |
| `npm run check:llm-envelope` | LLM 输出结构 |
| `npm run check:llm-prompt-envelope` | LLM prompt 包装结构 |
| `npm run check:coze-port-wiring` | 节点端口接线一致性 |
| `npm run check:coze-node-output-types` | 输出类型注解 |
| `npm run check:coze-kb-output-types` | KB 输出类型 |
| `npm run check:coze-batch-actions` | 批处理 actions schema |
| `npm run check:value-add:contracts` | 增值 experts 合同 |
| `npm run check:inbound:no-data-regressions` | 入库无数据回归 |
| `npm run check:inbound:customer-language` | 客户语言回归 |

**源文档**：`agentic/experts/docs/how-to-create-expert.md` 步骤 9、附录 A

---

## Layer B：本地运行

**作用**：在本地跑完整 expert 流程，验证节点串联和数据流。

```bash
npm run dev:expert <expert-id> -- --<业务字段> <值> --customerIntent "说明意图"
```

**两种模式**：

| 环境变量 | 行为 |
|---------|------|
| 未设 `OPENAI_API_KEY` | LLM 节点 Mock，返回预设 `analysisResult` |
| 已设 `OPENAI_API_KEY` | 调用真实模型，读取 `prompts/main.md`，解析 JSON 输出 |

**万邑通 OpenAPI 集成**：通过 `COZE_WINIT_*` 环境变量或 `--coze-winit-customer-code` CLI flag 控制。

**实现**：`agentic/experts/scripts/run-expert-cli.ts`

**源文档**：`agentic/experts/scripts/README.md`「dev:expert」章节、`how-to-create-expert.md` 步骤 8

---

## Layer C：Smoke 测试

**作用**：注入 Mock 数据，断言关键输出字段正确，验证端到端逻辑而不依赖外部 API。

| 命令 | Expert | 断言内容 |
|------|--------|---------|
| `npm run smoke:tracking-inquiry` | tracking-inquiry | `listStatus=success`、`sopBranch`、`outputContext.expertId` |
| `npm run smoke:substitute-claim` | substitute-claim | enum labels、structured records |
| `npm run smoke:inbound-appointment-manage` | inbound-appointment-manage | KB-only 模式 和 real API 模式 |

**机制**：通过 `winitOpenapiData` 参数注入 mock JSON，模拟万邑通插件返回。

**源文档**：`agentic/experts/scripts/smoke-tracking-inquiry.ts` 等

---

## Layer D：节点级单测

**作用**：单独验证某个 expert 的数据处理、映射、剪枝逻辑，无需跑完整工作流。

| 脚本 | Expert |
|------|--------|
| `scripts/test-sku-profile.ts` | sku/profile |
| `scripts/test-sku-registration-guide.ts` | sku/registration-guide |
| `scripts/test-sku-barcode-guide.ts` | sku/barcode-guide |
| `scripts/test-sku-compliance-check.ts` | sku/compliance-check |
| `scripts/test-refund-standard.ts` | last-mile/refund-standard |
| `scripts/test-tracking-no-scan.ts` | last-mile/tracking-no-scan |
| `scripts/test-tracking-stale.ts` | last-mile/tracking-stale |
| `scripts/test-shipping-label.ts` | last-mile/shipping-label |
| `scripts/test-inbound-order-status-supplemental.ts` | inbound/inbound-order-status |
| `scripts/test-human-service-records.ts` | human-service-records |
| `scripts/test-winit-openapi-call.ts` | Winit OpenAPI 代理 |
| `scripts/test-inbound-detail-strategy.ts` | Inbound detail strategy |

**源文档**：`agentic/experts/scripts/` 目录

---

## Layer E：线上工作流探测

**作用**：对已发布到 Coze 的 expert workflow 发起真实 `POST /v1/workflow/run`，验证线上行为。

```bash
# 仅解析登记表，不实际调用（dry-resolve）
npm run test:expert:online -- --expert-id tracking-inquiry --release-id rel-experts-20260626 --dry-resolve

# 完整调用 + 断言
npm run test:expert:online -- --fixture scripts/expert-online-test/fixtures/my.local.json --expert-id tracking-inquiry
```

**工作流程**：
1. 从飞书 Bitable 专家登记表读取 `coze_workflow_id`（筛选：`expert_id` + `release_id` + `available=on`）
2. 发送 `POST /v1/workflow/run`，parameters 与 `call-expert.ts` 一致
3. 解析响应（structured / analysis / outputContext / enrichedContext）
4. 执行 fixture 中的 `expect` 断言
5. 返回 `execute_id` 和 `debug_url`（Coze Trace 页面）

**环境变量**：

| 变量 | 说明 |
|------|------|
| `EXPERT_REGISTER_RELEASE_ID` | 登记批次 ID |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 飞书应用凭证 |
| `FEISHU_BITABLE_APP_TOKEN` / `FEISHU_BITABLE_TABLE_ID` | 注册表定位 |
| `COZE_API_TOKEN` | Coze 调用令牌 |

**Fixture 格式**（模板：`scripts/expert-online-test/fixtures/example.fixture.json`）：

```json
{
  "expert_id": "your-expert-id",
  "parameters": {
    "query": "...",
    "customerIntent": "smoke",
    "customerCode": "DEMO",
    "customerName": "Demo",
    "username": "tester",
    "language": "zh",
    "inputContext": { "sourceExpertId": "", "previousOutput": {}, "chainId": "expert-online-test" },
    "inputs": {}
  },
  "expect": {
    "outputContext": { "expertId": "your-expert-id", "resultSummary": { "minLength": 1 } },
    "analysis": { "minLength": 1 }
  }
}
```

**注意**：敏感单号使用 `*.local.json`（已 gitignore），勿提交真实数据。

**源文档**：`agentic/experts/scripts/README.md`「test:expert:online」章节

---

## Layer F：Coze 执行追溯

**作用**：程序化拉取某次 workflow/run 的节点级执行 trace，用于 post-hoc 调试。

```bash
npm run inspect:coze-run-history -- --url <debug_url>
```

**工作流程**：
1. 接收 `test:expert:online` 返回的 `debug_url`
2. 调用 `GET /v1/workflows/{id}/run_histories/{executeId}`
3. 输出各节点执行状态、耗时、错误信息和调用的 expert ID

**实现**：`agentic/experts/scripts/coze-run-history-inspect.ts`、`coze-run-history-inspect-lib.ts`

**源文档**：`agentic/experts/scripts/README.md`

---

## Layer G：回归检查

**作用**：对已上线 expert 执行回归验证，确保升级或环境变更后行为一致。

| 脚本 | 覆盖 |
|------|------|
| `scripts/check-value-add-online-regressions.ts` | 增值 expert 线上回归 |
| `scripts/check-sku-profile-regressions.ts` | SKU profile 回归 |
| `scripts/check-sku-barcode-guide-regressions.ts` | SKU barcode guide 回归 |
| `scripts/check-sku-registration-guide-regressions.ts` | SKU registration guide 回归 |

**源文档**：`agentic/experts/scripts/` 目录

---

## Layer H：注册 Dry-run

**作用**：预览注册表写入内容，不实际修改飞书 Bitable，验证版本号、字段映射和 expert 数量。

```bash
npm run sync:expert-register:dry-run
```

**实现**：`agentic/experts/scripts/sync-expert-register/cli.ts`

**源文档**：`agentic/experts/docs/how-to-upgrade-expert.md` 步骤 4

---

## 标准验证序列（新 Expert 创建后的推荐顺序）

```
Step 1  npm run check:experts:manifest           ← 静态校验 manifest
Step 2  npm run dev:expert <id> -- ...            ← 本地试跑（Mock 或 Real LLM）
Step 3  npm run export:coze -- experts/... --validate  ← 导出 Coze 包 + 结构对比
Step 4  npm run smoke:<expert>                    ← 本地 smoke（如有）
Step 5  上传 .zip → Coze 导入 → 发布
Step 6  填 coze_workflow_id 到飞书注册表
Step 7  npm run test:expert:online -- --fixture ... --expert-id <id>  ← 线上探测
Step 8  打开 debug_url → Coze Trace 页面 → 查看节点级执行
Step 9  npm run inspect:coze-run-history -- --url <debug_url>  ← 程序化 trace
Step 10 npm run sync:expert-register:dry-run      ← 注册预览
```

来源：`agentic/experts/docs/how-to-create-expert.md` 步骤 8-10 + 附录 A

---

## 导出校验

```bash
# 生成 Coze 工作流包
npm run export:coze -- experts/{domain}/{expert-id}

# 与已有 draft 做结构对比
npm run export:coze -- experts/{domain}/{expert-id} --validate
```

比较生成的 YAML 与已有参考：节点数量、边、代码节点内容。

---

## 调试工具

| 工具 | 命令 | 用途 |
|------|------|------|
| 入库追踪调试 | `scripts/debug-inbound-tracking.ts` | 用特定单号调用 Coze Winit workflow |
| Trace getlist 调试 | `scripts/dev-tail-trace-getlist.ts` | 开发时 trace 调试 |
| Expert 日志收集 | `scripts/coze-expert-log-collector.ts` | 收集 Coze expert 执行日志 |

---

## 测试数据生成

`agentic/experts/docs/plan/prompts/inbound-test-data-agent-prompt.md` 是一个结构化 prompt，用于让 AI Agent 为 18 个入库 expert 生成真实测试用例数据（单号、状态码等）。使用 7 维启发式提问框架，输出格式为 Markdown 表格 + JSON 附录。

---

## 验收清单（摘自 how-to-create-expert.md 附录 A）

- [ ] 目录 `experts/{domain}/{expert-id}/` 与 `manifest.id` 一致
- [ ] `manifest.json` 的 `description` 含 **Use when**；`inputSchema` 不含框架保留键
- [ ] `design.md` 已更新
- [ ] 每个 `workflow.json` 中的 `file` 有对应 `nodes/*.ts`
- [ ] 无跨节点 `import`；可执行节点内无 `export`/`import`
- [ ] `prompts/` 与 LLM 节点一致
- [ ] `coze.config.yml` 中 `packageMainName` / slug 无非法连字符
- [ ] `endOutputs` 包含四字段（structured/analysis/outputContext/enrichedContext）
- [ ] `format-output` 根级返回四字段；`outputContext.chainId` 不为 undefined/null
- [ ] `npm run dev:expert <expert-id> -- ...` 能跑通
- [ ] `npm run export:coze -- experts/{domain}/{expert-id} --validate` 通过
- [ ] `npm run check:experts:manifest` 通过

---

## 源文档索引

| 文档 | 路径 | 作用 |
|------|------|------|
| 创建 expert 完整指南 | `agentic/experts/docs/how-to-create-expert.md` | 步骤 8-10 + 附录 A 涵盖测试 |
| 升级/发布指南 | `agentic/experts/docs/how-to-upgrade-expert.md` | dry-run、验收清单 |
| 脚本使用说明 | `agentic/experts/scripts/README.md` | dev:expert、test:expert:online 详细用法 |
| 线上测试 fixture 模板 | `agentic/experts/scripts/expert-online-test/fixtures/example.fixture.json` | 入参格式参考 |
| Coze 工作流导出说明 | `agentic/experts/COZE-WORKFLOW.md` | 导出命令与包结构 |
| 环境变量参考 | `agentic/experts/.env.example` | 所有 env var 清单 |
| 测试数据生成 prompt | `agentic/experts/docs/plan/prompts/inbound-test-data-agent-prompt.md` | 入库 expert 测试数据 |
| 设计规范 | `agentic/experts/docs/design-spec.md` | inputSchema、outputSchema、调用 JSON |
