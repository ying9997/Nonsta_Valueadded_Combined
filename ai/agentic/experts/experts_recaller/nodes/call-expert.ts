/**
 * Coze 代码节点：按专家登记多维表中的 **coze_workflow_id** 调用对应专家 Coze 工作流（`POST /v1/workflow/run`）。
 * `coze_workflow_id` 由表内手工维护，工作流中通常绑定 get-expert-registry 输出行的该字段。
 *
 * 入参 params（除 workflow / token 外，下列字段须在 **顶层** 传入，缺一不可）
 * - **customerCode**、**customerIntent**（可写 **customerintent**）、**customerName**、**inputContext**（object）、**inputs**（object）、**language**、**query**、**username**
 * - **coze_workflow_id** 或 **workflow_id**：必填
 * - **coze_api_token**：可选；未传时使用文件顶部 **COZE_API_TOKEN** 常量（代码节点无 `process`）
 * - **coze_api_base_url**：可选；未传时使用文件顶部 **COZE_API_BASE_URL** 常量
 *
 * 出参（专家工作流成功返回后解析；与约定输出结构一致）
 * - **structured**：object
 * - **analysis**：string
 * - **outputContext**：{ **expertId**, **resultSummary**, **chainId** }（解析时兼容 expertld / chainld 等别名）
 * - **enrichedContext**：可选 object（专家若透出则解析）
 * - **coze_code** / **coze_msg** / **debug_url**：排错用
 */

interface CallExpertArgs {
    params: Record<string, unknown>;
}

interface OutputContextShape {
    expertId: string;
    resultSummary: string;
    chainId: string;
}

interface CallExpertOutput {
    structured: Record<string, unknown>;
    analysis: string;
    outputContext: OutputContextShape;
    /** 可选；专家结束节点若透出 enrichedContext（扁平事实），编排侧用于写入 sessionHandoff */
    enrichedContext?: Record<string, unknown>;
    coze_code: number | string;
    coze_msg: string;
    debug_url?: string;
}

const REQUIRED_PARAM_KEYS = [
    "customerCode",
    "customerIntent",
    "customerName",
    "inputContext",
    "inputs",
    "language",
    "query",
    "username",
] as const;

/** Coze PAT；代码节点无法使用 process.env，须在此填写（勿将真实令牌提交到公开仓库） */
const COZE_API_TOKEN = "";

/** 与 Coze 控制台区域一致；国内默认 api.coze.cn */
const COZE_API_BASE_URL = "https://api.coze.cn";

