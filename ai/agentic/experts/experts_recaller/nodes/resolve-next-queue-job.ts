/**
 * 在 queue-next-job-prepare 之前执行：从当前 plan 解析「下一条待办」，
 * 区分 expert / llm-judge / 已全部完成（需总结），并挂上 registry 中的 manifest 与 schema 文本。
 * Coze：整文件粘贴；避免使用全局 interface Args/Output 名以防 TS 工程合并冲突。
 *
 * ---------------------------------------------------------------------------
 * 返回值结构说明（main 的 return 对象）
 * ---------------------------------------------------------------------------
 *
 * jobKind          string   分支，三选一：
 *                           - "expert"     下一条待办是普通专家（非 llm-judge）
 *                           - "llm-judge"  下一条待办是评判/仲裁类步骤
 *                           - "none"       没有待办：要么 plan 无效/无任务行，要么所有行都已是 [x]
 *
 * expertId         string   与多维表格 registry 对齐的专家 id（已去掉 plan 里可能出现的 domain\ 前缀）。
 *                           仅在 jobKind === "expert" 时有意义；llm-judge / none 时一般为 ""。
 *
 * rawJobId         string   plan 任务行里冒号前的原始 job_id（未规范化），便于对账。
 *
 * taskDescription  string   当前待办行里冒号后的简短描述（本步要让专家/judge 做的事）。
 *
 * planLineIndex    number   当前待办在「仅任务行」列表里的下标，从 0 开始（与 queue-next-job-prepare 一致）。
 *                           无待办或异常时为 -1。
 *
 * manifest         object|null  从 experts_available 里该专家行带来的 manifest 解析对象；无专家或未找到行时为 null。
 *
 * manifestJson     string   同上行的 manifest 原始 JSON 字符串（registry 的 manifest_json）；没有则为 ""。
 *
 * inputSchema      string   给 LLM 看的「入参 JSON Schema」长文本（registry 的 input_schema）；没有则为 ""。
 *
 * outputSchema     string   给 LLM 看的「出参 JSON Schema」长文本（registry 的 output_schema）；没有则为 ""。
 *
 * expertFound      boolean  jobKind === "expert" 时，是否在 experts_available 里找到了对应 expert_id 的行。
 *
 * judgeTaskHint    string   jobKind === "llm-judge" 时，与 taskDescription 一致，专给 judge prompt 用；其它分支多为 ""。
 *
 * allTasksCompleted boolean 是否「有任务行且全部为 [x]」；为 true 时表示队列里没有 [ ] 了。
 *
 * needsFinalSummary boolean 应与「需要上游做最终总结」联动：通常为 allTasksCompleted === true；
 *                           流程里可用它直接分支到总结节点，跳过专家/judge。
 *
 * parseOk          boolean  代码侧是否认为可继续：无严重问题且（若是 expert）registry 命中。
 *
 * parseErrors      string[] 警告/错误文案列表（例如某行格式怪、专家不在 registry）；空数组表示无附加说明。
 *
 * currentJobPlanLine string 当前待办任务行 Markdown，形如「- [ ] job_id: 描述」，供 queue-next-job-prepare 等直接引用。
 *
 * expertName       string   jobKind === "expert" 且 registry 命中时，来自行的 name；否则 ""。
 *
 * expertDescription string  同上，来自行的 detail（表「详情」）；否则 ""。
 *
 * inputContext     object   本步 expert 入参用链式上下文（与 params.chainContext 一致后输出），与 outputContext 对齐。
 *
 * last_result      string   上一环节短摘要，等于 inputContext.resultSummary（来自 chainContext）
 *
 * sessionHandoff   object   与 check-planner-output / post-expert-output 同形；透传并同步 chainId。
 *
 * last_step_result_json string  steps 最后一项的 result 的 JSON 字符串；无步时为 "{}" 。
 *
 * last_step_expert_id    string  最后一跳 expertId；无步时为 ""。
 *
 * coze_workflow_id string  jobKind === "expert" 且 registry 命中时，来自 experts_available 行的 coze_workflow_id；否则 ""。
 *
 * taskIdentifiers string[] 当前待办描述中以 Markdown inline code 标出的业务标识；只保留逐字符通过来源校验的值。
 *
 * identifierValid boolean 当前待办中的显式业务标识是否都能在权威来源中逐字符找到。
 *
 * identifierErrors string[] 标识来源冲突说明；非空时本节点改走 llm-judge，让现有 replan 链修复待办行。
 *
 * ---------------------------------------------------------------------------
 * 入参 params（仅三项）
 * ---------------------------------------------------------------------------
 *
 * var_plan           每次更新后的计划（Markdown，或含 plan 的 JSON 字符串/对象）
 * experts_available  get-expert-registry 的 experts_available
 * chainContext       链路上下文：首轮为 check-planner-output.chainContext；之后为上一步 expert 写回后的同结构对象
 *
 * sessionHandoff     会话手交：首轮为 check-planner-output.sessionHandoff；之后与 chainContext 并列在环内传递
 * question           当前用户问题；显式包含业务标识时优先级高于历史消息
 * messageList        历史消息；仅在当前问题没有显式业务标识时作为回指来源
 *
 * ---------------------------------------------------------------------------
 * 三种典型组合（便于你对照字段）
 * ---------------------------------------------------------------------------
 *
 * A) 下一条是专家
 *    jobKind="expert", expertId 有值, planLineIndex>=0,
 *    expertFound=true 时 manifest/manifestJson/inputSchema/outputSchema 尽量有值；
 *    expertFound=false 时 expertId 仍有值但 manifest 等可能为空，parseOk=false。
 *
 * B) 下一条是 llm-judge
 *    jobKind="llm-judge", expertId="", judgeTaskHint/taskDescription 有值, planLineIndex>=0。
 *
 * C) 全部做完，要做总结
 *    jobKind="none", needsFinalSummary=true, allTasksCompleted=true,
 *    expertId/planLineIndex 等多为默认空或 -1。
 *
 * D) plan 空、或完全解析不到任务行
 *    jobKind="none", needsFinalSummary=false, parseOk=false, parseErrors 里有说明。
 */

