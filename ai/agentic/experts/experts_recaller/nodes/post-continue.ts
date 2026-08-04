/**
 * llm-judge 判定为 continue 后：将当前 judge 任务行标为 [x]、追加 accumulated_summary、输出下一轮 chainContext。
 *
 * 与 post-expert-output / post-planner-replan 对齐的出参：var_plan、accumulated_summary、chainContext、plan_update_ok、plan_update_error。
 *
 * 入参 params（与 llm-judge 输出字段一一对应，Coze 侧分别绑定变量，勿传整段 JSON）
 * - verdict：必填；仅当值为 continue（忽略大小写）时勾选计划并写日志
 * - rationale、confidence：可选
 * - var_plan、accumulated_summary、chainContext：当前状态
 * - sessionHandoff：可选；与 post-expert-output 同形，本节点仅透传并同步 chainId
 * - planLineIndex：可选，来自 resolve-next-queue-job（与执行 judge 时一致）
 *
 * Coze：仅在 verdict=continue 分支调用本节点；整文件粘贴，内联 main。
 */

const CONTINUE_TASK_LINE = /^(?:-\s+)?\[( |x)\]\s*(\S+?)\s*:\s*(.*)$/i;
const CONTINUE_JUDGE_JOB_ID = "llm-judge";

interface ChainContextPayload {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

interface ParsedJudge {
    verdict: string;
    rationale: string;
    confidence: string;
}

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
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

function toOptionalNonNegInt(v: unknown): number | null {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" && Number.isFinite(v) ? Math.trunc(v) : parseInt(String(v).trim(), 10);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
}

function lineIsPendingTask(line: string): boolean {
    const t = line.trim();
    const m = t.match(CONTINUE_TASK_LINE);
    if (!m) return false;
    return (m[1] ?? "").toLowerCase().trim() !== "x";
}

function markTaskLineDone(line: string): string {
    return line.replace(/^(\s*)(-\s+)?\[ \]/, "$1$2[x]");
}

function jobIdIsJudge(jobId: string): boolean {
    return jobId.trim().toLowerCase() === CONTINUE_JUDGE_JOB_ID;
}

/**
 * 优先按 planLineIndex 勾选待办行；失败则勾选第一条待办的 llm-judge 行（与 post-expert 的 index + fallback 对称）。
 */
function updateVarPlanAfterJudgeContinue(
    planText: string,
    planLineIndex: number | null
): { text: string; ok: boolean; error: string } {
    if (!planText.trim()) {
        return { text: planText, ok: false, error: "var_plan 为空" };
    }

    const lines = planText.split(/\r?\n/).map((l) => l.replace(/\r$/, ""));
    const out = [...lines];
    let taskOrdinal = -1;

    if (planLineIndex !== null) {
        taskOrdinal = -1;
        for (let i = 0; i < out.length; i++) {
            const line = out[i]!;
            const trimmed = line.trim();
            const m = trimmed.match(CONTINUE_TASK_LINE);
            if (!m) continue;
            taskOrdinal += 1;
            if (taskOrdinal !== planLineIndex) continue;
            if (!lineIsPendingTask(line)) {
                break;
            }
            out[i] = markTaskLineDone(line);
            return { text: out.join("\n"), ok: true, error: "" };
        }
    }

    for (let i = 0; i < out.length; i++) {
        const line = out[i]!;
        const trimmed = line.trim();
        const m = trimmed.match(CONTINUE_TASK_LINE);
        if (!m) continue;
        if (!lineIsPendingTask(line)) continue;
        const jobId = m[2]!.trim();
        if (jobIdIsJudge(jobId)) {
            out[i] = markTaskLineDone(line);
            return { text: out.join("\n"), ok: true, error: "" };
        }
    }

    return {
        text: planText,
        ok: false,
        error:
            planLineIndex !== null
                ? `planLineIndex=${planLineIndex} 未命中可勾选的 llm-judge 待办行，且未找到其它待办 llm-judge 行`
                : "未找到可勾选的 llm-judge 待办行（[ ]）",
    };
}

function buildContinueResultSummary(judge: ParsedJudge): string {
    const parts: string[] = ["[llm-judge] verdict=continue。"];
    if (judge.confidence) parts.push(`confidence=${judge.confidence}。`);
    return parts.join(" ");
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

function appendJudgeContinueLog(base: string, judge: ParsedJudge): string {
    const parts: string[] = [base.trimEnd()];
    parts.push("\n\n---\n");
    parts.push("[llm-judge decision metadata]\n");
    parts.push("verdict: continue\n");
    if (judge.confidence) parts.push(`confidence: ${judge.confidence}\n`);
    return parts.join("");
}

async function main({
    params,
}: {
    params: {
        verdict?: unknown;
        rationale?: unknown;
        confidence?: unknown;
        var_plan?: unknown;
        accumulated_summary?: unknown;
        chainContext?: unknown;
        sessionHandoff?: unknown;
        planLineIndex?: unknown;
    };
}): Promise<{
    var_plan: string;
    accumulated_summary: string;
    chainContext: ChainContextPayload;
    sessionHandoff: Record<string, unknown>;
    plan_update_ok: boolean;
    plan_update_error: string;
}> {
    const planText = asTrimString(params.var_plan);
    const accBase = asTrimString(params.accumulated_summary);
    const incoming = coerceIncomingChain(params.chainContext);
    const idx = toOptionalNonNegInt(params.planLineIndex);

    const judge: ParsedJudge = {
        verdict: asTrimString(params.verdict).toLowerCase(),
        rationale: asTrimString(params.rationale),
        confidence: asTrimString(params.confidence),
    };

    if (!judge.verdict) {
        const chainContext: ChainContextPayload = {
            expertId: "",
            resultSummary: incoming.resultSummary,
            chainId: incoming.chainId,
        };
        return {
            var_plan: planText,
            accumulated_summary: accBase,
            chainContext,
            sessionHandoff: passthroughSessionHandoff(params.sessionHandoff, incoming.chainId),
            plan_update_ok: false,
            plan_update_error: "verdict 为空（请绑定 judge 输出的 verdict 字段）",
        };
    }

    if (judge.verdict !== "continue") {
        const chainContext: ChainContextPayload = {
            expertId: "",
            resultSummary: incoming.resultSummary,
            chainId: incoming.chainId,
        };
        return {
            var_plan: planText,
            accumulated_summary: accBase,
            chainContext,
            sessionHandoff: passthroughSessionHandoff(params.sessionHandoff, incoming.chainId),
            plan_update_ok: false,
            plan_update_error: `verdict 为「${judge.verdict}」，本节点仅处理 continue（请走 replan/abort 分支）`,
        };
    }

    const planResult = updateVarPlanAfterJudgeContinue(planText, idx);
    const resultSummary = buildContinueResultSummary(judge);
    const chainContext: ChainContextPayload = {
        expertId: "",
        resultSummary,
        chainId: incoming.chainId,
    };

    const accumulated_summary = appendJudgeContinueLog(accBase, judge);

    return {
        var_plan: planResult.text,
        accumulated_summary,
        chainContext,
        sessionHandoff: passthroughSessionHandoff(params.sessionHandoff, chainContext.chainId),
        plan_update_ok: planResult.ok,
        plan_update_error: planResult.error,
    };
}
