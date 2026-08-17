/**
 * Replanner 产出新计划后：用其全文替换 var_plan、追加 accumulated_summary、刷新 chainContext 供下一轮 resolve 使用。
 *
 * 与 post-expert-output 对齐的出参：var_plan、accumulated_summary、chainContext、plan_update_ok、plan_update_error。
 * 差异：不勾选任务行，而是整体应用 Markdown 计划；chainContext.expertId 置空，resultSummary 承载「重规划摘要」。
 *
 * 入参 params
 * - replanner_output：Replanner LLM 输出，JSON 字符串或对象，需含 plan；或直接传 Markdown 计划字符串
 * - var_plan：可选；当 replanner 解析失败时回退为当前全文（便于编排不丢状态）
 * - accumulated_summary：当前累积日志
 * - chainContext：可选；保留 chainId，覆盖 expertId/resultSummary
 * - sessionHandoff：可选；与 post-expert-output 同形，本节点透传并同步 chainId（可选后续追加 replan 元 step）
 * - replan_reason / planner_brief：可选；来自 llm-judge，写入日志与 resultSummary
 *
 * Coze：整文件粘贴；内联 main，避免与其它节点全局类型冲突。
 */

interface ChainContextPayload {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function replanStripOuterMdFence(s: string): string {
    const t = s.trim();
    if (!t.startsWith("```")) return t;
    let body = t.replace(/^```[a-zA-Z0-9]*\s*\r?\n?/, "");
    const end = body.lastIndexOf("```");
    if (end !== -1) body = body.slice(0, end);
    return body.trim();
}

const REPLAN_PLAN_UNWRAP_MAX = 8;

function replanUnwrapPlannerPlanMarkdown(plan: string, depth: number): string {
    if (depth > REPLAN_PLAN_UNWRAP_MAX || plan === undefined || plan === null) return "";
    let s = String(plan).trim();
    if (!s) return "";
    s = replanStripOuterMdFence(s).trim();
    if (!s) return "";
    if (s.startsWith("{")) {
        try {
            const o = JSON.parse(s) as Record<string, unknown>;
            if (typeof o.plan === "string") {
                const inner = o.plan.trim();
                if (inner) return replanUnwrapPlannerPlanMarkdown(inner, depth + 1);
            }
        } catch {
            /* keep s */
        }
    }
    return s;
}

/** 与 check-planner-output / resolve-next-queue-job 的 extractPlan + unwrap 行为一致 */
function extractPlanFromReplannerOutput(raw: unknown): string {
    let base = "";
    if (raw === undefined || raw === null) base = "";
    else if (typeof raw === "string") {
        const s = raw.trim();
        if (s.startsWith("{")) {
            try {
                const o = JSON.parse(s) as Record<string, unknown>;
                if (typeof o.plan === "string") base = o.plan;
                else base = raw;
            } catch {
                base = raw;
            }
        } else base = raw;
    } else if (typeof raw === "object" && raw !== null && "plan" in raw) {
        const p = (raw as Record<string, unknown>).plan;
        base = typeof p === "string" ? p : "";
    } else base = String(raw);
    return replanUnwrapPlannerPlanMarkdown(base, 0);
}

function parseChainFromObj(o: Record<string, unknown>): ChainContextPayload {
    return {
        expertId: asTrimString(o.expertId ?? o.expert_id),
        resultSummary: asTrimString(o.resultSummary ?? o.result_summary),
        chainId: asTrimString(o.chainId ?? o.chain_id),
    };
}

function coerceIncomingChain(raw: unknown): ChainContextPayload {
    const empty = (): ChainContextPayload => ({ expertId: "", resultSummary: "", chainId: "" });
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

function passthroughSessionHandoff(raw: unknown, chainId: string): Record<string, unknown> {
    const base: Record<string, unknown> = { version: 1, chainId, steps: [] };
    if (raw === undefined || raw === null) return base;
    try {
        const o =
            typeof raw === "string" ? (JSON.parse(raw.trim() || "{}") as unknown) : raw;
        if (typeof o !== "object" || o === null || Array.isArray(o)) return base;
        const ob = o as Record<string, unknown>;
        const steps = Array.isArray(ob.steps) ? ob.steps : [];
        return {
            ...ob,
            version: typeof ob.version === "number" ? ob.version : 1,
            chainId: chainId || asTrimString(ob.chainId),
            steps,
        };
    } catch {
        return base;
    }
}

const MAX_PLAN_SNIP_IN_LOG = 1200;

function buildReplanResultSummary(
    _replanReason: string,
    _plannerBrief: string
): string {
    return "[replan] 任务计划已更新。";
}

function appendReplanLog(
    base: string,
    newPlan: string,
    _replanReason: string,
    _plannerBrief: string
): string {
    const parts: string[] = [base.trimEnd()];
    parts.push("\n\n---\n");
    parts.push("[replan decision metadata]\n");
    parts.push("Replanner 已应用新计划。\n");
    if (newPlan.trim()) {
        const p =
            newPlan.length > MAX_PLAN_SNIP_IN_LOG
                ? `${newPlan.slice(0, MAX_PLAN_SNIP_IN_LOG)}…`
                : newPlan;
        parts.push(`新 var_plan（摘录）:\n${p}\n`);
    }
    return parts.join("");
}

async function main({
    params,
}: {
    params: {
        replanner_output?: unknown;
        var_plan?: unknown;
        accumulated_summary?: unknown;
        chainContext?: unknown;
        sessionHandoff?: unknown;
        replan_reason?: unknown;
        planner_brief?: unknown;
    };
}): Promise<{
    var_plan: string;
    accumulated_summary: string;
    chainContext: ChainContextPayload;
    sessionHandoff: Record<string, unknown>;
    plan_update_ok: boolean;
    plan_update_error: string;
}> {
    const previousPlan = asTrimString(params.var_plan);
    const accBase = asTrimString(params.accumulated_summary);
    const incoming = coerceIncomingChain(params.chainContext);
    const replanReason = asTrimString(params.replan_reason);
    const plannerBrief = asTrimString(params.planner_brief);

    const extracted = extractPlanFromReplannerOutput(params.replanner_output).trim();

    if (!extracted) {
        const chainContext: ChainContextPayload = {
            expertId: "",
            resultSummary: incoming.resultSummary,
            chainId: incoming.chainId,
        };
        return {
            var_plan: previousPlan,
            accumulated_summary: accBase,
            chainContext,
            sessionHandoff: passthroughSessionHandoff(params.sessionHandoff, incoming.chainId),
            plan_update_ok: false,
            plan_update_error: "replanner_output 中未解析到有效 plan（需 JSON.plan 或非空 Markdown）",
        };
    }

    const resultSummary = buildReplanResultSummary(replanReason, plannerBrief);
    const chainContext: ChainContextPayload = {
        expertId: "",
        resultSummary,
        chainId: incoming.chainId,
    };

    const accumulated_summary = appendReplanLog(accBase, extracted, replanReason, plannerBrief);

    return {
        var_plan: extracted,
        accumulated_summary,
        chainContext,
        sessionHandoff: passthroughSessionHandoff(params.sessionHandoff, chainContext.chainId),
        plan_update_ok: true,
        plan_update_error: "",
    };
}
