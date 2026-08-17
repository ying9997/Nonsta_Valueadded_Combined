/**
 * 校验 Planner 输出是否符合作业队列约定（见 prompts/queue-planner.md）。
 * 出参 `plan` 为整理后的 Markdown 任务列表（已 strip ``` 与嵌套 JSON 的 unwrap），校验失败时仍为解析后的正文便于排障；空输入时为 ""。
 * Coze：整文件粘贴；此处不用全局 Args/Output 名，避免与其它节点 TS 合并冲突。
 *
 * sessionHandoff：与 chainContext.chainId 对齐的会话手交状态；steps 由 post-expert-output 追加。
 * 形状：{ version: 1, chainId: string, steps: Array<{ expertId, at, result, outputContext, enrichedContext? }> }
 */

interface ParsedTask {
    done: boolean;
    job_id: string;
    description: string;
}

const MAX_TASKS = 10;
const JOB_ID_PATTERN = /^[a-zA-Z0-9_.-]+$/;
const RESERVED_JUDGE = "llm-judge";
/** Planner 判定上游 solutions 已充分时输出的特殊标记 job_id */
const RESERVED_BYPASS = "SOLUTIONS_SUFFICIENT";

/** 嵌套列表：行首至少 2 个空白再接 `- [` */
const NESTED_LIST_LINE = /^\s{2,}-\s+\[( |x)\]/i;

/**
 * 单行任务：`[ ] job_id: 描述` 或 `- [ ] job_id: 描述`；已完成 `[x]`
 * job_id 与第一个 `:` 之间不能含空白（避免 description 里的冒号被误切）
 */
const TASK_LINE = /^(?:-\s+)?\[( |x)\]\s*(\S+?)\s*:\s*(.*)$/i;

/** 调用链 id：毫秒时间戳 + 3 位随机数字（000–999） */
function makeChainId(): string {
    const ts = Date.now();
    const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
    return `${ts}${rnd}`;
}

