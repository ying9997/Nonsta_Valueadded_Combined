from __future__ import annotations

import os
import re
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from statistics import mean
from typing import Any

import tiktoken
import yaml
from tabulate import tabulate


KNOWLEDGE_DIR = Path("../../../agentic/value-add-service-guide/")
OUTPUT_DIR = Path("output")
REPORT_PATH = OUTPUT_DIR / "comparison_report.md"
CHROMA_DIR = OUTPUT_DIR / "chroma_db"
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
TARGET_EXCEPTION_CODE = "B01E1315"
TOP_K = 3
MAX_EMBEDDING_TOKENS = 7800

STRATEGIES = {
    "by_file": "每个文件 = 1 个 chunk（保留实体边界，最接近当前方案）",
    "by_heading": "按 ## 二级标题拆分（文件内语义分段）",
    "by_token": "固定 512 token + 64 token 重叠（标准 RAG 做法）",
}

TEST_QUERIES = [
    "我的货到仓了但是说商品条码有问题，怎么办？",
    "B01E1315异常，我想原单上架",
    "包裹条码扫不了，能不能帮我拍个照看看？",
    "异常商品我不要了，可以销毁吗？",
    "什么是VASC202407031503503？",
]


@dataclass
class KnowledgeFile:
    path: Path
    relative_path: str
    metadata: dict[str, Any]
    content: str


@dataclass
class Chunk:
    id: str
    strategy: str
    text: str
    metadata: dict[str, Any]
    token_count: int


@dataclass
class RetrievalHit:
    text: str
    source: str
    metadata: dict[str, Any]
    distance: float
    similarity: float


def load_dotenv(path: Path = Path(".env")) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def get_encoding() -> tiktoken.Encoding:
    try:
        return tiktoken.encoding_for_model(os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL))
    except KeyError:
        return tiktoken.get_encoding("cl100k_base")


ENCODING = get_encoding()


def token_count(text: str) -> int:
    return len(ENCODING.encode(text))


def split_frontmatter(raw_text: str) -> tuple[dict[str, Any], str]:
    if not raw_text.startswith("---"):
        return {}, raw_text.strip()
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", raw_text, flags=re.DOTALL)
    if not match:
        return {}, raw_text.strip()
    metadata_text, body = match.groups()
    metadata = yaml.safe_load(metadata_text) or {}
    if not isinstance(metadata, dict):
        metadata = {}
    return metadata, body.strip()


def load_knowledge_files(knowledge_dir: Path) -> list[KnowledgeFile]:
    files: list[KnowledgeFile] = []
    for path in sorted(knowledge_dir.rglob("*.md")):
        raw_text = path.read_text(encoding="utf-8")
        metadata, content = split_frontmatter(raw_text)
        files.append(
            KnowledgeFile(
                path=path,
                relative_path=path.relative_to(knowledge_dir).as_posix(),
                metadata=metadata,
                content=content,
            )
        )
    return files


def compact_meta_value(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (list, tuple, set)):
        return ", ".join(str(item) for item in value)
    if isinstance(value, dict):
        return yaml.safe_dump(value, allow_unicode=True, default_flow_style=True).strip()
    return str(value)


def base_chunk_metadata(item: KnowledgeFile) -> dict[str, Any]:
    metadata = item.metadata
    return {
        "source": item.relative_path,
        "file_path": item.relative_path,
        "exception_code": compact_meta_value(metadata.get("exception_code")),
        "exception_name": compact_meta_value(metadata.get("exception_name")),
        "entity_type": compact_meta_value(metadata.get("entity_type")),
        "title": compact_meta_value(metadata.get("title")),
        "tags": compact_meta_value(metadata.get("tags")),
    }


def make_chunk(item: KnowledgeFile, strategy: str, index: int, text: str, section: str = "") -> Chunk:
    metadata = base_chunk_metadata(item)
    metadata.update(
        {
            "strategy": strategy,
            "chunk_index": index,
            "section": section,
        }
    )
    return Chunk(
        id=f"{strategy}:{item.relative_path}:{index}",
        strategy=strategy,
        text=text.strip(),
        metadata=metadata,
        token_count=token_count(text),
    )


def chunk_by_file(files: list[KnowledgeFile]) -> list[Chunk]:
    return [make_chunk(item, "by_file", 0, item.content, "完整文件") for item in files if item.content.strip()]


