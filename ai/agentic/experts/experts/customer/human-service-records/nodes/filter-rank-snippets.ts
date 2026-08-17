/**
 * 已由 build-summary-evidence 替代的兼容节点。
 * 保留旧节点名，避免旧画布导入时报错；绝不再构造或返回完整 transcript。
 */

interface MessageTurnLite {
  conversationId?: string;
  recordId?: string;
  timestamp?: string;
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function inWindow(turn: MessageTurnLite, scope: Record<string, unknown>): boolean {
  const window = scope.timeWindow && typeof scope.timeWindow === "object" ? scope.timeWindow as Record<string, unknown> : {};
  const timestamp = text(turn.timestamp);
  const start = text(window.start);
  const end = text(window.end);
  return !timestamp || !start || !end || (timestamp >= start && timestamp <= end);
}

async function main({ params }: { params: Record<string, unknown> }) {
  const turns = Array.isArray(params.messageTurns) ? params.messageTurns as MessageTurnLite[] : [];
  const scope = params.queryScope && typeof params.queryScope === "object" ? params.queryScope as Record<string, unknown> : {};
  const records = params.humanServiceRecords && typeof params.humanServiceRecords === "object"
    ? params.humanServiceRecords as Record<string, unknown>
    : {};
  const matched = turns.filter((turn) => inWindow(turn, scope));
  const conversationIds = new Set(matched.map((turn, index) => text(turn.conversationId) || text(turn.recordId) || `unknown-${index}`));
  const fetchStatus = text(records.fetchStatus);
  const answerStatus = fetchStatus && fetchStatus !== "ok"
    ? fetchStatus
    : turns.length === 0
      ? "no_records"
      : matched.length === 0
        ? "no_match"
        : "found";
  const rankedSnippets = {
    answerStatus,
    matchedConversationCount: conversationIds.size,
    matchedMessageCount: matched.length,
    recordsTruncated: records.recordsTruncated === true,
    summarySnippetsTruncated: false,
    snippets: [],
  };
  return {
    rankedSnippets,
    llmAnswerContext: {
      answerStatus,
      matchedConversationCount: rankedSnippets.matchedConversationCount,
      matchedMessageCount: rankedSnippets.matchedMessageCount,
      recordsTruncated: rankedSnippets.recordsTruncated,
      instruction: "This compatibility node never exposes a full transcript. Use build-summary-evidence for new workflows.",
    },
    snippets: [],
    matchedConversationCount: rankedSnippets.matchedConversationCount,
    matchedMessageCount: rankedSnippets.matchedMessageCount,
    recordsTruncated: rankedSnippets.recordsTruncated,
  };
}

if (typeof process !== "undefined" && process.argv[1]?.includes("filter-rank-snippets")) {
  const params = JSON.parse(process.argv[2] || "{}");
  main({ params })
    .then((result) => process.stdout.write(JSON.stringify(result)))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
