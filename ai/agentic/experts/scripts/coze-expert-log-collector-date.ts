import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  normalizeCapture,
  writeCollectorOutput,
  type CozeMessageRecord,
  type RawCollectorCapture,
  type RawExpertCall,
} from "./coze-expert-log-collector-lib";

interface PageResult {
  messages: CozeMessageRecord[];
  expertCalls: RawExpertCall[];
  hasMore: boolean;
  nextPageToken: string;
  traceErrors: Array<{ messageId: string; error: string }>;
}

function argValue(name: string, fallback = ""): string {
  const args = process.argv.slice(2);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] ?? fallback : fallback;
}

function browserExecutable(): string {
  if (process.platform !== "win32") return "agent-browser";
  const appData = process.env.APPDATA;
  const executable = appData
    ? path.join(appData, "npm", "node_modules", "agent-browser", "bin", "agent-browser-win32-x64.exe")
    : "";
  if (!executable || !existsSync(executable)) {
    throw new Error("agent-browser Windows executable was not found under APPDATA/npm/node_modules");
  }
  return executable;
}

function parseEvalResult(stdout: string): PageResult {
  const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index]!;
    if (!line.startsWith('"')) continue;
    try {
      const decoded = JSON.parse(line) as string;
      const parsed = JSON.parse(decoded) as PageResult;
      if (Array.isArray(parsed.messages) && Array.isArray(parsed.expertCalls)) return parsed;
    } catch {
      // Continue looking for the eval result line.
    }
  }
  throw new Error(`Unable to parse agent-browser eval result: ${stdout.slice(-1000)}`);
}

function pageScript(options: {
  spaceId: string;
  botId: string;
  startMs: string;
  endMs: string;
  pageToken: string;
  pageSize: number;
  concurrency: number;
}): string {
  return `(async function () {
    const options = ${JSON.stringify(options)};
    const headers = { "content-type": "application/json", "Agw-Js-Conv": "str" };
    const secretKeys = new Set(["authorization","cozeapitoken","accesstoken","refreshtoken","tenanttoken","tenantaccesstoken","token","cookie","setcookie","password","passwd","secret","clientsecret"]);
    const privateKeys = new Set(["consigneeemail","consigneephone","consigneename","consigneestreeone","consigneestreetone","consigneestreetwo","consigneehousenum"]);
    const normalizedKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");
    const parseMaybeJson = (value) => {
      if (typeof value !== "string") return value;
      const text = value.trim();
      if (!((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]")))) return value;
      try { return JSON.parse(text); } catch { return value; }
    };
    const sanitize = (value, seen) => {
      if (typeof value === "string") {
        const parsed = parseMaybeJson(value);
        if (parsed !== value) return sanitize(parsed, seen);
        return value
          .replace(/\\bBearer\\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
          .replace(/([?&](?:access_token|token|secret|password)=)[^&#\\s]*/gi, "$1[REDACTED]");
      }
      if (value === null || typeof value !== "object") return value;
      if (seen.has(value)) return "[CIRCULAR]";
      seen.add(value);
      if (Array.isArray(value)) return value.map((item) => sanitize(item, seen));
      const output = {};
      for (const [key, item] of Object.entries(value)) {
        const normalized = normalizedKey(key);
        if (secretKeys.has(normalized) || privateKeys.has(normalized)) continue;
        output[key] = sanitize(item, seen);
      }
      return output;
    };
    const post = async (url, body) => {
      let lastError;
      const attempts = url.includes("/trace/get/") ? 3 : 1;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const response = await fetch(url, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(body),
            signal: controller.signal
          });
          if (!response.ok) throw new Error(url + " HTTP " + response.status);
          const json = await response.json();
          if (json.code !== 0) throw new Error(url + " code=" + json.code + " msg=" + (json.msg || ""));
          return json;
        } catch (error) {
          lastError = error;
        } finally {
          clearTimeout(timeout);
        }
      }
      throw lastError;
    };
    const listBody = {
      space_id: options.spaceId,
      scene_param: { log_biz_scene: 0, entity_id: options.botId },
      query_filter: {
        status: [0, 1],
        start_time: { lte: options.endMs, gte: options.startMs },
        connector_ids: ["999", "10000010", "1024"],
        second_class_intents: []
      },
      limit: options.pageSize
    };
    if (options.pageToken) listBody.page_token = options.pageToken;
    const list = await post("/api/observe/query/list", listBody);
    const rows = Array.isArray(list.data) ? list.data : [];
    const expertCalls = [];
    const traceErrors = [];
    let cursor = 0;
    const workers = Array.from({ length: Math.min(options.concurrency, rows.length) }, async () => {
      while (cursor < rows.length) {
        const row = rows[cursor++];
        try {
          const startTime = String(row.start_time || "");
          const endTime = String(Number(startTime) + Number(row.latency || 0));
          const trace = await post("/api/observe/trace/get/" + row.trace_id, {
            space_id: options.spaceId,
            scene_param: { log_biz_scene: 0, entity_id: options.botId },
            start_time: startTime,
            end_time: endTime
          });
          let callIndex = 0;
          for (const span of trace.data?.spans || []) {
            if (String(span.name || "") !== "call-expert") continue;
            const attrKey = Object.keys(span).find((key) => key.startsWith("attr_") && span[key] && typeof span[key] === "object");
            const attr = attrKey ? span[attrKey] : {};
            expertCalls.push({
              messageId: String(row.message_id || ""),
              conversationId: String(row.conversation_id || ""),
              callIndex: callIndex++,
              nodeStatus: String(span.status ?? ""),
              input: sanitize(parseMaybeJson(attr.input), new WeakSet()),
              output: sanitize(parseMaybeJson(attr.output), new WeakSet())
            });
          }
        } catch (error) {
          traceErrors.push({ messageId: String(row.message_id || ""), error: error instanceof Error ? error.message : String(error) });
        }
      }
    });
    await Promise.all(workers);
    const messages = rows.map((row) => ({
      messageId: String(row.message_id || ""),
      conversationId: String(row.conversation_id || ""),
      userId: String(row.user_id || ""),
      userInput: String(row.input || ""),
      botOutput: String(row.output || ""),
      requestedAt: String(row.start_time || ""),
      status: String(row.status ?? ""),
      source: String(row.connector || ""),
      traceId: String(row.trace_id || ""),
      logId: String(row.log_id || ""),
      credit: row.credit ?? null,
      inputTokens: row.input_tokens ?? null,
      outputTokens: row.output_tokens ?? null,
      totalTokens: row.total_tokens ?? null,
      latencyMs: row.latency ?? null,
      firstResponseLatencyMs: row.latency_first_resp ?? null,
      spanSize: row.span_size ?? null
    }));
    return JSON.stringify({
      messages,
      expertCalls,
      traceErrors,
      hasMore: Boolean(list.has_more),
      nextPageToken: String(list.next_page_token || "")
    });
  })()`;
}

