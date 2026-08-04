export interface ParsedCozeWorkflowUrl {
  apiWorkflowId: string;
  pageWorkflowId: string;
  publishId: string;
  executeId: string;
  nodeId: string;
  subExecuteId: string;
}

export interface ParsedCozeDebugUrl {
  executeId: string;
  workflowId: string;
  spaceId: string;
}

export interface RunHistoryRecordSummary {
  executeId: string;
  executeStatus: string;
  createTime: number | null;
  createTimeShanghai: string;
  updateTime: number | null;
  updateTimeShanghai: string;
  outputPresent: boolean;
  outputLength: number;
  isOutputTrimmed: boolean | null;
  debugUrlPresent: boolean;
  debugUrl: string;
  errorCode: string;
  errorMessagePresent: boolean;
  usage: unknown;
  calledValueAddExpertIds: string[];
}

export interface RunHistorySummary {
  apiCode: unknown;
  apiMessage: string;
  apiWorkflowId: string;
  pageWorkflowId: string;
  publishId: string;
  executeId: string;
  debugUrls: string[];
  calledValueAddExpertIds: string[];
  records: RunHistoryRecordSummary[];
}

function asString(v: unknown): string {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  return v as Record<string, unknown>;
}

function uniqueSorted(items: string[]): string[] {
  return Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));
}

export function parseCozeWorkflowUrl(rawUrl: string): ParsedCozeWorkflowUrl {
  const u = new URL(rawUrl);
  const version = u.searchParams.get("version") ?? "";
  const versionMatch = version.match(/^Bot_(\d+)_Publish_(\d+)$/);
  const pageWorkflowId = asString(u.searchParams.get("workflow_id"));
  const apiWorkflowId = versionMatch?.[1] ?? pageWorkflowId;
  const publishId = versionMatch?.[2] ?? "";
  const executeId = asString(u.searchParams.get("execute_id"));

  if (!apiWorkflowId) {
    throw new Error("Coze URL missing workflow_id or version=Bot_<id>_Publish_<id>");
  }
  if (!executeId) {
    throw new Error("Coze URL missing execute_id");
  }

  return {
    apiWorkflowId,
    pageWorkflowId,
    publishId,
    executeId,
    nodeId: asString(u.searchParams.get("node_id")),
    subExecuteId: asString(u.searchParams.get("sub_execute_id")),
  };
}

export function parseCozeDebugUrl(rawUrl: string): ParsedCozeDebugUrl {
  const u = new URL(rawUrl);
  return {
    executeId: asString(u.searchParams.get("execute_id")),
    workflowId: asString(u.searchParams.get("workflow_id")),
    spaceId: asString(u.searchParams.get("space_id")),
  };
}

function maybeParseJsonString(v: string): unknown | null {
  const s = v.trim();
  if (!s || (!s.startsWith("{") && !s.startsWith("[") && !s.startsWith("\""))) return null;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

function collectValueAddExpertIds(value: unknown, out: string[], seen: Set<unknown>): void {
  if (value === undefined || value === null) return;

  if (typeof value === "string") {
    const matches = value.match(/\bvalue-add-[a-z0-9-]+\b/g);
    if (matches) out.push(...matches);
    const parsed = maybeParseJsonString(value);
    if (parsed !== null && !seen.has(parsed)) {
      seen.add(parsed);
      collectValueAddExpertIds(parsed, out, seen);
    }
    return;
  }

  if (typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) collectValueAddExpertIds(item, out, seen);
    return;
  }

  for (const item of Object.values(value as Record<string, unknown>)) {
    collectValueAddExpertIds(item, out, seen);
  }
}

export function extractValueAddExpertIds(value: unknown): string[] {
  const out: string[] = [];
  collectValueAddExpertIds(value, out, new Set<unknown>());
  return uniqueSorted(out);
}

function toNumberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toShanghaiTime(epochSeconds: number | null): string {
  if (epochSeconds === null) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(epochSeconds * 1000));
}

function outputLength(v: unknown): number {
  if (v === undefined || v === null) return 0;
  if (typeof v === "string") return v.length;
  try {
    return JSON.stringify(v).length;
  } catch {
    return -1;
  }
}

function summarizeRecord(row: Record<string, unknown>): RunHistoryRecordSummary {
  const createTime = toNumberOrNull(row.create_time);
  const updateTime = toNumberOrNull(row.update_time);
  const recordExpertIds = extractValueAddExpertIds(row);
  return {
    executeId: asString(row.execute_id),
    executeStatus: asString(row.execute_status),
    createTime,
    createTimeShanghai: toShanghaiTime(createTime),
    updateTime,
    updateTimeShanghai: toShanghaiTime(updateTime),
    outputPresent: row.output !== undefined && row.output !== null && row.output !== "",
    outputLength: outputLength(row.output),
    isOutputTrimmed: typeof row.is_output_trimmed === "boolean" ? row.is_output_trimmed : null,
    debugUrlPresent: asString(row.debug_url) !== "",
    debugUrl: asString(row.debug_url),
    errorCode: asString(row.error_code),
    errorMessagePresent: asString(row.error_message) !== "",
    usage: row.usage,
    calledValueAddExpertIds: recordExpertIds,
  };
}

export function summarizeRunHistoryResponse(
  response: unknown,
  parsedUrl: Pick<ParsedCozeWorkflowUrl, "apiWorkflowId" | "pageWorkflowId" | "publishId" | "executeId">
): RunHistorySummary {
  const root = asRecord(response);
  if (!root) {
    throw new Error("Coze run history response must be an object");
  }

  const data = root.data;
  const rows = Array.isArray(data) ? data : data !== undefined ? [data] : [];
  const records = rows
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map(summarizeRecord);

  return {
    apiCode: root.code,
    apiMessage: asString(root.msg ?? root.message),
    apiWorkflowId: parsedUrl.apiWorkflowId,
    pageWorkflowId: parsedUrl.pageWorkflowId,
    publishId: parsedUrl.publishId,
    executeId: parsedUrl.executeId,
    debugUrls: uniqueSorted(records.map((row) => row.debugUrl).filter(Boolean)),
    calledValueAddExpertIds: uniqueSorted(records.flatMap((row) => row.calledValueAddExpertIds)),
    records,
  };
}
