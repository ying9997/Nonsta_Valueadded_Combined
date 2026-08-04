import { execFileSync } from "child_process";
import * as path from "path";

const root = path.resolve(__dirname, "../../..");
const tsNode = require.resolve("ts-node/dist/bin.js");
const tsconfig = path.join(root, "scripts", "tsconfig.json");

function runNode(file: string, params: Record<string, unknown>): Record<string, unknown> {
  const stdout = execFileSync(
    process.execPath,
    [tsNode, "-P", tsconfig, path.join(__dirname, file), JSON.stringify(params)],
    { encoding: "utf8" }
  );
  return JSON.parse(stdout) as Record<string, unknown>;
}

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(message);
}

const query = "品牌抽奖的赠品订单，没有货值附件，如何申请代客索赔？";
const validated = runNode("nodes/validate-input.ts", { query });
assert(validated.branch === "guidance", "流程/材料咨询必须进入 guidance 分支");

const fetched = runNode("nodes/fetch-compensate-list.ts", {
  branch: validated.branch,
  trackingIds: validated.trackingIds,
  outboundOrderNos: validated.outboundOrderNos,
  claimIds: validated.claimIds,
});
const facts = fetched.compensateListFacts as Record<string, unknown>;
assert(facts.branch === "guidance", "事实输出必须保留 guidance 分支");
assert(facts.listStatus === "skipped_guidance", "guidance 不得标记为 skipped_no_query");

const formatted = runNode("nodes/format-output.ts", {
  analysisResult: {
    structured: {
      nextAction: "请提供代客索赔单号、出库单号或跟踪号，以便查询进度。",
      missingFacts: [],
    },
    analysis:
      "请提供代客索赔单号、出库单号或跟踪号。操作路径：进入海外仓索赔管理，申请标准索赔即可进行代客索赔。",
  },
  compensateListFacts: facts,
  inputContext: {},
});

const analysis = String(formatted.analysis ?? "");
const structured = formatted.structured as Record<string, unknown>;
const statusSummary = structured.statusSummary as Record<string, unknown>;
const missingFacts = structured.missingFacts as unknown[];

assert(!analysis.includes("提供代客索赔单号"), "guidance 输出不得要求先提供单号");
assert(!analysis.includes("申请标准索赔"), "代客索赔 guidance 不得输出标准索赔入口");
assert(!missingFacts.some((x) => String(x).includes("无 claimIds")), "guidance 不得把无查询键列为缺失事实");
assert(statusSummary.listStatus === "skipped_guidance", "输出状态必须保留 skipped_guidance");
assert(statusSummary.guidanceGuardApplied === true, "矛盾模型输出必须触发 guidance guard");
assert(!String(structured.nextAction ?? "").includes("提供代客索赔单号"), "nextAction 不得继续索要单号");

const progress = runNode("nodes/validate-input.ts", {
  query: "查询这笔代客索赔进度",
  claimIds: ["CLM-DEMO-001"],
});
assert(progress.branch === "query", "带查询键的进度查询必须保持 query 分支");

process.stdout.write("substitute-claim guidance guard: OK\n");
