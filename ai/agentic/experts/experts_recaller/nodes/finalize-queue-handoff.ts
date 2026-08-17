/**
 * 在 resolve 返回 needsFinalSummary === true（队列任务行全部 [x]）之后调用：确定性拼装 handoff 包，供下游 agent 作上文；不调用 LLM。
 *
 * 入参 params
 * - var_plan：最终 Markdown 计划
 * - accumulated_summary：循环累积日志（含 post-* 追加块）
 * - chainContext：可选；写入 meta（chainId、expertId、resultSummary）
 * - sessionHandoff：可选；在 handoff_log_json 中附加 sessionHandoff_summary（步序 expertId + result 摘要，控制体积）
 * - completion_kind：可选；默认 all_tasks_done；abort 等分支可传 aborted 复用
 * - question / solutions 由外部维护，不写入本包
 *
 * 出参
 * - handoff_log_markdown：固定章节 Markdown，下游可直接拼接为上下文
 * - handoff_log_json：同内容结构的 JSON 字符串（便于程序解析）
 * - truncated：execution_log 是否被截断
 * - truncation_note：非空则说明截断原因与规模
 *
 * Coze：整文件粘贴；内联 main；常量前缀 HANDOFF_ 避免与其它节点合并冲突。
 */

const DEFAULT_COMPLETION_KIND = "all_tasks_done";
/** execution_log 主体长度上限（字符）；超出则保留前缀并附说明 */
const HANDOFF_MAX_EXECUTION_LOG_CHARS = 60000;
/** 整包 Markdown 二次保险（meta + plan + log）；极少触发 */
const HANDOFF_MAX_MARKDOWN_TOTAL_CHARS = 120000;

interface HandoffChainSlice {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function parseChainFromObj(o: Record<string, unknown>): HandoffChainSlice {
    return {
        expertId: asTrimString(o.expertId ?? o.expert_id),
        resultSummary: asTrimString(o.resultSummary ?? o.result_summary),
        chainId: asTrimString(o.chainId ?? o.chain_id),
    };
}

const HANDOFF_SESSION_STEP_SUMMARY_MAX = 8;
const HANDOFF_RESULT_SNIP = 240;

function summarizeSessionHandoff(raw: unknown): Array<Record<string, unknown>> {
    if (raw === undefined || raw === null) return [];
    let o: Record<string, unknown> | null = null;
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return [];
        try {
            const p = JSON.parse(s) as unknown;
            o = typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
        } catch {
            return [];
        }
    } else if (typeof raw === "object" && !Array.isArray(raw)) {
        o = raw as Record<string, unknown>;
    }
    if (!o) return [];
    const steps = Array.isArray(o.steps) ? o.steps : [];
    const out: Array<Record<string, unknown>> = [];
    const start = Math.max(0, steps.length - HANDOFF_SESSION_STEP_SUMMARY_MAX);
    for (let i = start; i < steps.length; i++) {
        const st = steps[i];
        if (!st || typeof st !== "object" || Array.isArray(st)) continue;
        const row = st as Record<string, unknown>;
        const expertId = String(row.expertId ?? row.expert_id ?? "").trim();
        const at = String(row.at ?? "").trim();
        let resultSummary = "";
        const res = row.result;
        if (res && typeof res === "object" && !Array.isArray(res)) {
            const rr = res as Record<string, unknown>;
            const a = rr.analysis;
            if (typeof a === "string" && a.trim()) {
                resultSummary =
                    a.length > HANDOFF_RESULT_SNIP ? `${a.slice(0, HANDOFF_RESULT_SNIP)}…` : a;
            }
        }
        out.push({
            expertId,
            at,
            resultSummary,
        });
    }
    return out;
}

function coerceChainContext(raw: unknown): HandoffChainSlice {
    const empty = (): HandoffChainSlice => ({ expertId: "", resultSummary: "", chainId: "" });
    if (raw === undefined || raw === null) return empty();
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return empty();
        try {
            const p = JSON.parse(s) as unknown;
            if (typeof p === "object" && p !== null && !Array.isArray(p)) {
                return parseChainFromObj(p as Record<string, unknown>);
            }
        } catch {
            return empty();
        }
        return empty();
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return parseChainFromObj(raw as Record<string, unknown>);
    }
    return empty();
}

