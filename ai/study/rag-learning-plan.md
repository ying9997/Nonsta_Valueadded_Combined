# RAG 学习计划

> 背景：当前 AI 客服 Multi-Expert 系统未使用 RAG，采用的是 Context Stuffing + LLM-as-Retriever。
> 学习 RAG 的目的：理解行业通用方案，判断当前方案的天花板，掌握未来知识量增长后的演进路径。

## 当前项目知识投递方式 vs RAG

| 维度 | 本项目（Context Stuffing） | RAG |
|------|---------------------------|-----|
| 切分 | 人工/AI IDE 按业务实体切分，一个异常编码=一个 md 文件 | text splitter 自动切片（按 token 数/语义边界） |
| 索引 | 飞书多维表格存 QID→question 的扁平表 | chunk → embedding model → 向量数据库 |
| 检索 | LLM 读整张 Markdown 表格做语义判断 | 用户 query → embedding → cosine similarity → top-k |
| 生成 | 匹配到的 solution + 预注入 Text 节点知识 → LLM | retrieved chunks + query → LLM |

## 学习资源

主要参考仓库：[awesome-llm-apps](https://github.com/Shubhamsaboo/awesome-llm-apps)

该仓库 `rag_tutorials/` 目录下有 21 个 RAG 实现示例，覆盖从基础管道到 Agentic RAG 的完整谱系。

## 学习路径

### Phase 1：理解基础 RAG 管道

| 项目 | 路径 | 学什么 |
|------|------|--------|
| Basic RAG Chain | `rag_tutorials/rag_chain` | 最小实现：切片→embedding→检索→生成，理解 chunk_size、overlap、top-k 参数 |

完成标准：能说清楚 embedding、vector store、similarity search 各自干什么。

### Phase 2：对比当前系统

| 项目 | 路径 | 和本项目的对应关系 |
|------|------|-------------------|
| Corrective RAG (CRAG) | `rag_tutorials/corrective_rag` | 检索后自我评分+重试 — 类似本项目 `q_match` + `llm-judge` |
| RAG with Database Routing | `rag_tutorials/rag_database_routing` | 路由到不同数据库 — 类似本项目 QID → `sys_experts` → 不同 expert |

完成标准：写一段对比笔记，说明本项目的 LLM-as-Retriever 在哪些方面等价于 RAG 的哪个环节。

### Phase 3：Agentic RAG（最接近本项目演进方向）

| 项目 | 路径 | 为什么重要 |
|------|------|-----------|
| Agentic RAG with Reasoning | `rag_tutorials/agentic_rag_with_reasoning` | Agent 决定是否检索、检索什么 — 类似 planner→expert→judge 循环 |
| Autonomous RAG | `rag_tutorials/autonomous_rag` | PDF 检索 + web search fallback — 如果未来 QID 没命中需要兜底 |

完成标准：能画出 Agentic RAG 的决策流，并标注本项目 experts_recaller 中哪些节点对应 RAG 的哪些阶段。

### Phase 4：诊断与生产化

| 项目 | 路径 | 价值 |
|------|------|------|
| RAG Failure Diagnostics Clinic | `rag_tutorials/rag_failure_diagnostics_clinic` | RAG 失败诊断 — 如果未来上 RAG 必须知道怎么排查 |
| Hybrid Search RAG | `rag_tutorials/hybrid_search_rag` | 关键词+向量混合检索 — 实际生产中纯向量不够用 |

完成标准：能列出 RAG 常见失败模式（如 chunk 切断关键上下文、embedding 模型对领域术语不敏感）及对应解法。

## 实践作业

学完 Phase 1-2 后，做一个思想实验：

> 如果把 `value-add-service-guide/` 的 224 个 md 文件用 RAG 做，pipeline 是什么样？
> - 怎么切片？（按 frontmatter entity？按 heading？按 token 数？）
> - 用什么 embedding model？（多语言？领域微调？）
> - 向量库选什么？（本地 FAISS？云端 Pinecone？）
> - top-k 设多少？overlap 设多少？
> - 和当前 Text 节点方案比，哪些场景更好哪些更差？

## 切换到 RAG 的触发条件

当前方案在以下条件下仍然适用：
- QID 知识：~200 条
- 异常实体：~35 个
- 总知识量能装进 32k-128k 上下文窗口

需要切 RAG 的信号：
- QID 涨到 1000+ 条（Markdown 表格塞不进 LLM 窗口）
- 异常/VASC 知识涨到 500+ 实体（Text 节点装不下）
- 知识更新频率 > 每周（人工重新导入 Coze 成本不可接受）
- 需要跨 expert 共享同一知识库