const RESERVED_JUDGE = "llm-judge";
const NESTED_LIST_LINE = /^\s{2,}-\s+\[( |x)\]/i;
const TASK_LINE = /^(?:-\s+)?\[( |x)\]\s*(\S+?)\s*:\s*(.*)$/i;
const JOB_ID_CORE = /^[a-zA-Z0-9_.\\-]+$/;

interface ParsedTask {
    done: boolean;
    job_id: string;
    description: string;
}

function resolveStripOuterMdFence(s: string): string {
    const t = s.trim();
    if (!t.startsWith("```")) return t;
    let body = t.replace(/^```[a-zA-Z0-9]*\s*\r?\n?/, "");
    const end = body.lastIndexOf("```");
    if (end !== -1) body = body.slice(0, end);
    return body.trim();
}

const RESOLVE_PLAN_UNWRAP_MAX = 8;

function resolveUnwrapPlannerPlanMarkdown(plan: string, depth: number): string {
    if (depth > RESOLVE_PLAN_UNWRAP_MAX || plan === undefined || plan === null) return "";
    let s = String(plan).trim();
    if (!s) return "";
    s = resolveStripOuterMdFence(s).trim();
    if (!s) return "";
    if (s.startsWith("{")) {
        try {
            const o = JSON.parse(s) as Record<string, unknown>;
            if (typeof o.plan === "string") {
                const inner = o.plan.trim();
                if (inner) return resolveUnwrapPlannerPlanMarkdown(inner, depth + 1);
            }
        } catch {
            /* keep s */
        }
    }
    return s;
}

function extractPlan(raw: unknown): string {
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
    return resolveUnwrapPlannerPlanMarkdown(base, 0);
}

function parseExpertsAvailable(raw: unknown): Array<Record<string, unknown>> {
    if (raw === undefined || raw === null) return [];
    let arr: unknown[] = [];
    if (Array.isArray(raw)) arr = raw;
    else if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return [];
        try {
            const p = JSON.parse(s) as unknown;
            if (Array.isArray(p)) arr = p;
        } catch {
            return [];
        }
    } else return [];
    return arr.filter((x) => x !== null && typeof x === "object") as Array<Record<string, unknown>>;
}

