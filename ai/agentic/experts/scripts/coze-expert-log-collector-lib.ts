import fs from "node:fs";
import path from "node:path";

export interface CozeMessageRecord {
  messageId: string;
  conversationId: string;
  userId: string;
  userInput: string;
  botOutput: string;
  requestedAt: string;
  status: string;
  source: string;
}

export interface RawExpertCall {
  messageId: string;
  conversationId: string;
  callIndex: number;
  nodeStatus?: string;
  input: unknown;
  output: unknown;
}

export interface ExpertCallRecord extends RawExpertCall {
  expertId: string;
  workflowId: string;
  executeId: string;
  spaceId: string;
  debugUrl: string;
}

export interface RawCollectorCapture {
  conversationId: string;
  sourceUrl: string;
  capturedAt: string;
  messages: CozeMessageRecord[];
  expertCalls: RawExpertCall[];
  traceErrors?: Array<{ messageId: string; error: string }>;
}

export interface CollectorOutput extends Omit<RawCollectorCapture, "expertCalls"> {
  expertCalls: ExpertCallRecord[];
}

const SECRET_KEYS = new Set([
  "authorization",
  "cozeapitoken",
  "accesstoken",
  "refreshtoken",
  "tenanttoken",
  "tenantaccesstoken",
  "token",
  "cookie",
  "setcookie",
  "password",
  "passwd",
  "secret",
  "clientsecret",
]);

const PRIVATE_KEYS = new Set([
  "consigneeemail",
  "consigneephone",
  "consigneename",
  "consigneestreeone",
  "consigneestreetone",
  "consigneestreetwo",
  "consigneehousenum",
]);

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shouldRemoveKey(key: string): boolean {
  const normalized = normalizedKey(key);
  return SECRET_KEYS.has(normalized) || PRIVATE_KEYS.has(normalized);
}

function sanitizeString(value: string, seen: WeakSet<object>): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      return JSON.stringify(sanitizeValue(JSON.parse(trimmed) as unknown, seen));
    } catch {
      // Keep non-JSON text and apply defensive pattern redaction below.
    }
  }

  return value
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(
      /\b(authorization|coze[_-]?api[_-]?token|access[_-]?token|refresh[_-]?token|tenant[_-]?(?:access[_-]?)?token|token|cookie|password|passwd|secret)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;}]+)/gi,
      "$1=[REDACTED]",
    )
    .replace(/([?&](?:access_token|token|secret|password)=)[^&#\s]*/gi, "$1[REDACTED]");
}

function sanitizeValue(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return sanitizeString(value, seen);
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (shouldRemoveKey(key)) continue;
    result[key] = sanitizeValue(item, seen);
  }
  return result;
}

/** Removes secrets and unnecessary consignee PII before any value is persisted. */
export function sanitizeForPersistence<T>(value: T): T {
  return sanitizeValue(value, new WeakSet<object>()) as T;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

export function parseDebugUrl(rawUrl: unknown): Pick<ExpertCallRecord, "debugUrl" | "workflowId" | "executeId" | "spaceId"> {
  const debugUrl = asString(rawUrl).trim();
  if (!debugUrl) return { debugUrl: "", workflowId: "", executeId: "", spaceId: "" };
  try {
    const url = new URL(debugUrl);
    return {
      debugUrl,
      workflowId: url.searchParams.get("workflow_id") ?? "",
      executeId: url.searchParams.get("execute_id") ?? "",
      spaceId: url.searchParams.get("space_id") ?? "",
    };
  } catch {
    return { debugUrl, workflowId: "", executeId: "", spaceId: "" };
  }
}

export function parseCallExpertRefs(snapshot: string): string[] {
  const lines = snapshot.split(/\r?\n/);
  const refs: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index]?.includes("call-expert")) continue;
    for (let cursor = index; cursor >= Math.max(0, index - 3); cursor -= 1) {
      const match = lines[cursor]?.match(/(@e\d+)\s+\[button\]/);
      if (match?.[1]) {
        refs.push(match[1]);
        break;
      }
    }
  }
  return Array.from(new Set(refs));
}

export function normalizeCapture(raw: RawCollectorCapture): CollectorOutput {
  const sanitized = sanitizeForPersistence(raw);
  const conversationId = asString(sanitized.conversationId);
  const messages = (sanitized.messages ?? []).map((message) => ({
    ...message,
    messageId: asString(message.messageId),
    conversationId: asString(message.conversationId || conversationId),
    userId: asString(message.userId),
  }));

  const expertCalls = (sanitized.expertCalls ?? []).map((call) => {
    const output = asRecord(call.output);
    const input = asRecord(call.input);
    const outputContext = asRecord(output.outputContext);
    const parsedUrl = parseDebugUrl(output.debug_url ?? output.debugUrl);
    return {
      ...call,
      messageId: asString(call.messageId),
      conversationId: asString(call.conversationId || conversationId),
      callIndex: Number.isFinite(call.callIndex) ? call.callIndex : 0,
      expertId: asString(outputContext.expertId ?? output.expert_id ?? input.expertId),
      workflowId: parsedUrl.workflowId || asString(output.workflow_id ?? input.coze_workflow_id),
      executeId: parsedUrl.executeId || asString(output.execute_id),
      spaceId: parsedUrl.spaceId || asString(output.space_id),
      debugUrl: parsedUrl.debugUrl,
    };
  });

  return { ...sanitized, conversationId, messages, expertCalls };
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function csvCell(value: unknown): string {
  const text = value === undefined || value === null
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function writeCsv<T extends object>(filePath: string, headers: string[], rows: T[]): void {
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) {
    const record = row as Record<string, unknown>;
    lines.push(headers.map((header) => csvCell(record[header])).join(","));
  }
  fs.writeFileSync(filePath, `\uFEFF${lines.join("\r\n")}\r\n`, "utf8");
}

export function writeCollectorOutput(outputDir: string, capture: CollectorOutput): void {
  fs.mkdirSync(outputDir, { recursive: true });
  writeJson(path.join(outputDir, "messages.json"), capture.messages);
  writeJson(path.join(outputDir, "expert-calls.json"), capture.expertCalls);
  writeJson(path.join(outputDir, "trace-errors.json"), capture.traceErrors ?? []);
  writeJson(path.join(outputDir, "summary.json"), {
    conversationId: capture.conversationId,
    sourceUrl: capture.sourceUrl,
    capturedAt: capture.capturedAt,
    messageCount: capture.messages.length,
    expertCallCount: capture.expertCalls.length,
    traceErrorCount: capture.traceErrors?.length ?? 0,
    messageIds: capture.messages.map((item) => item.messageId),
  });

  writeCsv(path.join(outputDir, "messages.csv"), [
    "messageId", "conversationId", "userId", "userInput", "botOutput", "requestedAt", "status", "source",
  ], capture.messages);
  writeCsv(path.join(outputDir, "expert-calls.csv"), [
    "messageId", "conversationId", "callIndex", "expertId", "workflowId", "executeId", "spaceId", "debugUrl", "nodeStatus", "input", "output",
  ], capture.expertCalls);
}