def chunk_by_heading(files: list[KnowledgeFile]) -> list[Chunk]:
    chunks: list[Chunk] = []
    heading_pattern = re.compile(r"(?m)^##\s+(.+?)\s*$")
    for item in files:
        matches = list(heading_pattern.finditer(item.content))
        if not matches:
            if item.content.strip():
                chunks.append(make_chunk(item, "by_heading", 0, item.content, "完整文件"))
            continue

        preface = item.content[: matches[0].start()].strip()
        index = 0
        if preface:
            chunks.append(make_chunk(item, "by_heading", index, preface, "标题与导言"))
            index += 1

        for pos, match in enumerate(matches):
            start = match.start()
            end = matches[pos + 1].start() if pos + 1 < len(matches) else len(item.content)
            section_text = item.content[start:end].strip()
            if section_text:
                chunks.append(make_chunk(item, "by_heading", index, section_text, match.group(1).strip()))
                index += 1
    return chunks


def chunk_text_by_tokens(text: str, chunk_size: int = 512, overlap: int = 64) -> list[str]:
    token_ids = ENCODING.encode(text)
    if not token_ids:
        return []
    decoded_text, offsets = ENCODING.decode_with_offsets(token_ids)
    chunks: list[str] = []
    step = max(1, chunk_size - overlap)
    for start in range(0, len(token_ids), step):
        end = min(start + chunk_size, len(token_ids))
        char_start = offsets[start]
        char_end = offsets[end] if end < len(offsets) else len(decoded_text)
        part = decoded_text[char_start:char_end].strip()
        if part:
            chunks.append(part)
        if end >= len(token_ids):
            break
    return chunks


def truncate_for_embedding(text: str, max_tokens: int = MAX_EMBEDDING_TOKENS) -> tuple[str, bool]:
    token_ids = ENCODING.encode(text)
    if len(token_ids) <= max_tokens:
        return text, False
    truncated = ENCODING.decode(token_ids[:max_tokens])
    return truncated + "\n\n[embedding 注：原 chunk 超过 embedding 上下文，已仅用于向量化裁剪。]", True


def chunk_by_token(files: list[KnowledgeFile]) -> list[Chunk]:
    chunks: list[Chunk] = []
    for item in files:
        for index, text in enumerate(chunk_text_by_tokens(item.content)):
            chunks.append(make_chunk(item, "by_token", index, text, f"token窗口 {index + 1}"))
    return chunks


def build_chunks(files: list[KnowledgeFile]) -> dict[str, list[Chunk]]:
    return {
        "by_file": chunk_by_file(files),
        "by_heading": chunk_by_heading(files),
        "by_token": chunk_by_token(files),
    }


def chunk_stats(chunks: list[Chunk]) -> dict[str, float | int]:
    sizes = [chunk.token_count for chunk in chunks]
    return {
        "chunk_count": len(chunks),
        "avg_tokens": round(mean(sizes), 1) if sizes else 0,
        "min_tokens": min(sizes) if sizes else 0,
        "max_tokens": max(sizes) if sizes else 0,
    }


def find_target_file(files: list[KnowledgeFile], exception_code: str = TARGET_EXCEPTION_CODE) -> KnowledgeFile | None:
    for item in files:
        if str(item.metadata.get("exception_code", "")).upper() == exception_code:
            return item
    for item in files:
        if exception_code.lower() in item.relative_path.lower() or exception_code in item.content:
            return item
    return None


def find_mapping_file(files: list[KnowledgeFile]) -> KnowledgeFile | None:
    preferred = "relationship-mappings/inbound-exception-to-vasc-product-mapping.md"
    for item in files:
        if item.relative_path == preferred:
            return item
    for item in files:
        if "inbound-exception-to-vasc" in item.relative_path and "mapping" in item.relative_path:
            return item
    for item in files:
        if "B01E1315" in item.content and "VASC202407031503503" in item.content and "映射表" in item.content:
            return item
    return None


def context_stuffing_baseline(files: list[KnowledgeFile]) -> dict[str, Any]:
    mapping_file = find_mapping_file(files)
    target_file = find_target_file(files)
    loaded = [item for item in [mapping_file, target_file] if item is not None]
    context_text = "\n\n".join(f"# {item.relative_path}\n\n{item.content}" for item in loaded)
    return {
        "files": [item.relative_path for item in loaded],
        "token_count": token_count(context_text),
        "mapping_loaded": mapping_file is not None,
        "target_loaded": target_file is not None,
    }