function collectPage(script: string, options: { session: string; pageUrl: string }): PageResult {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  const stdout = execFileSync(
    browserExecutable(),
    [
      "--session", options.session,
       "--restore",
       "batch", "--bail",
       `open ${options.pageUrl}`,
       `eval -b ${encoded}`,
    ],
    {
      encoding: "utf8",
      maxBuffer: 100 * 1024 * 1024,
      env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "900000" },
    },
  );
  return parseEvalResult(stdout);
}

function main(): void {
  const spaceId = argValue("--space-id", "7417755373999767571");
  const botId = argValue("--bot-id", "7447371549063626790");
  const startMs = argValue("--start-ms");
  const endMs = argValue("--end-ms");
  const outputDir = argValue("--output-dir", path.join("tmp", "coze-log-collector", `${startMs}-${endMs}`));
  const session = argValue("--session", "coze-expert-log-collector");
  const pageSize = Number(argValue("--page-size", "200"));
  const concurrency = Number(argValue("--concurrency", "6"));
  const maxPages = Number(argValue("--max-pages", "0"));
  if (!startMs || !endMs) throw new Error("--start-ms and --end-ms are required");

  const pageUrl = `https://www.coze.cn/space/${spaceId}/manage/publish/agent/${botId}` +
    `?queries_end_time=${endMs}&queries_filters=%5B%5D&queries_start_time=${startMs}` +
    `&queryTraceStatus=0%2C1&tab=logs&timeRange=5&utc=20`;
  const messages: CozeMessageRecord[] = [];
  const expertCalls: RawExpertCall[] = [];
  const traceErrors: Array<{ messageId: string; error: string }> = [];
  let pageToken = "";
  let page = 0;
  do {
    page += 1;
    const result = collectPage(pageScript({ spaceId, botId, startMs, endMs, pageToken, pageSize, concurrency }), { session, pageUrl });
    messages.push(...result.messages);
    expertCalls.push(...result.expertCalls);
    traceErrors.push(...result.traceErrors);
    pageToken = result.hasMore ? result.nextPageToken : "";
    process.stderr.write(`page=${page} messages=${messages.length} expertCalls=${expertCalls.length} traceErrors=${traceErrors.length}\n`);
  } while (pageToken && (maxPages <= 0 || page < maxPages));

  const capture: RawCollectorCapture = {
    conversationId: "",
    sourceUrl: pageUrl,
    capturedAt: new Date().toISOString(),
    messages,
    expertCalls,
    traceErrors,
  };
  const normalized = normalizeCapture(capture);
  writeCollectorOutput(outputDir, normalized);
  process.stdout.write(`${path.resolve(outputDir)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exitCode = 1;
}
