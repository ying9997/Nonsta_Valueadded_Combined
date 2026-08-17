/**
 * 将 queue-next-job-prepare 的 LLM 输出与 build-expert-invoke-baseline 的骨架合并：
 * inputContext 整对象强制采用 baseline；inputs 深度合并且 baseline 侧字段（如 enrichedContext）覆盖 LLM。
 * query：固定采用 resolve-next-queue-job 已校验的 taskDescription；不再信任 LLM 二次生成的 job。
 * 标识字段：taskIdentifiers 非空且只命中一个参数字段时，由确定性代码原样覆盖；多字段时只允许其精确子集。
 *
 * 入参 params
 * - baseline_input_params：build-expert-invoke-baseline 输出
 * - llm_input_params：prepare 节点输出的 input_params（对象或 JSON 字符串），语义为子工作流 inputs 负载
 * - llm_job：prepare 的 job 字段，仅保留兼容，不再作为 query 权威来源
 * - taskDescription：resolve-next-queue-job 已完成标识校验的当前任务描述
 * - taskIdentifiers：当前任务通过来源校验的业务标识
 * - question / last_step_result_json：taskIdentifiers 为空时，校验下游新发现标识的权威来源
 *
 * 出参
 * - input_params：合并后的完整调用负载（与 Coze 变量绑定时也可拆用下列字段）
 * - merged_query：子工作流 query
 * - merged_inputContext：input_params.inputContext（扁平输出便于画布绑定）
 * - merged_inputs：input_params.inputs（扁平输出，对应子工作流 inputs）
 *
 * Coze：整文件粘贴；内联 main。
 */

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Shallow-recursive merge: right-hand keys win (baseline `inputs` overwrites LLM). */
function mergePreferRight(left: unknown, right: unknown): unknown {
    if (!isPlainObject(right)) return right;
    if (!isPlainObject(left)) return { ...right };
    const out: Record<string, unknown> = { ...left };
    for (const k of Object.keys(right)) {
        const rv = right[k];
        const lv = out[k];
        if (isPlainObject(rv) && isPlainObject(lv)) {
            out[k] = mergePreferRight(lv, rv) as Record<string, unknown>;
        } else {
            out[k] = rv;
        }
    }
    return out;
}

function coerceObject(raw: unknown): Record<string, unknown> {
    if (raw === undefined || raw === null) return {};
    if (typeof raw === "string") {
        const s = raw.trim();
        if (!s) return {};
        try {
            const p = JSON.parse(s) as unknown;
            return isPlainObject(p) ? p : {};
        } catch {
            return {};
        }
    }
    return isPlainObject(raw) ? raw : {};
}

function coerceStringArray(raw: unknown): string[] {
    const values = Array.isArray(raw) ? raw : typeof raw === "string" ? [raw] : [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const value of values) {
        const s = asTrimString(value);
        if (!s || seen.has(s)) continue;
        seen.add(s);
        out.push(s);
    }
    return out;
}

function isIdentifierFieldName(key: string): boolean {
    const k = key.toLowerCase();
    if (k === "enrichedcontext") return false;
    return (
        k.includes("identifier") ||
        k.includes("tracking") ||
        k.includes("serial") ||
        k.includes("reference") ||
        /order(?:no|nos|id|ids|number|numbers)$/.test(k) ||
        /(?:^|_)(?:id|ids|no|nos|number|numbers)$/.test(k) ||
        /(?:id|ids|no|nos)$/.test(k)
    );
}

function countIdentifierFields(value: unknown): number {
    if (!isPlainObject(value)) return 0;
    let count = 0;
    for (const [key, child] of Object.entries(value)) {
        if (isIdentifierFieldName(key) && (typeof child === "string" || Array.isArray(child))) {
            count += 1;
        } else if (isPlainObject(child) && key.toLowerCase() !== "enrichedcontext") {
            count += countIdentifierFields(child);
        }
    }
    return count;
}

function assertGroundedIdentifier(value: string, taskIdentifiers: string[], sourceText: string): void {
    if (!value) return;
    if (taskIdentifiers.includes(value) || sourceText.includes(value)) return;
    throw new Error(`identifier_conflict: 最终调用标识「${value}」未在当前任务、原始问题或上一专家结构化结果中逐字符出现`);
}

function groundIdentifierFields(
    value: unknown,
    taskIdentifiers: string[],
    sourceText: string,
    identifierFieldCount: number
): unknown {
    if (!isPlainObject(value)) return value;
    const out: Record<string, unknown> = {};

    for (const [key, child] of Object.entries(value)) {
        if (key.toLowerCase() === "enrichedcontext") {
            out[key] = child;
            continue;
        }

        if (isIdentifierFieldName(key) && typeof child === "string") {
            if (taskIdentifiers.length > 0 && identifierFieldCount === 1) {
                if (taskIdentifiers.length !== 1) {
                    throw new Error(`identifier_conflict: 参数「${key}」是单值，但当前任务绑定了 ${taskIdentifiers.length} 个标识`);
                }
                out[key] = taskIdentifiers[0];
            } else {
                const grounded = asTrimString(child);
                assertGroundedIdentifier(grounded, taskIdentifiers, sourceText);
                out[key] = grounded;
            }
            continue;
        }

        if (isIdentifierFieldName(key) && Array.isArray(child)) {
            if (taskIdentifiers.length > 0 && identifierFieldCount === 1) {
                out[key] = [...taskIdentifiers];
            } else {
                const grounded = coerceStringArray(child);
                for (const identifier of grounded) {
                    assertGroundedIdentifier(identifier, taskIdentifiers, sourceText);
                }
                out[key] = grounded;
            }
            continue;
        }

        out[key] = isPlainObject(child)
            ? groundIdentifierFields(child, taskIdentifiers, sourceText, identifierFieldCount)
            : child;
    }

    return out;
}

async function main({
    params,
}: {
    params: {
        baseline_input_params?: unknown;
        llm_input_params?: unknown;
        llm_job?: unknown;
        taskDescription?: unknown;
        taskIdentifiers?: unknown;
        question?: unknown;
        last_step_result_json?: unknown;
    };
}): Promise<{
    input_params: Record<string, unknown>;
    merged_query: string;
    merged_inputContext: Record<string, unknown>;
    merged_inputs: Record<string, unknown>;
}> {
    const baseline = coerceObject(params.baseline_input_params);
    const llmPart = coerceObject(params.llm_input_params);
    const taskDescription = asTrimString(params.taskDescription);
    const taskIdentifiers = coerceStringArray(params.taskIdentifiers);
    const sourceText = `${asTrimString(params.question)}\n${asTrimString(params.last_step_result_json)}`;
    const identifierFieldCount = countIdentifierFields(llmPart);
    const groundedLlmPart = groundIdentifierFields(
        llmPart,
        taskIdentifiers,
        sourceText,
        identifierFieldCount
    );
    const baseIn = coerceObject(baseline.inputs);
    const inputsMerged = mergePreferRight(groundedLlmPart, baseIn);
    const merged_query = taskDescription || asTrimString(baseline.query);
    const merged: Record<string, unknown> = {
        query: merged_query,
        customerIntent: baseline.customerIntent ?? "",
        inputContext: { ...coerceObject(baseline.inputContext) },
        inputs: isPlainObject(inputsMerged) ? inputsMerged : {},
    };
    const merged_inputContext = coerceObject(merged.inputContext);
    const merged_inputs = coerceObject(merged.inputs);

    return { input_params: merged, merged_query, merged_inputContext, merged_inputs };
}
