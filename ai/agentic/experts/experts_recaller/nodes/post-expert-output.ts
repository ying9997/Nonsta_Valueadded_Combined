/**
 * 专家执行完成后：将 var_plan 中本步任务标为 [x]、追加 accumulated_summary、输出下一轮的 chainContext。
 *
 * 入参 params
 * - structured / analysis / outputContext：expert 输出（object 或 JSON 字符串）
 * - var_plan / accumulated_summary：任务管理器当前状态
 * - planLineIndex：可选，来自 resolve-next-queue-job，优先用于定位待勾选行
 * - chainContext：可选，本步执行前的链上下文；chainId 首轮来自 check-planner-output.chainContext
 * - expert_id：可选，outputContext.expertId 为空时用于 plan 匹配与 chainContext.expertId
 * - sessionHandoff：可选；与 check-planner-output 同形，本节点 append 一步（含 result 供下一跳 previousOutput）
 * - enrichedContextFromExpert：可选；call-expert 解析的专家 enrichedContext（扁平），写入 step.enrichedContext
 * - expertDomain：可选；与本步 manifest.domain 一致（通常来自 build-expert-invoke-baseline.expertDomain），写入 step.expertDomain 供域索引合并
 *
 * 出参
 * - var_plan / accumulated_summary：更新后全文
 * - chainContext：供下一轮 resolve-next-queue-job 传入
 * - sessionHandoff：更新后的会话手交（steps 有界截断）
 * - plan_update_ok / plan_update_error：plan 是否成功勾选
 *
 * Coze：整文件粘贴；内联 main 类型，避免与仓库其他 Args 合并冲突。
 */

const POST_TASK_LINE = /^(?:-\s+)?\[( |x)\]\s*(\S+?)\s*:\s*(.*)$/i;