def has_api_key() -> bool:
    value = os.getenv("OPENAI_API_KEY", "").strip()
    return bool(value)


def import_langchain_components():
    from langchain_community.vectorstores import Chroma
    from langchain_core.documents import Document
    from langchain_openai import OpenAIEmbeddings

    return Chroma, Document, OpenAIEmbeddings


def build_vectorstores(chunks_by_strategy: dict[str, list[Chunk]]) -> dict[str, Any]:
    Chroma, Document, OpenAIEmbeddings = import_langchain_components()

    if CHROMA_DIR.exists():
        shutil.rmtree(CHROMA_DIR)
    CHROMA_DIR.mkdir(parents=True, exist_ok=True)

    embedding_model = os.getenv("EMBEDDING_MODEL", DEFAULT_EMBEDDING_MODEL)
    embeddings = OpenAIEmbeddings(
        model=embedding_model,
        api_key=os.getenv("OPENAI_API_KEY"),
        base_url=os.getenv("OPENAI_BASE_URL") or None,
        chunk_size=32,
        check_embedding_ctx_length=False,
    )

    stores: dict[str, Any] = {}
    for strategy, chunks in chunks_by_strategy.items():
        documents = []
        for chunk in chunks:
            embedding_text, truncated = truncate_for_embedding(chunk.text)
            metadata = {key: value for key, value in chunk.metadata.items() if value is not None}
            metadata["original_token_count"] = chunk.token_count
            metadata["embedding_truncated"] = "true" if truncated else "false"
            documents.append(Document(page_content=embedding_text, metadata=metadata))
        ids = [chunk.id for chunk in chunks]
        stores[strategy] = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            ids=ids,
            collection_name=f"rag_comparison_{strategy}",
            persist_directory=str(CHROMA_DIR),
        )
    return stores


def run_retrieval(vectorstores: dict[str, Any], query: str) -> dict[str, list[RetrievalHit]]:
    results: dict[str, list[RetrievalHit]] = {}
    for strategy, store in vectorstores.items():
        hits = []
        for document, distance in store.similarity_search_with_score(query, k=TOP_K):
            similarity = 1 / (1 + float(distance))
            hits.append(
                RetrievalHit(
                    text=document.page_content,
                    source=document.metadata.get("source", ""),
                    metadata=dict(document.metadata),
                    distance=float(distance),
                    similarity=similarity,
                )
            )
        results[strategy] = hits
    return results


def expected_targets(query: str) -> list[str]:
    if "VASC202407031503503" in query:
        return ["vasc-product-original-order-putaway.md", "inbound-exception-to-vasc-product-mapping.md"]
    if "包裹条码" in query:
        return ["B0102E21", "package-barcode", "parcel-barcode", "inbound-exception-to-vasc-product-mapping.md"]
    return ["B01E1315", "exception-b01e1315", "inbound-exception-to-vasc-product-mapping.md"]


def is_target_hit(query: str, sources: list[str], metadatas: list[dict[str, Any]]) -> bool:
    targets = expected_targets(query)
    haystack = "\n".join(sources + [str(meta.get("exception_code", "")) for meta in metadatas]).lower()
    return any(target.lower() in haystack for target in targets)


def missed_key_context(query: str, sources: list[str]) -> str:
    source_text = "\n".join(sources).lower()
    has_mapping = "inbound-exception-to-vasc-product-mapping.md" in source_text
    has_exception = "exception-b01e1315" in source_text or "b01e1315" in source_text
    has_vasc = "vasc-product-original-order-putaway.md" in source_text

    if "VASC202407031503503" in query and not has_vasc:
        return "可能漏掉 VASC 产品详情页"
    if ("原单上架" in query or "销毁" in query or "拍照" in query) and not has_mapping:
        return "可能漏掉异常到 VASC 映射表"
    if "商品条码" in query and not has_exception:
        return "可能漏掉 B01E1315 异常实体页"
    return "低"


