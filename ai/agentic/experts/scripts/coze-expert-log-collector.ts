import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  normalizeCapture,
  parseCallExpertRefs,
  writeCollectorOutput,
  type CozeMessageRecord,
  type RawCollectorCapture,
  type RawExpertCall,
} from "./coze-expert-log-collector-lib";

interface CliOptions {
  conversationId: string;
  pageUrl: string;
  outputDir: string;
  session: string;
  inputFile: string;
  allowDedicatedBrowser: boolean;
}

function argValue(argv: string[], name: string): string {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] ?? "" : "";
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function usage(): string {
  return [
    "Usage:",
    "  npx ts-node -P scripts/tsconfig.json scripts/coze-expert-log-collector.ts --conversation-id <id> --page-url <coze-log-url> --allow-dedicated-browser",
    "  npx ts-node -P scripts/tsconfig.json scripts/coze-expert-log-collector.ts --input <raw-capture.json>",
    "",
    "Options:",
    "  --output-dir <dir>  Defaults to tmp/coze-log-collector/<timestamp>",
    "  --session <name>     Isolated agent-browser session; defaults to coze-expert-log-collector",
    "  --allow-dedicated-browser  Required for live mode; prevents accidental external-browser use",
    "",
    "The live mode uses a dedicated agent-browser profile. It never connects to Chrome/Edge.",
    "Run it only after the dedicated session has been signed in to www.coze.cn.",
  ].join("\n");
}

function parseOptions(argv: string[]): CliOptions {
  const inputFile = argValue(argv, "--input");
  const conversationId = argValue(argv, "--conversation-id");
  const pageUrl = argValue(argv, "--page-url");
  if (!inputFile && (!conversationId || !pageUrl)) throw new Error(usage());
  return {
    inputFile,
    conversationId,
    pageUrl,
    outputDir: argValue(argv, "--output-dir") || path.join("tmp", "coze-log-collector", timestamp()),
    session: argValue(argv, "--session") || "coze-expert-log-collector",
    allowDedicatedBrowser: argv.includes("--allow-dedicated-browser"),
  };
}

function browserExecutable(): string {
  return process.platform === "win32" ? "agent-browser.cmd" : "agent-browser";
}

function browserCommand(session: string, args: string[], raw = false): string {
  const stdout = execFileSync(browserExecutable(), ["--session", session, "--restore", ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 20 * 1024 * 1024,
  }).trim();
  if (raw) return stdout;
  return stdout;
}

function evaluate<T>(session: string, script: string): T {
  const encoded = Buffer.from(script, "utf8").toString("base64");
  const stdout = browserCommand(session, ["eval", "-b", encoded]);
  let value: unknown = JSON.parse(stdout);
  if (typeof value === "string") {
    try { value = JSON.parse(value) as unknown; } catch { /* already a scalar string */ }
  }
  return value as T;
}

const EXTRACT_MESSAGES_SCRIPT = String.raw`JSON.stringify((() => {
  const normalize = (value) => (value || "").replace(/\s+/g, " ").trim();
  const tables = Array.from(document.querySelectorAll("table, .semi-table"));
  const table = tables.find((candidate) => normalize(candidate.textContent).includes("消息 ID") && normalize(candidate.textContent).includes("会话 ID"));
  if (!table) throw new Error("Coze log table not found");
  const tableContainer = table.closest(".semi-table-container") || table.parentElement || table;
  const headers = Array.from(table.querySelectorAll("thead th, .semi-table-thead .semi-table-row-head")).map((cell) => normalize(cell.textContent));
  const allRows = Array.from(tableContainer.querySelectorAll("tbody tr, .semi-table-tbody .semi-table-row"));
  return allRows.map((row) => {
    const cells = Array.from(row.querySelectorAll("td, .semi-table-row-cell")).map((cell) => normalize(cell.textContent));
    const byHeader = Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
    const messageId = byHeader["消息 ID"] || cells.find((cell) => /^\d{16,20}$/.test(cell)) || "";
    const conversationId = byHeader["会话 ID"] || "";
    if (!messageId || !conversationId) return null;
    return {
      messageId,
      conversationId,
      userId: byHeader["用户 ID"] || "",
      userInput: byHeader["用户输入"] || "",
      botOutput: byHeader["输出"] || "",
      requestedAt: byHeader["请求发起时间"] || "",
      status: (cells[0] || "").trim(),
      source: byHeader["来源"] || byHeader["渠道"] || ""
    };
  }).filter(Boolean);
})())`;

