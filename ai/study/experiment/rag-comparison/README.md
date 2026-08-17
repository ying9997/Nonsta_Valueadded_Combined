# RAG vs Context Stuffing 对比实验

本实验用于对比当前 AI 智能客服知识注入方式和最小 RAG 管道的差异。

当前线上方案不是 RAG，而是 **Context Stuffing**：开发阶段把知识预写入 Coze 工作流 Text 节点，运行时由 Code 节点按条件裁剪，再通过模板变量注入 LLM prompt。这个方式的优势是关键上下文可被强制放进 prompt，例如异常到 VASC 产品映射表；风险是 token 成本随知识量增长，且维护粒度较粗。

本实验会读取 `../../../agentic/value-add-service-guide/` 下的真实 Markdown 知识文件，解析 YAML frontmatter，分别用三种策略切片：

- `by_file`：每个文件一个 chunk，最接近当前按实体塞上下文的做法。
- `by_heading`：按 `##` 二级标题切分，保留文件内语义段落。
- `by_token`：固定 512 token、64 token 重叠，模拟标准 RAG 切片。

然后脚本会在本地 ChromaDB 中为三种切片策略分别建 collection，使用 OpenAI embedding 模型对真实客户问题做 top-k 检索，并输出 RAG 与 Context Stuffing 的并排对比报告。

## 前置条件

1. Python 3.10+。
2. 已在本目录安装依赖：

```bash
pip install -r requirements.txt
```

3. 如需运行 embedding 和检索，复制 `.env.example` 为 `.env`，并配置可用的 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `EMBEDDING_MODEL`。

```bash
copy .env.example .env
```

如果没有配置 API Key，脚本会自动降级：只展示知识加载、切片统计、B01E1315 示例切片和 Context Stuffing token 统计，不做向量化和检索。

## 运行方式

在本目录执行：

```bash
python rag_experiment.py
```

输出会同时写到：

- 终端
- `output/comparison_report.md`

向量库会写到：

- `output/chroma_db/`

## 关注点

这不是为了证明 RAG 一定优于 Context Stuffing，而是为了看清楚：

- 哪种切片策略最适合这个结构化 Markdown 知识库。
- RAG 是否会漏掉映射表、流程表等必须同时存在的上下文。
- Context Stuffing 用 token 换确定性，RAG 用检索降低 token 成本，两者的边界在哪里。
- 当知识库继续扩展时，什么时候必须从固定上下文注入切换到检索增强。