/** 与 resolve-next-queue-job / expert outputContext 对齐；首轮仅填 chainId，余下透传过程中补全 */
interface ChainContextPayload {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

function initialChainContext(chainId: string): ChainContextPayload {
    return {
        expertId: "",
        resultSummary: "",
        chainId,
    };
}

const SESSION_HANDOFF_VERSION = 1;

interface SessionHandoffPayload {
    version: number;
    chainId: string;
    steps: Array<{
        expertId: string;
        at: string;
        result: { structured?: unknown; analysis?: string };
        outputContext: { expertId?: string; resultSummary?: string; chainId?: string };
        enrichedContext?: unknown;
    }>;
}

function initialSessionHandoff(chainId: string): SessionHandoffPayload {
    return { version: SESSION_HANDOFF_VERSION, chainId, steps: [] };
}

/** 去掉最外层 ``` 或 ```json 代码块（Planner 常把整段 JSON 包在 fence 里塞进 plan 字段） */
function checkStripOuterMdFence(s: string): string {
    const t = s.trim();
    if (!t.startsWith("```")) return t;
    let body = t.replace(/^```[a-zA-Z0-9]*\s*\r?\n?/, "");
    const end = body.lastIndexOf("```");
    if (end !== -1) body = body.slice(0, end);
    return body.trim();
}

const CHECK_PLAN_UNWRAP_MAX = 8;

/** 递归：strip fence → 若为 JSON 且含 plan 则取内层（可多层嵌套） */
function checkUnwrapPlannerPlanMarkdown(plan: string, depth: number): string {
    if (depth > CHECK_PLAN_UNWRAP_MAX || plan === undefined || plan === null) return "";
    let s = String(plan).trim();
    if (!s) return "";
    s = checkStripOuterMdFence(s).trim();
    if (!s) return "";
    if (s.startsWith("{")) {
        try {
            const o = JSON.parse(s) as Record<string, unknown>;
            if (typeof o.plan === "string") {
                const inner = o.plan.trim();
                if (inner) return checkUnwrapPlannerPlanMarkdown(inner, depth + 1);
            }
        } catch {
            /* 非 JSON，当作最终 Markdown */
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
    return checkUnwrapPlannerPlanMarkdown(base, 0);
}

/**
 * 与 get-expert-registry 输出一致：`RegistryRow[]` 或该数组的 JSON 字符串。
 * 未传或解析不到数组时不做 job_id 白名单校验；传空数组则仅允许 llm-judge。
 */
function expertIdsFromExpertsAvailable(raw: unknown): string[] | null {
    if (raw === undefined || raw === null) return null;
    let arr: unknown[] | null = null;
    if (Array.isArray(raw)) {
        arr = raw;
    } else if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return null;
        try {
            const p = JSON.parse(s) as unknown;
            if (Array.isArray(p)) arr = p;
        } catch {
            return null;
        }
    }
    if (arr === null) return null;
    const ids: string[] = [];
    for (const item of arr) {
        if (item !== null && typeof item === "object" && "expert_id" in item) {
            const id = String((item as { expert_id?: unknown }).expert_id ?? "").trim();
            if (id) ids.push(id);
        }
    }
    return ids;
}

function parseTasks(plan: string): { tasks: ParsedTask[]; lineErrors: string[] } {
    const tasks: ParsedTask[] = [];
    const lineErrors: string[] = [];
    const lines = plan.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i];
        const lineNo = i + 1;

        if (NESTED_LIST_LINE.test(raw)) {
            lineErrors.push(`第 ${lineNo} 行：禁止嵌套/子任务列表`);
            continue;
        }

        const trimmed = raw.trim();
        if (!trimmed) continue;

        const m = trimmed.match(TASK_LINE);
        if (!m) {
            lineErrors.push(`第 ${lineNo} 行：应为「[ ] job_id: 描述」或「- [ ] job_id: 描述」格式，当前：${trimmed.slice(0, 120)}${trimmed.length > 120 ? "…" : ""}`);
            continue;
        }

        const mark = (m[1] ?? "").toLowerCase().trim();
        const done = mark === "x";
        const job_id = m[2]!.trim();
        const description = (m[3] ?? "").trim();

        if (!JOB_ID_PATTERN.test(job_id)) {
            lineErrors.push(`第 ${lineNo} 行：job_id「${job_id}」含非法字符（仅允许字母数字、_、-、.）`);
            continue;
        }

        if (!done && !description) {
            lineErrors.push(`第 ${lineNo} 行：待办任务 [ ] 需有简短描述（冒号后不能为空）`);
            continue;
        }

        tasks.push({ done, job_id, description });
    }

    return { tasks, lineErrors };
}

async function main({
    params,
}: {
    params: {
        plan?: unknown;
        /** get-expert-registry 的 experts_available（对象数组或 JSON 字符串） */
        experts_available?: unknown;
    };
}): Promise<{
    valid: boolean;
    /** true 时表示 Planner 判定上游 solutions 已充分，应旁路 agent_loop 直达 finalize-planner-skip */
    is_bypass: boolean;
    errors: string[];
    task_count: number;
    accumulated_summary: string;
    tasks: ParsedTask[];
    /** 含 chainId；与 expert 链式上下文同形 */
    chainContext: ChainContextPayload;
    /** 结构化会话手交；steps 在 post-expert-output 追加 */
    sessionHandoff: SessionHandoffPayload;
    /** 整理后的 var_plan 正文（unwrap 后）；下游可直接写入任务管理器 */
    plan: string;
}> {
    const cid = makeChainId();
    const chainContext = initialChainContext(cid);
    const sessionHandoff = initialSessionHandoff(cid);
    const plan = extractPlan(params.plan);
    const allowed = expertIdsFromExpertsAvailable(params.experts_available);
    const allowSet = allowed !== null ? new Set(allowed) : null;

    const errors: string[] = [];
    const tasks: ParsedTask[] = [];

    if (!plan.trim()) {
        errors.push("plan 为空：缺少 Markdown 任务列表");
        return {
            valid: false,
            is_bypass: false,
            errors,
            task_count: 0,
            tasks: [],
            accumulated_summary: "",
            chainContext,
            sessionHandoff,
            plan: "",
        };
    }

    const { tasks: parsed, lineErrors } = parseTasks(plan);
    errors.push(...lineErrors);
    tasks.push(...parsed);

    // bypass 检测：Planner 唯一输出行为 SOLUTIONS_SUFFICIENT 时，跳过 agent_loop
    const isBypass =
        tasks.length === 1 &&
        tasks[0]!.job_id === RESERVED_BYPASS &&
        !tasks[0]!.done;

    if (isBypass) {
        return {
            valid: true,
            is_bypass: true,
            errors: [],
            task_count: 1,
            tasks,
            accumulated_summary: "知识库解决方案已充分，跳过 expert 调用。",
            chainContext,
            sessionHandoff,
            plan,
        };
    }

    if (tasks.length > MAX_TASKS) {
        errors.push(`任务超过上限：共 ${tasks.length} 条，最多 ${MAX_TASKS} 条`);
    }

    if (allowSet !== null) {
        for (let i = 0; i < tasks.length; i++) {
            const t = tasks[i]!;
            const ok = t.job_id === RESERVED_JUDGE || allowSet.has(t.job_id);
            if (!ok) {
                errors.push(
                    `任务 ${i + 1}：job_id「${t.job_id}」不在 experts_available 中，且不是 ${RESERVED_JUDGE}`
                );
            }
        }
    }

    var accumulated_summary = "";

    if(errors.length == 0) {
        accumulated_summary += "制定下述计划：\n" + plan;
    } else {
        accumulated_summary += "当前专家无法解决用户问题，请重试。\n" + plan;
        for (let i = 0; i < errors.length; i++) {
            accumulated_summary += `- ${errors[i]}\n`;
        }
    }

    const valid = errors.length === 0;

    return {
        valid,
        is_bypass: false,
        accumulated_summary,
        errors,
        task_count: tasks.length,
        tasks,
        chainContext,
        sessionHandoff,
        plan,
    };
}
