/**
 * Coze POST /v1/workflow/run for expert sub-workflows.
 * Mirrors experts_recaller/nodes/call-expert.ts validation and response parsing.
 */

import type { ExpertRunResult } from "./types";
import { parseCozeDebugUrl } from "../coze-run-history-inspect-lib";

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

function asTrimString(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Coze 常将 data 为 JSON 字符串再包一层 */
export function parseWorkflowRunDataField(data: unknown): unknown {
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

export function buildWorkflowParameters(p: Record<string, unknown>): Record<string, unknown> {
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

export function validateWorkflowParameters(m: Record<string, unknown>): void {
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

export function extractExpertOutputShape(raw: unknown): Pick<
  ExpertRunResult,
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

  const result: Pick<ExpertRunResult, "structured" | "analysis" | "outputContext" | "enrichedContext"> = {
    structured: { ...structured },
    analysis,
    outputContext: { expertId, resultSummary, chainId },
  };
  if (enrichedContext !== undefined) result.enrichedContext = enrichedContext;
  return result;
}

export function resolveCozeApiToken(): string {
  const t = (process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "").trim();
  return t;
}

export function resolveCozeApiBaseUrl(): string {
  return (process.env.COZE_API_BASE_URL ?? "https://api.coze.cn").replace(/\/$/, "");
}

export interface RunExpertWorkflowOptions {
  workflowId: string;
  parameters: Record<string, unknown>;
}

export async function runExpertWorkflow(opts: RunExpertWorkflowOptions): Promise<ExpertRunResult> {
  const apiToken = resolveCozeApiToken();
  if (!apiToken) {
    throw new Error("缺少 COZE_API_TOKEN 或 COZE_WORKFLOW_PAT");
  }

  const parameters = buildWorkflowParameters(opts.parameters);
  validateWorkflowParameters(parameters);

  const baseUrl = resolveCozeApiBaseUrl();
  const url = `${baseUrl}/v1/workflow/run`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workflow_id: opts.workflowId,
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
  const execute_id = debug_url ? parseCozeDebugUrl(debug_url).executeId || undefined : undefined;

  if (!res.ok) {
    throw new Error(
      `Coze workflow/run HTTP ${res.status}: ${coze_msg || text.slice(0, 500)}${debug_url ? ` ${debug_url}` : ""}`
    );
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
    execute_id,
  };
}