/** 与 queue-next-job-prepare 一致：去掉 domain\ 前缀，得到 registry 的 expert_id */
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

function formatPendingTaskLine(rawJobId: string, description: string): string {
    return `- [ ] ${rawJobId}: ${description}`;
}

/** 与 outputContext 同形：供本步 expert 入参 inputContext 使用 */
interface ChainContextPayload {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

/** Planner 约定：任务描述中的业务标识必须使用单个 Markdown inline-code 包裹。 */
function extractInlineBusinessIdentifiers(description: string): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const re = /`([^`\r\n]+)`/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(description)) !== null) {
        const value = (m[1] ?? "").trim();
        if (!isLikelyBusinessIdentifier(value) || seen.has(value)) continue;
        seen.add(value);
        out.push(value);
    }
    return out;
}

function isLikelyBusinessIdentifier(value: string): boolean {
    if (value.length < 4 || /\s/.test(value) || value.includes("://")) return false;
    return /\d/.test(value) && /^[A-Za-z0-9._/\-]+$/.test(value);
}

function stringifySource(raw: unknown): string {
    if (raw === undefined || raw === null) return "";
    if (typeof raw === "string") return raw;
    try {
        return JSON.stringify(raw);
    } catch {
        return String(raw);
    }
}

function sourceHasExplicitIdentifier(text: string): boolean {
    const tokens = text.match(/[A-Za-z0-9][A-Za-z0-9._/\-]{3,}/g) ?? [];
    return tokens.some((token) => isLikelyBusinessIdentifier(token));
}

function validateTaskIdentifiers(
    identifiers: string[],
    questionRaw: unknown,
    messageListRaw: unknown,
    lastStepResultJson: string
): { valid: boolean; errors: string[] } {
    if (identifiers.length === 0) return { valid: true, errors: [] };

    const question = stringifySource(questionRaw);
    const messages = stringifySource(messageListRaw);
    const lastStep = stringifySource(lastStepResultJson);
    const questionHasIdentifiers = sourceHasExplicitIdentifier(question);
    const errors: string[] = [];

    for (const identifier of identifiers) {
        const groundedInCurrent = question.includes(identifier);
        const groundedInPreviousStructured = lastStep.includes(identifier);
        const groundedByHistoryFallback = !questionHasIdentifiers && messages.includes(identifier);
        if (!groundedInCurrent && !groundedInPreviousStructured && !groundedByHistoryFallback) {
            errors.push(
                `identifier_conflict: 任务标识「${identifier}」未在当前问题或上一专家结构化结果中逐字符出现` +
                    (questionHasIdentifiers ? "；当前问题已包含其它显式业务标识，禁止回退到历史消息" : "")
            );
        }
    }

    return { valid: errors.length === 0, errors };
}

function parseChainContextPayload(o: Record<string, unknown>): ChainContextPayload {
    return {
        expertId: asTrimString(o.expertId ?? o.expert_id),
        resultSummary: asTrimString(o.resultSummary ?? o.result_summary),
        chainId: asTrimString(o.chainId ?? o.chain_id),
    };
}

/** 解析 params.chainContext（对象或 JSON 字符串）；缺省或非法时返回空结构 */
function coerceChainContext(raw: unknown): ChainContextPayload {
    const empty = (): ChainContextPayload => ({ expertId: "", resultSummary: "", chainId: "" });
    if (raw === undefined || raw === null) return empty();
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return empty();
        try {
            const o = JSON.parse(s) as unknown;
            if (typeof o === "object" && o !== null && !Array.isArray(o)) {
                return parseChainContextPayload(o as Record<string, unknown>);
            }
        } catch {
            return empty();
        }
        return empty();
    }
    if (typeof raw === "object" && !Array.isArray(raw)) {
        return parseChainContextPayload(raw as Record<string, unknown>);
    }
    return empty();
}

function normalizeSessionHandoff(raw: unknown, chainId: string): Record<string, unknown> {
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

function lastStepDerivedFields(handoff: Record<string, unknown>): {
    last_step_result_json: string;
    last_step_expert_id: string;
} {
    const steps = Array.isArray(handoff.steps) ? handoff.steps : [];
    const last = steps.length > 0 ? steps[steps.length - 1] : null;
    if (last === null || typeof last !== "object" || Array.isArray(last)) {
        return { last_step_result_json: "{}", last_step_expert_id: "" };
    }
    const step = last as Record<string, unknown>;
    const expertId = asTrimString(step.expertId ?? step.expert_id);
    const result = step.result;
    try {
        const payload = result !== undefined && result !== null ? result : {};
        return { last_step_result_json: JSON.stringify(payload), last_step_expert_id: expertId };
    } catch {
        return { last_step_result_json: "{}", last_step_expert_id: expertId };
    }
}

function parseTaskLines(plan: string): { tasks: ParsedTask[]; errors: string[] } {
    const tasks: ParsedTask[] = [];
    const errors: string[] = [];
    const lines = plan.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i]!;
        const lineNo = i + 1;

        if (NESTED_LIST_LINE.test(raw)) {
            errors.push(`第 ${lineNo} 行：疑似嵌套列表，已跳过`);
            continue;
        }

        const trimmed = raw.trim();
        if (!trimmed) continue;

        const m = trimmed.match(TASK_LINE);
        if (!m) continue;

        const mark = (m[1] ?? "").toLowerCase().trim();
        const done = mark === "x";
        const job_id = m[2]!.trim();
        const description = (m[3] ?? "").trim();

        if (!JOB_ID_CORE.test(job_id)) {
            errors.push(`第 ${lineNo} 行：job_id「${job_id}」格式异常`);
            continue;
        }

        tasks.push({ done, job_id, description });
    }

    return { tasks, errors };
}

async function main({
    params,
}: {
    params: {
        /** 每次更新后的计划 */
        var_plan?: unknown;
        experts_available?: unknown;
        /** 上一阶段链路上下文：首轮 check-planner-output.chainContext，其后为 expert 回写后的对象 */
        chainContext?: unknown;
        sessionHandoff?: unknown;
        question?: unknown;
        messageList?: unknown;
    };
}): Promise<{
    jobKind: "expert" | "llm-judge" | "none";
    expertId: string;
    rawJobId: string;
    taskDescription: string;
    planLineIndex: number;
    manifest: Record<string, unknown> | null;
    manifestJson: string;
    inputSchema: string;
    outputSchema: string;
    expertFound: boolean;
    judgeTaskHint: string;
    allTasksCompleted: boolean;
    needsFinalSummary: boolean;
    parseOk: boolean;
    parseErrors: string[];
    currentJobPlanLine: string;
    expertName: string;
    expertDescription: string;
    inputContext: ChainContextPayload;
    /** 同 inputContext.resultSummary，便于下游单独绑定 */
    last_result: string;
    sessionHandoff: Record<string, unknown>;
    last_step_result_json: string;
    last_step_expert_id: string;
    coze_workflow_id: string;
    taskIdentifiers: string[];
    identifierValid: boolean;
    identifierErrors: string[];
}> {
    const inputContext = coerceChainContext(params.chainContext);
    const sessionHandoff = normalizeSessionHandoff(params.sessionHandoff, inputContext.chainId);
    const { last_step_result_json, last_step_expert_id } = lastStepDerivedFields(sessionHandoff);
    const plan = extractPlan(params.var_plan);
    const registryRows = parseExpertsAvailable(params.experts_available);
    const byId = new Map<string, Record<string, unknown>>();
    for (const r of registryRows) {
        const id = String(r.expert_id ?? "").trim();
        if (id) byId.set(id, r);
    }

    const base = {
        jobKind: "none" as const,
        expertId: "",
        rawJobId: "",
        taskDescription: "",
        planLineIndex: -1,
        manifest: null as Record<string, unknown> | null,
        manifestJson: "",
        inputSchema: "",
        outputSchema: "",
        expertFound: false,
        judgeTaskHint: "",
        allTasksCompleted: false,
        needsFinalSummary: false,
        parseOk: true,
        parseErrors: [] as string[],
        currentJobPlanLine: "",
        expertName: "",
        expertDescription: "",
        inputContext,
        last_result: inputContext.resultSummary,
        sessionHandoff,
        last_step_result_json,
        last_step_expert_id,
        coze_workflow_id: "",
        taskIdentifiers: [] as string[],
        identifierValid: true,
        identifierErrors: [] as string[],
    };

    if (!plan.trim()) {
        return {
            ...base,
            parseOk: false,
            parseErrors: ["plan 为空"],
        };
    }

    const { tasks, errors } = parseTaskLines(plan);
    base.parseErrors = errors;

    if (tasks.length === 0) {
        return {
            ...base,
            parseOk: errors.length === 0,
            parseErrors: errors.length ? errors : ["未解析到任何任务行（需 [ ] job_id: 描述 格式）"],
        };
    }

    const firstPendingIdx = tasks.findIndex((t) => !t.done);

    if (firstPendingIdx < 0) {
        return {
            ...base,
            jobKind: "none",
            allTasksCompleted: true,
            needsFinalSummary: true,
            parseOk: errors.length === 0,
        };
    }

    const t = tasks[firstPendingIdx]!;
    const rawJobId = t.job_id;
    const normalized = normalizeJobIdToExpertId(rawJobId);
    const description = t.description;

    const pendingLine = formatPendingTaskLine(rawJobId, description);

    if (normalized.toLowerCase() === RESERVED_JUDGE || rawJobId.toLowerCase() === RESERVED_JUDGE) {
        return {
            ...base,
            jobKind: "llm-judge",
            rawJobId,
            expertId: "",
            taskDescription: description,
            planLineIndex: firstPendingIdx,
            judgeTaskHint: description,
            currentJobPlanLine: pendingLine,
            parseOk: errors.length === 0,
        };
    }

    const row = byId.get(normalized) ?? null;
    const manifest = (row?.manifest ?? null) as Record<string, unknown> | null;
    const manifestJson = String(row?.manifest_json ?? "");
    const inputSchema = String(row?.input_schema ?? "");
    const outputSchema = String(row?.output_schema ?? "");

    const expertName = row !== null ? String(row.name ?? "").trim() : "";
    const expertDescription = row !== null ? String(row.detail ?? "").trim() : "";
    const coze_workflow_id = row !== null ? asTrimString(row.coze_workflow_id) : "";
    const taskIdentifiers = extractInlineBusinessIdentifiers(description);
    const identifierCheck = validateTaskIdentifiers(
        taskIdentifiers,
        params.question,
        params.messageList,
        last_step_result_json
    );

    if (!identifierCheck.valid) {
        const conflict = identifierCheck.errors.join("；");
        return {
            ...base,
            jobKind: "llm-judge",
            rawJobId,
            expertId: "",
            taskDescription: conflict,
            planLineIndex: firstPendingIdx,
            judgeTaskHint: conflict,
            currentJobPlanLine: pendingLine,
            parseOk: false,
            parseErrors: [...errors, ...identifierCheck.errors],
            taskIdentifiers,
            identifierValid: false,
            identifierErrors: identifierCheck.errors,
        };
    }

    return {
        ...base,
        jobKind: "expert",
        expertId: normalized,
        rawJobId,
        taskDescription: description,
        planLineIndex: firstPendingIdx,
        currentJobPlanLine: pendingLine,
        expertName,
        expertDescription,
        manifest: manifest && typeof manifest === "object" ? manifest : null,
        manifestJson,
        inputSchema,
        outputSchema,
        expertFound: row !== null,
        coze_workflow_id,
        parseOk: errors.length === 0 && row !== null,
        parseErrors:
            row === null
                ? [...errors, `专家「${normalized}」不在 experts_available 中（请检查 plan 与 registry）`]
                : errors,
        taskIdentifiers,
        identifierValid: true,
        identifierErrors: [],
    };
}