function clickMessage(session: string, messageId: string): void {
  const script = `(() => {
    const target = Array.from(document.querySelectorAll("td, [role=gridcell]")).find((el) => (el.textContent || "").trim() === ${JSON.stringify(messageId)});
    if (!target) throw new Error("Message row not found: ${messageId}");
    (target.closest("tr") || target).click();
    return true;
  })()`;
  evaluate<boolean>(session, script);
  browserCommand(session, ["wait", "--text", messageId]);
}

function callExpertRefs(session: string): string[] {
  const snapshot = browserCommand(session, ["snapshot", "-i"]);
  return parseCallExpertRefs(snapshot);
}

function clickCallExpert(session: string, index: number): void {
  const refs = callExpertRefs(session);
  const ref = refs[index];
  if (!ref) throw new Error(`call-expert node ${index} not found in accessibility snapshot`);
  browserCommand(session, ["click", ref]);
  browserCommand(session, ["wait", "--text", "名称 :"]);
}

function copyNodeSection(session: string, prefix: "input--" | "output--"): unknown {
  const clicked = evaluate<boolean>(session, `(() => {
    const section = Array.from(document.querySelectorAll("div")).find((el) => typeof el.className === "string" && el.className.split(" ").some((name) => name.startsWith(${JSON.stringify(prefix)})));
    const button = section && section.querySelector("button");
    if (!button) return false;
    button.click();
    return true;
  })()`);
  if (!clicked) return {};
  const text = browserCommand(session, ["clipboard", "read"], true);
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

function collectLive(options: CliOptions): RawCollectorCapture {
  if (!options.allowDedicatedBrowser) {
    throw new Error(
      "Live collection needs a dedicated agent-browser Chromium session. " +
      "It cannot control the Codex in-app browser from a standalone Node process. " +
      "Use --input for an in-app-browser capture, or explicitly pass --allow-dedicated-browser.",
    );
  }
  const url = new URL(options.pageUrl);
  url.searchParams.set("tab", "logs");
  url.searchParams.set("queryTraceSessionIds", options.conversationId);
  browserCommand(options.session, ["open", url.toString()]);
  browserCommand(options.session, ["wait", "--text", "消息 ID"]);

  const messages = evaluate<CozeMessageRecord[]>(options.session, EXTRACT_MESSAGES_SCRIPT)
    .filter((message) => message.conversationId === options.conversationId);
  const expertCalls: RawExpertCall[] = [];

  for (const message of messages) {
    clickMessage(options.session, message.messageId);
    const callCount = callExpertRefs(options.session).length;
    for (let callIndex = 0; callIndex < callCount; callIndex += 1) {
      clickCallExpert(options.session, callIndex);
      expertCalls.push({
        messageId: message.messageId,
        conversationId: message.conversationId,
        callIndex,
        input: copyNodeSection(options.session, "input--"),
        output: copyNodeSection(options.session, "output--"),
      });
    }
  }

  return {
    conversationId: options.conversationId,
    sourceUrl: url.toString(),
    capturedAt: new Date().toISOString(),
    messages,
    expertCalls,
  };
}

function main(): void {
  const options = parseOptions(process.argv.slice(2));
  const raw = options.inputFile
    ? JSON.parse(fs.readFileSync(options.inputFile, "utf8")) as RawCollectorCapture
    : collectLive(options);
  const normalized = normalizeCapture(raw);
  writeCollectorOutput(options.outputDir, normalized);
  process.stdout.write(`${path.resolve(options.outputDir)}\n`);
}

try {
  main();
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
