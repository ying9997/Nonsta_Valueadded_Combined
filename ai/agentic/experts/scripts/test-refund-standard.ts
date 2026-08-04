/**
 * 用 fixtures 跑 refund-standard 全流程。
 *
 * 默认：加载 .env 后走 OpenAI（与 run-expert 一致，需 OPENAI_API_KEY）。
 * 快速无 LLM：node 传参 --stub
 *
 * npm run test:refund-standard
 * npm run test:refund-standard -- --stub
 */

import * as fs from "fs";
import * as path from "path";
import { findExpertDir, runExpert } from "./run-expert";

const projectRoot = path.resolve(__dirname, "..");
const fixturesPath = path.join(__dirname, "fixtures", "refund-standard-params.json");

interface FixtureCase {
  id: string;
  description: string;
  params: Record<string, unknown>;
}

function llmStub(): Promise<Record<string, unknown>> {
  return Promise.resolve({
    analysisResult: {
      structured: {
        policyBranch: "unknown",
        matchedRuleIds: [] as string[],
        scenarioSummary: "test-stub",
        confidence: "high" as const,
        suggestedNextStep: "none" as const,
      },
      analysis: "[test-refund-standard] LLM stub：仅验证知识注入与 format-output。",
    },
  });
}

function useStub(): boolean {
  return process.argv.includes("--stub");
}

async function main(): Promise<void> {
  const stub = useStub();
  if (!stub && !process.env.OPENAI_API_KEY?.trim()) {
    console.error("未设置 OPENAI_API_KEY。请在 .env 中配置，或加 --stub 跳过 LLM。");
    process.exit(1);
  }

  const expertDir = findExpertDir(projectRoot, "refund-standard");
  if (!expertDir) {
    console.error("未找到 manifest.id=refund-standard 的专家目录");
    process.exit(1);
  }

  console.log(stub ? "模式: stub（无 LLM 调用）" : "模式: OpenAI（真实 LLM）");

  const { cases } = JSON.parse(fs.readFileSync(fixturesPath, "utf-8")) as { cases: FixtureCase[] };

  for (const c of cases) {
    console.log("\n==========", c.id, "==========");
    console.log(c.description);

    const ctxStub = stub
      ? { expertDir, initialParams: c.params, llmHandler: llmStub }
      : { expertDir, initialParams: c.params };

    const ctx = await runExpert(ctxStub);

    if (ctx.valid === false) {
      console.log("valid: false", ctx.error);
      continue;
    }

    console.log("countryResolved:", ctx.countryResolved, "| countrySource:", ctx.countrySource ?? "(n/a)");
    console.log("countryShardMode:", ctx.countryShardMode);

    const shard = typeof ctx.designatedCountryShard === "string" ? ctx.designatedCountryShard : "";
    const preview = shard.slice(0, 420);
    console.log("designatedCountryShard preview:\n", preview + (shard.length > preview.length ? "\n…" : ""));

    const matrix = typeof ctx.clauseMatrix === "string" ? ctx.clauseMatrix : "";
    const cIdx = matrix.lastIndexOf("## C.");
    const comboOnly = cIdx >= 0 ? matrix.slice(cIdx) : matrix;
    console.log("clauseMatrix total chars:", matrix.length);
    console.log("clauseMatrix C-section preview:\n", comboOnly.slice(0, 500) + (comboOnly.length > 500 ? "\n…" : ""));

    const result = ctx.result as
      | {
          structured?: {
            policyBranch?: string;
            matchedRuleIds?: string[];
            scenarioSummary?: string;
            confidence?: string;
            suggestedNextStep?: string;
          };
          analysis?: string;
        }
      | undefined;

    console.log("--- LLM / format 结果 ---");
    console.log("policyBranch:", result?.structured?.policyBranch ?? "(missing)");
    console.log("matchedRuleIds:", result?.structured?.matchedRuleIds ?? []);
    console.log("confidence:", result?.structured?.confidence ?? "(n/a)");
    console.log("scenarioSummary:", result?.structured?.scenarioSummary ?? "(n/a)");
    const analysis = typeof result?.analysis === "string" ? result.analysis : "";
    const aPrev = analysis.slice(0, 900);
    console.log("analysis preview:\n", aPrev + (analysis.length > aPrev.length ? "\n…" : ""));
  }

  console.log("\n全部用例跑完。");
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
