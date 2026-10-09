/**
 * Prompt J: retry / circuit / pipeline catch / 已提供附件 / topicSummary fallback.
 *
 *   npx tsx internal-review-copilot/scripts/test-prompt-j.ts
 */
import { createServer, type Server } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { FeishuError, withRetry } from "../lib/feishu-bot.ts";
import { buildClarificationCard, buildRequirementClarificationCard, demoTopicTitle } from "../lib/feishu-card.ts";
import { callChat, LlmError, type LlmConfig } from "../lib/llm-client.ts";
import { deriveTopicSummary } from "../lib/llm-scene-classifier.ts";
import { omsCircuitOpen, recordOmsCircuitFailureForTests, resetOmsCircuitForTests } from "../lib/oms-tom-client.ts";
import { runPipeline, type PipelineResult } from "../lib/run-pipeline.ts";
import type { JsonRecord } from "../lib/types.ts";

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(msg);
}

const logs: string[] = [];
const origWarn = console.warn;
const origError = console.error;
console.warn = (...args: unknown[]) => {
  logs.push(String(args[0] || ""));
  origWarn.apply(console, args);
};
console.error = (...args: unknown[]) => {
  logs.push(String(args[0] || ""));
  origError.apply(console, args);
};

let n = 0;
const once = await withRetry(async () => {
  n += 1;
  if (n === 1) throw new Error("boom-once");
  return "ok";
}, 1, 10);
assert(once === "ok" && n === 2, "withRetry retries once");
assert(logs.some((line) => /feishu retry in 10ms/.test(line)), "withRetry logs retry");

try {
  await withRetry(async () => {
    throw new Error("always");
  }, 1, 10);
  throw new Error("should throw");
} catch (err) {
  assert(err instanceof Error && err.message === "always", "withRetry still throws after retry");
}

let n4 = 0;
try {
  await withRetry(async () => {
    n4 += 1;
    throw new FeishuError("chat not found", 400, 230002);
  }, 1, 10);
  throw new Error("4xx should not retry");
} catch (err) {
  assert(err instanceof FeishuError && err.status === 400, "4xx throws FeishuError");
  assert(n4 === 1, "Feishu 4xx no retry");
}

let n5 = 0;
const after5 = await withRetry(async () => {
  n5 += 1;
  if (n5 === 1) throw new FeishuError("bad gateway", 502);
  return "ok";
}, 1, 10);
assert(after5 === "ok" && n5 === 2, "Feishu 5xx retries once");

resetOmsCircuitForTests();
recordOmsCircuitFailureForTests();
recordOmsCircuitFailureForTests();
assert(!omsCircuitOpen(), "circuit still closed after 2 failures");
recordOmsCircuitFailureForTests();
assert(omsCircuitOpen(), "circuit opens after 3 failures");
assert(logs.some((line) => /断路器开启 5 分钟/.test(line)), "circuit log");
try {
  const { createTomClient } = await import("../lib/oms-tom-client.ts");
  await createTomClient();
  throw new Error("circuit should block createTomClient");
} catch (err) {
  assert(/OMS 断路器开启中/.test(err instanceof Error ? err.message : String(err)), "createTomClient blocked by circuit");
}
resetOmsCircuitForTests();

function listen(server: Server): Promise<number> {
  return new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (!addr || typeof addr === "string") throw new Error("no port");
      resolveListen(addr.port);
    });
  });
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolveClose) => server.close(() => resolveClose()));
}

let hits = 0;
const llmServer = createServer((req, res) => {
  hits += 1;
  if (hits === 1) {
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "bad gateway" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }));
});
const llmPort = await listen(llmServer);
const llmCfg: LlmConfig = {
  apiKey: "test",
  baseURL: `http://127.0.0.1:${llmPort}/v1`,
  model: "dummy",
  fallbackModels: [],
  timeoutMs: 5000,
};
const llmOut = await callChat(llmCfg, [{ role: "user", content: "hi" }], { jsonMode: true });
assert(llmOut.includes("ok"), "LLM 502 then success");
assert(hits === 2, "LLM retried once after 502");
assert(logs.some((line) => /retrying in 2s/.test(line)), "LLM retry log");
await closeServer(llmServer);

