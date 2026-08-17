/**
 * 当 check-planner-output 检测到 is_bypass=true 时调用：
 * Planner 已判定上游 solutions 足以回答用户问题，无需进入 agent_loop。
 * 确定性拼装 handoff 包（不调用 LLM），completion_kind 固定为 "solutions_sufficient"。
 *
 * 入参
 * - question：用户原始问题（来自 Start 节点）
 * - solutions：上游合并的解决方案摘要（来自 Start 节点）
 * - chainContext：check-planner-output 初始化的链式上下文（含 chainId）
 * - sessionHandoff：check-planner-output 初始化的会话手交（steps 为空）
 *
 * 出参与 finalize-queue-handoff 完全对齐，下游 queue-user-facing-summary 可直接复用。
 * - handoff_log_markdown
 * - handoff_log_json
 * - truncated
 * - truncation_note
 *
 * Coze：整文件粘贴；常量前缀 SKIP_ 避免与其它节点合并冲突。
 */

const SKIP_COMPLETION_KIND = "solutions_sufficient";
/** solutions 写入 execution_log 的长度上限（字符） */
const SKIP_MAX_SOLUTIONS_CHARS = 60000;
/** 整包 Markdown 二次保险 */
const SKIP_MAX_MARKDOWN_TOTAL_CHARS = 120000;

interface SkipChainSlice {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

function skipAsTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function skipCoerceChainContext(raw: unknown): SkipChainSlice {
    const empty = (): SkipChainSlice => ({ expertId: "", resultSummary: "", chainId: "" });
    if (raw === undefined || raw === null) return empty();
    let o: Record<string, unknown> | null = null;
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return empty();
        try {
            const p = JSON.parse(s) as unknown;
            o = typeof p === "object" && p !== null && !Array.isArray(p)
                ? (p as Record<string, unknown>)
                : null;
        } catch {
            return empty();
        }
    } else if (typeof raw === "object" && !Array.isArray(raw)) {
        o = raw as Record<string, unknown>;
    }
    if (!o) return empty();
    return {
        expertId: skipAsTrimString(o.expertId ?? o.expert_id),
        resultSummary: skipAsTrimString(o.resultSummary ?? o.result_summary),
        chainId: skipAsTrimString(o.chainId ?? o.chain_id),
    };
}

function skipTruncateSolutions(s: string): { text: string; truncated: boolean; note: string } {
    if (s.length <= SKIP_MAX_SOLUTIONS_CHARS) {
        return { text: s, truncated: false, note: "" };
    }
    const dropped = s.length - SKIP_MAX_SOLUTIONS_CHARS;
    return {
        text:
            s.slice(0, SKIP_MAX_SOLUTIONS_CHARS) +
            `\n\n---\n[skip] solutions 已截断：省略末尾 ${dropped} 个字符（上限 ${SKIP_MAX_SOLUTIONS_CHARS}）。\n`,
        truncated: true,
        note: `solutions 超过 ${SKIP_MAX_SOLUTIONS_CHARS} 字符，已截断末尾 ${dropped} 字符`,
    };
}

function skipMaybeTruncateTotal(md: string): { text: string; truncated: boolean; note: string } {
    if (md.length <= SKIP_MAX_MARKDOWN_TOTAL_CHARS) {
        return { text: md, truncated: false, note: "" };
    }
    const dropped = md.length - SKIP_MAX_MARKDOWN_TOTAL_CHARS;
    return {
        text:
            md.slice(0, SKIP_MAX_MARKDOWN_TOTAL_CHARS) +
            `\n\n---\n[skip] 全文超过上限，已截断末尾 ${dropped} 字符。\n`,
        truncated: true,
        note: `handoff_log_markdown 总长度超过 ${SKIP_MAX_MARKDOWN_TOTAL_CHARS}，已二次截断`,
    };
}

async function main({
    params,
}: {
    params: {
        question?: unknown;
        solutions?: unknown;
        chainContext?: unknown;
        sessionHandoff?: unknown;
    };
}): Promise<{
    handoff_log_markdown: string;
    handoff_log_json: string;
    truncated: boolean;
    truncation_note: string;
}> {
    const question = skipAsTrimString(params.question);
    const rawSolutions = skipAsTrimString(params.solutions);
    const chain = skipCoerceChainContext(params.chainContext);

    const solutionsResult = skipTruncateSolutions(rawSolutions);
    const solutionsForLog = solutionsResult.text;

    const metaLines: string[] = [
        "## Meta",
        "",
        `- completion_kind: ${SKIP_COMPLETION_KIND}`,
        `- chainId: ${chain.chainId || "(empty)"}`,
        `- bypass_reason: Planner 判定上游 solutions 已完整回答用户问题，无需调用 expert`,
        "",
    ];

    const parts: string[] = [];
    parts.push("# Expert queue handoff\n");
    parts.push(...metaLines);

    parts.push("## Final plan\n\n");
    parts.push("```markdown\n");
    parts.push("[ ] SOLUTIONS_SUFFICIENT: 上游知识库已完整回答用户问题，无需查询系统数据");
    parts.push("\n```\n\n");

    parts.push("## Execution log\n\n");
    parts.push(`> bypass: solutions sufficient — no expert calls made\n\n`);
    parts.push(solutionsForLog || "(solutions empty)");

    let handoff_log_markdown = parts.join("");
    const totalTrunc = skipMaybeTruncateTotal(handoff_log_markdown);
    handoff_log_markdown = totalTrunc.text;

    const notes: string[] = [];
    if (solutionsResult.truncated && solutionsResult.note) notes.push(solutionsResult.note);
    if (totalTrunc.truncated && totalTrunc.note) notes.push(totalTrunc.note);
    const truncation_note = notes.join("；");

    const payload = {
        completion_kind: SKIP_COMPLETION_KIND,
        chainId: chain.chainId,
        bypass_reason: "solutions_sufficient",
        question,
        solutions_log: solutionsForLog,
        truncated: solutionsResult.truncated || totalTrunc.truncated,
        truncation_note: truncation_note || undefined,
    };

    let handoff_log_json: string;
    try {
        handoff_log_json = JSON.stringify(payload);
    } catch {
        handoff_log_json = JSON.stringify({
            completion_kind: SKIP_COMPLETION_KIND,
            chainId: chain.chainId,
            error: "handoff JSON stringify failed",
        });
    }

    return {
        handoff_log_markdown,
        handoff_log_json,
        truncated: solutionsResult.truncated || totalTrunc.truncated,
        truncation_note,
    };
}
