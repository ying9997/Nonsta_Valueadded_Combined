import {
  parseCozeWorkflowUrl,
  summarizeRunHistoryResponse,
  type ParsedCozeWorkflowUrl,
} from "./coze-run-history-inspect-lib";

function printErr(msg: string): void {
  console.error(msg);
}

function getArg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  return argv[i + 1];
}

function usage(): string {
  return [
    "Usage:",
    "  npm run inspect:coze-run-history -- --url <coze-workflow-url>",
    "",
    "Environment:",
    "  COZE_API_TOKEN or COZE_WORKFLOW_PAT",
    "  COZE_API_BASE_URL defaults to https://api.coze.cn",
  ].join("\n");
}

function resolveCozeApiToken(): string {
  return (process.env.COZE_API_TOKEN ?? process.env.COZE_WORKFLOW_PAT ?? "").trim();
}

function resolveCozeApiBaseUrl(): string {
  return (process.env.COZE_API_BASE_URL ?? "https://api.coze.cn").replace(/\/$/, "");
}

async function fetchRunHistory(parsed: ParsedCozeWorkflowUrl): Promise<unknown> {
  const token = resolveCozeApiToken();
  if (!token) {
    throw new Error("Missing COZE_API_TOKEN or COZE_WORKFLOW_PAT");
  }

  const baseUrl = resolveCozeApiBaseUrl();
  const url = `${baseUrl}/v1/workflows/${parsed.apiWorkflowId}/run_histories/${parsed.executeId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Coze run history response is not JSON, HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const rawUrl = getArg(argv, "--url") ?? argv[0];
  if (!rawUrl) {
    printErr(usage());
    process.exit(2);
  }

  const parsed = parseCozeWorkflowUrl(rawUrl);
  const response = await fetchRunHistory(parsed);
  const summary = summarizeRunHistoryResponse(response, parsed);

  console.log(JSON.stringify(summary, null, 2));

  if (summary.calledValueAddExpertIds.length === 0) {
    printErr(
      [
        "[note] Main run-history output did not expose value-add expert ids.",
        "[note] This usually means the callable summary is not in the final output; inspect Trace/debug_url or node outputs next.",
      ].join("\n")
    );
  }
}

main().catch((e) => {
  printErr(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