interface ChainContextPayload {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function normalizeJobIdToExpertId(jobId: string): string {
    const s = jobId.trim();
    if (!s) return s;
    if (s.includes("\\")) {
        const parts = s.split("\\");
        const last = parts[parts.length - 1]!.trim();
        return last || s;
    }
    return s;
}

function parseJsonRecord(raw: unknown): Record<string, unknown> | null {
    if (raw === undefined || raw === null) return null;
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return null;
        try {
            const p = JSON.parse(s) as unknown;
            return typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }
    if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
    return null;
}

function parseOutputContext(raw: unknown): ChainContextPayload {
    const o = parseJsonRecord(raw);
    if (!o) return { expertId: "", resultSummary: "", chainId: "" };
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

function parseChainFromObj(o: Record<string, unknown>): ChainContextPayload {
    return {
        expertId: asTrimString(o.expertId ?? o.expert_id),
        resultSummary: asTrimString(o.resultSummary ?? o.result_summary),
        chainId: asTrimString(o.chainId ?? o.chain_id),
    };
}

function mergeUpdatedChainContext(
    outCtx: ChainContextPayload,
    incoming: ChainContextPayload,
    fallbackExpertId: string,
    analysisText: string,
    maxSummaryFromAnalysis: number
): ChainContextPayload {
    const chainId = outCtx.chainId || incoming.chainId;
    let expertId = outCtx.expertId || asTrimString(fallbackExpertId);
    let resultSummary = outCtx.resultSummary;
    if (!resultSummary && analysisText) {
        resultSummary =
            analysisText.length > maxSummaryFromAnalysis
                ? `${analysisText.slice(0, maxSummaryFromAnalysis)}…`
                : analysisText;
    }
    return { expertId, resultSummary, chainId };
}

function toOptionalNonNegInt(v: unknown): number | null {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
}

function lineIsPendingTask(line: string): boolean {
    const t = line.trim();
    const m = t.match(POST_TASK_LINE);
    if (!m) return false;
    return (m[1] ?? "").toLowerCase().trim() !== "x";
}

function markTaskLineDone(line: string): string {
    return line.replace(/^(\s*)(-\s+)?\[ \]/, "$1$2[x]");
}

function buildExpertIdTargets(outCtx: ChainContextPayload, fallbackExpertId: string): Set<string> {
    const s = new Set<string>();
    const add = (x: string) => {
        const t = x.trim();
        if (t) {
            s.add(t);
            s.add(normalizeJobIdToExpertId(t));
        }
    };
    add(outCtx.expertId);
    add(asTrimString(fallbackExpertId));
    return s;
}

function jobIdMatchesTargets(jobId: string, targets: Set<string>): boolean {
    const raw = jobId.trim();
    if (!raw) return false;
    if (targets.has(raw)) return true;
    const norm = normalizeJobIdToExpertId(raw);
    if (targets.has(norm)) return true;
    for (const t of targets) {
        if (normalizeJobIdToExpertId(t) === norm) return true;
    }
    return false;
}

function updateVarPlan(
    planText: string,
    planLineIndex: number | null,
    targets: Set<string>
): { text: string; ok: boolean; error: string } {
    if (!planText.trim()) {
        return { text: planText, ok: false, error: "var_plan 为空" };
    }

    const lines = planText.split(/\r?\n/).map((l) => l.replace(/\r$/, ""));
    const out = [...lines];
    let taskOrdinal = -1;

    const tryByIndex = (): boolean => {
        if (planLineIndex === null) return false;
        taskOrdinal = -1;
        for (let i = 0; i < out.length; i++) {
            const line = out[i]!;
            const trimmed = line.trim();
            const m = trimmed.match(POST_TASK_LINE);
            if (!m) continue;
            taskOrdinal += 1;
            if (taskOrdinal !== planLineIndex) continue;
            if (!lineIsPendingTask(line)) {
                return false;
            }
            out[i] = markTaskLineDone(line);
            return true;
        }
        return false;
    };

    const tryByExpertId = (): boolean => {
        for (let i = 0; i < out.length; i++) {
            const line = out[i]!;
            const trimmed = line.trim();
            const m = trimmed.match(POST_TASK_LINE);
            if (!m) continue;
            if (!lineIsPendingTask(line)) continue;
            const jobId = m[2]!.trim();
            if (jobIdMatchesTargets(jobId, targets)) {
                out[i] = markTaskLineDone(line);
                return true;
            }
        }
        return false;
    };

    if (tryByIndex()) {
        return { text: out.join("\n"), ok: true, error: "" };
    }

    if (planLineIndex !== null) {
        if (tryByExpertId()) {
            return { text: out.join("\n"), ok: true, error: "" };
        }
        return {
            text: planText,
            ok: false,
            error: `planLineIndex=${planLineIndex} 未命中可勾选行，且未按 expertId 匹配到待办`,
        };
    }

    if (tryByExpertId()) {
        return { text: out.join("\n"), ok: true, error: "" };
    }

    return {
        text: planText,
        ok: false,
        error: "未找到可勾选的待办行（[ ]）或与 expertId 匹配的行",
    };
}

const MAX_ANALYSIS_SNIP = 900;
const MAX_STRUCTURED_SNIP = 900;
const MAX_SESSION_STEPS = 10;
const MAX_STEP_ANALYSIS_CHARS = 12000;

interface SessionStepStored {
    expertId: string;
    at: string;
    result: { structured?: unknown; analysis?: string };
    outputContext: { expertId?: string; resultSummary?: string; chainId?: string };
    /** manifest.domain，与 expertId 组成域索引键 `{domain}/{expertId}` */
    expertDomain?: string;
    enrichedContext?: unknown;
}

interface SessionHandoffPayload {
    version: number;
    chainId: string;
    steps: SessionStepStored[];
}

function coerceSessionHandoff(raw: unknown, fallbackChainId: string): SessionHandoffPayload {
    const empty = (): SessionHandoffPayload => ({
        version: 1,
        chainId: fallbackChainId,
        steps: [],
    });
    if (raw === undefined || raw === null) return empty();
    let o: Record<string, unknown> | null = null;
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return empty();
        try {
            const p = JSON.parse(s) as unknown;
            o = typeof p === "object" && p !== null && !Array.isArray(p) ? (p as Record<string, unknown>) : null;
        } catch {
            return empty();
        }
    } else if (typeof raw === "object" && !Array.isArray(raw)) {
        o = raw as Record<string, unknown>;
    }
    if (!o) return empty();
    const chainId = asTrimString(o.chainId) || fallbackChainId;
    const stepsRaw = o.steps;
    const steps: SessionStepStored[] = [];
    if (Array.isArray(stepsRaw)) {
        for (const item of stepsRaw) {
            if (!item || typeof item !== "object" || Array.isArray(item)) continue;
            const it = item as Record<string, unknown>;
            const expertId = asTrimString(it.expertId);
            const at = asTrimString(it.at);
            if (!expertId || !at) continue;
            const res = it.result;
            let result: { structured?: unknown; analysis?: string } = {};
            if (res && typeof res === "object" && !Array.isArray(res)) {
                const rr = res as Record<string, unknown>;
                result = {
                    structured: rr.structured,
                    analysis: typeof rr.analysis === "string" ? rr.analysis : undefined,
                };
            }
            const oc = it.outputContext;
            let outputContext: { expertId?: string; resultSummary?: string; chainId?: string } = {};
            if (oc && typeof oc === "object" && !Array.isArray(oc)) {
                const oo = oc as Record<string, unknown>;
                outputContext = {
                    expertId: asTrimString(oo.expertId ?? oo.expert_id) || undefined,
                    resultSummary: asTrimString(oo.resultSummary ?? oo.result_summary) || undefined,
                    chainId: asTrimString(oo.chainId ?? oo.chain_id) || undefined,
                };
            }
            const row: SessionStepStored = { expertId, at, result, outputContext };
            if (it.enrichedContext !== undefined) row.enrichedContext = it.enrichedContext;
            const dom = asTrimString(it.expertDomain);
            if (dom) row.expertDomain = dom;
            steps.push(row);
        }
    }
    const ver = typeof o.version === "number" && Number.isFinite(o.version) ? Math.trunc(o.version) : 1;
    return { version: ver, chainId, steps };
}

function trimStoredAnalysis(s: string): string {
    if (s.length <= MAX_STEP_ANALYSIS_CHARS) return s;
    return `${s.slice(0, MAX_STEP_ANALYSIS_CHARS)}…`;
}

function stringifyStructured(raw: unknown): string {
    if (raw === undefined || raw === null) return "";
    if (typeof raw === "string") return raw.trim();
    try {
        return JSON.stringify(raw);
    } catch {
        return String(raw);
    }
}

function appendRunLog(
    base: string,
    expertLabel: string,
    resultSummary: string,
    analysis: string,
    structured: unknown,
    parseNote: string
): string {
    const parts: string[] = [base.trimEnd()];
    parts.push("\n\n---\n");
    parts.push(`[expert 执行] ${expertLabel || "(unknown)"}\n`);
    if (parseNote) parts.push(`解析说明: ${parseNote}\n`);
    if (resultSummary) parts.push(`resultSummary: ${resultSummary}\n`);
    if (analysis) {
        const sn =
            analysis.length > MAX_ANALYSIS_SNIP ? `${analysis.slice(0, MAX_ANALYSIS_SNIP)}…` : analysis;
        parts.push(`analysis:\n${sn}\n`);
    }
    const sj = stringifyStructured(structured);
    if (sj) {
        const sn = sj.length > MAX_STRUCTURED_SNIP ? `${sj.slice(0, MAX_STRUCTURED_SNIP)}…` : sj;
        parts.push(`structured:\n${sn}\n`);
    }
    return parts.join("");
}

async function main({
    params,
}: {
    params: {
        structured?: unknown;
        analysis?: unknown;
        outputContext?: unknown;
        var_plan?: unknown;
        accumulated_summary?: unknown;
        planLineIndex?: unknown;
        chainContext?: unknown;
        expert_id?: unknown;
        sessionHandoff?: unknown;
        enrichedContextFromExpert?: unknown;
        expertDomain?: unknown;
    };
}): Promise<{
    var_plan: string;
    accumulated_summary: string;
    chainContext: ChainContextPayload;
    sessionHandoff: SessionHandoffPayload;
    plan_update_ok: boolean;
    plan_update_error: string;
}> {
    const planText = asTrimString(params.var_plan);
    const accBase = asTrimString(params.accumulated_summary);

    const outCtx = parseOutputContext(params.outputContext);
    const incoming = coerceIncomingChain(params.chainContext);
    const fallbackExpert = asTrimString(params.expert_id);

    let analysis = "";
    let structuredRaw: unknown = params.structured;
    let parseNote = "";

    if (typeof params.analysis === "string") {
        analysis = params.analysis.trim();
    } else if (params.analysis !== undefined && params.analysis !== null) {
        analysis = stringifyStructured(params.analysis);
        if (!analysis) parseNote = "analysis 非字符串，已 stringify";
    }

    const structuredRec = parseJsonRecord(params.structured);
    if (structuredRec && parseNote === "") {
        structuredRaw = structuredRec;
    } else if (typeof params.structured === "string" && !structuredRec) {
        parseNote = parseNote || "structured 字符串 JSON 解析失败";
        structuredRaw = params.structured;
    }

    const idx = toOptionalNonNegInt(params.planLineIndex);
    const targets = buildExpertIdTargets(outCtx, fallbackExpert);

    const planResult = updateVarPlan(planText, idx, targets);

    const chainContext = mergeUpdatedChainContext(
        outCtx,
        incoming,
        fallbackExpert,
        analysis,
        MAX_ANALYSIS_SNIP
    );

    const sh = coerceSessionHandoff(params.sessionHandoff, chainContext.chainId || incoming.chainId);
    sh.chainId = chainContext.chainId || incoming.chainId || sh.chainId;
    const stepExpertId = chainContext.expertId || fallbackExpert || "unknown";
    const analysisForStep = analysis ? trimStoredAnalysis(analysis) : "";
    const newStep: SessionStepStored = {
        expertId: stepExpertId,
        at: new Date().toISOString(),
        result: {
            structured: structuredRec ?? (structuredRaw !== undefined && structuredRaw !== null ? structuredRaw : undefined),
            analysis: analysisForStep || undefined,
        },
        outputContext: {
            expertId: outCtx.expertId || stepExpertId,
            resultSummary: outCtx.resultSummary || chainContext.resultSummary,
            chainId: outCtx.chainId || chainContext.chainId,
        },
    };
    if (params.enrichedContextFromExpert !== undefined) {
        newStep.enrichedContext = params.enrichedContextFromExpert;
    }
    const stepDomain = asTrimString(params.expertDomain);
    if (stepDomain) newStep.expertDomain = stepDomain;
    sh.steps.push(newStep);
    while (sh.steps.length > MAX_SESSION_STEPS) {
        sh.steps.shift();
    }

    const expertLabel = chainContext.expertId || fallbackExpert || "unknown";

    const accumulated_summary = appendRunLog(
        accBase,
        expertLabel,
        chainContext.resultSummary,
        analysis,
        structuredRaw,
        parseNote
    );

    return {
        var_plan: planResult.text,
        accumulated_summary,
        chainContext,
        sessionHandoff: sh,
        plan_update_ok: planResult.ok,
        plan_update_error: planResult.error,
    };
}