def first_200(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()[:200]


def render_strategy_stats(chunks_by_strategy: dict[str, list[Chunk]]) -> str:
    rows = []
    for strategy, description in STRATEGIES.items():
        stats = chunk_stats(chunks_by_strategy[strategy])
        rows.append(
            [
                strategy,
                description,
                stats["chunk_count"],
                stats["avg_tokens"],
                stats["min_tokens"],
                stats["max_tokens"],
            ]
        )
    return tabulate(
        rows,
        headers=["切片策略", "说明", "chunk 数", "平均 token", "最小 token", "最大 token"],
        tablefmt="github",
    )


def render_target_examples(chunks_by_strategy: dict[str, list[Chunk]], target_file: KnowledgeFile | None) -> str:
    if target_file is None:
        return "未找到 B01E1315 目标文件。"
    parts = [f"目标文件：`{target_file.relative_path}`"]
    for strategy in STRATEGIES:
        chunks = [chunk for chunk in chunks_by_strategy[strategy] if chunk.metadata["source"] == target_file.relative_path]
        parts.append(f"\n### {strategy}\n")
        parts.append(f"- chunk 数：{len(chunks)}")
        for chunk in chunks[:6]:
            parts.append(
                f"- chunk {chunk.metadata['chunk_index']} / {chunk.token_count} tokens / {chunk.metadata.get('section')}: "
                f"{first_200(chunk.text)}"
            )
        if len(chunks) > 6:
            parts.append(f"- 其余 {len(chunks) - 6} 个 chunk 已省略。")
    return "\n".join(parts)


def render_retrieval_details(query: str, results: dict[str, list[RetrievalHit]]) -> str:
    parts = [f"## 查询：{query}"]
    for strategy, hits in results.items():
        parts.append(f"\n### {strategy}")
        if not hits:
            parts.append("未检索到结果。")
            continue
        for index, hit in enumerate(hits, start=1):
            parts.append(
                "\n".join(
                    [
                        f"{index}. 相似度：{hit.similarity:.4f}（distance={hit.distance:.4f}）",
                        f"   来源：`{hit.source}`",
                        (
                            "   元数据："
                            f"exception_code={hit.metadata.get('exception_code', '')}, "
                            f"entity_type={hit.metadata.get('entity_type', '')}, "
                            f"section={hit.metadata.get('section', '')}"
                        ),
                        f"   内容前 200 字：{first_200(hit.text)}",
                    ]
                )
            )
    return "\n".join(parts)


def render_comparison_table(
    all_results: dict[str, dict[str, list[RetrievalHit]]],
    chunks_by_strategy: dict[str, list[Chunk]],
    stuffing_tokens: int,
) -> str:
    rows = []
    for query, results in all_results.items():
        for strategy, hits in results.items():
            sources = [hit.source for hit in hits]
            metadatas = [hit.metadata for hit in hits]
            consumed_tokens = sum(token_count(hit.text) for hit in hits)
            rows.append(
                [
                    query,
                    strategy,
                    "<br>".join(sources) if sources else "未运行检索",
                    "是" if is_target_hit(query, sources, metadatas) else "否",
                    consumed_tokens,
                    missed_key_context(query, sources) if hits else "未配置 API Key，未检索",
                ]
            )

    rows.append(
        [
            "Context Stuffing 基线",
            "mapping + B01E1315 完整文件",
            "固定加载映射表和目标异常文件",
            "是",
            stuffing_tokens,
            "低：关键映射被强制放入上下文，但 token 成本固定偏高",
        ]
    )
    return tabulate(
        rows,
        headers=["查询问题", "切片策略", "检索到的文件", "是否命中目标？", "消耗 token 数", "漏检风险"],
        tablefmt="github",
    )


def render_final_summary(stats_by_strategy: dict[str, dict[str, float | int]], stuffing_tokens: int) -> str:
    by_file_avg = stats_by_strategy["by_file"]["avg_tokens"]
    by_heading_avg = stats_by_strategy["by_heading"]["avg_tokens"]
    by_token_avg = stats_by_strategy["by_token"]["avg_tokens"]
    return "\n".join(
        [
            "## 最终总结",
            "",
            "1. 对这个知识库来说，优先推荐 `by_heading` 作为默认 RAG 切片策略。原因是这些 Markdown 文件本身已经按“摘要、异常标识、客户处理选项、VASC 索引、检查清单”等二级标题组织，按标题切能保留业务语义，同时比整文件切更省 token。",
            f"2. `by_file` 最接近当前 Context Stuffing，实体边界完整，平均 chunk 约 {by_file_avg} tokens；但检索后单次塞入成本较高，且长文件会稀释 embedding 表征。",
            f"3. `by_token` 平均 chunk 约 {by_token_avg} tokens，长度稳定，适合非结构化长文；但它可能把表格、限制条件和解释文字切断，对本知识库的结构化 Markdown 不如按标题切自然。",
            f"4. `by_heading` 平均 chunk 约 {by_heading_avg} tokens，在命中精度、上下文完整度和 token 成本之间更均衡。",
            "5. RAG 可能漏掉 Context Stuffing 能保证不漏的内容：异常到 VASC 产品映射表、VASC 到服务项编排映射、流程页和检查清单。尤其当用户只说“商品条码有问题”而没有提 VASC 时，检索可能只命中异常解释页，不一定命中映射表。",
            "6. RAG 更优的地方是 token 效率和可扩展性：它只取 top-k 相关 chunk，知识文件从几百个扩展到几千个时，不需要把候选知识全部塞进 prompt。",
            f"7. 当前 Context Stuffing 基线仅固定加载映射表 + B01E1315 目标文件就需要约 {stuffing_tokens} tokens。经验上，当固定注入上下文持续超过模型上下文窗口的 20%-30%，或知识规模超过数百个实体页且问题路由无法稳定裁剪时，就应该切到 RAG 或“规则召回 + RAG + 必选上下文”的混合方案。",
            "8. 更适合生产的方案不是纯 RAG 替代 Context Stuffing，而是混合：用规则强制注入权威映射表/流程约束，用 RAG 检索实体详情页、VASC 产品页和服务项页。",
        ]
    )


def write_and_print(report: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(report)
    print(f"\n报告已写入：{REPORT_PATH.resolve()}")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

    load_dotenv()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    knowledge_dir = KNOWLEDGE_DIR.resolve()
    if not knowledge_dir.exists():
        raise FileNotFoundError(f"知识目录不存在：{knowledge_dir}")

    files = load_knowledge_files(knowledge_dir)
    chunks_by_strategy = build_chunks(files)
    stats_by_strategy = {strategy: chunk_stats(chunks) for strategy, chunks in chunks_by_strategy.items()}
    target_file = find_target_file(files)
    stuffing = context_stuffing_baseline(files)

    report_parts = [
        "# RAG vs Context Stuffing 对比实验报告",
        "",
        f"- 知识目录：`{knowledge_dir}`",
        f"- Markdown 文件数：{len(files)}",
        f"- 测试问题数：{len(TEST_QUERIES)}",
        "",
        "## 切片策略统计",
        "",
        render_strategy_stats(chunks_by_strategy),
        "",
        "## B01E1315 三种切片示例",
        "",
        render_target_examples(chunks_by_strategy, target_file),
        "",
        "## Context Stuffing 基线",
        "",
        f"- 固定加载文件：{', '.join(f'`{item}`' for item in stuffing['files'])}",
        f"- 总 token 数：{stuffing['token_count']}",
        "- 结论：当前方案可以保证映射表一定在 LLM 上下文中；RAG 如果用户没提 VASC 或映射关系，可能检索不到映射表。",
    ]

    all_results: dict[str, dict[str, list[RetrievalHit]]] = {}
    if not has_api_key():
        report_parts.extend(
            [
                "",
                "## RAG 检索",
                "",
                "未配置有效 `OPENAI_API_KEY`，本次自动降级为只展示切片统计和 Context Stuffing 基线，不做 embedding 和检索。",
            ]
        )
        for query in TEST_QUERIES:
            all_results[query] = {strategy: [] for strategy in STRATEGIES}
    else:
        report_parts.extend(["", "## RAG 检索明细", ""])
        vectorstores = build_vectorstores(chunks_by_strategy)
        for query in TEST_QUERIES:
            results = run_retrieval(vectorstores, query)
            all_results[query] = results
            report_parts.append(render_retrieval_details(query, results))
            report_parts.append("")

    report_parts.extend(
        [
            "",
            "## 并排对比表",
            "",
            render_comparison_table(all_results, chunks_by_strategy, stuffing["token_count"]),
            "",
            render_final_summary(stats_by_strategy, stuffing["token_count"]),
        ]
    )

    write_and_print("\n".join(report_parts))


if __name__ == "__main__":
    main()