hits = 0;
const bad4xx = createServer((_req, res) => {
  hits += 1;
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "bad request" }));
});
const p4 = await listen(bad4xx);
try {
  await callChat(
    {
      apiKey: "test",
      baseURL: `http://127.0.0.1:${p4}/v1`,
      model: "dummy",
      fallbackModels: [],
      timeoutMs: 3000,
    },
    [{ role: "user", content: "hi" }],
  );
  throw new Error("4xx should throw");
} catch (err) {
  assert(err instanceof LlmError && err.status === 400, "4xx not retried as success");
  assert(hits === 1, "4xx no retry");
}
await closeServer(bad4xx);

const boom: JsonRecord = {
  orderNo: "VASC_THROW",
  get atoms() {
    throw new Error("missing key boom");
  },
};
const caught = await runPipeline(boom, { skipLlm: true, sceneLlm: false });
assert(caught, "pipeline catch returns object");
assert(caught!.outputPath === "transfer_human", "unexpected throw → transfer_human");
assert(caught!.failureType === "unexpected_error", "failureType unexpected_error");
assert(caught!.agentInput.vascNo === "VASC_THROW", "stub agentInput present");
assert(logs.some((line) => /pipeline unexpected error VASC_THROW/.test(line)), "pipeline catch log");

const here = dirname(fileURLToPath(import.meta.url));
const livePath = resolve(here, "../../_runs/20260915_e2e_rerun/VASC000000366432.input.json");
assert(existsSync(livePath), "366432 fixture");
const detail = JSON.parse(readFileSync(livePath, "utf8")) as JsonRecord;
const l25 = await runPipeline(detail, {
  skipLlm: true,
  sceneLlm: false,
  overrideScene: "inbound_label_identify",
});
assert(l25, "366432 pipeline");
const people = { 销售: { name: "销售", openId: null }, 审核员: { name: "审核员", openId: null } };
const orange = buildClarificationCard(
  {
    ...(l25 as PipelineResult),
    outputPath: "needs_field_clarification",
    missingRequirementItems: ["处理范围未说明"],
    missingAttachments: [],
  },
  people,
);
const orangeText = JSON.stringify(orange);
assert(orangeText.includes("已提供附件"), "orange card shows 已提供附件");
assert(orangeText.includes("操作说明附件 ✓"), "orange lists 操作说明");
assert(orangeText.includes("标签文件 ✓"), "orange lists 标签文件");
assert(!orangeText.includes("标签文件（未上传）"), "orange does not ask uploaded label");

const red = buildRequirementClarificationCard(
  {
    ...(l25 as PipelineResult),
    outputPath: "needs_requirement_clarification",
    missingRequirementItems: ["操作动作不清"],
  },
  people,
);
assert(JSON.stringify(red).includes("已提供附件"), "red L1 card also shows uploaded attachments");

assert(deriveTopicSummary("", "辨识后补贴包裹标签上架到新单。后面是推理") === "辨识后补贴包裹标签上架到新单", "reasoning first sentence");
assert(deriveTopicSummary("取出配件后贴标上架", "很长的推理") === "取出配件后贴标上架", "prefer LLM topicSummary");
assert(deriveTopicSummary("", "短") === "", "too short reasoning ignored");

const fromReason = demoTopicTitle({
  orderNo: "VASC000000366432",
  contextFacts: { customerCode: "17112511", customerName: "AUSSIE", warehouseCode: "AUME" },
  matchResult: {
    llmClassification: {
      reasoning: "从已入库商品取出配件后贴标上架。这是判断过程。",
    },
  },
});
assert(fromReason.includes("从已入库商品取出配件后贴标上架"), "topic title falls back to reasoning");

console.warn = origWarn;
console.error = origError;
console.log("test-prompt-j ok");
