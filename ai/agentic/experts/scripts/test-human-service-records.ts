import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const tsNodeBin = path.join(root, "node_modules", "ts-node", "dist", "bin.js");
const project = path.join(root, "scripts", "tsconfig.json");
const nodeDir = path.join(root, "experts", "customer", "human-service-records", "nodes");
const expertDir = path.join(root, "experts", "customer", "human-service-records");

function runNode(file: string, params: Record<string, unknown>): any {
  const out = execFileSync(process.execPath, [tsNodeBin, "-P", project, path.join(nodeDir, file), JSON.stringify(params)], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return JSON.parse(out);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertArrayIncludes<T>(actual: T[], expected: T, message: string) {
  if (!actual.includes(expected)) {
    throw new Error(`${message}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}

function testValidateRequiresUsernameOnly() {
  const missing = runNode("validate-input.ts", {
    username: "",
    customerCode: "C001",
    customerName: "Demo Customer",
    inputContext: { chainId: "chain-1" },
  });
  assertEqual(missing.validationStatus, "need_identity", "missing username should stop lookup");
  assertEqual(missing.canQuery, false, "missing username should not query");

  const ok = runNode("validate-input.ts", {
    username: "seller@example.com",
    customerName: "Demo Customer",
    query: "帮我查看昨天跟客服的聊天记录",
    inputContext: { chainId: "chain-1" },
  });
  assertEqual(ok.validationStatus, "ok", "username-only identity should validate");
  assertEqual(ok.canQuery, true, "missing customerCode should not stop lookup");
  assertEqual(ok.identity.username, "seller@example.com", "username should be trimmed");
  assertEqual(ok.identity.customerCode, "", "customerCode should remain optional diagnostic context");
}

function testFetchFiltersByUsernameOnly() {
  const source = fs.readFileSync(path.join(nodeDir, "fetch-human-service-records.ts"), "utf8");
  assert(source.includes('{ field_name: fieldMap.customerEmail, operator: "is", value: [identity?.username ?? ""] }'), "fetch should filter by username/customer email");
  assertEqual(source.includes('field_name: fieldMap.customerCode'), false, "fetch should not filter by customerCode/customer id");
  assertEqual(source.includes('requireField(fields, "客户id")'), false, "fetch should not require the Feishu customer id field");
  assertEqual(source.includes("records.length >= maxConversations"), false, "fetch must not stop at a conversation-count business cap");
  assertEqual(source.includes("page < 5"), false, "fetch must not stop after five pages while a next page exists");
}

function testResolveQueryScopeParsesYesterdayWithMessageTime() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "帮我查看昨天跟客服的聊天记录",
    nowIso: "2026-07-13T10:00:00+08:00",
  });
  assertEqual(scope.timeWindow.kind, "explicit", "yesterday should be explicit");
  assertEqual(scope.timeWindow.start, "2026-07-12 00:00:00", "yesterday start");
  assertEqual(scope.timeWindow.end, "2026-07-12 23:59:59", "yesterday end");
  assertArrayIncludes(scope.serverDateHints, "2026-07-11", "server rough filter should include prior day");
  assertArrayIncludes(scope.serverDateHints, "2026-07-13", "server rough filter should include next day");
  assertEqual(scope.usedMessageTimeFilter, true, "message timestamp filtering should be enabled");
  assertEqual(scope.queryScope.recentLatestOnly, false, "explicit query should not force latest-only rendering");
  assertEqual(scope.queryScope.sortDirection, "desc", "explicit query should also sort conversations newest first");
}

function testResolveQueryScopeTreatsEmptyLimitsAsMaximumDefaults() {
  for (const value of [null, 0]) {
    const scope = runNode("resolve-query-scope.ts", {
      query: "帮我查看昨天跟客服的聊天记录",
      nowIso: "2026-07-13T10:00:00+08:00",
      maxConversations: value,
      maxMessages: value,
    });
    assertEqual(scope.limits.maxConversations, 10, `${String(value)} conversation limit should use the maximum default`);
    assertEqual(scope.limits.maxMessages, 200, `${String(value)} message limit should use the maximum default`);
  }
}

function testResolveQueryScopeUsesCompleteRecentWindowWithoutExplicitTime() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "之前人工客服的聊天记录帮我查看一下",
    nowIso: "2026-07-13T10:00:00+08:00",
  });
  assertEqual(scope.timeWindow.kind, "recent", "vague history query should use recent window");
  assertEqual(scope.timeWindow.start, "2026-06-13 00:00:00", "recent fallback start");
  assertEqual(scope.timeWindow.end, "2026-07-12 23:59:59", "recent fallback should end yesterday");
  assertEqual(scope.queryScope.recentLatestOnly, false, "recent fallback should return every conversation in the 30-day scope");
  assertEqual(scope.queryScope.sortDirection, "desc", "recent fallback should sort newest first");
  assertArrayIncludes(scope.serverDateHints, "2026-06-12", "recent rough filter should include prior day");
  assertArrayIncludes(scope.serverDateHints, "2026-07-13", "recent rough filter should include next day");
}

function testResolveQueryScopeParsesRelativeCalendarPeriods() {
  const cases = [
    { query: "查上周人工客服记录", start: "2026-07-06 00:00:00", end: "2026-07-12 23:59:59" },
    { query: "查上上周人工客服记录", start: "2026-06-29 00:00:00", end: "2026-07-05 23:59:59" },
    { query: "查上个月人工客服记录", start: "2026-06-01 00:00:00", end: "2026-06-30 23:59:59" },
    { query: "查上上月人工客服记录", start: "2026-05-01 00:00:00", end: "2026-05-31 23:59:59" },
    { query: "查2周前人工客服记录", start: "2026-06-29 00:00:00", end: "2026-07-05 23:59:59" },
    { query: "查两个月前人工客服记录", start: "2026-05-01 00:00:00", end: "2026-05-31 23:59:59" },
  ];
  for (const item of cases) {
    const scope = runNode("resolve-query-scope.ts", {
      query: item.query,
      nowIso: "2026-07-16T10:00:00+08:00",
    });
    assertEqual(scope.timeWindow.kind, "explicit", `${item.query} should resolve to an explicit calendar period`);
    assertEqual(scope.timeWindow.start, item.start, `${item.query} start`);
    assertEqual(scope.timeWindow.end, item.end, `${item.query} end`);
  }
}

function testResolveQueryScopeDoesNotExposeLegacySummaryLimits() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "帮我查看昨天跟客服的聊天记录",
    nowIso: "2026-07-13T10:00:00+08:00",
    maxConversations: 1,
    maxMessages: 1,
  });
  assertEqual(Object.prototype.hasOwnProperty.call(scope.queryScope, "limits"), false, "query scope must not expose caller-controlled summary limits");
  assertEqual(Object.prototype.hasOwnProperty.call(scope, "limits"), false, "node outputs must not expose legacy summary limits");
}

function testResolveQueryScopeDisablesPartialServerHintsForLongRanges() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "查询这段时间的全部人工客服记录",
    timeStart: "2026-03-01",
    timeEnd: "2026-06-30",
    nowIso: "2026-07-17T10:00:00+08:00",
  });
  assertEqual(scope.queryScope.queryStatus, "ok", "long in-policy range should be queryable");
  assertEqual(scope.serverDateHints.length, 0, "long ranges must disable partial date hints instead of dropping later dates");
}

function testResolveQueryScopeCapsCurrentPeriodsAtYesterday() {
  const currentWeek = runNode("resolve-query-scope.ts", {
    query: "查本周人工客服记录",
    nowIso: "2026-07-16T10:00:00+08:00",
  });
  assertEqual(currentWeek.timeWindow.start, "2026-07-13 00:00:00", "current week should start on Monday");
  assertEqual(currentWeek.timeWindow.end, "2026-07-15 23:59:59", "current week should stop yesterday");

  const currentMonth = runNode("resolve-query-scope.ts", {
    query: "查本月人工客服记录",
    nowIso: "2026-07-16T10:00:00+08:00",
  });
  assertEqual(currentMonth.timeWindow.start, "2026-07-01 00:00:00", "current month should start on day one");
  assertEqual(currentMonth.timeWindow.end, "2026-07-15 23:59:59", "current month should stop yesterday");
}

function testResolveQueryScopeRejectsTodayOnly() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "查今天人工客服记录",
    nowIso: "2026-07-16T10:00:00+08:00",
  });
  assertEqual(scope.queryScope.queryStatus, "rejected_today_unavailable", "today-only query should not fetch incomplete records");
  assertEqual(scope.queryScope.rejectReason, "today_records_available_tomorrow", "today-only rejection reason");
  assertEqual(scope.queryScope.serverDateHints.length, 0, "today-only query should not build date hints");
}

function testResolveQueryScopeUsesRecentKeywordSearchWithoutLatestOnly() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "客服之前关于标签怎么说的",
    keywords: ["标签"],
    nowIso: "2026-07-13T10:00:00+08:00",
  });
  assertEqual(scope.timeWindow.kind, "recent", "keyword history query should use recent window");
  assertEqual(scope.queryScope.recentLatestOnly, false, "keyword history query should search relevant conversations");
  assertEqual(scope.queryScope.recentKeywordSearch, true, "keyword history query should be marked for recent keyword search");
}

function testResolveQueryScopeRejectsOlderThanSixMonths() {
  const scope = runNode("resolve-query-scope.ts", {
    query: "帮我查看2025-07-12跟客服的聊天记录",
    nowIso: "2026-07-13T10:00:00+08:00",
  });
  assertEqual(scope.queryScope.queryStatus, "rejected_too_old", "older-than-six-months query should be rejected");
  assertEqual(scope.queryScope.rejectReason, "older_than_six_months", "reject reason should be explicit");
  assertEqual(scope.queryScope.serverDateHints.length, 0, "rejected query should not build date hints");
}

function testParseMessagesSupportsMultilineTurns() {
  const parsed = runNode("parse-message-turns.ts", {
    humanServiceRecords: {
      records: [
        {
          recordId: "rec1",
          conversationId: "group-a",
          conversationStartedAt: "2026-07-11 23:50:00",
          agentName: "Agent A",
          channel: "web",
          messages:
            "[2026-07-11 23:58:00] 客户: 昨天怎么操作?\n" +
            "[2026-07-12 00:05:00] 客服: 请先进入订单页面\n再点击异常处理\n" +
            "[2026-07-12 00:06:00] 客户: 好的",
        },
      ],
      recordsTruncated: false,
    },
  });
  assertEqual(parsed.messageTurns.length, 3, "should parse three turns");
  assertEqual(parsed.messageTurns[1].role, "agent", "客服 should map to agent");
  assert(
    String(parsed.messageTurns[1].text).includes("再点击异常处理"),
    "multiline continuation should join previous agent turn"
  );
}

function testParseMessagesSupportsConcatenatedTimestampTurns() {
  const parsed = runNode("parse-message-turns.ts", {
    humanServiceRecords: {
      records: [
        {
          recordId: "rec1",
          conversationId: "group-a",
          conversationStartedAt: "2026-07-11 18:27:53",
          messages:
            "[2026-07-11 18:27:34] 客服: 调研邀请" +
            "[2026-07-11 18:27:53] 客户: 你好" +
            "[2026-07-11 18:28:01] 客服: 您好",
        },
      ],
      recordsTruncated: false,
    },
  });
  assertEqual(parsed.messageTurns.length, 3, "should parse concatenated timestamp turns");
  assertEqual(parsed.messageTurns[1].timestamp, "2026-07-11 18:27:53", "second timestamp should be parsed");
  assertEqual(parsed.messageTurns[1].role, "customer", "客户 should map to customer");
  assertEqual(parsed.messageTurns[2].text, "您好", "third turn text should be parsed");
}

function testFetchSkipsRejectedTooOldQuery() {
  const fetched = runNode("fetch-human-service-records.ts", {
    validation: { canQuery: true, identity: { username: "seller@example.com", customerCode: "C001" } },
    queryScope: { queryStatus: "rejected_too_old", rejectReason: "older_than_six_months" },
  });
  assertEqual(fetched.humanServiceRecords.fetchStatus, "rejected_too_old", "fetch should short-circuit rejected query");
  assertEqual(fetched.humanServiceRecords.records.length, 0, "rejected query should not fetch records");
}

function testFetchSkipsTodayUnavailableQuery() {
  const fetched = runNode("fetch-human-service-records.ts", {
    validation: { canQuery: true, identity: { username: "seller@example.com", customerCode: "C001" } },
    queryScope: { queryStatus: "rejected_today_unavailable", rejectReason: "today_records_available_tomorrow" },
  });
  assertEqual(fetched.humanServiceRecords.fetchStatus, "rejected_today_unavailable", "fetch should short-circuit today-only query");
  assertEqual(fetched.humanServiceRecords.records.length, 0, "today-only query should not fetch records");
}

function testFilterRanksByMessageTimeAndAgentInstruction() {
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 23:58:00",
        role: "customer",
        text: "怎么处理异常?",
        agentName: "Agent A",
        channel: "web",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-12 00:05:00",
        role: "agent",
        text: "请先进入订单页面，再点击异常处理。",
        agentName: "Agent A",
        channel: "web",
      },
      {
        conversationId: "group-b",
        timestamp: "2026-07-10 12:00:00",
        role: "agent",
        text: "这条不应命中昨天窗口。",
        agentName: "Agent B",
        channel: "web",
      },
    ],
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-12 00:00:00",
        end: "2026-07-12 23:59:59",
      },
      keywords: ["异常"],
      limits: { maxConversations: 5, maxMessages: 2 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: true },
  });
  assertEqual(filtered.matchedMessageCount, 1, "matched count should reflect the one message inside the requested window");
  assertEqual(filtered.snippets.length, 2, "summary snippets may retain one neighboring context message");
  assertEqual(filtered.snippets[0].role, "agent", "agent instruction should rank first");
  assertEqual(filtered.recordsTruncated, true, "truncation flag should propagate");
  assertEqual(filtered.snippets[0].text.includes("不应命中"), false, "outside-window text should be excluded");
}

function testFilterReturnsEveryConversationInRecentScope() {
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      {
        conversationId: "old-conv",
        timestamp: "2026-07-10 10:00:00",
        role: "agent",
        speaker: "客服",
        text: "旧会话里的客服回复",
      },
      {
        conversationId: "new-conv",
        timestamp: "2026-07-12 18:00:00",
        role: "customer",
        speaker: "客户",
        text: "最新会话里的客户问题",
      },
      {
        conversationId: "new-conv",
        timestamp: "2026-07-12 18:01:00",
        role: "agent",
        speaker: "客服",
        text: "最新会话里的客服回复",
      },
    ],
    queryScope: {
      timeWindow: {
        kind: "recent",
        start: "2026-06-13 00:00:00",
        end: "2026-07-13 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 10, maxMessages: 200 },
      usedMessageTimeFilter: true,
      recentLatestOnly: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const markdown = String(filtered.rankedSnippets.transcriptMarkdown ?? "");
  assertEqual(filtered.rankedSnippets.matchedConversationCount, 2, "recent scope should return every matching conversation");
  assertEqual(markdown.includes("帮您找到最近 30 天内最新的一条人工客服记录"), false, "latest-only guidance must not be shown");
  assert(markdown.includes("最新会话里的客服回复"), "latest conversation should be rendered");
  assert(markdown.includes("旧会话里的客服回复"), "older in-scope conversation should also be rendered");
}

function testFormatOutputGuidesRecentKeywordNoMatch() {
  const formatted = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true },
    queryScope: {
      queryStatus: "ok",
      recentKeywordSearch: true,
      timeWindow: { kind: "recent", start: "2026-06-13 00:00:00", end: "2026-07-13 23:59:59" },
    },
    rankedSnippets: {
      answerStatus: "no_match",
      matchedConversationCount: 0,
      matchedMessageCount: 0,
      recordsTruncated: false,
    },
    analysisResult: { structured: { answerStatus: "no_match" }, analysis: "LLM_GENERIC_NO_MATCH" },
    inputContext: { chainId: "chain-keyword-no-match" },
  });
  assert(String(formatted.analysis).includes("30"), "recent keyword no-match should mention the 30-day search window");
  assertEqual(String(formatted.analysis).includes("10"), false, "untruncated no-match should not mention a display limit");
  assertEqual(String(formatted.analysis).includes("LLM_GENERIC_NO_MATCH"), false, "deterministic guidance should override generic LLM wording");
}

function testFormatOutputExplainsRecentKeywordScanLimitOnlyWhenTruncated() {
  const formatted = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true },
    queryScope: {
      queryStatus: "ok",
      recentKeywordSearch: true,
      timeWindow: { kind: "recent", start: "2026-06-13 00:00:00", end: "2026-07-13 23:59:59" },
    },
    rankedSnippets: {
      answerStatus: "no_match",
      matchedConversationCount: 0,
      matchedMessageCount: 0,
      recordsTruncated: true,
    },
    analysisResult: { structured: { answerStatus: "no_match" }, analysis: "LLM_GENERIC_NO_MATCH" },
    inputContext: { chainId: "chain-keyword-no-match-truncated" },
  });
  assert(String(formatted.analysis).includes("部分"), "truncated no-match should explain that only part of the records was checked");
  assertEqual(String(formatted.analysis).includes("最多展示 10 条相关会话"), false, "truncated no-match should not claim that 10 conversations were displayed");
}

function testFilterReturnsAllExplicitQueryConversations() {
  const messageTurns = Array.from({ length: 11 }, (_, index) => {
    const day = String(12 - index).padStart(2, "0");
    return {
      conversationId: `conv-${index + 1}`,
      timestamp: `2026-07-${day} 10:00:00`,
      role: "agent",
      speaker: "客服",
      text: `第 ${index + 1} 条明确日期会话里的客服有效回复`,
    };
  });
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns,
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-01 00:00:00",
        end: "2026-07-12 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 99, maxMessages: 200 },
      usedMessageTimeFilter: true,
      recentLatestOnly: false,
      sortDirection: "desc",
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(filtered.rankedSnippets.matchedConversationCount, 11, "all in-scope conversations should be returned");
  assertEqual(
    filtered.rankedSnippets.conversationRefs.some((ref: { conversationId: string }) => ref.conversationId === "conv-11"),
    true,
    "the oldest in-scope conversation must not be dropped by a global cap"
  );
}

function testFilterReturnsMoreThanTwoHundredMessagesWithoutTruncation() {
  const messageTurns = Array.from({ length: 205 }, (_, index) => ({
    conversationId: "long-conversation",
    timestamp: new Date(Date.UTC(2026, 6, 11, 0, 0, index)).toISOString().slice(0, 19).replace("T", " "),
    role: index % 2 === 0 ? "customer" : "agent",
    speaker: index % 2 === 0 ? "客户" : "客服",
    text: `完整聊天消息 ${index + 1}`,
  }));
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns,
    queryScope: {
      timeWindow: { kind: "explicit", start: "2026-07-11 00:00:00", end: "2026-07-11 23:59:59" },
      keywords: [],
      limits: { maxConversations: 10, maxMessages: 200 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const markdown = String(filtered.rankedSnippets.transcriptMarkdown ?? "");
  assertEqual(filtered.rankedSnippets.totalMessageCount, 205, "total count should include every in-scope message");
  assertEqual(filtered.rankedSnippets.renderedMessageCount, 205, "transcript should render beyond the old 200-message cap");
  assertEqual(filtered.rankedSnippets.recordsTruncated, false, "summary snippet limits must not mark the transcript truncated");
  assert(markdown.includes("完整聊天消息 205"), "the final in-scope message must be present");
}

function testFilterWarnsBeforePotentialPlatformTruncationWithoutDroppingMessages() {
  const messageTurns = Array.from({ length: 20 }, (_, index) => ({
    conversationId: "very-long-conversation",
    timestamp: `2026-07-11 18:${String(index).padStart(2, "0")}:00`,
    role: index % 2 === 0 ? "customer" : "agent",
    speaker: index % 2 === 0 ? "客户" : "客服",
    text: `超长聊天消息 ${index + 1}：${"内容".repeat(320)}`,
  }));
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns,
    queryScope: {
      timeWindow: { kind: "explicit", start: "2026-07-11 00:00:00", end: "2026-07-11 23:59:59" },
      keywords: [],
      limits: { maxConversations: 10, maxMessages: 200 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const markdown = String(filtered.rankedSnippets.transcriptMarkdown ?? "");
  assert(markdown.startsWith("> 提醒：本次聊天记录内容较长"), "platform-risk warning should be the first content");
  assertEqual(filtered.rankedSnippets.platformTruncationRisk, true, "structured output should expose platform risk");
  assertEqual(filtered.rankedSnippets.totalMessageCount, 20, "warning must not reduce the total count");
  assertEqual(filtered.rankedSnippets.renderedMessageCount, 20, "warning must not drop transcript messages");
  assert(markdown.includes("超长聊天消息 20"), "the last message must remain after adding the warning");
  assertEqual(filtered.rankedSnippets.outputCharacterCount, markdown.length, "reported output length should match the final transcript");
}

function testFilterRendersMultipleConversationsChronologically() {
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      {
        conversationId: "new-conv",
        timestamp: "2026-07-12 18:00:00",
        role: "agent",
        speaker: "agent",
        text: "newer conversation reply",
      },
      {
        conversationId: "old-conv",
        timestamp: "2026-07-10 10:00:00",
        role: "agent",
        speaker: "agent",
        text: "older conversation reply",
      },
    ],
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-01 00:00:00",
        end: "2026-07-12 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 10, maxMessages: 200 },
      usedMessageTimeFilter: true,
      recentLatestOnly: false,
      sortDirection: "desc",
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const markdown = String(filtered.rankedSnippets.transcriptMarkdown ?? "");
  assert(
    markdown.indexOf("older conversation reply") >= 0 &&
      markdown.indexOf("newer conversation reply") > markdown.indexOf("older conversation reply"),
    "transcript should render multiple conversations from earlier to later"
  );
}

function testFilterDeprioritizesClosingAndSurveyMessages() {
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:28:07",
        role: "customer",
        text: "打印标签的时候为什么序号不是从1开始",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:30:00",
        role: "agent",
        text: "这里是因为已经多次打印，系统会延续上一次打印的箱号。",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:39:32",
        role: "agent",
        text: "请问还有其他问题咨询吗？",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:47:05",
        role: "agent",
        text: "您的对话已关闭，如果您仍有问题需要咨询，请再次上线。",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:47:06",
        role: "agent",
        text: "系统发送满意度调查",
      },
    ],
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-11 00:00:00",
        end: "2026-07-11 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 5, maxMessages: 4 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(
    filtered.snippets[0].text,
    "这里是因为已经多次打印，系统会延续上一次打印的箱号。",
    "substantive agent message should rank before closing/survey messages"
  );
  assertEqual(filtered.snippets[0].text.includes("还有其他问题"), false, "wrap-up question should not rank first");
  assertEqual(filtered.snippets[0].text.includes("满意度调查"), false, "survey message should not rank first");
  assertEqual(filtered.snippets[0].text.includes("对话已关闭"), false, "closing message should not rank first");
}

function testFilterFoldsSystemEventsWithoutDroppingThem() {
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:28:07",
        role: "customer",
        text: "打印标签的时候为什么序号不是从1开始",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:30:00",
        role: "agent",
        text: "正常没有影响的哈",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:31:00",
        role: "agent",
        text: "如果您想了解满意度调查结果，可以告诉我具体问题。",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:47:04",
        role: "other",
        text: "有新的咨询进来了。",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:47:05",
        role: "agent",
        text: "您的对话已关闭，如果您仍有问题需要咨询，请再次上线。",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:47:06",
        role: "agent",
        text: "客服Emily发送满意度调查",
      },
    ],
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-11 00:00:00",
        end: "2026-07-11 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 5, maxMessages: 80 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const markdown = String(filtered.rankedSnippets.transcriptMarkdown ?? "");
  assert(markdown.includes("<details>"), "system events should use a collapsible block");
  assert(markdown.includes("<summary>系统事件（3 条）</summary>"), "contiguous system events should share one summary");
  assert(markdown.includes("有新的咨询进来了。"), "conversation-open event should remain in the returned transcript");
  assert(markdown.includes("您的对话已关闭"), "conversation-close event should remain in the returned transcript");
  assert(markdown.includes("客服Emily发送满意度调查"), "agent-labelled survey event should remain in the returned transcript");
  assert(markdown.includes("</details>"), "collapsible block should be closed");
  assert(
    markdown.indexOf("如果您想了解满意度调查结果") < markdown.indexOf("<details>"),
    "ordinary agent messages mentioning surveys must remain directly visible"
  );
  assertEqual(filtered.rankedSnippets.foldedSystemEventCount, 3, "folded event count should be exposed");
  assertEqual(filtered.rankedSnippets.filteredSystemEventCount, 0, "folded events must not be reported as filtered");
}

function testFormatOutputHasExceptionFallbackMessages() {
  const missingUsername = runNode("format-output.ts", {
    validation: { validationStatus: "need_identity", canQuery: false, identity: { username: "", customerCode: "C001" } },
    queryScope: {},
    rankedSnippets: { answerStatus: "skipped_identity", matchedConversationCount: 0, matchedMessageCount: 0 },
    analysisResult: { structured: { answerStatus: "skipped_identity" }, analysis: "" },
    inputContext: { chainId: "chain-1" },
  });
  assertEqual(String(missingUsername.analysis).includes("客户 ID"), false, "missing identity wording should require username only");

  const tooOld = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true, identity: { username: "seller@example.com", customerCode: "C001" } },
    queryScope: {
      queryStatus: "rejected_too_old",
      rejectReason: "older_than_six_months",
      timeWindow: { kind: "explicit", start: "2025-07-12 00:00:00", end: "2025-07-12 23:59:59" },
    },
    rankedSnippets: { answerStatus: "rejected_too_old", matchedConversationCount: 0, matchedMessageCount: 0 },
    analysisResult: { structured: { answerStatus: "rejected_too_old" }, analysis: "" },
    inputContext: { chainId: "chain-1" },
  });
  assert(String(tooOld.analysis).includes("暂不支持查询半年前的人工客服记录"), "too-old query should have refusal wording");

  const todayUnavailable = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true },
    queryScope: {
      queryStatus: "rejected_today_unavailable",
      rejectReason: "today_records_available_tomorrow",
      timeWindow: { kind: "explicit", start: "2026-07-16 00:00:00", end: "2026-07-15 23:59:59" },
    },
    rankedSnippets: { answerStatus: "rejected_today_unavailable", matchedConversationCount: 0, matchedMessageCount: 0 },
    analysisResult: { structured: { answerStatus: "rejected_today_unavailable" }, analysis: "身份核验已通过，查询流程正常" },
    inputContext: { chainId: "chain-1" },
  });
  assertEqual(todayUnavailable.analysis, "今天的人工客服聊天记录需明天才能查询。", "today-only query should explain availability without internal state");

  const recentNoMatch = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true, identity: { username: "seller@example.com", customerCode: "C001" } },
    queryScope: {
      recentLatestOnly: true,
      timeWindow: { kind: "recent", start: "2026-06-13 00:00:00", end: "2026-07-13 23:59:59" },
    },
    rankedSnippets: { answerStatus: "no_match", matchedConversationCount: 0, matchedMessageCount: 0, recordsTruncated: true },
    analysisResult: { structured: { answerStatus: "no_match" }, analysis: "" },
    inputContext: { chainId: "chain-1" },
  });
  assert(String(recentNoMatch.analysis).includes("最近 30 天内没有查到"), "recent no-match should explain default range");
}

function testFormatOutputKeepsFourRootFields() {
  const formatted = runNode("format-output.ts", {
    validation: { validationStatus: "ok", identity: { username: "seller@example.com", customerCode: "C001" } },
    queryScope: {
      timeWindow: { kind: "explicit", start: "2026-07-12 00:00:00", end: "2026-07-12 23:59:59" },
      usedMessageTimeFilter: true,
    },
    rankedSnippets: {
      answerStatus: "found",
      matchedConversationCount: 1,
      matchedMessageCount: 205,
      totalMessageCount: 205,
      renderedMessageCount: 205,
      foldedSystemEventCount: 6,
      filteredSystemEventCount: 0,
      platformTruncationRisk: true,
      outputCharacterCount: 12000,
      recordsTruncated: false,
      snippets: [
        {
          conversationId: "group-a",
          timestamp: "2026-07-12 00:05:00",
          role: "agent",
          text: "请先进入订单页面。",
        },
      ],
    },
    analysisResult: {
      structured: { answerStatus: "found" },
      analysis: "查询到您的历史人工客服沟通记录：客服建议先进入订单页面。",
    },
    inputContext: { chainId: "chain-1" },
  });
  assert(formatted.structured, "structured should exist");
  assertEqual(formatted.analysis.includes("飞书"), false, "analysis must not mention Feishu");
  assertEqual(Object.prototype.hasOwnProperty.call(formatted.structured, "identityMatched"), false, "public structured output must not expose identity state");
  assertEqual(Object.prototype.hasOwnProperty.call(formatted.structured, "timeWindow"), false, "public structured output must not expose normalized date ranges");
  assertEqual(formatted.enrichedContext.identityMatched, false, "internal identity state may remain in enrichedContext");
  assert(formatted.enrichedContext.timeWindow, "internal time window should remain in enrichedContext");
  assertEqual(formatted.outputContext.expertId, "human-service-records", "expert id should be fixed");
  assert(formatted.enrichedContext, "enrichedContext should exist");
  assertEqual(formatted.structured.totalMessageCount, 205, "structured output should expose the complete message count");
  assertEqual(formatted.structured.renderedMessageCount, 205, "structured output should expose the rendered message count");
  assertEqual(formatted.structured.platformTruncationRisk, true, "structured output should expose platform truncation risk");
  assertEqual(formatted.structured.outputCharacterCount, 12000, "structured output should expose final transcript length");
}

function testFilterBuildsMarkdownTranscriptWithExpiredAttachmentNotice() {
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:27:34",
        role: "agent",
        speaker: "客服",
        text: "尊敬的客户：感谢您一直以来对我们的支持！本次匿名调研 http://survey.winit.com.cn/vm/demo.aspx#",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:27:55",
        role: "customer",
        speaker: "客户",
        text: "有新的咨询进来了。",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:27:56",
        role: "customer",
        speaker: "客户",
        text: "[image] https://pro-cs-freq.udeskcs.com/chat_upload/demo.png?OSSAccessKeyId=abc&Expires=1783837176&Signature=xyz",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:27:57",
        role: "customer",
        speaker: "客户",
        text: "[image]https://pro-cs-freq.udeskcs.com/chat_upload/demo-no-space.png?OSSAccessKeyId=abc&Expires=1783837176&Signature=xyz",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:27:58",
        role: "agent",
        speaker: "客服",
        text: "[image]https://pro-cs-freq.udeskcs.com/icon/tid23926/image_1783765911000_m0pfc1783765911002.png",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:28:07",
        role: "customer",
        speaker: "客户",
        text: "打印标签的时候为什么序号不是从1开始",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:30:44",
        role: "agent",
        speaker: "客服",
        text: "正常没有影响的哈",
      },
      {
        conversationId: "group-a",
        timestamp: "2026-07-11 18:47:06",
        role: "agent",
        speaker: "客服",
        text: "系统发送满意度调查",
      },
    ],
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-11 00:00:00",
        end: "2026-07-11 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 5, maxMessages: 20 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const markdown = filtered.rankedSnippets.transcriptMarkdown;
  assert(markdown, "transcript markdown should exist");
  assert(String(markdown).includes("**2026-07-11 18:27:56 您**"), "transcript should show full date and seconds");
  assert(String(markdown).includes("[图片 1：历史图片链接可能已过期]("), "image should be kept with expiry warning");
  assert(String(markdown).includes("[图片 2：历史图片链接可能已过期]("), "image without a space after marker should be normalized");
  assert(String(markdown).includes("[图片 3：历史图片链接可能已过期]("), "agent icon image without a space should be normalized");
  assertEqual(String(markdown).includes("[image]https://"), false, "raw image marker should not leak into transcript");
  assertEqual(/\[(image|file)\]\s*https?:\/\//i.test(String(markdown)), false, "raw attachment marker should never leak into transcript");
  assert(String(markdown).includes("历史附件链接可能已过期"), "transcript should warn users about expired attachments");
  assert(String(markdown).includes("有新的咨询进来了"), "system enter event should remain inside a folded block");
  assert(String(markdown).includes("系统发送满意度调查"), "survey event should remain inside a folded block");
  assert(String(markdown).includes("尊敬的客户：感谢您一直以来对我们的支持！"), "survey invitation should remain inside a folded block");
  assert(String(markdown).includes("<summary>系统事件（2 条）</summary>"), "adjacent system events should be grouped without changing chronology");
}

function testLlmAnswerContextExcludesFullTranscript() {
  const turns = Array.from({ length: 80 }, (_, index) => ({
    conversationId: "long-conv",
    timestamp: `2026-07-11 18:${String(Math.floor(index / 2)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
    role: index % 2 === 0 ? "customer" : "agent",
    speaker: index % 2 === 0 ? "客户" : "客服",
    text:
      index % 10 === 0
        ? `[image]https://pro-cs-freq.udeskcs.com/chat_upload/demo-${index}.png?OSSAccessKeyId=abc&Expires=1783837176&Signature=longsignature`
        : `这是一条较长的人工客服记录消息 ${index}，用于确认完整 transcript 不会继续传入 LLM 节点。`,
  }));
  const filtered = runNode("filter-rank-snippets.ts", {
    messageTurns: turns,
    queryScope: {
      timeWindow: {
        kind: "explicit",
        start: "2026-07-11 00:00:00",
        end: "2026-07-11 23:59:59",
      },
      keywords: [],
      limits: { maxConversations: 10, maxMessages: 200 },
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const transcript = String(filtered.rankedSnippets.transcriptMarkdown ?? "");
  const llmContext = filtered.llmAnswerContext;
  assert(transcript.length > 1000, "test fixture should build a long transcript");
  assert(llmContext, "filter node should expose a lightweight LLM context");
  assertEqual(Object.prototype.hasOwnProperty.call(llmContext, "transcriptMarkdown"), false, "LLM context must not include transcriptMarkdown");
  assertEqual(JSON.stringify(llmContext).includes("这是一条较长的人工客服记录消息"), false, "LLM context must not include raw transcript text");
  assert(JSON.stringify(llmContext).length < transcript.length / 4, "LLM context should be much smaller than transcript");
}

function testWorkflowFeedsLightweightContextToLlm() {
  const workflow = JSON.parse(fs.readFileSync(path.join(expertDir, "workflow.json"), "utf8"));
  const filterNode = workflow.nodes.find((node: { id: string }) => node.id === "filter-rank-snippets");
  const llmNode = workflow.nodes.find((node: { id: string }) => node.id === "llm-answer-from-records");
  assert(filterNode, "filter node should exist");
  assert(llmNode, "LLM node should exist");
  assertArrayIncludes(filterNode.outputs, "llmAnswerContext", "filter node should output lightweight LLM context");
  assertArrayIncludes(llmNode.inputs, "llmAnswerContext", "LLM node should consume lightweight context");
  assertEqual(llmNode.inputs.includes("rankedSnippets"), false, "LLM node should not consume full rankedSnippets");
}

function testFormatOutputPrefersMarkdownTranscript() {
  const formatted = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true, identity: { username: "seller@example.com", customerCode: "C001" } },
    queryScope: {
      timeWindow: { kind: "explicit", start: "2026-07-11 00:00:00", end: "2026-07-11 23:59:59" },
      usedMessageTimeFilter: true,
    },
    rankedSnippets: {
      answerStatus: "found",
      matchedConversationCount: 1,
      matchedMessageCount: 2,
      recordsTruncated: false,
      transcriptMarkdown: "## 聊天记录\n\n> 提醒：历史附件链接可能已过期，如图片或文件无法打开，请以文字记录为准。\n\n**2026-07-11 18:27:56 您**  \n[图片 1：历史图片链接可能已过期](https://example.test/a.png)",
      attachmentNotice: "历史附件链接可能已过期，如图片或文件无法打开，请以文字记录为准。",
      snippets: [],
    },
    analysisResult: {
      structured: { answerStatus: "found" },
      analysis: "LLM 摘要不应该覆盖原始记录",
    },
    inputContext: { chainId: "chain-1" },
  });
  assert(String(formatted.analysis).includes("## 聊天记录"), "analysis should use transcript markdown");
  assert(String(formatted.analysis).includes("历史附件链接可能已过期"), "analysis should include attachment notice");
  assertEqual(String(formatted.analysis).includes("LLM 摘要"), false, "LLM summary should not override transcript");
}

function testBuildSummaryEvidenceUsesLatestConversationForGenericQuery() {
  const result = runNode("build-summary-evidence.ts", {
    query: "帮我查一下历史人工客服记录",
    messageTurns: [
      { conversationId: "older", timestamp: "2026-07-10 09:00:00", role: "customer", speaker: "客户", text: "旧会话的问题" },
      { conversationId: "older", timestamp: "2026-07-10 09:02:00", role: "agent", speaker: "客服", text: "旧会话的答复" },
      { conversationId: "latest", timestamp: "2026-07-12 10:00:00", role: "customer", speaker: "客户", text: "最近会话的问题" },
      { conversationId: "latest", timestamp: "2026-07-12 10:03:00", role: "agent", speaker: "客服", text: "最近会话的处理建议" },
    ],
    queryScope: {
      timeWindow: { kind: "recent", start: "2026-06-13 00:00:00", end: "2026-07-12 23:59:59" },
      keywords: [],
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(result.summaryEvidence.requestType, "recap", "generic history query should be a recap");
  assertEqual(result.summaryEvidence.matchedConversationCount, 1, "generic history query should select the latest conversation only");
  assertEqual(result.summaryEvidence.dataCompleteness, "relevant_subset", "summary evidence must disclose omitted raw messages");
  assertEqual(result.summaryEvidence.evidence.length, 2, "latest conversation should keep its substantive turns");
  assertEqual(result.summaryEvidence.evidence[0].conversationId, "latest", "evidence should exclude older conversations");
  assertEqual(result.summaryEvidence.evidence[1].text, "最近会话的处理建议", "evidence should preserve chronological order");
}

function testBuildSummaryEvidenceKeepsRelevantQuestionContextAndFinalAgentReply() {
  const result = runNode("build-summary-evidence.ts", {
    query: "之前客服让我怎么处理入库异常？",
    messageTurns: [
      { conversationId: "irrelevant", timestamp: "2026-07-11 09:00:00", role: "customer", speaker: "客户", text: "请问发票怎么下载？" },
      { conversationId: "irrelevant", timestamp: "2026-07-11 09:01:00", role: "agent", speaker: "客服", text: "请在账单中心下载发票。" },
      { conversationId: "target", timestamp: "2026-07-12 10:00:00", role: "customer", speaker: "客户", text: "入库异常应该怎么处理？" },
      { conversationId: "target", timestamp: "2026-07-12 10:02:00", role: "agent", speaker: "客服", text: "请先提供异常单号和商品信息。" },
      { conversationId: "target", timestamp: "2026-07-12 10:05:00", role: "agent", speaker: "客服", text: "收到材料后会安排仓库核实并反馈。" },
    ],
    queryScope: {
      timeWindow: { kind: "recent", start: "2026-06-13 00:00:00", end: "2026-07-12 23:59:59" },
      keywords: ["入库", "异常"],
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const evidence = result.summaryEvidence.evidence as Array<{ conversationId: string; text: string }>;
  assertEqual(result.summaryEvidence.requestType, "how_to", "how-to question should be classified");
  assertEqual(result.summaryEvidence.matchedConversationCount, 1, "topic lookup should exclude unrelated conversations");
  assertEqual(evidence.some((item) => item.conversationId === "irrelevant"), false, "unrelated evidence must not reach the LLM");
  assertEqual(evidence[0].text, "入库异常应该怎么处理？", "matched customer question should be retained");
  assertEqual(evidence[evidence.length - 1].text, "收到材料后会安排仓库核实并反馈。", "final substantive agent reply should be retained");
}

function testFormatOutputRendersOnlyValidatedSummaryEvidence() {
  const formatted = runNode("format-output.ts", {
    validation: { validationStatus: "ok", canQuery: true, identity: { username: "seller@example.com" } },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: {
      requestType: "how_to",
      answerStatus: "found",
      matchedConversationCount: 1,
      matchedMessageCount: 3,
      evidenceConversationCount: 1,
      evidenceMessageCount: 3,
      dataCompleteness: "complete",
      evidence: [
        { id: "e-question", conversationId: "target", timestamp: "2026-07-12 10:00:00", role: "customer", speaker: "客户", text: "入库异常应该怎么处理？", textTruncated: false },
        { id: "e-guidance", conversationId: "target", timestamp: "2026-07-12 10:02:00", role: "agent", speaker: "客服", text: "请先提供异常单号和商品信息。", textTruncated: false },
      ],
    },
    analysisResult: {
      structured: {
        directAnswer: "客服建议先提供异常单号和商品信息。",
        directAnswerEvidenceIds: ["e-guidance"],
        keyFacts: [
          { factType: "agent_guidance", text: "客服要求先补充异常单号和商品信息。", evidenceIds: ["e-guidance"] },
          { factType: "completed", text: "异常已经处理完成。", evidenceIds: ["missing-evidence"] },
        ],
        unconfirmedItems: ["记录中未见异常已处理完成的明确确认。"],
      },
      analysis: "不应直接透传这段模型自由文本。",
    },
    inputContext: { chainId: "chain-1" },
  });
  assert(String(formatted.analysis).includes("客服建议先提供异常单号和商品信息。"), "validated direct answer should be rendered");
  assert(String(formatted.analysis).includes("2026-07-12 10:02:00 客服"), "rendered facts should include dated evidence");
  assertEqual(String(formatted.analysis).includes("异常已经处理完成。"), false, "fact with an invalid evidence id must be removed");
  assertEqual(String(formatted.analysis).includes("不应直接透传"), false, "free-form LLM analysis must not bypass validation");
  assertEqual(String(formatted.analysis).includes("未见异常已处理完成"), true, "complete evidence may render an explicit unconfirmed item");
  assertEqual(formatted.structured.dataCompleteness, "complete", "structured output should expose evidence coverage");
  assertEqual(formatted.structured.keyFacts.length, 1, "structured output should only keep validated facts");
}

function testWorkflowUsesSummaryEvidenceWithoutTranscriptContract() {
  const workflow = JSON.parse(fs.readFileSync(path.join(expertDir, "workflow.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join(expertDir, "manifest.json"), "utf8"));
  const prompt = fs.readFileSync(path.join(expertDir, "prompts", "main.md"), "utf8");
  const evidenceNode = workflow.nodes.find((node: { id: string }) => node.id === "build-summary-evidence");
  const llmNode = workflow.nodes.find((node: { id: string }) => node.id === "llm-answer-from-records");
  const formatNode = workflow.nodes.find((node: { id: string }) => node.id === "format-output");
  assert(evidenceNode, "workflow should build a dedicated summary evidence package");
  assertArrayIncludes(evidenceNode.outputs, "summaryEvidence", "evidence node should expose summaryEvidence");
  assertArrayIncludes(evidenceNode.outputs, "attachmentDelivery", "evidence node should expose attachment delivery separately from LLM evidence");
  assert(llmNode.inputs.includes("summaryEvidence"), "LLM should consume summaryEvidence");
  assertEqual(llmNode.inputs.includes("attachmentDelivery"), false, "LLM must not receive raw attachment URLs");
  assertEqual(llmNode.inputs.includes("llmAnswerContext"), false, "LLM should not consume the legacy status-only context");
  assert(formatNode.inputs.includes("summaryEvidence"), "format-output should consume summaryEvidence");
  assert(formatNode.inputs.includes("attachmentDelivery"), "format-output should receive code-rendered attachment links");
  assertEqual(formatNode.inputs.includes("rankedSnippets"), false, "format-output should not receive legacy transcript data");
  assertEqual(Object.prototype.hasOwnProperty.call(manifest.inputSchema.properties, "maxConversations"), false, "public schema should not expose conversation summary caps");
  assertEqual(Object.prototype.hasOwnProperty.call(manifest.inputSchema.properties, "maxMessages"), false, "public schema should not expose message summary caps");
  assert(Object.prototype.hasOwnProperty.call(manifest.outputSchema.properties.structured.properties, "attachments"), "public schema should describe explicit attachment delivery");
  assert(prompt.includes("evidenceIds"), "summary prompt should require evidence references");
  assert(prompt.includes("不得生成、补全或改写附件链接"), "prompt must reserve links for code rendering");
  assertEqual(prompt.includes("完整 Markdown 记录会由后续节点返回"), false, "prompt must not promise a full transcript");
}

function testBuildSummaryEvidenceMarksOversizeResultsWithoutTranscript() {
  const result = runNode("build-summary-evidence.ts", {
    query: "帮我查一下历史人工客服记录",
    messageTurns: Array.from({ length: 21 }, (_, index) => ({
      conversationId: "latest",
      timestamp: `2026-07-12 10:${String(index).padStart(2, "0")}:00`,
      role: index % 2 === 0 ? "customer" : "agent",
      speaker: index % 2 === 0 ? "客户" : "客服",
      text: `第${index + 1}条沟通：${"内容".repeat(700)}`,
    })),
    queryScope: {
      timeWindow: { kind: "recent", start: "2026-06-13 00:00:00", end: "2026-07-12 23:59:59" },
      keywords: [],
      usedMessageTimeFilter: true,
    },
    humanServiceRecords: { recordsTruncated: false },
  });
  const summary = result.summaryEvidence;
  assertEqual(summary.dataCompleteness, "relevant_subset", "oversize evidence should disclose a relevant subset");
  assert(summary.evidenceCharacterCount <= 24_000, "evidence must stay inside the fixed input budget");
  assertEqual(Object.prototype.hasOwnProperty.call(summary, "transcriptMarkdown"), false, "summary evidence must never carry a full transcript field");
  assertEqual(summary.evidence.length < 21, true, "oversize evidence should omit lower-priority turns");
}

function testFormatOutputSuppressesNegativeClaimsForPartialSource() {
  const formatted = runNode("format-output.ts", {
    validation: { canQuery: true },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: {
      requestType: "outcome",
      answerStatus: "found",
      matchedConversationCount: 1,
      matchedMessageCount: 2,
      evidenceConversationCount: 1,
      evidenceMessageCount: 1,
      dataCompleteness: "partial_source",
      evidence: [
        { id: "e-commit", conversationId: "target", timestamp: "2026-07-12 10:05:00", role: "agent", speaker: "客服", text: "收到材料后会安排仓库核实并反馈。", textTruncated: false },
      ],
    },
    analysisResult: {
      structured: {
        directAnswer: "客服表示会安排仓库核实并反馈。",
        directAnswerEvidenceIds: ["e-commit"],
        unconfirmedItems: ["记录中未见异常已处理完成的明确确认。"],
      },
      analysis: "模型自由文本不得直接输出。",
    },
    inputContext: {},
  });
  assert(String(formatted.analysis).includes("客服表示会安排仓库核实并反馈。"), "valid historical commitment should be rendered");
  assertEqual(String(formatted.analysis).includes("未见异常已处理完成"), false, "partial source must suppress negative claims");
  assert(String(formatted.analysis).includes("仅基于已获取的部分历史记录"), "partial source should show a coverage warning");
  assertEqual(formatted.structured.unconfirmedItems.length, 0, "partial source should not expose unconfirmed negative claims in structured output");
}

function attachmentTurns() {
  return [
    { conversationId: "latest", timestamp: "2026-07-16 17:41:57", role: "other", speaker: "系统", text: "有新的咨询进来了" },
    { conversationId: "latest", timestamp: "2026-07-16 17:42:32", role: "customer", speaker: "客户", text: "随便回我点消息，我需要做转人工对话历史的测试，贴张图片给我" },
    { conversationId: "latest", timestamp: "2026-07-16 17:42:40", role: "agent", speaker: "客服", text: "您好" },
    { conversationId: "latest", timestamp: "2026-07-16 17:43:16", role: "customer", speaker: "客户", text: "[image]https://example.test/customer-image.png?Signature=customer" },
    { conversationId: "latest", timestamp: "2026-07-16 17:43:26", role: "customer", speaker: "客户", text: "请帮我确认图片是否已发送" },
    { conversationId: "latest", timestamp: "2026-07-16 17:43:51", role: "agent", speaker: "客服", text: "您好，好的 稍等" },
    { conversationId: "latest", timestamp: "2026-07-16 17:44:05", role: "agent", speaker: "客服", text: "[image]https://example.test/agent-image.png?Signature=agent" },
    { conversationId: "latest", timestamp: "2026-07-16 17:44:11", role: "other", speaker: "系统", text: "发送满意度调查" },
    { conversationId: "latest", timestamp: "2026-07-16 17:44:20", role: "customer", speaker: "客户", text: "谢谢" },
    { conversationId: "latest", timestamp: "2026-07-16 17:44:30", role: "agent", speaker: "客服", text: "不客气" },
    { conversationId: "latest", timestamp: "2026-07-16 17:44:40", role: "customer", speaker: "客户", text: "后续如有问题再咨询" },
    { conversationId: "latest", timestamp: "2026-07-16 17:44:50", role: "agent", speaker: "客服", text: "祝您生活愉快" },
    { conversationId: "latest", timestamp: "2026-07-16 17:45:00", role: "other", speaker: "系统", text: "您的对话已关闭" },
    { conversationId: "latest", timestamp: "2026-07-16 17:45:10", role: "customer", speaker: "客户", text: "测试结束" },
  ];
}

function standardScope() {
  return {
    timeWindow: { kind: "recent", start: "2026-07-01 00:00:00", end: "2026-07-16 23:59:59" },
    keywords: [],
    usedMessageTimeFilter: true,
  };
}

function testAttachmentDeliveryIsCodeRenderedAndRoleScoped() {
  const evidenceResult = runNode("build-summary-evidence.ts", {
    query: "客服给我发的图片是什么？",
    messageTurns: attachmentTurns(),
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  const summary = evidenceResult.summaryEvidence;
  const delivery = evidenceResult.attachmentDelivery;
  assertEqual(summary.dataCompleteness, "relevant_subset", "a three-message summary of a fourteen-message conversation must be a relevant subset");
  assertEqual(delivery.intent, "deliver", "what-image query should request link delivery");
  assertEqual(delivery.roleFilter, "agent", "客服 qualifier should scope delivery to agent attachments");
  assertEqual(delivery.matchingAttachmentCount, 1, "customer image must not satisfy an agent image request");
  assertEqual(delivery.attachments.length, 1, "only the requested agent attachment should be delivered");
  assertEqual(delivery.attachments[0].url, "https://example.test/agent-image.png?Signature=agent", "the source URL should remain unchanged");
  assertEqual(JSON.stringify(summary).includes("Signature=agent"), false, "LLM summary evidence must not contain raw attachment URLs");

  const agentEvidence = summary.evidence.find((item: { attachmentType?: string; role?: string }) => item.attachmentType === "image" && item.role === "agent");
  const formatted = runNode("format-output.ts", {
    validation: { canQuery: true },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: summary,
    attachmentDelivery: delivery,
    analysisResult: {
      structured: {
        directAnswer: "客服曾发送图片。",
        directAnswerEvidenceIds: [agentEvidence.id],
        keyFacts: [{ factType: "attachment_event", text: "客服发送过图片。", evidenceIds: [agentEvidence.id] }],
      },
    },
    inputContext: {},
  });
  assert(String(formatted.analysis).includes("[打开图片](<https://example.test/agent-image.png?Signature=agent>)"), "format node should render the exact source URL as a clickable link");
  assert(String(formatted.analysis).includes("历史图片或附件链接可能已过期"), "attachment output should warn about expiry");
  assertEqual(String(formatted.analysis).includes("customer-image.png"), false, "customer attachment must not leak into an agent-only response");
  assertEqual(String(formatted.analysis).includes("完整记录"), false, "summary output must not claim a complete record");
  assertEqual(formatted.structured.attachments.length, 1, "structured output should expose delivered attachments only");
}

function testAttachmentContentRequestDeliversLinks() {
  const evidenceResult = runNode("build-summary-evidence.ts", {
    query: "查询用户2026年7月16日与人工客服沟通时双方各自发送的1张图片的具体内容",
    messageTurns: attachmentTurns(),
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  const delivery = evidenceResult.attachmentDelivery;
  assertEqual(delivery.intent, "deliver", "specific attachment-content request should deliver links");
  assertEqual(delivery.roleFilter, "any", "both-sides attachment request should not restrict the sender");
  assertEqual(delivery.attachments.length, 2, "specific attachment-content request should return both available image links");
  assertEqual(delivery.attachments[0].url, "https://example.test/customer-image.png?Signature=customer", "customer image URL should be preserved");
  assertEqual(delivery.attachments[1].url, "https://example.test/agent-image.png?Signature=agent", "agent image URL should be preserved");
}

function testAttachmentCheckDoesNotExposeLinkAndHandlesPartialSource() {
  const check = runNode("build-summary-evidence.ts", {
    query: "客服有没有发过图片？",
    messageTurns: attachmentTurns(),
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(check.attachmentDelivery.intent, "check", "presence question should not request a link");
  const formatted = runNode("format-output.ts", {
    validation: { canQuery: true },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: check.summaryEvidence,
    attachmentDelivery: check.attachmentDelivery,
    analysisResult: { structured: {} },
    inputContext: {},
  });
  assert(String(formatted.analysis).includes("查到客服发送的1个图片"), "attachment check should return the observed event");
  assertEqual(String(formatted.analysis).includes("https://example.test/agent-image.png"), false, "presence check must not expose a URL");

  const partial = runNode("build-summary-evidence.ts", {
    query: "客服有没有发过图片？",
    messageTurns: [{ conversationId: "latest", timestamp: "2026-07-16 17:42:32", role: "customer", speaker: "客户", text: "请协助处理" }],
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: true },
  });
  const partialFormatted = runNode("format-output.ts", {
    validation: { canQuery: true },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: partial.summaryEvidence,
    attachmentDelivery: partial.attachmentDelivery,
    analysisResult: { structured: {} },
    inputContext: {},
  });
  assertEqual(String(partialFormatted.analysis).includes("未发现客服发送的图片"), false, "partial source must not make a negative attachment conclusion");
  assert(String(partialFormatted.analysis).includes("无法据此判断"), "partial source should explain that attachment presence is unknown");
}

function testGenericSummaryAutomaticallyDeliversRelevantAttachmentUrls() {
  const generic = runNode("build-summary-evidence.ts", {
    query: "查看之前的人工记录",
    messageTurns: attachmentTurns(),
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(generic.attachmentDelivery.intent, "summary_auto", "generic summary should automatically deliver attachments already selected as evidence");
  assertEqual(generic.attachmentDelivery.attachments.length, 2, "generic summary should include the two relevant image links");
  const firstEvidence = generic.summaryEvidence.evidence[0];
  const formatted = runNode("format-output.ts", {
    validation: { canQuery: true },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: generic.summaryEvidence,
    attachmentDelivery: generic.attachmentDelivery,
    analysisResult: {
      structured: {
        directAnswer: "最近一次会话包含测试沟通。",
        directAnswerEvidenceIds: [firstEvidence.id],
      },
    },
    inputContext: {},
  });
  assert(String(formatted.analysis).includes("[打开图片](<https://example.test/customer-image.png?Signature=customer>)"), "generic summary should render the customer image link without a follow-up question");
  assert(String(formatted.analysis).includes("[打开图片](<https://example.test/agent-image.png?Signature=agent>)"), "generic summary should render the agent image link without a follow-up question");
  assertEqual(formatted.structured.attachments.length, 2, "generic structured output should expose automatically delivered attachments");
  assert(String(formatted.outputContext.resultSummary).startsWith("历史附件链接（请原样保留）："), "generic summary handoff should put attachment links before prose");
  assert(String(formatted.outputContext.resultSummary).includes("[打开图片](<https://example.test/customer-image.png?Signature=customer>)"), "generic summary handoff must preserve the first raw image link");
  assertEqual(String(formatted.outputContext.resultSummary).includes("无法恢复原附件内容"), false, "attachment handoff must not claim that image content cannot be recovered");

  const capped = runNode("build-summary-evidence.ts", {
    query: "查看之前的人工记录",
    messageTurns: Array.from({ length: 4 }, (_, index) => ({
      conversationId: "latest",
      timestamp: `2026-07-16 17:4${index}:00`,
      role: "agent",
      speaker: "客服",
      text: `[image]https://example.test/auto-${index + 1}.png?Signature=${index + 1}`,
    })),
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(capped.attachmentDelivery.intent, "summary_auto", "generic attachment-only summary should use automatic delivery");
  assertEqual(capped.attachmentDelivery.attachments.length, 3, "automatic delivery should cap links at three");
  assertEqual(capped.attachmentDelivery.deliveryTruncated, true, "automatic delivery should disclose omitted older links");
}

function testConversationContextDoesNotLimitAttachmentSender() {
  const result = runNode("build-summary-evidence.ts", {
    query: "上次跟客服聊了什么，把图片给我",
    messageTurns: [
      { conversationId: "latest", timestamp: "2026-07-16 17:42:32", role: "customer", speaker: "客户", text: "请帮我测试人工客服历史记录" },
      { conversationId: "latest", timestamp: "2026-07-16 17:43:16", role: "customer", speaker: "客户", text: "[image]https://example.test/customer-image.png?Signature=customer" },
      { conversationId: "latest", timestamp: "2026-07-16 17:43:53", role: "agent", speaker: "客服", text: "[image]https://example.test/agent-image.png?Signature=agent" },
    ],
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(result.attachmentDelivery.intent, "deliver", "give-me-image query should request attachment delivery");
  assertEqual(result.attachmentDelivery.roleFilter, "any", "conversation context must not be mistaken for an attachment sender constraint");
  assertEqual(result.attachmentDelivery.attachments.length, 2, "unscoped image request should return customer and agent images from the conversation");
}

function testAttachmentInvalidLinksAndDeliveryCapDegradeSafely() {
  const invalid = runNode("build-summary-evidence.ts", {
    query: "把客服图片链接给我",
    messageTurns: [{ conversationId: "latest", timestamp: "2026-07-16 17:44:05", role: "agent", speaker: "客服", text: "[image]ftp://example.test/not-allowed.png" }],
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(invalid.attachmentDelivery.matchingAttachmentCount, 1, "attachment event without an http URL should remain observable");
  assertEqual(invalid.attachmentDelivery.attachments.length, 0, "invalid protocols must not be delivered");
  const invalidFormatted = runNode("format-output.ts", {
    validation: { canQuery: true },
    queryScope: { queryStatus: "ok" },
    summaryEvidence: invalid.summaryEvidence,
    attachmentDelivery: invalid.attachmentDelivery,
    analysisResult: { structured: {} },
    inputContext: {},
  });
  assert(String(invalidFormatted.analysis).includes("原始链接未随当前记录返回"), "invalid link should degrade without fabricating a URL");
  assertEqual(String(invalidFormatted.analysis).includes("ftp://"), false, "invalid source protocol must never leak to users");
  assertEqual(String(invalidFormatted.analysis).includes("无法提供附件内容"), false, "missing raw URL should not be misrepresented as an inability to identify content");
  assertEqual(String(invalidFormatted.analysis).includes("无法恢复原附件内容"), false, "missing raw URL should not claim that attachment content cannot be recovered");

  const allAttachments = runNode("build-summary-evidence.ts", {
    query: "把附件给我",
    messageTurns: [
      { conversationId: "latest", timestamp: "2026-07-16 17:44:05", role: "agent", speaker: "客服", text: "[image]https://example.test/image.png?Signature=image" },
      { conversationId: "latest", timestamp: "2026-07-16 17:44:06", role: "agent", speaker: "客服", text: "[file]https://example.test/file.pdf?Signature=file" },
    ],
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(allAttachments.attachmentDelivery.types.length, 0, "generic attachment request should include every attachment type");
  assertEqual(allAttachments.attachmentDelivery.attachments.length, 2, "generic attachment request should return both image and file links");

  const capped = runNode("build-summary-evidence.ts", {
    query: "把图片给我",
    messageTurns: Array.from({ length: 21 }, (_, index) => ({
      conversationId: "latest",
      timestamp: `2026-07-16 17:${String(index).padStart(2, "0")}:00`,
      role: "agent",
      speaker: "客服",
      text: `[image]https://example.test/image-${index + 1}.png?Signature=${index + 1}`,
    })),
    queryScope: standardScope(),
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(capped.attachmentDelivery.attachments.length, 20, "delivery should cap attachment links at twenty");
  assertEqual(capped.attachmentDelivery.deliveryTruncated, true, "link cap should disclose omitted older attachments");
  assertEqual(capped.attachmentDelivery.attachments[0].url.includes("image-2.png"), true, "delivery cap should retain the newest attachments");
}

function testLegacyFilterDoesNotExposeFullTranscript() {
  const result = runNode("filter-rank-snippets.ts", {
    messageTurns: [
      { conversationId: "target", timestamp: "2026-07-12 10:00:00", role: "customer", speaker: "客户", text: "入库异常应该怎么处理？" },
      { conversationId: "target", timestamp: "2026-07-12 10:02:00", role: "agent", speaker: "客服", text: "请先提供异常单号和商品信息。" },
    ],
    queryScope: { timeWindow: { start: "2026-07-12 00:00:00", end: "2026-07-12 23:59:59" }, keywords: ["异常"] },
    humanServiceRecords: { recordsTruncated: false },
  });
  assertEqual(Object.prototype.hasOwnProperty.call(result.rankedSnippets, "transcriptMarkdown"), false, "legacy filter must not retain a complete transcript");
  assertEqual(Object.prototype.hasOwnProperty.call(result.llmAnswerContext, "transcriptMarkdown"), false, "legacy LLM context must not retain a complete transcript");
}

const tests = [
  testValidateRequiresUsernameOnly,
  testFetchFiltersByUsernameOnly,
  testResolveQueryScopeParsesYesterdayWithMessageTime,
  testResolveQueryScopeUsesCompleteRecentWindowWithoutExplicitTime,
  testResolveQueryScopeParsesRelativeCalendarPeriods,
  testResolveQueryScopeDoesNotExposeLegacySummaryLimits,
  testResolveQueryScopeDisablesPartialServerHintsForLongRanges,
  testResolveQueryScopeCapsCurrentPeriodsAtYesterday,
  testResolveQueryScopeRejectsTodayOnly,
  testResolveQueryScopeUsesRecentKeywordSearchWithoutLatestOnly,
  testResolveQueryScopeRejectsOlderThanSixMonths,
  testParseMessagesSupportsMultilineTurns,
  testParseMessagesSupportsConcatenatedTimestampTurns,
  testFetchSkipsRejectedTooOldQuery,
  testFetchSkipsTodayUnavailableQuery,
  testBuildSummaryEvidenceUsesLatestConversationForGenericQuery,
  testBuildSummaryEvidenceKeepsRelevantQuestionContextAndFinalAgentReply,
  testFormatOutputRendersOnlyValidatedSummaryEvidence,
  testWorkflowUsesSummaryEvidenceWithoutTranscriptContract,
  testBuildSummaryEvidenceMarksOversizeResultsWithoutTranscript,
  testFormatOutputSuppressesNegativeClaimsForPartialSource,
  testAttachmentDeliveryIsCodeRenderedAndRoleScoped,
  testAttachmentContentRequestDeliversLinks,
  testAttachmentCheckDoesNotExposeLinkAndHandlesPartialSource,
  testGenericSummaryAutomaticallyDeliversRelevantAttachmentUrls,
  testConversationContextDoesNotLimitAttachmentSender,
  testAttachmentInvalidLinksAndDeliveryCapDegradeSafely,
  testLegacyFilterDoesNotExposeFullTranscript,
];

for (const test of tests) {
  test();
  process.stdout.write(`PASS ${test.name}\n`);
}