function asTrimString(v: unknown): string {
    if (v === undefined || v === null) return "";
    return String(v).trim();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Coze 常将 data 为 JSON 字符串再包一层 */
function parseWorkflowRunDataField(data: unknown): unknown {
    if (data == null) return null;
    if (typeof data !== "string") return data;
    try {
        const once = JSON.parse(data) as unknown;
        if (typeof once === "string") {
            try {
                return JSON.parse(once) as unknown;
            } catch {
                return once;
            }
        }
        return once;
    } catch {
        return data;
    }
}

/** 仅从顶层 params 组装 Coze workflow/run 的 parameters（不再读取 workflow_parameters / parameters 包裹） */
function buildWorkflowParameters(p: Record<string, unknown>): Record<string, unknown> {
    const merged: Record<string, unknown> = {};
    for (const k of REQUIRED_PARAM_KEYS) {
        if (p[k] !== undefined) merged[k] = p[k];
    }
    if (merged.customerIntent === undefined) {
        if (p.customerintent !== undefined) merged.customerIntent = p.customerintent;
        else if (p.CustomerIntent !== undefined) merged.customerIntent = p.CustomerIntent;
    }
    return merged;
}

function validateWorkflowParameters(m: Record<string, unknown>): void {
    const missing: string[] = [];
    for (const k of REQUIRED_PARAM_KEYS) {
        if (m[k] === undefined || m[k] === null) missing.push(k);
    }
    if (missing.length > 0) {
        throw new Error(`调用专家工作流缺少必填 parameters 字段: ${missing.join(", ")}`);
    }
    if (!isPlainObject(m.inputContext)) {
        throw new Error("inputContext 须为 object");
    }
    if (!isPlainObject(m.inputs)) {
        throw new Error("inputs 须为 object");
    }
    for (const k of ["customerCode", "customerName", "language", "query", "username"] as const) {
        if (asTrimString(m[k]) === "") {
            throw new Error(`parameters.${k} 不能为空字符串`);
        }
    }
    if (asTrimString(m.customerIntent) === "") {
        throw new Error("parameters.customerIntent 不能为空字符串");
    }
}

/** 从工作流返回中取出约定输出；兼容 Output 包裹、outputContext 内 expertld/chainld 别名 */
function extractExpertOutputShape(raw: unknown): Pick<
    CallExpertOutput,
    "structured" | "analysis" | "outputContext" | "enrichedContext"
> {
    let o = parseWorkflowRunDataField(raw);
    if (typeof o === "string") {
        try {
            o = JSON.parse(o) as unknown;
        } catch {
            throw new Error("专家工作流 data 无法解析为 JSON 对象");
        }
    }
    if (!isPlainObject(o)) {
        throw new Error("专家工作流 data 须为 JSON 对象");
    }
    const root = o as Record<string, unknown>;
    const payload = isPlainObject(root.Output)
        ? (root.Output as Record<string, unknown>)
        : isPlainObject(root.output)
          ? (root.output as Record<string, unknown>)
          : root;

    const structured = payload.structured;
    if (!isPlainObject(structured)) {
        throw new Error("专家工作流返回缺少 structured（须为 object）");
    }

    const analysis =
        typeof payload.analysis === "string" ? payload.analysis : String(payload.analysis ?? "");

    const ocRaw = payload.outputContext ?? payload.outputcontext;
    if (!isPlainObject(ocRaw)) {
        throw new Error("专家工作流返回缺少 outputContext（须为 object）");
    }
    const oc = ocRaw as Record<string, unknown>;
    const expertId = asTrimString(oc.expertId ?? oc.expertid ?? oc.expertld);
    const resultSummary = asTrimString(oc.resultSummary ?? oc.result_summary);
    const chainId = asTrimString(oc.chainId ?? oc.chainid ?? oc.chainld);
    if (!expertId || !resultSummary) {
        throw new Error(
            "outputContext 须包含非空 expertId、resultSummary（兼容 expertld 等键名）；chainId 允许为空串"
        );
    }

    const ecRaw = payload.enrichedContext ?? payload.enrichedcontext;
    let enrichedContext: Record<string, unknown> | undefined;
    if (ecRaw !== undefined && ecRaw !== null && isPlainObject(ecRaw)) {
        enrichedContext = { ...(ecRaw as Record<string, unknown>) };
    }

    const result: Pick<
        CallExpertOutput,
        "structured" | "analysis" | "outputContext" | "enrichedContext"
    > = {
        structured: { ...structured },
        analysis,
        outputContext: { expertId, resultSummary, chainId },
    };
    if (enrichedContext !== undefined) result.enrichedContext = enrichedContext;
    return result;
}

async function main({ params }: CallExpertArgs): Promise<CallExpertOutput> {
    const p = params ?? {};
    const workflowId = asTrimString(p.coze_workflow_id ?? p.workflow_id);
    if (!workflowId) {
        throw new Error("缺少 coze_workflow_id（或 workflow_id）；请绑定专家登记表中的 coze_workflow_id");
    }

    const apiToken = asTrimString(p.coze_api_token) || COZE_API_TOKEN.trim();
    if (!apiToken) {
        throw new Error("缺少 coze_api_token：请在文件顶部将 COZE_API_TOKEN 填写为 Coze PAT，或在 params.coze_api_token 传入");
    }

    const parameters = buildWorkflowParameters(p);
    validateWorkflowParameters(parameters);

    const baseUrl = (asTrimString(p.coze_api_base_url) || COZE_API_BASE_URL).replace(/\/$/, "");
    const url = `${baseUrl}/v1/workflow/run`;

    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            workflow_id: workflowId,
            parameters,
        }),
    });

    const text = await res.text();
    let body: Record<string, unknown>;
    try {
        body = JSON.parse(text) as Record<string, unknown>;
    } catch {
        throw new Error(`Coze workflow/run 响应非 JSON（HTTP ${res.status}）: ${text.slice(0, 500)}`);
    }

    const coze_code = body.code ?? -1;
    const coze_msg = String(body.msg ?? body.message ?? "");
    const debug_url = body.debug_url != null ? String(body.debug_url) : undefined;

    if (!res.ok) {
        throw new Error(`Coze workflow/run HTTP ${res.status}: ${coze_msg || text.slice(0, 500)}${debug_url ? ` ${debug_url}` : ""}`);
    }

    if (coze_code !== 0 && coze_code !== "0") {
        throw new Error(`Coze workflow 失败 code=${String(coze_code)} msg=${coze_msg}${debug_url ? ` ${debug_url}` : ""}`);
    }

    const parsed = extractExpertOutputShape(body.data);

    return {
        ...parsed,
        coze_code,
        coze_msg,
        debug_url,
    };
}