function truncateExecutionLog(log: string): { text: string; truncated: boolean; note: string } {
    const t = log;
    if (t.length <= HANDOFF_MAX_EXECUTION_LOG_CHARS) {
        return { text: t, truncated: false, note: "" };
    }
    const dropped = t.length - HANDOFF_MAX_EXECUTION_LOG_CHARS;
    const text =
        t.slice(0, HANDOFF_MAX_EXECUTION_LOG_CHARS) +
        `\n\n---\n[handoff] execution_log 已截断：省略末尾 ${dropped} 个字符（上限 ${HANDOFF_MAX_EXECUTION_LOG_CHARS}）。\n`;
    return {
        text,
        truncated: true,
        note: `execution_log 超过 ${HANDOFF_MAX_EXECUTION_LOG_CHARS} 字符，已截断末尾 ${dropped} 字符`,
    };
}

function maybeTruncateTotalMarkdown(md: string): { text: string; truncated: boolean; note: string } {
    if (md.length <= HANDOFF_MAX_MARKDOWN_TOTAL_CHARS) {
        return { text: md, truncated: false, note: "" };
    }
    const dropped = md.length - HANDOFF_MAX_MARKDOWN_TOTAL_CHARS;
    return {
        text:
            md.slice(0, HANDOFF_MAX_MARKDOWN_TOTAL_CHARS) +
            `\n\n---\n[handoff] 全文超过上限，已截断末尾 ${dropped} 字符。\n`,
        truncated: true,
        note: `handoff_log_markdown 总长度超过 ${HANDOFF_MAX_MARKDOWN_TOTAL_CHARS}，已二次截断`,
    };
}

async function main({
    params,
}: {
    params: {
        var_plan?: unknown;
        accumulated_summary?: unknown;
        chainContext?: unknown;
        sessionHandoff?: unknown;
        completion_kind?: unknown;
    };
}): Promise<{
    handoff_log_markdown: string;
    handoff_log_json: string;
    truncated: boolean;
    truncation_note: string;
}> {
    const finalPlan = asTrimString(params.var_plan);
    const rawLog = asTrimString(params.accumulated_summary);
    const completionKindRaw = asTrimString(params.completion_kind);
    const completionKind = completionKindRaw || DEFAULT_COMPLETION_KIND;
    const chain = coerceChainContext(params.chainContext);
    const sessionHandoff_summary = summarizeSessionHandoff(params.sessionHandoff);

    const execResult = truncateExecutionLog(rawLog);
    const executionLogForOutputs = execResult.text;

    const metaLines: string[] = [
        "## Meta",
        "",
        `- completion_kind: ${completionKind}`,
        `- chainId: ${chain.chainId || "(empty)"}`,
        `- last_chain_expertId: ${chain.expertId || "(empty)"}`,
    ];
    if (chain.resultSummary) {
        metaLines.push(`- last_chain_resultSummary: ${chain.resultSummary.replace(/\n/g, " ").slice(0, 500)}${chain.resultSummary.length > 500 ? "…" : ""}`);
    }
    metaLines.push("");

    const parts: string[] = [];
    parts.push("# Expert queue handoff\n");
    parts.push(...metaLines);

    parts.push("## Final plan\n\n");
    parts.push("```markdown\n");
    parts.push(finalPlan || "(empty)");
    parts.push("\n```\n\n");

    parts.push("## Execution log\n\n");
    parts.push(executionLogForOutputs);

    let handoff_log_markdown = parts.join("");
    let totalTrunc = maybeTruncateTotalMarkdown(handoff_log_markdown);
    handoff_log_markdown = totalTrunc.text;

    const notes: string[] = [];
    if (execResult.truncated && execResult.note) notes.push(execResult.note);
    if (totalTrunc.truncated && totalTrunc.note) notes.push(totalTrunc.note);
    const truncation_note = notes.join("；");

    const payload = {
        completion_kind: completionKind,
        chainId: chain.chainId,
        last_chain_expertId: chain.expertId,
        last_chain_resultSummary: chain.resultSummary,
        sessionHandoff_summary,
        final_plan: finalPlan,
        execution_log: executionLogForOutputs,
        truncated: execResult.truncated || totalTrunc.truncated,
        truncation_note: truncation_note || undefined,
    };

    let handoff_log_json: string;
    try {
        handoff_log_json = JSON.stringify(payload);
    } catch {
        handoff_log_json = JSON.stringify({
            completion_kind: completionKind,
            chainId: chain.chainId,
            error: "handoff JSON stringify failed",
        });
    }

    return {
        handoff_log_markdown,
        handoff_log_json,
        truncated: execResult.truncated || totalTrunc.truncated,
        truncation_note,
    };
}
