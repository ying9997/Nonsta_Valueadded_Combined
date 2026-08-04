# 新建专家模板（`_template`）

- **`arithmetic-formula/`**  
  可运行的**参考专家**：四则运算求值，示范 `manifest.json`（仅业务 `inputSchema`）、`design.md`、`workflow.json`、`nodes/`、`prompts/` 及框架顶层 + `inputs` 调用约定。

**新建专家步骤**

设计阶段（场景、边界、API、`design.md`）见 [docs/how-to-design-expert.md](../../docs/how-to-design-expert.md)；实现阶段见 [docs/how-to-create-expert.md](../../docs/how-to-create-expert.md)。

1. 复制 `arithmetic-formula` 文件夹到 `experts/{领域}/{新专家id}/`（例如 `experts/last-mile/my-expert/`）。
2. 修改 `manifest.json` 的 `id`、`name`、`description`、`capabilities`、`inputSchema` / `outputSchema`。
3. 重命名或替换 `nodes/` 下文件，更新 `workflow.json` 中的 `file` 与 `inputs` / `outputs`。
4. 改写 `design.md`、`prompts/main.md`，删除与本业务无关的示例文案。

**本地试跑本参考专家**

```bash
npx ts-node -P scripts/tsconfig.json scripts/run-expert-cli.ts arithmetic-formula -- --expression "(1+2)*3" --customerIntent "验证运费分摊" --query "计算括号表达式"
```

链路含 **LLM 点评**节点：配置 `OPENAI_API_KEY` 后走真实模型；未配置时使用 Mock，仍可验证合并输出。

全局规范见仓库根目录 [`docs/design-spec.md`](../../docs/design-spec.md) 与 [`REQUIREMENTS.md`](../../REQUIREMENTS.md)（含主 Prompt 须遵守的**对客可读输出**约束，禁止向客户引用飞书/内部表为规则依据）。**可执行代码节点**（`workflow.json` 的 `file`）内禁止 `export` / `import`（含 `export {}`），见 `REQUIREMENTS.md` 第 2 节与 [`docs/how-to-create-expert.md`](../../docs/how-to-create-expert.md) 步骤 4。
