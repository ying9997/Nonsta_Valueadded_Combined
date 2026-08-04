/**
 * 在 queue-next-job-prepare 之前执行：根据 sessionHandoff 末步与 chainContext 生成「专家调用骨架」，
 * 供 merge-queue-input-params 与 LLM 输出深度合并；链式字段由本节点锁定，LLM 不可覆盖。
 *
 * 入参 params
 * - sessionHandoff：与 check-planner-output / post-expert-output 同形
 * - manifest：可选；本步专家 registry 解析后的 manifest 对象（与 resolve-next-queue-job.manifest 一致）
 * - expertId：本步待执行专家 id（resolve-next-queue-job.expertId），便于排障；注入逻辑不依赖硬编码 id
 * - chainContext：当前环内 chainContext（与 resolve 输出一致）
 * - taskDescription：可选；用于预填顶层 query
 *
 * 出参
 * - baseline_input_params：{ query, customerIntent, inputContext: { chainId, sourceExpertId, previousOutput }, inputs? }
 *   当 manifest.x_recaller_propagate_previous_enriched_context === true 时，预填 inputs.enrichedContext
 *   为「域索引」结构（见 docs/design-spec.md §8）：键为 `{domain}/{expertId}`，值为按时间顺序追加的快照数组。
 * - expertDomain：manifest.domain，供 post-expert-output 写入 sessionHandoff.steps[].expertDomain
 *
 * Coze：整文件粘贴；内联 main。
 */

const RECALLER_FLAG_PROPAGATE_ENRICHED = "x_recaller_propagate_previous_enriched_context";

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function parseChainFromObj(o: Record<string, unknown>): { chainId: string } {
    return { chainId: asTrimString(o.chainId ?? o.chain_id) };
}

function coerceChainContext(raw: unknown): { chainId: string } {
    const empty = (): { chainId: string } => ({ chainId: "" });
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

function coerceManifestRecord(raw: unknown): Record<string, unknown> | null {
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

function manifestPropagatePreviousEnrichedContext(manifest: Record<string, unknown> | null): boolean {
    if (!manifest) return false;
    const v = manifest[RECALLER_FLAG_PROPAGATE_ENRICHED];
    return v === true;
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

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

function lastStepPayload(handoff: Record<string, unknown>): {
    previousOutput: Record<string, unknown>;
    sourceExpertId: string;
} {
    const steps = Array.isArray(handoff.steps) ? handoff.steps : [];
    const last = steps.length > 0 ? steps[steps.length - 1] : null;
    if (last === null || typeof last !== "object" || Array.isArray(last)) {
        return { previousOutput: {}, sourceExpertId: "" };
    }
    const step = last as Record<string, unknown>;
    const sourceExpertId = asTrimString(step.expertId ?? step.expert_id);
    const res = step.result;
    let previousOutput: Record<string, unknown> = {};
    if (res !== undefined && res !== null && typeof res === "object" && !Array.isArray(res)) {
        previousOutput = res as Record<string, unknown>;
    }
    return {
        previousOutput,
        sourceExpertId,
    };
}

/**
 * 扫描 sessionHandoff.steps，将每步的扁平 enrichedContext 归并为域索引：
 * 键 `{expertDomain}/{expertId}`（缺 domain 时用 `unknown`），同键多次调用追加为数组，保留历史。
 */
function buildDomainIndexedEnrichedContext(handoff: Record<string, unknown>): Record<string, unknown[]> | undefined {
    const steps = Array.isArray(handoff.steps) ? handoff.steps : [];
    const index: Record<string, unknown[]> = {};

    for (let i = 0; i < steps.length; i++) {
        const raw = steps[i];
        if (raw === null || typeof raw !== "object" || Array.isArray(raw)) continue;
        const step = raw as Record<string, unknown>;
        const ec = step.enrichedContext;
        if (ec === undefined || ec === null || !isPlainObject(ec)) continue;

        const expertPart = asTrimString(step.expertId ?? step.expert_id);
        if (!expertPart) continue;
        const domainPart = asTrimString(step.expertDomain ?? step.expert_domain);
        const domainSeg = domainPart || "unknown";
        const domainKey = `${domainSeg}/${expertPart}`;

        const flat = { ...ec };
        delete flat._meta;
        const at = asTrimString(step.at);
        const entry: Record<string, unknown> = {
            _meta: { stepIndex: i, at },
            ...flat,
        };

        if (!index[domainKey]) index[domainKey] = [];
        index[domainKey]!.push(entry);
    }

    return Object.keys(index).length > 0 ? index : undefined;
}

async function main({
    params,
}: {
    params: {
        sessionHandoff?: unknown;
        manifest?: unknown;
        expertId?: unknown;
        chainContext?: unknown;
        taskDescription?: unknown;
    };
}): Promise<{
    baseline_input_params: Record<string, unknown>;
    expertDomain: string;
}> {
    const chain = coerceChainContext(params.chainContext);
    const sessionHandoff = normalizeSessionHandoff(params.sessionHandoff, chain.chainId);
    const { previousOutput, sourceExpertId } = lastStepPayload(sessionHandoff);
    const taskDescription = asTrimString(params.taskDescription);
    const manifestRec = coerceManifestRecord(params.manifest);
    const propagatedIndex = buildDomainIndexedEnrichedContext(sessionHandoff);

    const inputContext: Record<string, unknown> = {
        chainId: chain.chainId || asTrimString(sessionHandoff.chainId as string),
        sourceExpertId,
        previousOutput,
    };

    const baseline: Record<string, unknown> = {
        query: taskDescription,
        customerIntent: "",
        inputContext,
        inputs: {} as Record<string, unknown>,
    };

    if (manifestPropagatePreviousEnrichedContext(manifestRec) && propagatedIndex !== undefined) {
        baseline.inputs = { enrichedContext: propagatedIndex };
    }

    const expertDomain = asTrimString(manifestRec?.domain);

    return { baseline_input_params: baseline, expertDomain };
}
