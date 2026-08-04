import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  normalizeCapture,
  parseCallExpertRefs,
  sanitizeForPersistence,
  writeCollectorOutput,
  type RawCollectorCapture,
} from "./coze-expert-log-collector-lib";

const capture: RawCollectorCapture = {
  conversationId: "7648905849746571291",
  sourceUrl: "https://www.coze.cn/example",
  capturedAt: "2026-07-31T10:00:00.000Z",
  messages: [
    {
      messageId: "7667833982445027362",
      conversationId: "7648905849746571291",
      userId: "149440",
      userInput: "查询 TA260721045",
      botOutput: "处理中",
      requestedAt: "2026-07-29 14:32:02",
      status: "Success",
      source: "API",
    },
    {
      messageId: "7667834510482341922",
      conversationId: "7648905849746571291",
      userId: "149440",
      userInput: "为什么未满三天",
      botOutput: "",
      requestedAt: "2026-07-29 14:34:05",
      status: "Success",
      source: "API",
    },
  ],
  expertCalls: [
    {
      messageId: "7667833982445027362",
      conversationId: "7648905849746571291",
      callIndex: 0,
      input: {
        coze_api_token: "must-never-persist",
        customerCode: "13247347",
        customerName: "测试客户",
        username: "user@example.com",
        nested: JSON.stringify({ authorization: "Bearer nested-secret", safe: "ok" }),
      },
      output: {
        outputContext: { expertId: "tracking-inquiry" },
        rawRecord: { consigneePhone: "123", consigneeName: "name", orderNo: "WO1" },
        debug_url: "https://www.coze.cn/work_flow?execute_id=7667834086228246568&space_id=7417755373999767571&workflow_id=7649722091507957801&execute_mode=2",
      },
    },
    {
      messageId: "7667833982445027362",
      conversationId: "7648905849746571291",
      callIndex: 1,
      input: { query: "second call", cookie: "secret" },
      output: { coze_code: "500", coze_msg: "failed", outputContext: { expertId: "second-expert" } },
    },
  ],
};

const normalized = normalizeCapture(capture);
assert.equal(normalized.messages.length, 2, "one conversation can contain multiple messages");
assert.equal(normalized.expertCalls.length, 2, "one message can contain multiple expert calls");
assert.equal(normalized.messages[0]?.messageId, "7667833982445027362", "ids stay as strings");
assert.equal(normalized.expertCalls[0]?.expertId, "tracking-inquiry");
assert.equal(normalized.expertCalls[0]?.workflowId, "7649722091507957801");
assert.equal(normalized.expertCalls[0]?.executeId, "7667834086228246568");
assert.equal(normalized.expertCalls[0]?.spaceId, "7417755373999767571");

const serialized = JSON.stringify(normalized);
assert(!serialized.includes("must-never-persist"), "top-level token must not persist");
assert(!serialized.includes("nested-secret"), "token inside a JSON string must not persist");
assert(!serialized.includes("consigneePhone"), "unnecessary consignee PII must not persist");
assert(serialized.includes("customerCode"), "diagnostic customer context is retained");
assert(serialized.includes("测试客户"), "UTF-8 Chinese remains intact");

assert.deepEqual(sanitizeForPersistence({ password: "x", safe: "y" }), { safe: "y" });
assert.deepEqual(normalizeCapture({ ...capture, expertCalls: [] }).expertCalls, [], "messages without call-expert are valid");
assert.deepEqual(
  parseCallExpertRefs([
    '@e41 [button]',
    '  [generic] "代码 call-expert"',
    '@e42 [button] "代码 call-expert"',
    '@e99 [button] "其他节点"',
  ].join("\n")),
  ["@e41", "@e42"],
  "call-expert refs should work with nested or inline accessibility labels",
);

const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "coze-log-collector-test-"));
writeCollectorOutput(outputDir, normalized);
for (const fileName of ["messages.json", "expert-calls.json", "summary.json", "messages.csv", "expert-calls.csv"]) {
  assert(fs.existsSync(path.join(outputDir, fileName)), `${fileName} should be written`);
}
const persisted = fs.readFileSync(path.join(outputDir, "expert-calls.json"), "utf8");
assert(!persisted.includes("must-never-persist"));
assert(persisted.includes("tracking-inquiry"));

process.stdout.write("coze expert log collector tests passed\n");
